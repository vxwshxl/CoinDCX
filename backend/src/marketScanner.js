const config = require("../config/config");
const apiClient = require("./apiClient");

class MarketScanner {
  normalizeMetadata(detail = {}) {
    return {
      ...detail,
      market: detail.symbol || detail.coindcx_name,
      pair: detail.pair,
      status: detail.status,
      baseCurrency: detail.base_currency_short_name,
      targetCurrency: detail.target_currency_short_name,
      step: Number(detail.step || 0),
      quantityPrecision:
        typeof detail.target_currency_precision === "number"
          ? detail.target_currency_precision
          : Number(detail.target_currency_precision || 8),
      minQuantity: Number(
        detail.min_quantity
        || detail.min_quantity_per_order
        || detail.min_trade_amount
        || 0
      ),
      minNotional: Number(
        detail.min_notional
        || detail.min_notional_value
        || detail.min_amount
        || 0
      ),
    };
  }

  evaluateCompatibility({ detail, price, tradeSize }) {
    if (!Number.isFinite(price) || price <= 0) {
      return {
        compatible: false,
        reason: "Missing price",
        totalQuantity: 0,
        notional: 0,
      };
    }

    const step = Number(detail.step || 0.00000001);
    const precision = Number.isFinite(detail.quantityPrecision) ? detail.quantityPrecision : 8;
    const rawQuantity = Number(tradeSize) / price;
    const adjustedQuantity = Math.floor(rawQuantity / step) * step;
    const totalQuantity = Number(adjustedQuantity.toFixed(precision));
    const notional = Number((totalQuantity * price).toFixed(8));

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      return {
        compatible: false,
        reason: "Trade size too small for market step size",
        totalQuantity: 0,
        notional: 0,
      };
    }

    if (detail.minQuantity > 0 && totalQuantity < detail.minQuantity) {
      return {
        compatible: false,
        reason: `Quantity below min (${detail.minQuantity})`,
        totalQuantity,
        notional,
      };
    }

    if (detail.minNotional > 0 && notional < detail.minNotional) {
      return {
        compatible: false,
        reason: `Notional below min (${detail.minNotional})`,
        totalQuantity,
        notional,
      };
    }

    return {
      compatible: true,
      reason: null,
      totalQuantity,
      notional,
    };
  }

  async scanTopMarkets(limit = 10, options = {}) {
    const quoteCurrency = String(
      options.quoteCurrency || config.strategy.autoMarketQuote || "INR"
    ).toUpperCase();
    const tradeSize = Number(options.tradeSize || config.strategy.tradeSize || 0);

    const [marketDetails, ticker] = await Promise.all([
      apiClient.getMarketDetails(),
      apiClient.getTicker(),
    ]);

    const detailMap = new Map(
      marketDetails
        .filter((item) => item.status === "active")
        .map((item) => {
          const normalized = this.normalizeMetadata(item);
          return [normalized.market, normalized];
        })
    );

    return ticker
      .map((item) => {
        const detail = detailMap.get(item.market);
        if (!detail) return null;
        if (quoteCurrency && detail.targetCurrency !== quoteCurrency) return null;

        const bid = Number(item.bid || 0);
        const ask = Number(item.ask || 0);
        const lastPrice = Number(item.last_price || 0);
        const spread = ask > 0 ? ((ask - bid) / ask) * 100 : 0;
        const volatility = Math.abs(Number(item.change_24_hour || 0));
        const volume = Number(item.volume || 0);
        const compatibility = this.evaluateCompatibility({
          detail,
          price: lastPrice || ask || bid,
          tradeSize,
        });

        return {
          market: item.market,
          pair: detail.pair,
          volume,
          spreadPercent: Number(spread.toFixed(4)),
          volatilityPercent: Number(volatility.toFixed(4)),
          lastPrice,
          bid,
          ask,
          baseCurrency: detail.baseCurrency,
          targetCurrency: detail.targetCurrency,
          compatible: compatibility.compatible,
          compatibilityReason: compatibility.reason,
          estimatedQuantity: compatibility.totalQuantity,
          estimatedNotional: compatibility.notional,
          score: volume * 0.5 + volatility * 100 - spread * 25,
        };
      })
      .filter(Boolean)
      .filter((item) => item.volume > 0 && item.spreadPercent > 0 && item.volatilityPercent > 0)
      .sort((a, b) => {
        if (a.compatible !== b.compatible) {
          return a.compatible ? -1 : 1;
        }
        return b.score - a.score;
      })
      .slice(0, limit);
  }
}

module.exports = MarketScanner;
