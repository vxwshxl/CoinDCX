const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: process.env.ENV_FILE || path.resolve(__dirname, "../../.env"),
});

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const MIN_REPRICE_INTERVAL_MS = 1000;

const tradeMarkets = (process.env.TRADE_MARKETS || "BTCINR,ETHINR")
  .split(",")
  .map((market) => market.trim())
  .filter(Boolean);

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseNumber(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || "",
  apiKey: process.env.COINDCX_API_KEY || "",
  secretKey: process.env.COINDCX_SECRET_KEY || "",
  botMode: process.env.BOT_MODE === "live" ? "live" : "paper",
  tradeMarkets,
  strategy: {
    enabled: parseBoolean(process.env.STRATEGY_ENABLED, true),
    tradeSize: parseNumber(process.env.TRADE_SIZE, 300),
    profitTargetPercent: parseNumber(process.env.PROFIT_TARGET_PERCENT, 0.5),
    dipBuyPercent: parseNumber(process.env.DIP_BUY_PERCENT, 0.3),
    stopLossPercent: parseNumber(process.env.STOP_LOSS_PERCENT, 1),
    repriceIntervalMs: Math.max(
      parseNumber(process.env.REPRICE_INTERVAL_MS, 3000),
      MIN_REPRICE_INTERVAL_MS
    ),
    repriceThresholdPercent: parseNumber(process.env.REPRICE_THRESHOLD_PERCENT, 0.15),
    makerBufferPercent: parseNumber(process.env.MAKER_BUFFER_PERCENT, 0.05),
    autoSellEnabled: parseBoolean(process.env.AUTO_SELL_ENABLED, true),
    autoMarketSelection: parseBoolean(process.env.AUTO_MARKET_SELECTION, false),
    autoMarketSelectionCount: parseNumber(process.env.AUTO_MARKET_SELECTION_COUNT, 8),
    autoMarketRefreshMs: parseNumber(process.env.AUTO_MARKET_REFRESH_MS, 120000),
    minRepriceIntervalMs: MIN_REPRICE_INTERVAL_MS,
  },
  risk: {
    maxPositionSize: parseNumber(process.env.MAX_POSITION_SIZE, 2000),
    maxOpenOrders: parseNumber(process.env.MAX_OPEN_ORDERS, 5),
    dailyLossLimit: parseNumber(process.env.DAILY_LOSS_LIMIT, 500),
  },
  websocket: {
    coinDcxUrl: process.env.COINDCX_WS_URL || "wss://stream.coindcx.com",
    frontendHeartbeatMs: parseNumber(process.env.FRONTEND_WS_HEARTBEAT_MS, 15000),
  },
  coinDcx: {
    apiBaseUrl: process.env.COINDCX_API_BASE_URL || "https://api.coindcx.com",
    publicBaseUrl: process.env.COINDCX_PUBLIC_BASE_URL || "https://public.coindcx.com",
  },
  integrations: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    redisUrl: process.env.REDIS_URL || "",
  },
  frontend: {
    distPath: path.resolve(__dirname, "../../frontend/dist"),
  },
};
