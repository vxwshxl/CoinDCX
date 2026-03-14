const config = require("../config/config");
const db = require("./database");
const { sendTelegramAlert } = require("./notifier");

class RiskManager {
  constructor() {
    this.halted = false;
    this.haltReason = null;
    this.dailyRealizedLoss = 0;
  }

  async initializeFromDatabase() {
    try {
      const metrics = await db.getDashboardMetrics();
      this.dailyRealizedLoss = Number(metrics.summary.daily_pnl || 0);
    } catch (error) {
      await db.insertLog("warn", "Failed to initialize risk metrics from database", {
        error: error.message,
      });
    }
  }

  getStatus() {
    return {
      halted: this.halted,
      haltReason: this.haltReason,
      dailyRealizedLoss: this.dailyRealizedLoss,
      maxPositionSize: config.risk.maxPositionSize,
      maxOpenOrders: config.risk.maxOpenOrders,
      dailyLossLimit: config.risk.dailyLossLimit,
    };
  }

  async haltTrading(reason, details = {}) {
    this.halted = true;
    this.haltReason = reason;
    await db.insertLog("error", `Trading halted: ${reason}`, details);
    await sendTelegramAlert(
      `CoinDCX bot halted\nReason: ${reason}\nDetails: ${JSON.stringify(details)}`
    ).catch(async (error) => {
      await db.insertLog("warn", "Telegram alert failed", {
        error: error.message,
        reason,
      });
    });
  }

  async resumeTrading() {
    this.halted = false;
    this.haltReason = null;
    await db.insertLog("info", "Trading resumed by operator");
  }

  async check({ openOrdersCount, proposedOrderValue, currentExposure }) {
    if (this.halted) {
      return {
        allowed: false,
        reason: this.haltReason || "Trading halted",
      };
    }

    if (openOrdersCount >= config.risk.maxOpenOrders) {
      await this.haltTrading("Maximum open orders reached", { openOrdersCount });
      return { allowed: false, reason: "Maximum open orders reached" };
    }

    if (currentExposure + proposedOrderValue > config.risk.maxPositionSize) {
      await this.haltTrading("Maximum position size exceeded", {
        currentExposure,
        proposedOrderValue,
      });
      return { allowed: false, reason: "Maximum position size exceeded" };
    }

    if (Math.abs(Math.min(this.dailyRealizedLoss, 0)) >= config.risk.dailyLossLimit) {
      await this.haltTrading("Daily loss limit reached", {
        dailyRealizedLoss: this.dailyRealizedLoss,
      });
      return { allowed: false, reason: "Daily loss limit reached" };
    }

    return { allowed: true };
  }

  async registerRealizedPnl(pnl) {
    this.dailyRealizedLoss += Number(pnl || 0);

    if (Math.abs(Math.min(this.dailyRealizedLoss, 0)) >= config.risk.dailyLossLimit) {
      await this.haltTrading("Daily loss limit reached", {
        dailyRealizedLoss: this.dailyRealizedLoss,
      });
    }
  }
}

module.exports = RiskManager;
