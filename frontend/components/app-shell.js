"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CandlestickChart, Gauge, Settings2, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/trades", label: "Trades", icon: Wallet },
  { href: "/strategies", label: "Strategies", icon: Sparkles },
  { href: "/markets", label: "Markets", icon: CandlestickChart },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ connectionState, children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-grid-overlay">
      <div className="container py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/10 bg-card/80 p-5 shadow-glow backdrop-blur-xl">
            <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  CoinDCX Ops
                </p>
                <h1 className="text-lg font-semibold">Trading Control</h1>
              </div>
            </div>
            <div className="mt-6">
              <Badge variant={connectionState === "live" ? "success" : "destructive"}>
                {connectionState === "live" ? "Realtime connected" : "Realtime disconnected"}
              </Badge>
            </div>
            <nav className="mt-8 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                      active
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
