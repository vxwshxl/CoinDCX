const axios = require("axios");
const crypto = require("crypto");
const config = require("../config/config");

class CoinDCXApiClient {
  constructor() {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.publicClient = axios.create({
      baseURL: config.coinDcx.apiBaseUrl,
      timeout: 15000,
    });
  }

  buildSignedBody(body = {}) {
    const payload = {
      ...body,
      timestamp: Date.now(),
    };
    const jsonBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(jsonBody)
      .digest("hex");

    return { payload, jsonBody, signature };
  }

  async publicGet(url) {
    const response = await this.publicClient.get(url);
    return response.data;
  }

  async privatePost(path, body = {}) {
    if (!this.apiKey || !this.secretKey) {
      throw new Error("CoinDCX API credentials are not configured");
    }

    const { payload, signature } = this.buildSignedBody(body);
    const response = await this.publicClient.post(path, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-AUTH-APIKEY": this.apiKey,
        "X-AUTH-SIGNATURE": signature,
      },
    });

    return response.data;
  }

  async getTicker() {
    return this.publicGet("/exchange/ticker");
  }

  async getMarkets() {
    return this.publicGet("/exchange/v1/markets");
  }

  async getMarketDetails() {
    return this.publicGet("/exchange/v1/markets_details");
  }

  async getBalances() {
    return this.privatePost("/exchange/v1/users/balances", {});
  }

  async createOrder(order) {
    return this.privatePost("/exchange/v1/orders/create", order);
  }

  async cancelOrder(order) {
    return this.privatePost("/exchange/v1/orders/cancel", order);
  }

  async getActiveOrdersCount(params) {
    return this.privatePost("/exchange/v1/orders/active_orders_count", params);
  }

  async getTradeHistory(params = {}) {
    return this.privatePost("/exchange/v1/orders/trade_history", params);
  }

  async getActiveOrders(params = {}) {
    return this.privatePost("/exchange/v1/orders/active_orders", params);
  }

  async getOrderStatus(params = {}) {
    return this.privatePost("/exchange/v1/orders/status", params);
  }

  async editOrderPrice(params = {}) {
    return this.privatePost("/exchange/v1/orders/edit", params);
  }
}

module.exports = new CoinDCXApiClient();
