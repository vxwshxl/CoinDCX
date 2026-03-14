"use client";

import { api } from "@/lib/api";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";

export function PendingOrdersPanel({ orders = [], onRefresh }) {
  const [cancellingId, setCancellingId] = useState(null);
  const { pushToast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Limit Orders</CardTitle>
        <CardDescription>Open sell orders created from fixed-size entries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
            No pending limit orders.
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-white/10 bg-secondary/35 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{order.market}</div>
                    <Badge variant="outline">{order.side}</Badge>
                    <Badge variant="secondary">{order.orderType}</Badge>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                    <div>Limit Price: {order.pricePerUnit}</div>
                    <div>Quantity: {order.totalQuantity}</div>
                    <div>Role: {order.role}</div>
                  </div>
                </div>
                <LoadingButton
                  loading={cancellingId === order.id}
                  variant="secondary"
                  onClick={async () => {
                    setCancellingId(order.id);
                    try {
                      await api.cancelOrder(order.id);
                      await onRefresh?.();
                      pushToast({
                        title: "Order cancelled",
                        description: `${order.market} pending order was cancelled.`,
                      });
                    } catch (error) {
                      pushToast({
                        title: "Cancel failed",
                        description: error.message,
                        variant: "error",
                      });
                    } finally {
                      setCancellingId(null);
                    }
                  }}
                >
                  Cancel
                </LoadingButton>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
