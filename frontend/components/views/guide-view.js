"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/lib/use-dashboard-data";

const sections = [
  {
    title: "What Start Bot really means",
    body:
      "Start Bot is a backend action, not only a UI state. It opens the CoinDCX market stream, begins the strategy loop, manages pending limit sells, runs order reconciliation, and writes events into bot_logs.",
  },
  {
    title: "Where to verify it is actually working",
    body:
      "Use the Dashboard Activity Log, Pending Limit Orders, Open Positions, and Trades sections. Those surfaces come from backend state and PostgreSQL records.",
  },
  {
    title: "Trade Size",
    body:
      "Trade Size is the fixed INR amount per new entry. For example, 500 means roughly Rs 500 per trade, not your entire wallet balance.",
  },
  {
    title: "Profit Target, Maker Buffer, and Repricing",
    body:
      "After entry, the bot places a pending limit sell. Profit Target sets the minimum sell floor, Maker Buffer pushes the order above current price, and repricing moves that pending sell over time.",
  },
  {
    title: "Stop Loss",
    body:
      "If market price falls beyond the configured stop loss, the bot cancels the pending sell order and exits the position.",
  },
  {
    title: "Auto Market Selection",
    body:
      "When enabled, the backend scans markets by liquidity, spread, and volatility, then refreshes the active tradeMarkets set automatically.",
  },
  {
    title: "Paper vs Live",
    body:
      "Paper mode simulates fills. Live mode sends real orders through your CoinDCX API key. Use paper first and move to live only with small values and rotated keys.",
  },
];

export function GuideView() {
  const { connectionState } = useDashboardData();

  return (
    <AppShell connectionState={connectionState}>
      <PageHeader
        eyebrow="Guide"
        title="Operator Guide"
        description="Reference page for every major setting, what the backend actually does, and how to verify behavior before trading live."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{section.body}</CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
