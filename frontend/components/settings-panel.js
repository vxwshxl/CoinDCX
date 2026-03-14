"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MIN_REPRICE_INTERVAL_MS = 1000;

export function SettingsPanel({ status, onUpdated }) {
  const [form, setForm] = useState({
    mode: "paper",
    enabled: true,
    tradeSize: 300,
    maxPositionSize: 2000,
    maxOpenOrders: 5,
    dailyLossLimit: 500,
    profitTargetPercent: 0.5,
    dipBuyPercent: 0.3,
    stopLossPercent: 1,
    repriceIntervalMs: 3000,
    repriceThresholdPercent: 0.15,
    makerBufferPercent: 0.05,
    autoSellEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setForm({
      mode: status?.mode || "paper",
      enabled: status?.strategy?.enabled ?? true,
      tradeSize: status?.strategy?.tradeSize ?? 300,
      maxPositionSize: status?.risk?.maxPositionSize ?? 2000,
      maxOpenOrders: status?.risk?.maxOpenOrders ?? 5,
      dailyLossLimit: status?.risk?.dailyLossLimit ?? 500,
      profitTargetPercent: status?.strategy?.profitTargetPercent ?? 0.5,
      dipBuyPercent: status?.strategy?.dipBuyPercent ?? 0.3,
      stopLossPercent: status?.strategy?.stopLossPercent ?? 1,
      repriceIntervalMs: status?.strategy?.repriceIntervalMs ?? 3000,
      repriceThresholdPercent: status?.strategy?.repriceThresholdPercent ?? 0.15,
      makerBufferPercent: status?.strategy?.makerBufferPercent ?? 0.05,
      autoSellEnabled: status?.strategy?.autoSellEnabled ?? true,
    });
  }, [status]);

  const estimatedMinimumWallet = useMemo(() => {
    const tradeSize = Math.max(Number(form.tradeSize || 0), 0);
    const maxOpenOrders = Math.max(Number(status?.risk?.maxOpenOrders || 1), 1);
    return Math.ceil(tradeSize * maxOpenOrders * 1.25);
  }, [form.tradeSize, status?.risk?.maxOpenOrders]);

  async function saveSettings() {
    setSaving(true);
    try {
      const nextStatus = await api.updateSettings({
        ...form,
        repriceIntervalMs: Math.max(Number(form.repriceIntervalMs || 0), MIN_REPRICE_INTERVAL_MS),
      });
      onUpdated?.(nextStatus);
      pushToast({
        title: "Execution settings saved",
        description: "Settings and strategy controls are now synced.",
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
        <CardDescription>
          Mode, signal tuning, and pending-order management from one synced control surface.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mode" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mode">Mode</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          </TabsList>
          <TabsContent value="mode" className="grid gap-4 md:max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="mode">Bot Mode</Label>
              <select
                id="mode"
                value={form.mode}
                onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))}
                className="flex h-10 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm"
              >
                <option value="paper">Paper</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm text-muted-foreground">
              Use `paper` until you confirm the bot is opening entries, keeping pending sell orders alive,
              and repricing them the way you expect. `Trade Size` is INR per new entry, not full wallet usage.
            </div>
            <LoadingButton loading={saving} onClick={saveSettings} className="w-full md:w-fit">
              Save Runtime Settings
            </LoadingButton>
          </TabsContent>
          <TabsContent value="risk" className="grid gap-5 md:max-w-3xl">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="max-position-size">Max Position Size</Label>
                <Input
                  id="max-position-size"
                  type="number"
                  value={form.maxPositionSize}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxPositionSize: Number(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Hard cap on total INR exposure across all open positions.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-open-orders">Max Open Orders</Label>
                <Input
                  id="max-open-orders"
                  type="number"
                  value={form.maxOpenOrders}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxOpenOrders: Number(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Limits how many entries and pending exits can stay active at once.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-loss-limit">Daily Loss Limit</Label>
                <Input
                  id="daily-loss-limit"
                  type="number"
                  value={form.dailyLossLimit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dailyLossLimit: Number(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Trading halts automatically once realized daily loss reaches this value.
                </p>
              </div>
            </div>
            <LoadingButton loading={saving} onClick={saveSettings} className="w-full md:w-fit">
              Save Risk Limits
            </LoadingButton>
          </TabsContent>
          <TabsContent value="execution" className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-secondary/35 p-4">
                <div className="text-sm text-muted-foreground">Trade Size Per Entry</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">Rs {Number(form.tradeSize || 0)}</div>
                <div className="mt-2 text-sm text-muted-foreground">Each new buy uses this INR amount.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/35 p-4">
                <div className="text-sm text-muted-foreground">Recommended Minimum Wallet</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">Rs {estimatedMinimumWallet}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Rough estimate for keeping entries and pending exits alive.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-secondary/35 p-4">
                <div className="text-sm text-muted-foreground">Pending Order Loop</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {Math.max(Number(form.repriceIntervalMs || 0), MIN_REPRICE_INTERVAL_MS)} ms
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  CoinDCX order edits are clamped to a safe minimum of 1000 ms.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-secondary/35 p-4">
              <div>
                <div className="font-medium">Strategy Enabled</div>
                <p className="text-sm text-muted-foreground">
                  Disable signals without stopping the websocket or pending-order management loop.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="trade-size-runtime">Trade Size (INR per trade)</Label>
                <Input
                  id="trade-size-runtime"
                  type="number"
                  value={form.tradeSize}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tradeSize: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profit-target-runtime">Profit Target %</Label>
                <Input
                  id="profit-target-runtime"
                  type="number"
                  step="0.1"
                  value={form.profitTargetPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      profitTargetPercent: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dip-buy-runtime">Dip Buy %</Label>
                <Input
                  id="dip-buy-runtime"
                  type="number"
                  step="0.1"
                  value={form.dipBuyPercent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dipBuyPercent: Number(event.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="stop-loss-runtime">Stop Loss %</Label>
                <Input
                  id="stop-loss-runtime"
                  type="number"
                  step="0.1"
                  value={form.stopLossPercent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stopLossPercent: Number(event.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reprice-interval-runtime">Reprice Interval (ms)</Label>
                <Input
                  id="reprice-interval-runtime"
                  type="number"
                  min={MIN_REPRICE_INTERVAL_MS}
                  value={form.repriceIntervalMs}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      repriceIntervalMs: Number(event.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The bot keeps working continuously, but exchange repricing is rate-limited to 1000 ms minimum.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reprice-threshold-runtime">Reprice Threshold %</Label>
                <Input
                  id="reprice-threshold-runtime"
                  type="number"
                  step="0.01"
                  value={form.repriceThresholdPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      repriceThresholdPercent: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maker-buffer-runtime">Maker Buffer %</Label>
                <Input
                  id="maker-buffer-runtime"
                  type="number"
                  step="0.01"
                  value={form.makerBufferPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      makerBufferPercent: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-secondary/35 p-4">
              <div>
                <div className="font-medium">Automatic Limit Sell Management</div>
                <p className="text-sm text-muted-foreground">
                  Keep pending exit orders alive and keep repricing them while the bot runs.
                </p>
              </div>
              <Switch
                checked={form.autoSellEnabled}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, autoSellEnabled: checked }))
                }
              />
            </div>

            <LoadingButton loading={saving} onClick={saveSettings} className="w-full md:w-fit">
              Save Execution Settings
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
                    description: "Websocket, strategy checks, and pending-order maintenance are active.",
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
                    description: "Realtime execution and pending-order maintenance were halted.",
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
