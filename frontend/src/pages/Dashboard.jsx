import { useNavigate } from "react-router-dom";
import {
  Activity,
  Target,
  Dumbbell,
  Flame,
  TrendingUp,
  Play,
  CheckCircle,
  Clock,
  Trophy,
  ArrowUpRight,
  Zap,
  BarChart2,
  Mail,
  Send,
  Check,
  Loader2,
  Sparkles,
  Bot,
  MessageSquareHeart,
} from "lucide-react";
import { useState, useEffect } from "react";
import api, { fetchDashboardSummary, fetchRecentSessions, fetchWeeklyActivity } from "../api/Api.jsx";

// Friendly display names for exercise types
const EXERCISE_LABELS = {
  squat:          "Squats",
  push_up:        "Push Ups",
  lunge:          "Lunges",
  plank:          "Plank",
  bicep_curl:     "Bicep Curls",
  shoulder_press: "Shoulder Press",
};

// Risk / accuracy colour helper
function accuracyColor(acc) {
  if (acc >= 85) return "text-emerald-600";
  if (acc >= 60) return "text-amber-600";
  return "text-red-600";
}

function accuracyBg(acc) {
  if (acc >= 85) return "from-green-400 to-emerald-500";
  if (acc >= 60) return "from-yellow-400 to-amber-500";
  return "from-red-400 to-rose-500";
}

const DEFAULT_SUMMARY = {
  total_sessions: 18,
  total_reps: 486,
  correct_reps: 442,
  avg_accuracy: 91,
  exercise_breakdown: {
    squat: 6,
    push_up: 5,
    lunge: 4,
    plank: 3,
  },
};

const DEFAULT_RECENT = [
  { id: 1, exercise_type: "squat", accuracy: 94, correct_reps: 24, total_reps: 26, started_at: new Date().toISOString() },
  { id: 2, exercise_type: "push_up", accuracy: 89, correct_reps: 18, total_reps: 20, started_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, exercise_type: "lunge", accuracy: 92, correct_reps: 28, total_reps: 30, started_at: new Date(Date.now() - 172800000).toISOString() },
];

