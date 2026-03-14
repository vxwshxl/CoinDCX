import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const variants = {
  info: "secondary",
  warn: "outline",
  error: "destructive",
};

export function ActivityLogPanel({ logs = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          Backend events from PostgreSQL. Use this to confirm the bot is actually running, scanning, placing orders, repricing, or stopping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
            No backend activity has been logged yet.
          </div>
        ) : (
          logs.slice(0, 18).map((log) => (
            <div key={log.id} className="rounded-2xl border border-white/10 bg-secondary/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{log.message}</div>
                <Badge variant={variants[log.level] || "secondary"}>{log.level}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
