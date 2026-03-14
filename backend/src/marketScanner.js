const apiClient = require("./apiClient");

class MarketScanner {
  async scanTopMarkets(limit = 10) {
    const [marketDetails, ticker] = await Promise.all([
      apiClient.getMarketDetails(),
      apiClient.getTicker(),
    ]);

    const detailMap = new Map(
      marketDetails
        .filter((item) => item.status === "active")
        .map((item) => [item.symbol || item.coindcx_name, item])
    );

    return ticker
      .map((item) => {
        const detail = detailMap.get(item.market);
        if (!detail) return null;

        const bid = Number(item.bid || 0);
        const ask = Number(item.ask || 0);
        const spread = ask > 0 ? ((ask - bid) / ask) * 100 : 0;
        const volatility = Math.abs(Number(item.change_24_hour || 0));
        const volume = Number(item.volume || 0);

        return {
          market: item.market,
          pair: detail.pair,
          volume,
          spreadPercent: Number(spread.toFixed(4)),
          volatilityPercent: Number(volatility.toFixed(4)),
          lastPrice: Number(item.last_price || 0),
          bid,
          ask,
          baseCurrency: detail.base_currency_short_name,
          targetCurrency: detail.target_currency_short_name,
          score: volume * 0.5 + volatility * 100 - spread * 25,
        };
      })
      .filter(Boolean)
      .filter((item) => item.volume > 0 && item.spreadPercent > 0 && item.volatilityPercent > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

module.exports = MarketScanner;
