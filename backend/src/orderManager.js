const crypto = require("crypto");
const config = require("../config/config");
const db = require("./database");
const apiClient = require("./apiClient");

class OrderManager {
  constructor({ riskManager, eventBus }) {
    this.riskManager = riskManager;
    this.eventBus = eventBus;
    this.openPositions = new Map();
    this.openOrders = new Map();
    this.pnl = 0;
    this.lastRepriceAt = new Map();
  }

  getSnapshot() {
    return {
      openPositions: Array.from(this.openPositions.values()),
      openOrders: Array.from(this.openOrders.values()),
      pnl: this.pnl,
      mode: config.botMode,
    };
  }

  getOpenExposure() {
    return Array.from(this.openPositions.values()).reduce(
      (sum, position) => sum + Number(position.notional || 0),
      0
    );
  }

  getOpenOrderCount() {
    return this.openOrders.size;
  }

  hasActiveExposure(market) {
    return this.openPositions.has(market)
      || Array.from(this.openOrders.values()).some((order) => order.market === market);
  }

  calculateQuantity(market, price, marketMeta = {}) {
    const quantity = config.strategy.tradeSize / price;
    const step = Number(marketMeta.step || 0.00000001);
    const precision =
      typeof marketMeta.target_currency_precision === "number"
        ? marketMeta.target_currency_precision
        : 8;

    const adjusted = Math.floor(quantity / step) * step;
    return Number(adjusted.toFixed(precision));
  }

  validateEntrySize(price, marketMeta = {}) {
    const totalQuantity = this.calculateQuantity(marketMeta.market, price, marketMeta);
    const notional = Number((totalQuantity * price).toFixed(8));
    const minQuantity = Number(
      marketMeta.min_quantity
      || marketMeta.min_quantity_per_order
      || marketMeta.min_trade_amount
      || 0
    );
    const minNotional = Number(
      marketMeta.min_notional
      || marketMeta.min_notional_value
      || marketMeta.min_amount
      || 0
    );

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      return { valid: false, reason: "Trade size is too small for this market", totalQuantity, notional };
    }

    if (minQuantity > 0 && totalQuantity < minQuantity) {
      return {
        valid: false,
        reason: `Quantity below exchange minimum (${minQuantity})`,
        totalQuantity,
        notional,
      };
    }

    if (minNotional > 0 && notional < minNotional) {
      return {
        valid: false,
        reason: `Order notional below exchange minimum (${minNotional})`,
        totalQuantity,
        notional,
      };
    }

