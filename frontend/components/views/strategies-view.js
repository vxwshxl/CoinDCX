"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StrategyPanel } from "@/components/strategy-panel";
import { useDashboardData } from "@/lib/use-dashboard-data";

export function StrategiesView() {
  const { activeStrategy, connectionState, refreshStrategies } = useDashboardData();

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Strategy"
        title="Signal Controls"
        description="Tune the dip-buy and take-profit parameters without redeploying the bot."
      />
      <StrategyPanel strategy={activeStrategy} onUpdated={refreshStrategies} />
    </AppShell>
  );
}
