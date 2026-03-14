import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TradesTable({ trades = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
        <CardDescription>Persisted order fills and paper trades from PostgreSQL</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Exit</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>PnL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>{trade.market}</TableCell>
                <TableCell className="uppercase">{trade.side}</TableCell>
                <TableCell>{trade.entry_price}</TableCell>
                <TableCell>{trade.exit_price ?? "-"}</TableCell>
                <TableCell>{trade.quantity}</TableCell>
                <TableCell>
                  <span
                    className={
                      Number(trade.realized_pnl) >= 0 ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {trade.realized_pnl}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={trade.status === "open" ? "outline" : "secondary"}>
                    {trade.status}
                  </Badge>
                </TableCell>
                <TableCell>{trade.mode}</TableCell>
                <TableCell>{new Date(trade.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
