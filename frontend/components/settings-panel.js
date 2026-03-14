"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPanel({ status, onUpdated }) {
  const [mode, setMode] = useState("paper");
  const [tradeSize, setTradeSize] = useState(300);
  const [stopLossPercent, setStopLossPercent] = useState(1);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setMode(status?.mode || "paper");
    setTradeSize(status?.strategy?.tradeSize ?? 300);
    setStopLossPercent(status?.strategy?.stopLossPercent ?? 1);
  }, [status]);

  async function saveSettings() {
    setSaving(true);
    try {
      await api.updateSettings({ mode, tradeSize });
      await api.updateStrategy({ tradeSize, stopLossPercent });
      onUpdated?.(await api.getStatus());
      pushToast({
        title: "Runtime settings saved",
        description: "Mode and risk values were updated successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to save settings",
        description: error.message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Runtime Settings</CardTitle>
        <CardDescription>Mode switches, sizing controls, and bot lifecycle actions</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mode" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mode">Mode</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
            <TabsTrigger value="guide">Guide</TabsTrigger>
          </TabsList>
          <TabsContent value="mode" className="grid gap-4 md:max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="mode">Bot Mode</Label>
              <select
                id="mode"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm"
              >
                <option value="paper">Paper</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade-size-runtime">Trade Size</Label>
              <Input
                id="trade-size-runtime"
                type="number"
                value={tradeSize}
                onChange={(event) => setTradeSize(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop-loss-runtime">Stop Loss %</Label>
              <Input
                id="stop-loss-runtime"
                type="number"
                step="0.1"
                value={stopLossPercent}
                onChange={(event) => setStopLossPercent(Number(event.target.value))}
              />
            </div>
            <LoadingButton loading={saving} onClick={saveSettings} className="w-full md:w-fit">
              Save Runtime Settings
            </LoadingButton>
          </TabsContent>
          <TabsContent value="lifecycle" className="flex flex-wrap gap-3">
            <LoadingButton
              loading={starting}
              onClick={async () => {
                setStarting(true);
                try {
                  onUpdated?.(await api.startBot());
                  pushToast({
                    title: "Bot started",
                    description: "Realtime trading loop is now active.",
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
              Start Bot
            </LoadingButton>
            <LoadingButton
              loading={stopping}
              variant="secondary"
              onClick={async () => {
                setStopping(true);
                try {
                  onUpdated?.(await api.stopBot());
                  pushToast({
                    title: "Bot stopped",
                    description: "Realtime trading loop has been halted.",
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
              Stop Bot
            </LoadingButton>
          </TabsContent>
          <TabsContent value="guide" className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
              <div className="font-medium text-foreground">How this bot trades</div>
              <p className="mt-2">
                The bot listens to live market data, buys a fixed INR amount when the dip rule triggers,
                places a pending limit sell, keeps repricing that sell order, and exits with stop loss if needed.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
                <div className="font-medium text-foreground">Trade Size</div>
                <p className="mt-2">Fixed amount per entry. `500` means buy roughly Rs 500 worth of a coin, not your whole wallet.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
                <div className="font-medium text-foreground">Profit Target %</div>
                <p className="mt-2">Minimum profit floor used when placing or repricing the sell limit order.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
                <div className="font-medium text-foreground">Stop Loss %</div>
                <p className="mt-2">If price drops this much below entry, the bot cancels the pending sell and exits the position.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
                <div className="font-medium text-foreground">Reprice Interval / Threshold</div>
                <p className="mt-2">Controls how often the bot is allowed to move the pending sell order and by how much price must change first.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
                <div className="font-medium text-foreground">Maker Buffer %</div>
                <p className="mt-2">Extra markup placed above the latest price when maintaining the sell order.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
                <div className="font-medium text-foreground">Paper vs Live</div>
                <p className="mt-2">Paper mode simulates execution. Live mode sends real CoinDCX orders through your API key.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-foreground">
              Start in paper mode, confirm pending orders and exits behave as expected, then switch to live only after rotating your API keys and verifying small trade sizes.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