    return { valid: true, totalQuantity, notional };
  }

  roundPrice(price, marketMeta = {}) {
    const precision =
      typeof marketMeta.base_currency_precision === "number"
        ? marketMeta.base_currency_precision
        : 4;
    return Number(Number(price).toFixed(precision));
  }

  buildClientOrderId(market, side, role) {
    return `${Date.now()}-${market.toLowerCase()}-${side}-${role}-${crypto
      .randomBytes(3)
      .toString("hex")}`;
  }

  buildPosition({ market, quantity, entryPrice, strategyName, marketMeta }) {
    return {
      market,
      side: "long",
      quantity,
      entryPrice,
      notional: Number((quantity * entryPrice).toFixed(8)),
      stopLossPrice: this.roundPrice(
        entryPrice * (1 - config.strategy.stopLossPercent / 100),
        marketMeta
      ),
      targetFloorPrice: this.roundPrice(
        entryPrice * (1 + config.strategy.profitTargetPercent / 100),
        marketMeta
      ),
      pendingSellOrderId: null,
      pendingSellClientOrderId: null,
      pendingSellPrice: null,
      externalSellOrderId: null,
      openedAt: new Date().toISOString(),
      strategyName,
      marketMeta,
      highestSeenPrice: entryPrice,
    };
  }

  async executeEntrySignal({ market, price, strategyName, marketMeta }) {
    if (this.hasActiveExposure(market)) {
      return { success: false, reason: "Market already has an active position or order" };
    }

    const entryValidation = this.validateEntrySize(price, {
      ...marketMeta,
      market,
    });
    if (!entryValidation.valid) {
      await db.insertLog("warn", "Order rejected before placement", {
        market,
        side: "buy",
        reason: entryValidation.reason,
        totalQuantity: entryValidation.totalQuantity,
        notional: entryValidation.notional,
      });
      return { success: false, reason: entryValidation.reason };
    }

    const { totalQuantity } = entryValidation;
    const proposedOrderValue = entryValidation.notional;
    const riskCheck = await this.riskManager.check({
      openOrdersCount: this.getOpenOrderCount(),
      proposedOrderValue,
      currentExposure: this.getOpenExposure(),
    });

    if (!riskCheck.allowed) {
      await db.insertLog("warn", "Order rejected by risk manager", {
        market,
        side: "buy",
        reason: riskCheck.reason,
      });
      return { success: false, reason: riskCheck.reason };
    }

    const clientOrderId = this.buildClientOrderId(market, "buy", "entry");

    const orderPayload = {
      side: "buy",
      order_type: "market_order",
      market,
      total_quantity: totalQuantity,
      client_order_id: clientOrderId,
    };

    const pendingOrder = await db.storeOrder({
      externalOrderId: null,
      clientOrderId,
      market,
      side: "buy",
      orderType: "market_order",
      status: "pending",
      pricePerUnit: price,
      totalQuantity,
      mode: config.botMode,
      metadata: { strategyName, role: "entry" },
    });

    this.openOrders.set(pendingOrder.id, {
      id: pendingOrder.id,
      market,
      side: "buy",
      orderType: "market_order",
      status: "pending",
      clientOrderId,
      pricePerUnit: price,
      totalQuantity,
      role: "entry",
    });

    try {
      let execution;

      if (config.botMode === "paper") {
        execution = {
          id: `paper-${clientOrderId}`,
          status: "filled",
          avg_price: price,
          market,
          side: "buy",
          total_quantity: totalQuantity,
        };
      } else {
        execution = await apiClient.createOrder(orderPayload);
      }

      const executionPrice = Number(execution.avg_price || execution.price_per_unit || price);
      const orderRecord = await db.updateOrderStatus(pendingOrder.id, "filled", {
        execution,
      });

      this.openOrders.delete(pendingOrder.id);
      const position = this.buildPosition({
        market,
        quantity: totalQuantity,
        entryPrice: executionPrice,
        strategyName,
        marketMeta,
      });
      this.openPositions.set(market, position);

      await db.storeTrade({
        market,
        side: "buy",
        entryPrice: executionPrice,
        exitPrice: null,
        quantity: totalQuantity,
        realizedPnl: 0,
        mode: config.botMode,
        orderRef: orderRecord.id,
        strategyName,
        status: "open",
        metadata: { execution, stopLossPrice: position.stopLossPrice },
      });

      if (config.strategy.autoSellEnabled) {
        await this.placeExitOrder({
          market,
          currentPrice: executionPrice,
          forceCreate: true,
        });
      }

      await db.insertLog("info", "Order executed", {
        market,
        side: "buy",
        price: executionPrice,
        quantity: totalQuantity,
        mode: config.botMode,
      });

      this.eventBus.emit("order:executed", {
        market,
        side: "buy",
        price: executionPrice,
        quantity: totalQuantity,
        strategyName,
      });

      return { success: true, order: orderRecord, execution, position };
    } catch (error) {
      const exchangeError =
        error.response?.data?.message
        || error.response?.data?.error
        || error.response?.data?.status
        || error.message;
      this.openOrders.delete(pendingOrder.id);
      await db.updateOrderStatus(pendingOrder.id, "failed", {
        error: exchangeError,
        exchangeError: error.response?.data || null,
      });
      await db.insertLog("error", "Order placement failed", {
        market,
        side: "buy",
        error: exchangeError,
        exchangeError: error.response?.data || null,
      });
      return { success: false, reason: exchangeError };
    }
  }

  computeDesiredExitPrice(position, currentPrice) {
    const dynamicTarget = currentPrice * (1 + config.strategy.makerBufferPercent / 100);
    return this.roundPrice(
      Math.max(position.targetFloorPrice, dynamicTarget),
      position.marketMeta
    );
  }

  async placeExitOrder({ market, currentPrice, forceCreate = false }) {
    const position = this.openPositions.get(market);
    if (!position || !config.strategy.autoSellEnabled) {
      return { success: false, reason: "No active position" };
    }

    if (position.pendingSellOrderId && !forceCreate) {
      return this.repriceExitOrder({ market, currentPrice });
    }

    const desiredPrice = this.computeDesiredExitPrice(position, currentPrice);
    const clientOrderId = this.buildClientOrderId(market, "sell", "exit");
    const pendingOrder = await db.storeOrder({
      externalOrderId: null,
      clientOrderId,
      market,
      side: "sell",
      orderType: "limit_order",
      status: "open",
      pricePerUnit: desiredPrice,
      totalQuantity: position.quantity,
      mode: config.botMode,
      metadata: {
        strategyName: position.strategyName,
        role: "exit",
        entryPrice: position.entryPrice,
      },
    });

    let execution;
    if (config.botMode === "paper") {
      execution = {
        id: `paper-${clientOrderId}`,
        status: "open",
        market,
        side: "sell",
        total_quantity: position.quantity,
        price_per_unit: desiredPrice,
      };
    } else {
      execution = await apiClient.createOrder({
        side: "sell",
        order_type: "limit_order",
        market,
        price_per_unit: desiredPrice,
        total_quantity: position.quantity,
        client_order_id: clientOrderId,
      });
    }

    const updated = await db.updateOrderStatus(pendingOrder.id, "open", {
      execution,
      role: "exit",
      targetPrice: desiredPrice,
    });

    this.openOrders.set(pendingOrder.id, {
      id: pendingOrder.id,
      market,
      side: "sell",
      orderType: "limit_order",
      status: "open",
      clientOrderId,
      pricePerUnit: desiredPrice,
      totalQuantity: position.quantity,
      role: "exit",
      externalOrderId: execution.id || null,
    });

    position.pendingSellOrderId = pendingOrder.id;
    position.pendingSellClientOrderId = clientOrderId;
    position.pendingSellPrice = desiredPrice;
    position.externalSellOrderId = execution.id || null;
    this.lastRepriceAt.set(market, Date.now());

    this.eventBus.emit("order:pending", {
      market,
      side: "sell",
      price: desiredPrice,
      quantity: position.quantity,
      strategyName: position.strategyName,
    });

    return { success: true, order: updated };
  }

  async repriceExitOrder({ market, currentPrice }) {
    const position = this.openPositions.get(market);
    if (!position || !position.pendingSellOrderId) {
      return { success: false, reason: "No pending exit order" };
    }

    const now = Date.now();
    if (now - (this.lastRepriceAt.get(market) || 0) < config.strategy.repriceIntervalMs) {
      return { success: false, reason: "Reprice interval not reached" };
    }

    const desiredPrice = this.computeDesiredExitPrice(position, currentPrice);
    const currentLimitPrice = Number(position.pendingSellPrice || 0);
    const deltaPercent =
      currentLimitPrice > 0
        ? (Math.abs(desiredPrice - currentLimitPrice) / currentLimitPrice) * 100
        : 100;

    if (deltaPercent < config.strategy.repriceThresholdPercent) {
      return { success: false, reason: "Reprice threshold not met" };
    }

    try {
      if (config.botMode !== "paper") {
        await apiClient.editOrderPrice({
          client_order_id: position.pendingSellClientOrderId,
          price_per_unit: desiredPrice,
        });
      }

      position.pendingSellPrice = desiredPrice;
      this.lastRepriceAt.set(market, now);
      const order = this.openOrders.get(position.pendingSellOrderId);
      if (order) {
        order.pricePerUnit = desiredPrice;
      }
      await db.updateOrderStatus(position.pendingSellOrderId, "open", {
        targetPrice: desiredPrice,
        repricedAt: new Date().toISOString(),
      });
      await db.insertLog("info", "Pending sell order repriced", {
        market,
        desiredPrice,
        currentPrice,
      });
      return { success: true, price: desiredPrice };
    } catch (error) {
      await db.insertLog("error", "Failed to reprice sell order", {
        market,
        error: error.message,
      });
      return { success: false, reason: error.message };
    }
  }

  async cancelOrder(orderId) {
    const order = this.openOrders.get(orderId);
    if (!order) {
      return { success: false, reason: "Order not found" };
    }

    try {
      if (config.botMode !== "paper") {
        await apiClient.cancelOrder({
          client_order_id: order.clientOrderId,
        });
      }

      this.openOrders.delete(orderId);
      await db.updateOrderStatus(orderId, "cancelled");
      await db.insertLog("info", "Order cancelled", { orderId });
      return { success: true };
    } catch (error) {
      await db.insertLog("error", "Order cancellation failed", {
        orderId,
        error: error.message,
      });
      return { success: false, reason: error.message };
    }
  }

  async finalizeExit({ position, exitPrice, reason, execution = {}, status = "filled" }) {
    const realizedPnl = Number(
      ((Number(exitPrice) - Number(position.entryPrice)) * Number(position.quantity)).toFixed(6)
    );

    this.pnl += realizedPnl;
    await this.riskManager.registerRealizedPnl(realizedPnl);

    if (position.pendingSellOrderId) {
      await db.updateOrderStatus(position.pendingSellOrderId, status, {
        execution,
        exitReason: reason,
      });
      this.openOrders.delete(position.pendingSellOrderId);
    }

    await db.closeOpenTrade(position.market, {
      exitPrice,
      realizedPnl,
      metadata: { closeExecution: execution, exitReason: reason },
    });

    await db.storeTrade({
      market: position.market,
      side: "sell",
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      realizedPnl,
      mode: config.botMode,
      orderRef: position.pendingSellOrderId,
      strategyName: position.strategyName,
      status,
      metadata: { execution, exitReason: reason },
    });

    this.openPositions.delete(position.market);
    this.lastRepriceAt.delete(position.market);

    this.eventBus.emit("order:executed", {
      market: position.market,
      side: "sell",
      price: exitPrice,
      quantity: position.quantity,
      strategyName: position.strategyName,
      reason,
    });

    return { success: true, realizedPnl };
  }

  async triggerStopLoss({ market, currentPrice }) {
    const position = this.openPositions.get(market);
    if (!position) {
      return { success: false, reason: "Position not found" };
    }

    if (position.pendingSellOrderId) {
      await this.cancelOrder(position.pendingSellOrderId).catch(() => null);
      position.pendingSellOrderId = null;
      position.pendingSellClientOrderId = null;
      position.pendingSellPrice = null;
    }

    let execution = {
      id: `paper-stop-${market}-${Date.now()}`,
      avg_price: currentPrice,
      status: "filled",
    };

    if (config.botMode !== "paper") {
      execution = await apiClient.createOrder({
        side: "sell",
        order_type: "market_order",
        market,
        total_quantity: position.quantity,
        client_order_id: this.buildClientOrderId(market, "sell", "stop"),
      });
    }

    await db.insertLog("warn", "Stop loss triggered", {
      market,
      currentPrice,
      stopLossPrice: position.stopLossPrice,
    });

    return this.finalizeExit({
      position,
      exitPrice: Number(execution.avg_price || currentPrice),
      reason: "stop_loss",
      execution,
    });
  }

  async onPriceTick(tick) {
    const position = this.openPositions.get(tick.market);
    if (!position) return;

    position.highestSeenPrice = Math.max(Number(position.highestSeenPrice || 0), Number(tick.price));

    if (Number(tick.price) <= Number(position.stopLossPrice)) {
      await this.triggerStopLoss({ market: tick.market, currentPrice: tick.price });
      return;
    }

    if (!config.strategy.autoSellEnabled) {
      return;
    }

    if (!position.pendingSellOrderId) {
      await this.placeExitOrder({ market: tick.market, currentPrice: tick.price, forceCreate: true });
      return;
    }

    if (config.botMode === "paper" && Number(tick.price) >= Number(position.pendingSellPrice || 0)) {
      await this.finalizeExit({
        position,
        exitPrice: Number(position.pendingSellPrice),
        reason: "target_hit",
        execution: {
          id: `paper-fill-${position.pendingSellClientOrderId}`,
          avg_price: position.pendingSellPrice,
          status: "filled",
        },
      });
      return;
    }

    await this.repriceExitOrder({ market: tick.market, currentPrice: tick.price });
  }

  async reconcileLiveOrders() {
    if (config.botMode !== "live") return;

    for (const [market, position] of this.openPositions.entries()) {
      if (!position.pendingSellClientOrderId) continue;

      try {
        const response = await apiClient.getOrderStatus({
          client_order_id: position.pendingSellClientOrderId,
        });
        const [status] = Array.isArray(response) ? response : [];
        if (!status) continue;

        if (
          status.status === "filled"
          || Number(status.remaining_quantity || 0) === 0
        ) {
          await this.finalizeExit({
            position,
            exitPrice: Number(status.avg_price || status.price_per_unit || position.pendingSellPrice),
            reason: "target_hit",
            execution: status,
          });
        }
      } catch (error) {
        await db.insertLog("warn", "Live order reconciliation failed", {
          market,
          error: error.message,
        });
      }
    }
  }
}

module.exports = OrderManager;
