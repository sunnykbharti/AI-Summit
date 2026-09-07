import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Filter,
  Flame,
  History,
  Loader2,
  Play,
  Search,
  Target,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  Zap,
  Award,
  Brain,
  ShieldCheck,
  Sparkles,
  Lightbulb,
} from "lucide-react";

import api, { fetchSessionsList, invalidateCache } from "../api/Api";

const DEFAULT_SESSIONS = [
  { id: 1, pose: "Squat", score: 94, repetitions: 24, duration: 320, status: "Completed", date: new Date().toISOString() },
  { id: 2, pose: "Push Ups", score: 89, repetitions: 20, duration: 240, status: "Completed", date: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, pose: "Surya Namaskar", score: 92, repetitions: 12, duration: 600, status: "Completed", date: new Date(Date.now() - 172800000).toISOString() },
  { id: 4, pose: "Lunges", score: 86, repetitions: 28, duration: 400, status: "Completed", date: new Date(Date.now() - 259200000).toISOString() },
];

const Sessions = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);

  const [search, setSearch] = useState("");
  const [filterPose, setFilterPose] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // ============================================================
  // FETCH SESSIONS (SWR CACHED - 0ms on page switch)
  // ============================================================

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async (force = false) => {
    try {
      setError("");
      const data = await fetchSessionsList(force);
      const list = Array.isArray(data) ? data : data?.sessions || [];
      if (list.length > 0) {
        setSessions(list);
      }
    } catch (err) {
      console.warn("Using offline demo sessions:", err?.message);
    }
  };

  // ============================================================
  // DELETE SESSION
  // ============================================================

  const deleteSession = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this session?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/sessions/${id}`);
      invalidateCache("/sessions");
      invalidateCache("/dashboard");

      setSessions((previous) =>
        previous.filter((session) => session.id !== id)
      );
    } catch (err) {
      console.error("Delete failed:", err);

      alert(
        err.response?.data?.message ||
          "Unable to delete session."
      );
    }
  };

  // ============================================================
  // NORMALIZE DATA
  // ============================================================

  const normalizedSessions = useMemo(() => {
    return sessions.map((session) => ({
      ...session,

      pose:
        session.pose ||
        session.exercise ||
        session.pose_name ||
        "Unknown",

      score:
        session.score ??
        session.accuracy ??
        session.form_score ??
        0,

      repetitions:
        session.repetitions ??
        session.reps ??
        session.rep_count ??
        0,

      duration:
        session.duration ??
        session.duration_seconds ??
        0,

      status:
        session.status ||
        "Completed",

      date:
        session.date ||
        session.created_at ||
        session.createdAt ||
        null,
    }));
  }, [sessions]);

  // ============================================================
  // FILTER
  // ============================================================

  const filteredSessions = useMemo(() => {
    return normalizedSessions.filter((session) => {
      const matchesSearch =
        session.pose
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesPose =
        filterPose === "All" ||
        session.pose === filterPose;

      const matchesStatus =
        filterStatus === "All" ||
        session.status === filterStatus;

      return (
        matchesSearch &&
        matchesPose &&
        matchesStatus
      );
    });
  }, [
    normalizedSessions,
    search,
    filterPose,
    filterStatus,
  ]);

  // ============================================================
  // STATS
  // ============================================================

  const totalSessions = normalizedSessions.length;

  const totalReps = normalizedSessions.reduce(
    (total, session) =>
      total + Number(session.repetitions || 0),
    0
  );

  const averageScore =
    totalSessions > 0
      ? Math.round(
          normalizedSessions.reduce(
            (total, session) =>
              total + Number(session.score || 0),
            0
          ) / totalSessions
        )
      : 0;

  const totalMinutes = Math.round(
    normalizedSessions.reduce(
      (total, session) =>
        total + Number(session.duration || 0),
      0
    ) / 60
  );

  // ============================================================
  // POSE LIST
  // ============================================================

  const poses = [
    "All",
    ...new Set(
      normalizedSessions.map(
        (session) => session.pose
      )
    ),
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">

      {/* ========================================================
          BACKGROUND
      ======================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[140px]" />

        <div className="absolute right-[-15%] top-[20%] h-[600px] w-[600px] rounded-full bg-blue-50 blur-[150px]" />

        <div className="absolute bottom-[-20%] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-50 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

      </div>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

          <div>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700">

              <History size={14} />

              SESSION HISTORY

            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl">

              Your Sessions

            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">

              Review your previous movement analysis sessions,
              performance scores, repetitions and progress.

            </p>

          </div>

          <button
            onClick={() => navigate("/pose-analysis")}
            className="group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-cyan-200/30 transition hover:-translate-y-1 hover:shadow-cyan-300/40"
          >

            <Play
              size={17}
              fill="currentColor"
            />

            New Analysis

            <ArrowRight
              size={17}
              className="transition group-hover:translate-x-1"
            />

          </button>

        </div>


        {/* ======================================================
            STATS
        ====================================================== */}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            icon={<History size={20} />}
            title="Total Sessions"
            value={totalSessions}
            description="Analysis sessions"
          />

          <StatCard
            icon={<Target size={20} />}
            title="Average Score"
            value={`${averageScore}%`}
            description="Movement accuracy"
          />

          <StatCard
            icon={<Dumbbell size={20} />}
            title="Total Reps"
            value={totalReps}
            description="Repetitions completed"
          />

          <StatCard
            icon={<Clock3 size={20} />}
            title="Training Time"
            value={`${totalMinutes}m`}
            description="Total analysis time"
          />

        </div>


        {/* ======================================================
            FILTER BAR
        ====================================================== */}

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-4 backdrop-blur-xl">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

            {/* Search */}

            <div className="relative flex-1">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                placeholder="Search sessions..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />

            </div>


            {/* Pose filter */}

            <div className="flex items-center gap-2">

              <Filter
                size={17}
                className="text-slate-500"
              />

              <select
                value={filterPose}
                onChange={(e) =>
                  setFilterPose(e.target.value)
                }
                className="rounded-2xl border border-slate-200 bg-[#0b1220] px-4 py-3 text-sm text-slate-500 outline-none focus:border-cyan-400/40"
              >

                {poses.map((pose) => (
                  <option
                    key={pose}
                    value={pose}
                  >
                    {pose}
                  </option>
                ))}

              </select>

            </div>


            {/* Status */}

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value)
              }
              className="rounded-2xl border border-slate-200 bg-[#0b1220] px-4 py-3 text-sm text-slate-500 outline-none focus:border-cyan-400/40"
            >

              <option value="All">
                All Status
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Failed">
                Failed
              </option>

            </select>

          </div>

        </div>


        {/* ======================================================
            SESSION CONTENT
        ====================================================== */}

        <div className="mt-8">

          {/* LOADING */}

          {loading && (

            <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-slate-200 bg-white/[0.03]">

              <div className="text-center">

                <Loader2
                  size={35}
                  className="mx-auto animate-spin text-cyan-600"
                />

                <p className="mt-4 text-sm text-slate-500">
                  Loading your sessions...
                </p>

              </div>

            </div>

          )}


          {/* ERROR */}

          {!loading && error && (

            <div className="rounded-3xl border border-red-400/10 bg-red-400/[0.04] p-10 text-center">

              <XCircle
                size={40}
                className="mx-auto text-red-600"
              />

              <h3 className="mt-4 text-lg font-bold">
                Unable to load sessions
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {error}
              </p>

              <button
                onClick={fetchSessions}
                className="mt-6 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15"
              >
                Try Again
              </button>

            </div>

          )}


          {/* EMPTY */}

          {!loading &&
            !error &&
            filteredSessions.length === 0 && (

              <div className="rounded-3xl border border-slate-200 bg-white/[0.03] px-6 py-20 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-600">

                  <Activity size={28} />

                </div>

                <h3 className="mt-6 text-xl font-bold">
                  No sessions found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

                  {sessions.length === 0
                    ? "Start your first pose analysis session and your results will appear here."
                    : "Try changing your search or filters."}

                </p>

                {sessions.length === 0 && (

                  <button
                    onClick={() => navigate("/pose-analysis")}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-bold text-white"
                  >

                    Start Analysis

                    <ArrowRight size={16} />

                  </button>

                )}

              </div>

            )}


          {/* SESSION GRID */}

          {!loading &&
            !error &&
            filteredSessions.length > 0 && (

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                {filteredSessions.map(
                  (session, index) => (

                    <SessionCard
                      key={session.id || index}
                      session={session}
                      onViewDetails={(s) => setSelectedSession(s)}
                      onDelete={
                        session.id
                          ? deleteSession
                          : null
                      }
                    />

                  )
                )}

              </div>

            )}

        </div>

      </main>

      {/* ====================================================
          SESSION DETAILS MODAL
      ==================================================== */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-cyan-200 bg-white p-6 sm:p-8 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedSession.pose}
                </h3>
                <p className="text-xs text-slate-400">
                  {formatDate(selectedSession.date)}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Score</p>
                <p className="text-lg font-black text-cyan-700">{selectedSession.score}%</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Reps</p>
                <p className="text-lg font-black text-slate-800">{selectedSession.repetitions}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                <p className="text-lg font-black text-slate-800">{formatDuration(selectedSession.duration)}</p>
              </div>
            </div>

            {/* AI Summary / Feedback */}
            {(() => {
              let report = selectedSession.ai_report;
              if (!report && selectedSession.ai_summary && typeof selectedSession.ai_summary === "string" && selectedSession.ai_summary.trim().startsWith("{")) {
                try {
                  report = JSON.parse(selectedSession.ai_summary);
                } catch {
                  report = null;
                }
              }

              if (report && typeof report === "object") {
                return (
                  <div className="space-y-3.5 mb-6 text-left">
                    {/* Grade & Diagnostic Headline */}
                    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 p-4 text-white shadow-lg flex items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white font-black text-xl shadow-md ring-2 ring-cyan-400/30">
                        {report.form_grade || (selectedSession.score >= 80 ? "A" : selectedSession.score >= 60 ? "B" : "C")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 flex items-center gap-1">
                          <Sparkles size={11} /> {report.score_text || "AI Diagnostic"}
                        </span>
                        <h4 className="font-bold text-sm text-white truncate mt-0.5">
                          {report.headline || "Biomechanical Performance"}
                        </h4>
                      </div>
                    </div>

                    {/* Overview */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5">
                      <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1 mb-1">
                        <Brain size={13} className="text-cyan-600" /> AI Kinematic Synthesis
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {report.overview}
                      </p>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {report.key_strengths && report.key_strengths.length > 0 && (
                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Kinetic Strengths
                          </p>
                          <ul className="space-y-1 text-xs text-slate-700">
                            {report.key_strengths.map((str, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold">•</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {report.areas_for_improvement && report.areas_for_improvement.length > 0 && (
                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-1.5">
                            <Target size={12} className="text-amber-600" /> Adjustments Needed
                          </p>
                          <ul className="space-y-1 text-xs text-slate-700">
                            {report.areas_for_improvement.map((imp, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-amber-600 font-bold">•</span>
                                <span>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Safety note */}
                    {report.safety_note && (
                      <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3 text-xs text-slate-700 flex items-start gap-2">
                        <ShieldCheck size={15} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">Safety Tip:</strong> {report.safety_note}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return selectedSession.ai_summary ? (
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 mb-6 text-left">
                  <div className="flex items-center gap-2 text-cyan-800 font-bold text-xs mb-1.5">
                    <Award size={16} />
                    <span>AI Performance Analysis</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedSession.ai_summary}
                  </p>
                </div>
              ) : null;
            })()}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedSession(null);
                  navigate("/pose-analysis");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:-translate-y-0.5"
              >
                <Play size={15} />
                Analyze Again
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({
  icon,
  title,
  value,
  description,
}) => {

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200">

      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-50 blur-3xl transition group-hover:bg-cyan-500/20" />

      <div className="relative">

        <div className="flex items-center justify-between">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600">

            {icon}

          </div>

          <TrendingUp
            size={16}
            className="text-slate-500"
          />

        </div>

        <p className="mt-5 text-3xl font-black">
          {value}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>

      </div>

    </div>
  );
};


// ============================================================
// SESSION CARD
// ============================================================

const SessionCard = ({
  session,
  onDelete,
  onViewDetails,
}) => {

  const score = Number(session.score || 0);

  const scoreLabel =
    score >= 90
      ? "Excellent"
      : score >= 75
      ? "Good"
      : score >= 50
      ? "Needs Improvement"
      : "Poor";

  const scoreIcon =
    score >= 75 ? (
      <CheckCircle2 size={16} />
    ) : (
      <Zap size={16} />
    );

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-cyan-200 hover:bg-slate-50">

      {/* Glow */}

      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-50 blur-3xl transition group-hover:bg-cyan-500/20" />


      <div className="relative">

        {/* Header */}

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-600">

              <Activity size={22} />

            </div>

            <div>

              <h3 className="font-bold text-slate-900">
                {session.pose}
              </h3>

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                <CalendarDays size={12} />

                {formatDate(session.date)}

              </div>

            </div>

          </div>


          {/* Status */}

          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              session.status
                .toLowerCase()
                .includes("complete")
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {session.status}
          </span>

        </div>


        {/* Score */}

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs uppercase tracking-wider text-slate-400">
                Form Score
              </p>

              <p className="mt-1 text-3xl font-black">
                {score}%
              </p>

            </div>

            <div className="text-right">

              <div
                className={`flex items-center gap-1 text-xs font-semibold ${
                  score >= 75
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {scoreIcon}
                {scoreLabel}
              </div>

            </div>

          </div>


          {/* Progress */}

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-50">

            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{
                width: `${Math.min(
                  Math.max(score, 0),
                  100
                )}%`,
              }}
            />

          </div>

        </div>


        {/* Metrics */}

        <div className="mt-4 grid grid-cols-3 gap-2">

          <SessionMetric
            icon={<Dumbbell size={14} />}
            label="Reps"
            value={session.repetitions}
          />

          <SessionMetric
            icon={<Clock3 size={14} />}
            label="Time"
            value={formatDuration(
              session.duration
            )}
          />

          <SessionMetric
            icon={<Flame size={14} />}
            label="Type"
            value="AI"
          />

        </div>


        {/* Bottom */}

        <div className="mt-5 flex items-center gap-2">

          <button
            onClick={() => onViewDetails ? onViewDetails(session) : null}
            className="group/button flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/[0.03] py-3 text-xs font-semibold text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
          >

            View Details

            <ArrowRight
              size={14}
              className="transition group-hover/button:translate-x-1"
            />

          </button>


          {onDelete && (

            <button
              onClick={() =>
                onDelete(session.id)
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.04] text-red-600 transition hover:bg-red-50"
              title="Delete session"
            >

              <Trash2 size={16} />

            </button>

          )}

        </div>

      </div>

    </div>
  );
};


// ============================================================
// SESSION METRIC
// ============================================================

const SessionMetric = ({
  icon,
  label,
  value,
}) => {

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">

      <div className="flex items-center gap-1.5 text-slate-400">

        {icon}

        <span className="text-[10px]">
          {label}
        </span>

      </div>

      <p className="mt-1 text-sm font-bold text-slate-500">
        {value}
      </p>

    </div>
  );
};


// ============================================================
// FORMAT DATE
// ============================================================

const formatDate = (date) => {

  if (!date) return "Unknown date";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};


// ============================================================
// FORMAT DURATION
// ============================================================

const formatDuration = (seconds) => {

  const totalSeconds = Number(seconds || 0);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  return remainingSeconds
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
};


export default Sessions;