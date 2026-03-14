import { API_BASE_URL } from "@/lib/config";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed for ${path}`);
  }

  return response.json();
}

export const api = {
  getStatus: () => request("/api/status"),
  getLogs: () => request("/api/logs"),
  startBot: () => request("/api/start-bot", { method: "POST" }),
  stopBot: () => request("/api/stop-bot", { method: "POST" }),
  getPrices: () => request("/api/prices"),
  getTrades: () => request("/api/trades"),
  cancelOrder: (orderId) => request(`/api/orders/${orderId}/cancel`, { method: "POST" }),
  getStrategies: () => request("/api/strategies"),
  updateStrategy: (payload) =>
    request("/api/strategies", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMarkets: () => request("/api/markets"),
  updateMarkets: (tradeMarkets) =>
    request("/api/markets", {
      method: "POST",
      body: JSON.stringify({ tradeMarkets }),
    }),
  updateSettings: (payload) =>
    request("/api/settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
