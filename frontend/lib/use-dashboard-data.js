"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { WS_BASE_URL } from "@/lib/config";

export function useDashboardData() {
  const [status, setStatus] = useState(null);
  const [prices, setPrices] = useState([]);
  const [trades, setTrades] = useState([]);
  const [logs, setLogs] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [connectionState, setConnectionState] = useState("connecting");

  useEffect(() => {
    let ignore = false;
    let socket;

    async function load() {
      const [statusData, pricesData, tradesData, logsData, strategyData, marketsData] =
        await Promise.all([
          api.getStatus(),
          api.getPrices(),
          api.getTrades(),
          api.getLogs(),
          api.getStrategies(),
          api.getMarkets(),
        ]);

      if (ignore) return;

      setStatus(statusData);
      setPrices(pricesData);
      setTrades(tradesData);
      setLogs(logsData);
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
          Promise.all([api.getStatus(), api.getTrades(), api.getLogs(), api.getStrategies()])
            .then(([statusData, tradesData, logsData, strategiesData]) => {
              setStatus(statusData);
              setTrades(tradesData);
              setLogs(logsData);
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
      api.getLogs().then(setLogs).catch(console.error);
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
    logs,
    strategies,
    activeStrategy,
    markets,
    connectionState,
    refreshStatus: () => api.getStatus().then(setStatus),
    refreshTrades: () => api.getTrades().then(setTrades),
    refreshLogs: () => api.getLogs().then(setLogs),
    refreshStrategies: () => api.getStrategies().then(setStrategies),
    refreshMarkets: () => api.getMarkets().then(setMarkets),
    setStatus,
    setTrades,
    setStrategies,
    setMarkets,
  };
}
