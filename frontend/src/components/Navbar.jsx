import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  Home,
  Video,
  History,
  TrendingUp,
  Dumbbell,
  User,
  LogOut,
  Sparkles,
  Trophy,
  Smile,
  Menu,
  X,
  Bot,
} from "lucide-react";
import { prefetch } from "../api/Api.jsx";

const PREFETCH_MAP = {
  "/dashboard": ["/dashboard/summary", "/dashboard/recent_sessions", "/dashboard/weekly"],
  "/sessions": ["/sessions"],
  "/leaderboard": ["/pose/leaderboard?period=all_time"],
  "/profile": ["/profile"],
  "/ask-me": ["/ask_ai/quick_prompts"],
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Remove the navbar when an exercise is chosen / on live camera feed
  const isCameraFeed =
    location.pathname === "/reaction-analysis" ||
    (location.pathname === "/pose-analysis" && Boolean(searchParams.get("exercise")));

  if (isCameraFeed) {
    return null;
  }

  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const handlePrefetch = (path) => {
    const urls = PREFETCH_MAP[path];
    if (urls) {
      urls.forEach((url) => prefetch(url));
    }
    // Prefetch 3D Bot chunk on hover for instant transition
    if (path === "/pose-analysis" || path === "/reaction-analysis") {
      try {
        import("../components/Pose3DBotViewer");
      } catch (_) {}
    }
  };

  const navItems = [
    { to: "/dashboard", icon: <Home size={17} />, text: "Dashboard" },
    { to: "/ask-me", icon: <Bot size={17} />, text: "Ask AI", badge: "AI" },
    { to: "/pose-analysis", icon: <Video size={17} />, text: "Pose Analysis" },
    { to: "/reaction-analysis", icon: <Smile size={17} />, text: "Reaction AI" },
    { to: "/sessions", icon: <History size={17} />, text: "Sessions" },
    { to: "/progress", icon: <TrendingUp size={17} />, text: "Progress" },
    { to: "/leaderboard", icon: <Trophy size={17} />, text: "Leaderboard" },
    { to: "/exercises", icon: <Dumbbell size={17} />, text: "Exercises" },
    { to: "/profile", icon: <User size={17} />, text: "Profile" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-[#f8fafc]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-18 sm:h-20 items-center justify-between">
          {/* ================= LOGO ================= */}
          <Link
            to="/dashboard"
            className="group flex items-center gap-3"
            onClick={() => setMobileMenuOpen(false)}
            onMouseEnter={() => handlePrefetch("/dashboard")}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-cyan-300/40 blur-lg group-hover:bg-cyan-400/60 transition" />
              <div className="relative rounded-xl border border-cyan-300 bg-white p-2 sm:p-2.5 shadow-sm">
                <Activity size={22} className="text-cyan-600" />
              </div>
            </div>

            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                Pose<span className="text-cyan-600">Care</span>
              </h1>
              <p className="flex items-center gap-1 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500">
                <Sparkles size={10} className="text-cyan-600" />
                AI Movement & Posture
              </p>
            </div>
          </Link>

          {/* ================= DESKTOP NAVIGATION ================= */}
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => handlePrefetch(item.to)}
                  onTouchStart={() => handlePrefetch(item.to)}
                  className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs xl:text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-cyan-600"
                  }`}
                >
                  <span className={`transition-transform duration-200 ${active ? "scale-110 text-cyan-600" : "group-hover:scale-110"}`}>
                    {item.icon}
                  </span>
                  <span>{item.text}</span>
                  {item.badge && (
                    <span className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ================= RIGHT CONTROLS ================= */}
          <div className="flex items-center gap-2">
            {token ? (
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 hover:border-red-300 shadow-sm"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:-translate-y-0.5"
              >
                <span>Login / Register</span>
                <Activity size={15} />
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex lg:hidden items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:text-cyan-600 hover:bg-slate-50 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ================= MOBILE NAVIGATION MENU ================= */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 pb-4 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  onTouchStart={() => handlePrefetch(item.to)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-cyan-600"
                  }`}
                >
                  <span className={active ? "text-cyan-600" : ""}>{item.icon}</span>
                  <span className="flex-1">{item.text}</span>
                  {item.badge && (
                    <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {token ? (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow transition"
                >
                  <span>Login / Register</span>
                  <Activity size={16} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;