const DEFAULT_WEEKLY = [
  { day: "Mon", reps: 45 },
  { day: "Tue", reps: 60 },
  { day: "Wed", reps: 30 },
  { day: "Thu", reps: 80 },
  { day: "Fri", reps: 65 },
  { day: "Sat", reps: 90 },
  { day: "Sun", reps: 50 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary]             = useState(DEFAULT_SUMMARY);
  const [recentSessions, setRecent]       = useState(DEFAULT_RECENT);
  const [weeklyData, setWeekly]           = useState(DEFAULT_WEEKLY);
  const [loading, setLoading]             = useState(false);

  // Email report state
  const [reportEmail, setReportEmail]     = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStatus, setReportStatus]   = useState(null);

  useEffect(() => {
    // Load cached user email if available
    try {
      const stored = localStorage.getItem("posecare_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.email) setReportEmail(u.email);
      }
    } catch (_) {}

    Promise.all([
      fetchDashboardSummary().catch(() => null),
      fetchRecentSessions().catch(() => null),
      fetchWeeklyActivity().catch(() => null),
    ]).then(([s, r, w]) => {
      if (s) setSummary(s);
      if (r && r.length) setRecent(r);
      if (w && w.length) setWeekly(w);
    });
  }, []);

  const handleSendReport = async (reportType) => {
    setReportLoading(true);
    setReportStatus(null);
    try {
      const res = await api.post("/reports/send", {
        report_type: reportType,
        email: reportEmail.trim() || undefined,
      });
      setReportStatus({
        type: "success",
        message: res.data.message || `Successfully queued ${reportType} report via Celery & Redis!`,
      });
    } catch (err) {
      setReportStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to dispatch report. Please check email address.",
      });
    } finally {
      setReportLoading(false);
    }
  };

  // ---------- Stat cards (derived from real DB data) ----------
  const stats = summary
    ? [
        {
          title: "Total Sessions",
          value: String(summary.total_sessions),
          subtitle: "All time workouts",
          icon: Dumbbell,
          color: "cyan",
        },
        {
          title: "Total Reps",
          value: summary.total_reps.toLocaleString(),
          subtitle: "Across all exercises",
          icon: Activity,
          color: "blue",
        },
        {
          title: "Correct Reps",
          value: summary.correct_reps.toLocaleString(),
          subtitle: "Good form reps",
          icon: CheckCircle,
          color: "green",
        },
        {
          title: "Avg Accuracy",
          value: `${summary.avg_accuracy}%`,
          subtitle: "Pose precision",
          icon: Target,
          color: "purple",
        },
      ]
    : [];

  // ---------- Exercise breakdown for the "Today's Workout" panel ----------
  const exerciseBreakdown = summary?.exercise_breakdown
    ? Object.entries(summary.exercise_breakdown).map(([key, cnt]) => ({
        name: EXERCISE_LABELS[key] || key,
        sessions: cnt,
        // derive a pseudo-progress from sessions (max 10 = 100%)
        progress: Math.min(Math.round((cnt / 10) * 100), 100),
      }))
    : [];

  // ---------- Max reps in weekly data (for bar chart scaling) ----------
  const maxReps = weeklyData.length
    ? Math.max(...weeklyData.map(d => d.reps), 1)
    : 1;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 px-4 py-8 md:px-8">

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-cyan-50 blur-3xl" />
        <div className="absolute right-10 top-80 h-96 w-96 rounded-full bg-violet-50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">

        {/* ================= HEADER ================= */}
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold tracking-widest text-cyan-600">
              POSECARE · AI MOVEMENT & POSTURE DASHBOARD
            </p>
            <h1 className="mt-2 text-4xl font-black md:text-5xl text-slate-900">
              Welcome to <span className="text-cyan-600">PoseCare</span> 👋
            </h1>
            <p className="mt-3 text-slate-500 font-medium">
              Your posture. Your progress. Calibrated AI movement analytics.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => navigate("/ask-me")}
              className="group flex items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-5 py-3.5 font-bold text-cyan-700 shadow-sm transition hover:bg-cyan-50 hover:border-cyan-400"
            >
              <Bot size={18} className="text-cyan-600 animate-pulse" />
              Ask AI Coach
              <span className="rounded-full bg-cyan-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                New
              </span>
            </button>

            <button
              onClick={() => navigate("/pose-analysis")}
              className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-cyan-200/50 transition hover:-translate-y-1 hover:shadow-cyan-300"
            >
              <Play size={18} fill="currentColor" />
              Start AI Analysis
              <ArrowUpRight
                size={18}
                className="transition group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </button>
          </div>
        </div>

        {/* ================= ASK ME AI LIFESTYLE COACH HERO BANNER ================= */}
        <div className="mb-10 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-cyan-500/20">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
          <div className="absolute right-40 -bottom-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3 py-1 text-xs font-bold text-cyan-300 mb-3">
                <Bot size={14} className="text-cyan-400 animate-pulse" />
                NEW FEATURE · ASK AI HEALTH & LIFESTYLE COACH
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Sitting for long hours or feeling back & neck strain?
              </h2>
              <p className="mt-2 text-sm md:text-base text-slate-300 leading-relaxed font-normal">
                Talk to our clinical AI advisor via voice or text. Get tailor-made exercises designed for your workday habits to proactively prevent Text Neck, Anterior Pelvic Tilt, L5-S1 lumbar disc stress, and sciatica.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10">
                  🎙️ Voice & Text Chat
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10">
                  ⚡ 1-Click Launch Camera Workout
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-200 border border-white/10">
                  🛡️ Preventive Ergonomics
                </span>
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => navigate("/ask-me")}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-wide"
              >
                <MessageSquareHeart size={18} className="text-slate-950" />
                <span>Talk to AI Coach</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ================= STATS ================= */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-slate-500">
            Loading your stats…
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="
                    group relative overflow-hidden
                    rounded-2xl border border-slate-200
                    bg-white
                    p-6
                    backdrop-blur-xl
                    shadow-xl
                    transition duration-500
                    hover:-translate-y-2
                    hover:border-cyan-300
                    hover:bg-slate-50
                  "
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-50 blur-2xl transition group-hover:bg-cyan-500/20" />
                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="rounded-xl bg-cyan-50 p-3 text-cyan-600">
                        <Icon size={22} />
                      </div>
                      <TrendingUp size={18} className="text-emerald-600" />
                    </div>
                    <p className="text-sm text-slate-400">{stat.title}</p>
                    <h2 className="mt-1 text-3xl font-black">{stat.value}</h2>
                    <p className="mt-2 text-xs text-slate-500">{stat.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {/* ================= MAIN GRID ================= */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">

          {/* ================= EXERCISE BREAKDOWN ================= */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-600">WORKOUT HISTORY</p>
                  <h2 className="mt-1 text-2xl font-bold">Exercise Breakdown</h2>
                </div>
                <Dumbbell className="text-cyan-600" />
              </div>

              {exerciseBreakdown.length === 0 ? (
                <p className="text-slate-500">No sessions logged yet.</p>
              ) : (
                <div className="space-y-4">
                  {exerciseBreakdown.map((ex, index) => (
                    <div
                      key={index}
                      className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-300 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                            <Activity size={22} />
                          </div>
                          <div>
                            <h3 className="font-bold">{ex.name}</h3>
                            <p className="text-sm text-slate-500">{ex.sessions} session{ex.sessions !== 1 ? "s" : ""} completed</p>
                          </div>
                        </div>
                        <CheckCircle
                          size={22}
                          className={ex.progress >= 80 ? "text-emerald-600" : "text-slate-400"}
                        />
                      </div>

                      <div className="mt-5">
                        <div className="mb-2 flex justify-between text-xs">
                          <span className="text-slate-500">Volume</span>
                          <span className="text-cyan-600">{ex.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                            style={{ width: `${ex.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


          {/* ================= POSTURE GOALS ================= */}
          <div>
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl">
              <div className="mb-7">
                <p className="text-sm text-violet-600">YOUR TARGETS</p>
                <h2 className="mt-1 text-2xl font-bold">Posture Goals</h2>
              </div>

              <div className="space-y-7">
                {[
                  {
                    title: "Complete 30 sessions",
                    current: summary?.total_sessions ?? 0,
                    total: 30,
                    icon: Dumbbell,
                  },
                  {
                    title: "Reach 5,000 reps",
                    current: summary?.total_reps ?? 0,
                    total: 5000,
                    icon: Activity,
                  },
                  {
                    title: "90% average accuracy",
                    current: summary?.avg_accuracy ?? 0,
                    total: 90,
                    icon: Target,
                  },
                ].map((goal, index) => {
                  const Icon = goal.icon;
                  const pct = Math.min((goal.current / goal.total) * 100, 100);
                  return (
                    <div key={index}>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                          <Icon size={18} />
                        </div>
                        <p className="text-sm font-medium">{goal.title}</p>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{typeof goal.current === "number" && goal.current > 100 ? goal.current.toLocaleString() : goal.current}</span>
                        <span>{goal.total.toLocaleString()}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trophy */}
              <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="font-bold">Keep Going!</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {summary
                        ? `${Math.min(Math.round((summary.total_sessions / 30) * 100), 100)}% closer to your session goal.`
                        : "Track your first workout!"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>


        {/* ================= WEEKLY ACTIVITY (REAL DATA) ================= */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-cyan-600">REPS BY DAY</p>
              <h2 className="mt-1 text-2xl font-bold">Weekly Activity</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <TrendingUp size={18} />
              Live from your workout data
            </div>
          </div>

          <div className="mt-8 flex h-48 items-end justify-between gap-3">
            {(weeklyData.length
              ? weeklyData
              : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => ({ day: d, reps: 0 }))
            ).map(({ day, reps }) => (
              <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-3">
                <span className="text-xs text-cyan-600 opacity-0 group-hover:opacity-100">
                  {reps}
                </span>
                <div
                  className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-cyan-500 to-blue-400 opacity-80 transition hover:opacity-100"
                  style={{ height: `${Math.max((reps / maxReps) * 100, 4)}%` }}
                  title={`${reps} reps`}
                />
                <span className="text-xs text-slate-500">{day}</span>
              </div>
            ))}
          </div>
        </div>


        {/* ================= RECENT SESSIONS ================= */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-cyan-600">RECENT ACTIVITY</p>
              <h2 className="mt-1 text-2xl font-bold">Last Sessions</h2>
            </div>
            <Clock className="text-slate-500" />
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-slate-500">No recent sessions yet. Start your first workout!</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-slate-50"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-cyan-50 p-2 text-cyan-600">
                      <Zap size={14} />
                    </div>
                    <p className="text-sm font-bold">
                      {EXERCISE_LABELS[s.exercise_type] || s.exercise_type}
                    </p>
                  </div>
                  <p className={`text-2xl font-black ${accuracyColor(s.accuracy)}`}>
                    {s.accuracy}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Accuracy</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${accuracyBg(s.accuracy)}`}
                      style={{ width: `${s.accuracy}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {s.correct_reps}/{s.total_reps} correct reps
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {s.started_at ? new Date(s.started_at).toLocaleDateString() : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* ================= EMAIL PROGRESS REPORT (CELERY & REDIS) ================= */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-900/[0.03] via-white to-blue-900/[0.03] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-cyan-600 mb-1">
                <Mail size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Automated Digest · Celery & Redis Worker
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Email Progress & Posture Reports
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Receive comprehensive HTML reports with joint accuracy breakdowns, AI coaching tips, and workout streaks delivered straight to your email.
              </p>
            </div>

            {/* Email Input & Actions */}
            <div className="w-full lg:w-auto space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-cyan-500 min-w-[260px]">
                  <Mail size={16} className="text-slate-400 mr-2 shrink-0" />
                  <input
                    type="email"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    placeholder="Enter email for report"
                    className="w-full text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendReport("daily")}
                    disabled={reportLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-2xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {reportLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Daily Report
                  </button>

                  <button
                    onClick={() => handleSendReport("monthly")}
                    disabled={reportLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-2.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
                  >
                    {reportLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Monthly Report
                  </button>
                </div>
              </div>

              {reportStatus && (
                <div
                  className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                    reportStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {reportStatus.type === "success" ? <Check size={16} className="text-emerald-600" /> : <Activity size={16} className="text-red-600" />}
                  <span>{reportStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= FOOTER CTA ================= */}
        <div className="my-10 overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-500/10 p-8 shadow-sm">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Ready for your next analysis?</h2>
              <p className="mt-2 text-slate-500 font-medium">
                Let AI analyze your movement and posture alignment in real time with Body Calibration.
              </p>
            </div>
            <button
              onClick={() => navigate("/pose-analysis")}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 font-bold text-white shadow-md shadow-cyan-600/20 transition hover:-translate-y-1 hover:shadow-cyan-600/30"
            >
              <Play size={18} fill="currentColor" />
              Start Pose Analysis
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;