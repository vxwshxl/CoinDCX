"use client";

import { AppShell } from "@/components/app-shell";
import { MarketScannerPanel } from "@/components/market-scanner-panel";
import { PageHeader } from "@/components/page-header";
import { useDashboardData } from "@/lib/use-dashboard-data";

export function MarketsView() {
  const { status, markets, connectionState, setStatus } = useDashboardData();

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Discovery"
        title="Market Selection"
        description="Rank and choose tradeable markets from CoinDCX scanning signals."
      />
      <MarketScannerPanel status={status} markets={markets} onUpdated={setStatus} />
    </AppShell>
  );
}
