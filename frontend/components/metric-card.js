import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({ label, value, tone = "neutral", detail }) {
  const positive = tone === "positive";
  const negative = tone === "negative";

  return (
    <Card className="border-white/10 bg-gradient-to-br from-card to-secondary/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-semibold">{value}</div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              positive && "bg-emerald-500/15 text-emerald-300",
              negative && "bg-rose-500/15 text-rose-300",
              !positive && !negative && "bg-secondary/70 text-muted-foreground"
            )}
          >
            {positive ? <ArrowUpRight className="h-5 w-5" /> : null}
            {negative ? <ArrowDownRight className="h-5 w-5" /> : null}
          </div>
        </div>
        {detail ? <p className="mt-3 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
