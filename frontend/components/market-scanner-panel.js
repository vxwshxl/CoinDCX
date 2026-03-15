"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useToast } from "@/components/providers/toast-provider";

const SELECTED_PAGE_SIZE = 24;
const MARKETS_PAGE_SIZE = 12;

export function MarketScannerPanel({ status, markets = [], onUpdated }) {
  const [selected, setSelected] = useState(status?.tradeMarkets || []);
  const [autoCount, setAutoCount] = useState(status?.automation?.autoMarketSelectionCount || 8);
  const [autoRefreshMs, setAutoRefreshMs] = useState(status?.automation?.autoMarketRefreshMs || 120000);
  const [autoEnabled, setAutoEnabled] = useState(status?.automation?.autoMarketSelection || false);
  const [autoQuote, setAutoQuote] = useState(status?.automation?.autoMarketQuote || "INR");
  const [search, setSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [marketsPage, setMarketsPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    setSelected(status?.tradeMarkets || []);
    setAutoCount(status?.automation?.autoMarketSelectionCount || 8);
    setAutoRefreshMs(status?.automation?.autoMarketRefreshMs || 120000);
    setAutoEnabled(status?.automation?.autoMarketSelection || false);
    setAutoQuote(status?.automation?.autoMarketQuote || "INR");
  }, [status]);

  const visibleMarkets = useMemo(() => markets.filter((market) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      market.market,
      market.pair,
      market.baseCurrency,
      market.targetCurrency,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  }), [markets, search]);

  const selectedTotalPages = Math.max(Math.ceil(selected.length / SELECTED_PAGE_SIZE), 1);
  const marketsTotalPages = Math.max(Math.ceil(visibleMarkets.length / MARKETS_PAGE_SIZE), 1);

  useEffect(() => {
    setSelectedPage((current) => Math.min(current, selectedTotalPages));
  }, [selectedTotalPages]);

  useEffect(() => {
    setMarketsPage(1);
  }, [search]);

  useEffect(() => {
    setMarketsPage((current) => Math.min(current, marketsTotalPages));
  }, [marketsTotalPages]);

  const selectedPageItems = useMemo(() => {
    const start = (selectedPage - 1) * SELECTED_PAGE_SIZE;
    return selected.slice(start, start + SELECTED_PAGE_SIZE);
  }, [selected, selectedPage]);

  const visibleMarketPageItems = useMemo(() => {
    const start = (marketsPage - 1) * MARKETS_PAGE_SIZE;
    return visibleMarkets.slice(start, start + MARKETS_PAGE_SIZE);
  }, [visibleMarkets, marketsPage]);

  function addMarkets(marketsToAdd) {
    setSelected((current) => [...new Set([...current, ...marketsToAdd])]);
  }

  async function saveMarkets() {
    setSaving(true);
    try {
      const response = await api.updateMarkets(selected);
      onUpdated?.(response);
      pushToast({
        title: "Markets updated",
        description: "Manual market selection was saved to the bot runtime.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to save markets",
        description: error.message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveAutoSelection() {
    setAutoSelecting(true);
    try {
      const response = await api.updateSettings({
        autoMarketSelection: autoEnabled,
        autoMarketSelectionCount: autoCount,
        autoMarketRefreshMs: autoRefreshMs,
        autoMarketQuote: autoQuote,
      });
      onUpdated?.(response);
      pushToast({
        title: "Auto market selection updated",
        description: autoEnabled
          ? `The bot will keep selecting top scanned ${autoQuote} markets automatically.`
          : "Automatic market selection has been disabled.",
      });
    } catch (error) {
      pushToast({
        title: "Auto-selection update failed",
        description: error.message,
        variant: "error",
      });
    } finally {
      setAutoSelecting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Market Scanner</CardTitle>
            <CardDescription>Ranked markets by spread, volatility, and liquidity</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {selected.length} selected, {visibleMarkets.length} visible
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-secondary/20 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium">Selected Markets</div>
              <div className="text-xs text-muted-foreground">
                Active trade markets applied to the bot runtime.
              </div>
            </div>
            {selected.length > SELECTED_PAGE_SIZE ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPage((current) => Math.max(current - 1, 1))}
                  disabled={selectedPage === 1}
                >
                  Prev
                </Button>
                <div className="min-w-24 text-center text-xs text-muted-foreground">
                  Page {selectedPage} / {selectedTotalPages}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPage((current) => Math.min(current + 1, selectedTotalPages))}
                  disabled={selectedPage === selectedTotalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedPageItems.map((item) => (
              <Badge key={item} variant="success">
                {item}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-secondary/20 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="auto-count">Auto Select Count</Label>
            <Input
              id="auto-count"
              type="number"
              value={autoCount}
              onChange={(event) => setAutoCount(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-refresh">Auto Refresh (ms)</Label>
            <Input
              id="auto-refresh"
              type="number"
              value={autoRefreshMs}
              onChange={(event) => setAutoRefreshMs(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auto-enabled">Automatic Selection</Label>
            <select
              id="auto-enabled"
              value={autoEnabled ? "true" : "false"}
              onChange={(event) => setAutoEnabled(event.target.value === "true")}
              className="flex h-10 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm"
            >
              <option value="false">Manual</option>
              <option value="true">Automatic</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-secondary/20 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="auto-quote">Automatic Universe</Label>
            <select
              id="auto-quote"
              value={autoQuote}
              onChange={(event) => setAutoQuote(event.target.value)}
              className="flex h-10 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm"
            >
              <option value="INR">INR pairs</option>
              <option value="USDT">USDT pairs</option>
              <option value="BTC">BTC pairs</option>
            </select>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm text-muted-foreground">
            Automatic mode now prefers markets that match your selected quote currency and are compatible with your current trade size.
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-secondary/20 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
          <div className="space-y-2">
            <Label htmlFor="market-search">Search Markets</Label>
            <Input
              id="market-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="BTC, INR, USDT, pair..."
            />
          </div>
          <LoadingButton
            type="button"
            variant="secondary"
            loading={false}
            onClick={() => addMarkets(visibleMarkets.slice(0, 20).map((market) => market.market))}
            className="self-end"
          >
            Select Top 20
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="secondary"
            loading={false}
            onClick={() => addMarkets(visibleMarkets.slice(0, 50).map((market) => market.market))}
            className="self-end"
          >
            Select Top 50
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="secondary"
            loading={false}
            onClick={() => addMarkets(visibleMarkets.map((market) => market.market))}
            className="self-end"
          >
            Select All Visible
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="secondary"
            loading={false}
            onClick={() => setSelected([])}
            className="self-end"
          >
            Clear
          </LoadingButton>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-secondary/20 p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {visibleMarketPageItems.length === 0 ? 0 : (marketsPage - 1) * MARKETS_PAGE_SIZE + 1}
            {" "}-{" "}
            {Math.min(marketsPage * MARKETS_PAGE_SIZE, visibleMarkets.length)} of {visibleMarkets.length} markets
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMarketsPage((current) => Math.max(current - 1, 1))}
              disabled={marketsPage === 1}
            >
              Prev
            </Button>
            <div className="min-w-24 text-center text-xs text-muted-foreground">
              Page {marketsPage} / {marketsTotalPages}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMarketsPage((current) => Math.min(current + 1, marketsTotalPages))}
              disabled={marketsPage === marketsTotalPages}
            >
              Next
            </Button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleMarketPageItems.map((market) => {
            const active = selected.includes(market.market);
            return (
              <button
                key={market.market}
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    active
                      ? current.filter((item) => item !== market.market)
                      : [...new Set([...current, market.market])]
                  )
                }
                className={`rounded-2xl border p-5 text-left transition ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-secondary/30 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{market.market}</div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={market.compatible ? "success" : "outline"}>
                      {market.compatible ? "Compatible" : "Skipped"}
                    </Badge>
                    <Badge variant={active ? "default" : "outline"}>
                      {active ? "Selected" : "Candidate"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  <div>Volume: {Number(market.volume || 0).toFixed(2)}</div>
                  <div>Spread: {Number(market.spreadPercent || 0).toFixed(4)}%</div>
                  <div>Volatility: {Number(market.volatilityPercent || 0).toFixed(4)}%</div>
                  <div>Last Price: {Number(market.lastPrice || 0).toFixed(4)}</div>
                  <div>Est. Quantity: {Number(market.estimatedQuantity || 0).toFixed(8)}</div>
                  <div>Est. Notional: {Number(market.estimatedNotional || 0).toFixed(2)}</div>
                  {!market.compatible ? (
                    <div className="text-rose-300">{market.compatibilityReason || "Skipped by automation"}</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <LoadingButton loading={saving} onClick={saveMarkets}>
            Apply {selected.length} Selected Markets
          </LoadingButton>
          <LoadingButton loading={autoSelecting} variant="secondary" onClick={saveAutoSelection}>
            Save Auto Selection
          </LoadingButton>
        </div>
      </CardContent>
    </Card>
  );
}
