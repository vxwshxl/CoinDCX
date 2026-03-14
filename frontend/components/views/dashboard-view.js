"use client";

import { useState } from "react";
import { ActivityLogPanel } from "@/components/activity-log-panel";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PendingOrdersPanel } from "@/components/pending-orders-panel";
import { PageHeader } from "@/components/page-header";
import { PriceTickerPanel } from "@/components/price-ticker-panel";
import { useToast } from "@/components/providers/toast-provider";
import { TradesTable } from "@/components/trades-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDashboardData } from "@/lib/use-dashboard-data";
import { api } from "@/lib/api";

export function DashboardView() {
  const { status, prices, trades, logs, connectionState, setStatus, refreshStatus } = useDashboardData();
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const { pushToast } = useToast();
  const summary = status?.metrics?.summary || {};
  const openPositions = status?.orders?.openPositions || [];
  const pendingOrders = status?.orders?.openOrders || [];

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Operations"
        title="Command Deck"
        description="Monitor the bot, inspect portfolio exposure, and control the execution loop from a single surface."
        right={
          <div className="flex flex-wrap gap-2">
            <LoadingButton
              loading={starting}
              onClick={async () => {
                setStarting(true);
                try {
                  setStatus(await api.startBot());
                  pushToast({
                    title: "Bot started",
                    description: "Realtime execution has been enabled from the dashboard.",
                  });
                } catch (error) {
                  pushToast({
                    title: "Failed to start bot",
                    description: error.message,
                    variant: "error",
                  });
                } finally {
                  setStarting(false);
                }
              }}
            >
              Start
            </LoadingButton>
            <LoadingButton
              loading={stopping}
              variant="secondary"
              onClick={async () => {
                setStopping(true);
                try {
                  setStatus(await api.stopBot());
                  pushToast({
                    title: "Bot stopped",
                    description: "Realtime execution has been halted from the dashboard.",
                  });
                } catch (error) {
                  pushToast({
                    title: "Failed to stop bot",
                    description: error.message,
                    variant: "error",
                  });
                } finally {
                  setStopping(false);
                }
              }}
            >
              Stop
            </LoadingButton>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bot Mode" value={status?.mode || "paper"} detail="Runtime execution mode" />
        <MetricCard
          label="Daily PnL"
          value={Number(summary.daily_pnl || 0).toFixed(2)}
          tone={Number(summary.daily_pnl || 0) >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          label="Net PnL"
          value={Number(summary.net_pnl || 0).toFixed(2)}
          tone={Number(summary.net_pnl || 0) >= 0 ? "positive" : "negative"}
        />
        <MetricCard label="Total Trades" value={summary.total_trades || 0} detail="Persisted fills in PostgreSQL" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <PriceTickerPanel prices={prices} />
        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
            <CardDescription>Current exposure tracked by the order manager</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {openPositions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
                No open positions.
              </div>
            ) : (
              openPositions.map((position) => (
                <div
                  key={`${position.market}-${position.openedAt}`}
                  className="rounded-2xl border border-white/10 bg-secondary/35 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{position.market}</div>
                    <Badge variant="outline">{position.side}</Badge>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                    <div>Entry: {position.entryPrice}</div>
                    <div>Qty: {position.quantity}</div>
                    <div>Target Floor: {position.targetFloorPrice}</div>
                    <div>Stop Loss: {position.stopLossPrice}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <PendingOrdersPanel orders={pendingOrders} onRefresh={refreshStatus} />

      <ActivityLogPanel logs={logs} />

      <TradesTable trades={trades.slice(0, 12)} />
    </AppShell>
  );
}
