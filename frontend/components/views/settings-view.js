"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";
import { MetricCard } from "@/components/metric-card";
import { useDashboardData } from "@/lib/use-dashboard-data";

export function SettingsView() {
  const { status, connectionState, setStatus } = useDashboardData();
  const risk = status?.risk || {};

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Runtime"
        title="Operational Settings"
        description="Manage execution mode, sizing limits, and lifecycle actions for the trading engine."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Max Position Size" value={risk.maxPositionSize || "-"} />
        <MetricCard label="Max Open Orders" value={risk.maxOpenOrders || "-"} />
        <MetricCard
          label="Daily Loss Limit"
          value={risk.dailyLossLimit || "-"}
          tone={risk.halted ? "negative" : "neutral"}
          detail={risk.halted ? `Halted: ${risk.haltReason}` : "Risk engine ready"}
        />
      </section>
      <SettingsPanel status={status} onUpdated={setStatus} />
    </AppShell>
  );
}
