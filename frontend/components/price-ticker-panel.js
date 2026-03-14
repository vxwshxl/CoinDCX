import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PriceTickerPanel({ prices = [] }) {
  const getPriceSizeClass = (value) => {
    const length = String(value).length;
    if (length <= 7) return "text-[clamp(2.75rem,3.2vw,4rem)]";
    if (length <= 10) return "text-[clamp(2.2rem,2.7vw,3.2rem)]";
    if (length <= 13) return "text-[clamp(1.7rem,2.1vw,2.4rem)]";
    return "text-[clamp(1.2rem,1.7vw,1.8rem)]";
  };

  const formatPrice = (price) => {
    const numeric = Number(price || 0);
    if (numeric >= 100000) {
      return numeric.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
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
  };

  const formatTime = (timestamp) =>
    new Date(timestamp || Date.now()).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Price Stream</CardTitle>
        <CardDescription>CoinDCX spot price updates from the backend WebSocket bridge</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {prices.map((item) => (
          <div key={item.market} className="min-w-0 rounded-2xl border border-white/10 bg-secondary/35 p-5">
            {(() => {
              const formattedPrice = formatPrice(item.price);
              return (
                <>
            <div className="truncate text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {item.market}
            </div>
            <div
              className={`mt-4 overflow-hidden whitespace-nowrap font-semibold leading-none tracking-tight tabular-nums ${getPriceSizeClass(
                formattedPrice
              )}`}
              title={formattedPrice}
            >
              {formattedPrice}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="whitespace-nowrap tabular-nums">
                {formatTime(item.timestamp)}
              </span>
              <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                Live
              </span>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
