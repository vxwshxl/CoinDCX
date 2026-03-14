"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/providers/toast-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";

export function StrategyPanel({ strategy, onUpdated }) {
  const [form, setForm] = useState({
    enabled: true,
    tradeSize: 300,
    profitTargetPercent: 0.5,
    dipBuyPercent: 0.3,
    stopLossPercent: 1,
    repriceIntervalMs: 3000,
    repriceThresholdPercent: 0.15,
    makerBufferPercent: 0.05,
    autoSellEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setForm({
      enabled: strategy?.enabled ?? true,
      tradeSize: strategy?.trade_size ?? 300,
      profitTargetPercent: strategy?.profit_target_percent ?? 0.5,
      dipBuyPercent: strategy?.dip_buy_percent ?? 0.3,
      stopLossPercent: strategy?.metadata?.stopLossPercent ?? 1,
      repriceIntervalMs: strategy?.metadata?.repriceIntervalMs ?? 3000,
      repriceThresholdPercent: strategy?.metadata?.repriceThresholdPercent ?? 0.15,
      makerBufferPercent: strategy?.metadata?.makerBufferPercent ?? 0.05,
      autoSellEnabled: strategy?.metadata?.autoSellEnabled ?? true,
    });
  }, [strategy]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.updateStrategy(form);
      onUpdated?.(response);
      pushToast({
        title: "Strategy saved",
        description: "Execution and repricing parameters were updated.",
      });
    } catch (error) {
      pushToast({
        title: "Strategy update failed",
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
        <CardTitle>Strategy Controls</CardTitle>
        <CardDescription>Scalping configuration with runtime updates</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-secondary/35 p-4">
            <div>
              <div className="font-medium">Strategy Enabled</div>
              <p className="text-sm text-muted-foreground">
                Disable signals without stopping market data ingestion
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
            />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tradeSize">Trade Size</Label>
              <Input
                id="tradeSize"
                type="number"
                value={form.tradeSize}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tradeSize: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profitTargetPercent">Profit Target %</Label>
              <Input
                id="profitTargetPercent"
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
              <Label htmlFor="dipBuyPercent">Dip Buy %</Label>
              <Input
                id="dipBuyPercent"
                type="number"
                step="0.1"
                value={form.dipBuyPercent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dipBuyPercent: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="stopLossPercent">Stop Loss %</Label>
              <Input
                id="stopLossPercent"
                type="number"
                step="0.1"
                value={form.stopLossPercent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stopLossPercent: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repriceIntervalMs">Reprice Interval (ms)</Label>
              <Input
                id="repriceIntervalMs"
                type="number"
                value={form.repriceIntervalMs}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    repriceIntervalMs: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repriceThresholdPercent">Reprice Threshold %</Label>
              <Input
                id="repriceThresholdPercent"
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
              <Label htmlFor="makerBufferPercent">Maker Buffer %</Label>
              <Input
                id="makerBufferPercent"
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
                Keep a pending sell order open and reprice it automatically
              </p>
            </div>
            <Switch
              checked={form.autoSellEnabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, autoSellEnabled: checked }))
              }
            />
          </div>
          <LoadingButton type="submit" loading={saving} className="w-full md:w-fit">
            Save Strategy
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
