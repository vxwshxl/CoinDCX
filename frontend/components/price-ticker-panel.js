import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PriceTickerPanel({ prices = [] }) {
  const formatPrice = (price) => {
    const numeric = Number(price || 0);
    if (numeric >= 100000) return numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    if (numeric >= 1000) return numeric.toLocaleString("en-IN", { maximumFractionDigits: 4 });
    return numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Price Stream</CardTitle>
        <CardDescription>CoinDCX spot price updates from the backend WebSocket bridge</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {prices.map((item) => (
          <div
            key={item.market}
            className="min-w-0 rounded-2xl border border-white/10 bg-secondary/35 p-4"
          >
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {item.market}
            </div>
            <div className="mt-3 break-all text-[clamp(1.35rem,2vw,2rem)] font-semibold leading-tight">
              {formatPrice(item.price)}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{new Date(item.timestamp || Date.now()).toLocaleTimeString()}</span>
              <span className="truncate">Live tick</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
