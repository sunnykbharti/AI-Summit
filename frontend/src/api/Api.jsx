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

// ============================================================
// IN-MEMORY SWR (STALE-WHILE-REVALIDATE) CLIENT CACHE
// Eliminates page-switch load delays & socket starvation
// ============================================================
const _cache = new Map(); // key -> { data, timestamp }
const _inFlight = new Map(); // key -> Promise

const DEFAULT_CACHE_TTL = 30000; // 30 seconds

export const cachedGet = async (url, options = {}) => {
  const { ttl = DEFAULT_CACHE_TTL, force = false } = options;
  const now = Date.now();
  const cached = _cache.get(url);

  // If cache is fresh and not forced, return immediately (0ms)
  if (!force && cached && (now - cached.timestamp < ttl)) {
    return cached.data;
  }

  // If in-flight request already exists for this URL, reuse promise to avoid duplicate sockets
  if (_inFlight.has(url)) {
    return _inFlight.get(url);
  }

  const fetchPromise = api.get(url)
    .then((res) => {
      _cache.set(url, { data: res.data, timestamp: Date.now() });
      _inFlight.delete(url);
      return res.data;
    })
    .catch((err) => {
      _inFlight.delete(url);
      // If stale cache exists on network error, return stale cache gracefully
      if (cached) {
        return cached.data;
      }
      throw err;
    });

  _inFlight.set(url, fetchPromise);

  // If stale cache exists, return it immediately while fetchPromise revalidates in the background
  if (!force && cached) {
    return cached.data;
  }

  return fetchPromise;
};

export const prefetch = (url, ttl = DEFAULT_CACHE_TTL) => {
  try {
    const cached = _cache.get(url);
    if (!cached || (Date.now() - cached.timestamp >= ttl)) {
      cachedGet(url, { ttl }).catch(() => {});
    }
  } catch (_) {}
};

export const invalidateCache = (pattern) => {
  if (!pattern) {
    _cache.clear();
    return;
  }
  for (const key of _cache.keys()) {
    if (key.includes(pattern)) {
      _cache.delete(key);
    }
  }
};

// Cached endpoints
export const fetchDashboardSummary = (force = false) => cachedGet("/dashboard/summary", { force });
export const fetchRecentSessions   = (force = false) => cachedGet("/dashboard/recent_sessions", { force });
export const fetchWeeklyActivity   = (force = false) => cachedGet("/dashboard/weekly", { force });
export const fetchSessionsList     = (force = false) => cachedGet("/sessions", { force });
export const fetchLeaderboardData  = (period = "all_time", force = false) => cachedGet(`/pose/leaderboard?period=${period}`, { force });

export default api;