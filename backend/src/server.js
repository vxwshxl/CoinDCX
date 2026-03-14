const EventEmitter = require("events");
const express = require("express");
const { WebSocketServer } = require("ws");
const config = require("../config/config");
const db = require("./database");
const apiClient = require("./apiClient");
const RiskManager = require("./riskManager");
const OrderManager = require("./orderManager");
const StrategyEngine = require("./strategyEngine");
const MarketScanner = require("./marketScanner");
const CoinDCXWebsocketClient = require("./websocketClient");
const botRoutes = require("../routes/botRoutes");
const tradeRoutes = require("../routes/tradeRoutes");
const strategyRoutes = require("../routes/strategyRoutes");
const marketRoutes = require("../routes/marketRoutes");

class BotController {
  constructor() {
    this.app = express();
    this.eventBus = new EventEmitter();
    this.marketScanner = new MarketScanner();
    this.riskManager = new RiskManager();
    this.orderManager = new OrderManager({
      riskManager: this.riskManager,
      eventBus: this.eventBus,
    });
    this.strategyEngine = new StrategyEngine({
      orderManager: this.orderManager,
    });
    this.marketMetadata = new Map();
    this.latestPrices = new Map();
    this.botRunning = false;
    this.coinDcxSocket = null;
    this.wss = null;
    this.reconcileTimer = null;
    this.marketSelectionTimer = null;
  }

