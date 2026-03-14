import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getPriceFontSize(value) {
  const length = String(value).length;

  if (length <= 7) return "3.85rem";
  if (length <= 10) return "3.2rem";
  if (length <= 12) return "2.65rem";
  if (length <= 14) return "2.2rem";
  return "1.8rem";
}

function formatPrice(price) {
  const numeric = Number(price || 0);

  if (numeric >= 1000) {
    return numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (numeric >= 100) {
    return numeric.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  }

  return numeric.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Price Stream</CardTitle>
        <CardDescription>CoinDCX spot price updates from the backend WebSocket bridge</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {prices.map((item) => {
          const formattedPrice = formatPrice(item.price);

          return (
            <div key={item.market} className="rounded-2xl border border-white/10 bg-secondary/35 p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{item.market}</div>
              <div
                className="mt-4 whitespace-nowrap font-semibold leading-none tracking-tight tabular-nums text-foreground"
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
      </CardContent>
    </Card>
  );
}
