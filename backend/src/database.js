const { Pool } = require("pg");
const config = require("../config/config");

const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl:
        config.env === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;

async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  return pool.query(text, params);
}

async function initDatabase() {
  if (!pool) {
    return false;
  }

  await query("SELECT 1");
  await query(
    `CREATE TABLE IF NOT EXISTS runtime_settings (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      bot_mode TEXT NOT NULL DEFAULT 'paper',
      max_position_size NUMERIC(24, 10) NOT NULL,
      max_open_orders INTEGER NOT NULL,
      daily_loss_limit NUMERIC(24, 10) NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT runtime_settings_singleton CHECK (id = 1)
    )`
  );
  return true;
}

async function insertLog(level, message, metadata = {}) {
  if (!pool) return;

  await query(
    `INSERT INTO bot_logs (level, message, metadata)
     VALUES ($1, $2, $3::jsonb)`,
    [level, message, JSON.stringify(metadata)]
  );
}

async function getLatestTrades(limit = 50) {
  const result = await query(
    `SELECT *
     FROM trades
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

async function getLatestLogs(limit = 80) {
  const result = await query(
    `SELECT *
     FROM bot_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

async function getStrategies() {
  const result = await query(
    `SELECT *
     FROM strategies
     ORDER BY updated_at DESC, id DESC`
  );

  return result.rows;
}

async function upsertStrategy(strategy) {
  const result = await query(
    `INSERT INTO strategies
      (name, enabled, trade_size, profit_target_percent, dip_buy_percent, markets, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::text[], $7::jsonb)
     ON CONFLICT (name)
     DO UPDATE SET
       enabled = EXCLUDED.enabled,
       trade_size = EXCLUDED.trade_size,
       profit_target_percent = EXCLUDED.profit_target_percent,
       dip_buy_percent = EXCLUDED.dip_buy_percent,
       markets = EXCLUDED.markets,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      strategy.name,
      strategy.enabled,
      strategy.tradeSize,
      strategy.profitTargetPercent,
      strategy.dipBuyPercent,
      strategy.markets,
      JSON.stringify(strategy.metadata || {}),
    ]
  );

  return result.rows[0];
}

async function getRuntimeSettings() {
  const result = await query(
    `SELECT *
     FROM runtime_settings
     WHERE id = 1`
  );

  return result.rows[0] || null;
}

async function upsertRuntimeSettings(settings) {
  const result = await query(
    `INSERT INTO runtime_settings
      (id, bot_mode, max_position_size, max_open_orders, daily_loss_limit, metadata)
     VALUES (1, $1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (id)
     DO UPDATE SET
       bot_mode = EXCLUDED.bot_mode,
       max_position_size = EXCLUDED.max_position_size,
       max_open_orders = EXCLUDED.max_open_orders,
       daily_loss_limit = EXCLUDED.daily_loss_limit,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      settings.botMode,
      settings.maxPositionSize,
      settings.maxOpenOrders,
      settings.dailyLossLimit,
      JSON.stringify(settings.metadata || {}),
    ]
  );

  return result.rows[0];
}

async function storeMarketData(point) {
  if (!pool) return;

  await query(
    `INSERT INTO market_data
      (market, pair, price, bid, ask, volume, change_24_hour, source_timestamp, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TO_TIMESTAMP($8 / 1000.0), $9::jsonb)`,
    [
      point.market,
      point.pair || null,
      point.price,
      point.bid ?? null,
      point.ask ?? null,
      point.volume ?? null,
      point.change24Hour ?? null,
      point.timestamp || Date.now(),
      JSON.stringify(point.raw || {}),
    ]
  );
}

async function storeOrder(order) {
  const result = await query(
    `INSERT INTO orders
      (external_order_id, client_order_id, market, side, order_type, status, price_per_unit, total_quantity, mode, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING *`,
    [
      order.externalOrderId || null,
      order.clientOrderId || null,
      order.market,
      order.side,
      order.orderType,
      order.status,
      order.pricePerUnit,
      order.totalQuantity,
      order.mode,
      JSON.stringify(order.metadata || {}),
    ]
  );

  return result.rows[0];
}

async function updateOrderStatus(orderId, status, metadata = {}) {
  const result = await query(
    `UPDATE orders
     SET status = $2,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [orderId, status, JSON.stringify(metadata)]
  );

  return result.rows[0];
}

async function storeTrade(trade) {
  const result = await query(
    `INSERT INTO trades
      (market, side, entry_price, exit_price, quantity, realized_pnl, mode, order_ref, strategy_name, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     RETURNING *`,
    [
      trade.market,
      trade.side,
      trade.entryPrice,
      trade.exitPrice,
      trade.quantity,
      trade.realizedPnl ?? 0,
      trade.mode,
      trade.orderRef || null,
      trade.strategyName,
      trade.status || "filled",
      JSON.stringify(trade.metadata || {}),
    ]
  );

  return result.rows[0];
}

async function closeOpenTrade(market, updates) {
  const result = await query(
    `UPDATE trades
     SET exit_price = $2,
         realized_pnl = $3,
         status = 'closed',
         metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
     WHERE id = (
       SELECT id
       FROM trades
       WHERE market = $1 AND status = 'open'
       ORDER BY created_at DESC
       LIMIT 1
     )
     RETURNING *`,
    [
      market,
      updates.exitPrice,
      updates.realizedPnl,
      JSON.stringify(updates.metadata || {}),
    ]
  );

  return result.rows[0];
}

async function getDashboardMetrics() {
  const [tradeSummary, openPositions] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_trades,
         COALESCE(SUM(realized_pnl), 0)::numeric AS net_pnl,
         COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN realized_pnl ELSE 0 END), 0)::numeric AS daily_pnl
       FROM trades`
    ),
    query(
      `SELECT market, side, entry_price, quantity, metadata, created_at
       FROM trades
       WHERE status = 'open'
       ORDER BY created_at DESC`
    ),
  ]);

  return {
    summary: tradeSummary.rows[0],
    openPositions: openPositions.rows,
  };
}

module.exports = {
  initDatabase,
  insertLog,
  getLatestTrades,
  getLatestLogs,
  getStrategies,
  upsertStrategy,
  getRuntimeSettings,
  upsertRuntimeSettings,
  storeMarketData,
  storeOrder,
  updateOrderStatus,
  storeTrade,
  closeOpenTrade,
  getDashboardMetrics,
  query,
};
