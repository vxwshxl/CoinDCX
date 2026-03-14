# CoinDCX Trading Bot Platform

Production-oriented self-hosted automated trading platform for CoinDCX with:

- Node.js + Express backend
- CoinDCX REST execution and WebSocket market ingestion
- PostgreSQL persistence
- Paper and live trading modes
- Browser dashboard built with Next.js, TailwindCSS, and shadcn-style UI components
- PM2 deployment on a VPS

## Architecture

- `backend/src/server.js`: Express API, dashboard WebSocket server, static frontend serving
- `backend/src/websocketClient.js`: CoinDCX market data ingestion from `wss://stream.coindcx.com`
- `backend/src/apiClient.js`: Signed REST requests for orders and account data
- `backend/src/strategyEngine.js`: Configurable dip-buy / profit-target scalping strategy
- `backend/src/orderManager.js`: Live and paper order execution, open position tracking
- `backend/src/riskManager.js`: Exposure, open-order, and daily-loss controls
- `backend/src/marketScanner.js`: Market ranking using ticker volume, spread, and volatility
- `database/schema.sql`: PostgreSQL schema for trades, orders, strategies, logs, and market data

## CoinDCX API References

This implementation was aligned to the official CoinDCX API docs:

- API reference: https://docs.coindcx.com/
- REST base URL: `https://api.coindcx.com`
- Spot order create: `POST /exchange/v1/orders/create`
- Spot cancel: `POST /exchange/v1/orders/cancel`
- Trade history: `POST /exchange/v1/orders/trade_history`
- Markets details: `GET /exchange/v1/markets_details`
- Ticker: `GET /exchange/ticker`
- Socket endpoint: `wss://stream.coindcx.com`
- Socket channel source: use `pair` from `markets_details`, then subscribe to `{pair}@trades`

CoinDCX’s current docs also state their socket client compatibility expectation explicitly: `socket.io-client` `2.4.0`.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- PM2 installed globally on the VPS: `npm install -g pm2`

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Create the database schema:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

3. Install backend dependencies:

```bash
cd backend
npm install
```

4. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

5. Build the frontend:

```bash
npm run build
```

6. Start the backend:

```bash
cd ../backend
npm start
```

7. Start the frontend:

```bash
cd ../frontend
npm start
```

The backend listens on `3001` and the Next.js dashboard listens on `3000` in the current PM2 configuration.

## PM2 Deployment

Start both backend and frontend under PM2:

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Available API Endpoints

- `GET /api/status`
- `POST /api/start-bot`
- `POST /api/stop-bot`
- `GET /api/prices`
- `GET /api/trades`
- `GET /api/strategies`
- `POST /api/strategies`
- `GET /api/markets`
- `POST /api/markets`
- `POST /api/settings`

## Notes On Live Trading

- Use `BOT_MODE=paper` first and validate behavior before switching to live.
- Never run live trading without IP-bound API keys and VPS-level firewalling.
- The current strategy uses fixed-size market buys followed by pending limit sells with automatic repricing and stop-loss exits.
- Exchange-specific quantity constraints are rounded using `step` and `target_currency_precision` from market metadata.
- Risk controls halt the bot when the configured limits are exceeded.

## Operational Recommendations

- Terminate TLS at Nginx or Caddy in front of the Express app.
- Restrict dashboard access behind VPN, reverse-proxy auth, or both.
- Run regular PostgreSQL backups.
- Add external alerts using Telegram or your preferred incident channel before enabling live mode.
- Add a systemd or PM2 health check workflow and VPS monitoring.
