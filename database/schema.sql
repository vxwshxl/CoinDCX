CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  external_order_id TEXT,
  client_order_id TEXT,
  market TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  status TEXT NOT NULL,
  price_per_unit NUMERIC(24, 10) NOT NULL,
  total_quantity NUMERIC(24, 10) NOT NULL,
  mode TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
  id BIGSERIAL PRIMARY KEY,
  market TEXT NOT NULL,
  side TEXT NOT NULL,
  entry_price NUMERIC(24, 10) NOT NULL,
  exit_price NUMERIC(24, 10),
  quantity NUMERIC(24, 10) NOT NULL,
  realized_pnl NUMERIC(24, 10) NOT NULL DEFAULT 0,
  mode TEXT NOT NULL,
  order_ref BIGINT REFERENCES orders(id),
  strategy_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'filled',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  trade_size NUMERIC(24, 10) NOT NULL,
  profit_target_percent NUMERIC(10, 4) NOT NULL,
  dip_buy_percent NUMERIC(10, 4) NOT NULL,
  markets TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  bot_mode TEXT NOT NULL DEFAULT 'paper',
  max_position_size NUMERIC(24, 10) NOT NULL,
  max_open_orders INTEGER NOT NULL,
  daily_loss_limit NUMERIC(24, 10) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT runtime_settings_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS bot_logs (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_data (
  id BIGSERIAL PRIMARY KEY,
  market TEXT NOT NULL,
  pair TEXT,
  price NUMERIC(24, 10) NOT NULL,
  bid NUMERIC(24, 10),
  ask NUMERIC(24, 10),
  volume NUMERIC(24, 10),
  change_24_hour NUMERIC(24, 10),
  source_timestamp TIMESTAMPTZ NOT NULL,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_market_created_at ON trades (market, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_market_status ON orders (market, status);
CREATE INDEX IF NOT EXISTS idx_market_data_market_source_timestamp ON market_data (market, source_timestamp DESC);
