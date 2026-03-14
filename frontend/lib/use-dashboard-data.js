"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { WS_BASE_URL } from "@/lib/config";

export function useDashboardData() {
  const [status, setStatus] = useState(null);
  const [prices, setPrices] = useState([]);
  const [trades, setTrades] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [connectionState, setConnectionState] = useState("connecting");

  useEffect(() => {
    let ignore = false;
    let socket;

    async function load() {
      const [statusData, pricesData, tradesData, strategyData, marketsData] =
        await Promise.all([
          api.getStatus(),
          api.getPrices(),
          api.getTrades(),
          api.getStrategies(),
          api.getMarkets(),
        ]);

      if (ignore) return;

      setStatus(statusData);
      setPrices(pricesData);
      setTrades(tradesData);
      setStrategies(strategyData);
      setMarkets(marketsData);
    }

    load().catch(console.error);

    try {
      socket = new WebSocket(WS_BASE_URL);
      socket.addEventListener("open", () => setConnectionState("live"));
      socket.addEventListener("close", () => setConnectionState("offline"));
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "snapshot") {
          setStatus(message.payload.status);
          setPrices(message.payload.prices || []);
        }

        if (message.type === "price") {
          setPrices((current) => {
            const next = current.filter((item) => item.market !== message.payload.market);
            return [message.payload, ...next].slice(0, 16);
          });
        }

        if (
          message.type === "order"
          || message.type === "strategy"
          || message.type === "pending-order"
        ) {
          Promise.all([api.getStatus(), api.getTrades(), api.getStrategies()])
            .then(([statusData, tradesData, strategiesData]) => {
              setStatus(statusData);
              setTrades(tradesData);
              setStrategies(strategiesData);
            })
            .catch(console.error);
        }
      });
    } catch (error) {
      console.error(error);
      setConnectionState("offline");
    }

    const interval = window.setInterval(() => {
      api.getStatus().then(setStatus).catch(console.error);
    }, 12000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
      socket?.close();
    };
  }, []);

  const activeStrategy = useMemo(
    () => strategies.find((strategy) => strategy.name === "scalping") || strategies[0],
    [strategies]
  );

  return {
    status,
    prices,
    trades,
    strategies,
    activeStrategy,
    markets,
    connectionState,
    refreshStatus: () => api.getStatus().then(setStatus),
    refreshTrades: () => api.getTrades().then(setTrades),
    refreshStrategies: () => api.getStrategies().then(setStrategies),
    refreshMarkets: () => api.getMarkets().then(setMarkets),
    setStatus,
    setTrades,
    setStrategies,
    setMarkets,
  };
}
