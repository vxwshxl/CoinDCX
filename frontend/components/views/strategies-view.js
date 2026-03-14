"use client";

import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StrategyPanel } from "@/components/strategy-panel";
import { useDashboardData } from "@/lib/use-dashboard-data";

export function StrategiesView() {
  const { activeStrategy, status, connectionState, refreshStrategies } = useDashboardData();
  const tradeSize = Number(activeStrategy?.trade_size ?? 300);
  const maxOpenOrders = Number(status?.risk?.maxOpenOrders ?? 1);
  const recommendedMinimum = Math.ceil(tradeSize * Math.max(maxOpenOrders, 1) * 1.25);

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Strategy"
        title="Signal Controls"
        description="Tune the dip-buy and take-profit parameters without redeploying the bot."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Trade Size Per Entry"
          value={`Rs ${tradeSize.toFixed(0)}`}
          detail="This is the INR amount used for each new buy, not the full wallet."
        />
        <MetricCard
          label="Recommended Minimum Wallet"
          value={`Rs ${recommendedMinimum}`}
          detail="Rough estimate: trade size x max open orders plus a small fee and slippage buffer."
        />
        <MetricCard
          label="Current Max Open Orders"
          value={maxOpenOrders}
          detail="Higher open-order limits require more wallet balance for the bot to operate comfortably."
        />
      </section>
      <StrategyPanel strategy={activeStrategy} status={status} onUpdated={refreshStrategies} />
    </AppShell>
  );
}