  async initialize() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      next();
    });

    const dbReady = await db.initDatabase().catch(async (error) => {
      console.error("Database init failed:", error.message);
      return false;
    });

    if (dbReady) {
      await this.riskManager.initializeFromDatabase();
      await this.strategyEngine.initialize();
    }

    await this.loadMarketMetadata();
    this.bindEvents();
    this.registerRoutes();
  }

  bindEvents() {
    this.eventBus.on("market:tick", async (tick) => {
      this.latestPrices.set(tick.market, {
        market: tick.market,
        pair: tick.pair,
        price: tick.price,
        timestamp: tick.timestamp,
      });

      this.broadcast({
        type: "price",
        payload: {
          market: tick.market,
          pair: tick.pair,
          price: tick.price,
          timestamp: tick.timestamp,
        },
      });

      await this.orderManager.onPriceTick(tick);
      await this.strategyEngine.onPriceTick(tick);
    });

    this.eventBus.on("order:executed", async (execution) => {
      this.broadcast({
        type: "order",
        payload: execution,
      });
    });

    this.eventBus.on("order:pending", async (execution) => {
      this.broadcast({
        type: "pending-order",
        payload: execution,
      });
    });
  }

  registerRoutes() {
    this.app.use("/api", botRoutes({ botController: this }));
    this.app.use("/api", tradeRoutes({ botController: this }));
    this.app.use("/api", strategyRoutes({ botController: this }));
    this.app.use("/api", marketRoutes({ botController: this }));

    this.app.use((error, _req, res, _next) => {
      const status = error.statusCode || 500;
      res.status(status).json({
        error: error.message || "Internal server error",
      });
    });
  }

  attachWebsocketServer(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws) => {
      ws.send(
        JSON.stringify({
          type: "snapshot",
          payload: {
            status: this.composeStatus(),
            prices: Array.from(this.latestPrices.values()),
            orderState: this.orderManager.getSnapshot(),
          },
        })
      );
    });

    setInterval(() => {
      this.broadcast({
        type: "heartbeat",
        payload: {
          timestamp: Date.now(),
          running: this.botRunning,
        },
      });
    }, config.websocket.frontendHeartbeatMs);
  }

  broadcast(message) {
    if (!this.wss) return;
    const encoded = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        client.send(encoded);
      }
    }
  }

  async loadMarketMetadata() {
    try {
      const marketDetails = await apiClient.getMarketDetails();
      for (const detail of marketDetails) {
        this.marketMetadata.set(detail.symbol || detail.coindcx_name, detail);
      }
      await db.insertLog("info", "Market metadata loaded", {
        count: this.marketMetadata.size,
      }).catch(() => {});
    } catch (error) {
      console.error("Failed to load market metadata:", error.message);
    }
  }

  composeStatus() {
    return {
      running: this.botRunning,
      mode: config.botMode,
      tradeMarkets: config.tradeMarkets,
      risk: this.riskManager.getStatus(),
      strategy: this.strategyEngine.getConfig(),
      orders: this.orderManager.getSnapshot(),
      automation: {
        autoMarketSelection: config.strategy.autoMarketSelection,
        autoMarketSelectionCount: config.strategy.autoMarketSelectionCount,
        autoMarketRefreshMs: config.strategy.autoMarketRefreshMs,
      },
    };
  }

  async applyAutoMarketSelection() {
    if (!config.strategy.autoMarketSelection) {
      return this.getStatus();
    }

    const scanned = await this.marketScanner.scanTopMarkets(
      config.strategy.autoMarketSelectionCount
    );
    const selectedMarkets = scanned.map((item) => item.market).filter(Boolean);
    if (selectedMarkets.length === 0) {
      return this.getStatus();
    }

    const hasChanged =
      selectedMarkets.length !== config.tradeMarkets.length
      || selectedMarkets.some((market, index) => config.tradeMarkets[index] !== market);

    if (!hasChanged) {
      return this.getStatus();
    }

    config.tradeMarkets.length = 0;
    config.tradeMarkets.push(...selectedMarkets);
    this.strategyEngine.resetMarketState();

    await db.insertLog("info", "Auto market selection updated active markets", {
      tradeMarkets: config.tradeMarkets,
    }).catch(() => {});

    if (this.botRunning) {
      await this.stopBot();
      await this.loadMarketMetadata();
      await this.startBot();
    }

    return this.getStatus();
  }

  async getStatus() {
    const metrics = await db.getDashboardMetrics().catch(() => ({
      summary: { total_trades: 0, net_pnl: 0, daily_pnl: 0 },
      openPositions: [],
    }));

    return {
      ...this.composeStatus(),
      metrics,
    };
  }

  async startBot() {
    if (this.botRunning) {
      return this.getStatus();
    }

    if (config.strategy.autoMarketSelection) {
      await this.applyAutoMarketSelection().catch((error) => {
        console.error("Auto market selection failed:", error.message);
      });
    }

    this.coinDcxSocket = new CoinDCXWebsocketClient({
      eventBus: this.eventBus,
      marketMetadata: this.marketMetadata,
    });
    this.coinDcxSocket.connect();
    if (config.strategy.autoMarketSelection) {
      this.marketSelectionTimer = setInterval(() => {
        this.applyAutoMarketSelection().catch((error) => {
          console.error("Auto market selection failed:", error.message);
        });
      }, Math.max(config.strategy.autoMarketRefreshMs, 30000));
    }
    this.reconcileTimer = setInterval(() => {
      this.orderManager.reconcileLiveOrders().catch((error) => {
        console.error("Order reconciliation failed:", error.message);
      });
    }, Math.max(config.strategy.repriceIntervalMs, 3000));
    this.botRunning = true;
    await db.insertLog("info", "Bot started", { mode: config.botMode }).catch(() => {});
    return this.getStatus();
  }

  async stopBot() {
    if (this.coinDcxSocket && this.coinDcxSocket.socket) {
      this.coinDcxSocket.socket.close();
    }
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
    if (this.marketSelectionTimer) {
      clearInterval(this.marketSelectionTimer);
      this.marketSelectionTimer = null;
    }
    this.botRunning = false;
    await db.insertLog("warn", "Bot stopped by operator").catch(() => {});
    return this.getStatus();
  }

  async getPrices() {
    if (this.latestPrices.size > 0) {
      return Array.from(this.latestPrices.values());
    }

    const ticker = await apiClient.getTicker();
    return ticker
      .filter((item) => config.tradeMarkets.includes(item.market))
      .map((item) => ({
        market: item.market,
        price: Number(item.last_price),
        bid: Number(item.bid),
        ask: Number(item.ask),
        volume: Number(item.volume),
        change24Hour: Number(item.change_24_hour),
        timestamp: Number(item.timestamp),
      }));
  }

  async getTrades() {
    return db.getLatestTrades(100);
  }

  async getLogs() {
    return db.getLatestLogs(80);
  }

  async cancelOrder(orderId) {
    return this.orderManager.cancelOrder(orderId);
  }

  async getStrategies() {
    return db.getStrategies();
  }

  async updateStrategy(body) {
    const strategy = await this.strategyEngine.updateConfig(body);
    this.broadcast({
      type: "strategy",
      payload: strategy,
    });
    return strategy;
  }

  async updateSettings(body) {
    let requiresRestart = false;

    if (body.mode === "paper" || body.mode === "live") {
      config.botMode = body.mode;
    }

    if (Number.isFinite(Number(body.tradeSize))) {
      config.strategy.tradeSize = Number(body.tradeSize);
      await this.strategyEngine.updateConfig({ tradeSize: config.strategy.tradeSize });
    }
    if (typeof body.autoMarketSelection === "boolean") {
      config.strategy.autoMarketSelection = body.autoMarketSelection;
      requiresRestart = true;
    }
    if (Number.isFinite(Number(body.autoMarketSelectionCount))) {
      config.strategy.autoMarketSelectionCount = Number(body.autoMarketSelectionCount);
      requiresRestart = true;
    }
    if (Number.isFinite(Number(body.autoMarketRefreshMs))) {
      config.strategy.autoMarketRefreshMs = Number(body.autoMarketRefreshMs);
      requiresRestart = true;
    }

    if (Array.isArray(body.tradeMarkets) && body.tradeMarkets.length > 0) {
      config.tradeMarkets.length = 0;
      config.tradeMarkets.push(...body.tradeMarkets.filter(Boolean));
      this.strategyEngine.resetMarketState();
      requiresRestart = true;
    }

    if (this.botRunning && requiresRestart) {
      await this.stopBot();
      await this.loadMarketMetadata();
      await this.startBot();
    }

    await db.insertLog("info", "Runtime settings updated", {
      mode: config.botMode,
      tradeSize: config.strategy.tradeSize,
      tradeMarkets: config.tradeMarkets,
      autoMarketSelection: config.strategy.autoMarketSelection,
      autoMarketSelectionCount: config.strategy.autoMarketSelectionCount,
    }).catch(() => {});

    return this.getStatus();
  }

  async getMarkets() {
    return this.marketScanner.scanTopMarkets(10);
  }

  async updateMarkets(body) {
    if (!Array.isArray(body.tradeMarkets) || body.tradeMarkets.length === 0) {
      const error = new Error("tradeMarkets must be a non-empty array");
      error.statusCode = 400;
      throw error;
    }

    return this.updateSettings({ tradeMarkets: body.tradeMarkets });
  }
}

async function bootstrap() {
  const controller = new BotController();
  await controller.initialize();

  const server = controller.app.listen(config.port, () => {
    console.log(`Backend listening on port ${config.port}`);
  });

  controller.attachWebsocketServer(server);
}

bootstrap().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
