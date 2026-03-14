const io = require("socket.io-client");
const config = require("../config/config");
const db = require("./database");

class CoinDCXWebsocketClient {
  constructor({ eventBus, marketMetadata }) {
    this.eventBus = eventBus;
    this.marketMetadata = marketMetadata;
    this.socket = null;
  }

  connect() {
    this.socket = io(config.websocket.coinDcxUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on("connect", async () => {
      await db.insertLog("info", "Connected to CoinDCX websocket");

      for (const market of config.tradeMarkets) {
        const meta = this.marketMetadata.get(market);
        if (!meta || !meta.pair) continue;
        this.socket.emit("join", { channelName: `${meta.pair}@trades` });
      }
    });

    this.socket.on("new-trade", async (message) => {
      const payload = message && message.data ? message.data : message;
      const pair = payload.s;
      const meta = Array.from(this.marketMetadata.values()).find((item) => item.pair === pair);
      if (!meta) return;

      const tick = {
        market: meta.symbol || meta.coindcx_name,
        pair,
        price: Number(payload.p),
        quantity: Number(payload.q || 0),
        timestamp: Number(payload.T || Date.now()),
        marketMeta: meta,
        raw: payload,
      };

      this.eventBus.emit("market:tick", tick);

      try {
        await db.storeMarketData({
          market: tick.market,
          pair: tick.pair,
          price: tick.price,
          timestamp: tick.timestamp,
          raw: payload,
        });
      } catch (error) {
        await db.insertLog("warn", "Failed to store websocket market data", {
          error: error.message,
          market: tick.market,
        });
      }
    });

    this.socket.on("disconnect", async (reason) => {
      await db.insertLog("warn", "CoinDCX websocket disconnected", { reason });
    });

    this.socket.on("error", async (error) => {
      await db.insertLog("error", "CoinDCX websocket error", {
        error: error.message || String(error),
      });
    });
  }
}

module.exports = CoinDCXWebsocketClient;
