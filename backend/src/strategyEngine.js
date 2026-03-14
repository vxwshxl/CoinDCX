const EventEmitter = require("events");
const config = require("../config/config");
const db = require("./database");

class StrategyEngine extends EventEmitter {
  constructor({ orderManager }) {
    super();
    this.orderManager = orderManager;
    this.enabled = config.strategy.enabled;
    this.state = new Map();
    this.parameters = {
      tradeSize: config.strategy.tradeSize,
      profitTargetPercent: config.strategy.profitTargetPercent,
      dipBuyPercent: config.strategy.dipBuyPercent,
      stopLossPercent: config.strategy.stopLossPercent,
      repriceIntervalMs: config.strategy.repriceIntervalMs,
      repriceThresholdPercent: config.strategy.repriceThresholdPercent,
      makerBufferPercent: config.strategy.makerBufferPercent,
      autoSellEnabled: config.strategy.autoSellEnabled,
    };
  }

  getConfig() {
    return {
      name: "scalping",
      enabled: this.enabled,
      markets: config.tradeMarkets,
      ...this.parameters,
    };
  }

  async initialize() {
    await db.upsertStrategy({
      name: "scalping",
      enabled: this.enabled,
      tradeSize: this.parameters.tradeSize,
      profitTargetPercent: this.parameters.profitTargetPercent,
      dipBuyPercent: this.parameters.dipBuyPercent,
      markets: config.tradeMarkets,
      metadata: {
        stopLossPercent: this.parameters.stopLossPercent,
        repriceIntervalMs: this.parameters.repriceIntervalMs,
        repriceThresholdPercent: this.parameters.repriceThresholdPercent,
        makerBufferPercent: this.parameters.makerBufferPercent,
        autoSellEnabled: this.parameters.autoSellEnabled,
      },
    });
  }

  async updateConfig(nextConfig) {
    if (typeof nextConfig.enabled === "boolean") {
      this.enabled = nextConfig.enabled;
    }
    if (Number.isFinite(Number(nextConfig.tradeSize))) {
      this.parameters.tradeSize = Number(nextConfig.tradeSize);
      config.strategy.tradeSize = this.parameters.tradeSize;
    }
    if (Number.isFinite(Number(nextConfig.profitTargetPercent))) {
      this.parameters.profitTargetPercent = Number(nextConfig.profitTargetPercent);
      config.strategy.profitTargetPercent = this.parameters.profitTargetPercent;
    }
    if (Number.isFinite(Number(nextConfig.dipBuyPercent))) {
      this.parameters.dipBuyPercent = Number(nextConfig.dipBuyPercent);
      config.strategy.dipBuyPercent = this.parameters.dipBuyPercent;
    }
    if (Number.isFinite(Number(nextConfig.stopLossPercent))) {
      this.parameters.stopLossPercent = Number(nextConfig.stopLossPercent);
      config.strategy.stopLossPercent = this.parameters.stopLossPercent;
    }
    if (Number.isFinite(Number(nextConfig.repriceIntervalMs))) {
      this.parameters.repriceIntervalMs = Math.max(
        Number(nextConfig.repriceIntervalMs),
        config.strategy.minRepriceIntervalMs
      );
      config.strategy.repriceIntervalMs = this.parameters.repriceIntervalMs;
    }
    if (Number.isFinite(Number(nextConfig.repriceThresholdPercent))) {
      this.parameters.repriceThresholdPercent = Number(nextConfig.repriceThresholdPercent);
      config.strategy.repriceThresholdPercent = this.parameters.repriceThresholdPercent;
    }
    if (Number.isFinite(Number(nextConfig.makerBufferPercent))) {
      this.parameters.makerBufferPercent = Number(nextConfig.makerBufferPercent);
      config.strategy.makerBufferPercent = this.parameters.makerBufferPercent;
    }
    if (typeof nextConfig.autoSellEnabled === "boolean") {
      this.parameters.autoSellEnabled = nextConfig.autoSellEnabled;
      config.strategy.autoSellEnabled = this.parameters.autoSellEnabled;
    }

    const saved = await db.upsertStrategy({
      name: "scalping",
      enabled: this.enabled,
      tradeSize: this.parameters.tradeSize,
      profitTargetPercent: this.parameters.profitTargetPercent,
      dipBuyPercent: this.parameters.dipBuyPercent,
      markets: config.tradeMarkets,
      metadata: {
        stopLossPercent: this.parameters.stopLossPercent,
        repriceIntervalMs: this.parameters.repriceIntervalMs,
        repriceThresholdPercent: this.parameters.repriceThresholdPercent,
        makerBufferPercent: this.parameters.makerBufferPercent,
        autoSellEnabled: this.parameters.autoSellEnabled,
      },
    });

    return saved;
  }

  resetMarketState() {
    this.state.clear();
  }

  async onPriceTick(tick) {
    if (!this.enabled) return;
    if (!config.tradeMarkets.includes(tick.market)) return;

    const existingState = this.state.get(tick.market) || {
      referencePrice: tick.price,
      lastPrice: tick.price,
      pair: tick.pair,
      marketMeta: tick.marketMeta,
    };

    const position = this.orderManager.openPositions.get(tick.market);
    existingState.lastPrice = tick.price;
    existingState.pair = tick.pair;
    existingState.marketMeta = tick.marketMeta;

    if (!position) {
      const buyTriggerPrice =
        existingState.referencePrice *
        (1 - this.parameters.dipBuyPercent / 100);

      if (tick.price <= buyTriggerPrice) {
        await db.insertLog("info", "Strategy buy signal", {
          market: tick.market,
          price: tick.price,
          buyTriggerPrice,
        });

        const order = await this.orderManager.executeEntrySignal({
          market: tick.market,
          price: tick.price,
          strategyName: "scalping",
          marketMeta: tick.marketMeta,
        });

        if (order.success) {
          existingState.referencePrice = tick.price;
          this.emit("signal", { market: tick.market, side: "buy", price: tick.price });
        }
      } else if (tick.price > existingState.referencePrice) {
        existingState.referencePrice = tick.price;
      }
    }

    this.state.set(tick.market, existingState);
  }
}

module.exports = StrategyEngine;
