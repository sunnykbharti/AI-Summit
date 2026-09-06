import axios from "axios";

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.replace(/\/$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }
  // In browser, relative '/api' works with Vite's proxy in dev mode
  // and with Flask static serving in production, seamlessly across local network/WiFi.
  if (typeof window !== "undefined") {
    return "/api";
  }
  return "http://127.0.0.1:5000/api";
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchDashboardSummary    = () => api.get("/dashboard/summary").then(r => r.data);
export const fetchRecentSessions      = () => api.get("/dashboard/recent_sessions").then(r => r.data);
export const fetchWeeklyActivity      = () => api.get("/dashboard/weekly").then(r => r.data);

export default api;