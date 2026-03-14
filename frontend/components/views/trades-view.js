"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TradesTable } from "@/components/trades-table";
import { useDashboardData } from "@/lib/use-dashboard-data";

export function TradesView() {
  const { trades, connectionState } = useDashboardData();

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Execution"
        title="Trade Ledger"
        description="Audit live and paper fills, realized PnL, and order outcomes."
      />
      <TradesTable trades={trades} />
    </AppShell>
  );
}
