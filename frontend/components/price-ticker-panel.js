import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PRICE_PAGE_SIZE = 6;

function getPriceFontSize(value) {
  const length = String(value).length;

  if (length <= 6) return "clamp(2.5rem, 5vw, 4rem)";
  if (length <= 9) return "clamp(2.15rem, 4.2vw, 3.25rem)";
  if (length <= 12) return "clamp(1.8rem, 3.5vw, 2.6rem)";
  if (length <= 15) return "clamp(1.45rem, 3vw, 2.1rem)";
  return "clamp(1.15rem, 2.2vw, 1.55rem)";
}

function formatPrice(price) {
  const numeric = Number(price || 0);

  if (numeric >= 100000) {
    return numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  if (numeric >= 1000) {
    return numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (numeric >= 1) {
    return numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  return numeric.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function formatTime(timestamp) {
  return new Date(timestamp || Date.now()).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function PriceTickerPanel({ prices = [] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(Math.ceil(prices.length / PRICE_PAGE_SIZE), 1);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visiblePrices = useMemo(() => {
    const start = (page - 1) * PRICE_PAGE_SIZE;
    return prices.slice(start, start + PRICE_PAGE_SIZE);
  }, [page, prices]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Live Price Stream</CardTitle>
            <CardDescription>CoinDCX spot price updates from the backend WebSocket bridge</CardDescription>
          </div>
          {prices.length > PRICE_PAGE_SIZE ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <div className="min-w-20 text-center text-xs text-muted-foreground">
                Page {page} / {totalPages}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {visiblePrices.map((item) => {
          const formattedPrice = formatPrice(item.price);

          return (
            <div key={item.market} className="rounded-2xl border border-white/10 bg-secondary/35 p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{item.market}</div>
              <div
                className="mt-4 break-all font-semibold leading-[0.95] tracking-tight tabular-nums text-foreground"
                style={{ fontSize: getPriceFontSize(formattedPrice) }}
                title={formattedPrice}
              >
                {formattedPrice}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="whitespace-nowrap tabular-nums">{formatTime(item.timestamp)}</span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                  Live
                </span>
              </div>
            </div>
          );
        })}
        {visiblePrices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
            No live prices yet.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
