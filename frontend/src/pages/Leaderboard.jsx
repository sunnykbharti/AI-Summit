import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Flame,
  Target,
  Sparkles,
  TrendingUp,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

const DEMO_LEADERBOARD = [
  {
    rank: 1,
    user_id: 101,
    name: "Dr. Ananya Sharma",
    role: "Doctor",
    accuracy: 96.8,
    correct_reps: 1240,
    sessions_count: 34,
    points: 13950,
    badge: "🥇 Posture Master",
    tier: "Gold",
  },
  {
    rank: 2,
    user_id: 102,
    name: "Rohan Mehta",
    role: "Engineer",
    accuracy: 93.2,
    correct_reps: 1045,
    sessions_count: 29,
    points: 11200,
    badge: "🥈 Form Elite",
    tier: "Silver",
  },
  {
    rank: 3,
    user_id: 103,
    name: "Priya Kapoor",
    role: "Student",
    accuracy: 91.5,
    correct_reps: 978,
    sessions_count: 26,
    points: 9870,
    badge: "🥉 Movement Pro",
    tier: "Bronze",
  },
  {
    rank: 4,
    user_id: 104,
    name: "Arjun Singh",
    role: "Athlete",
    accuracy: 88.7,
    correct_reps: 850,
    sessions_count: 22,
    points: 8300,
    badge: "⚡ Rising Star",
    tier: "Silver",
  },
  {
    rank: 5,
    user_id: 105,
    name: "Neha Gupta",
    role: "Trainer",
    accuracy: 86.4,
    correct_reps: 790,
    sessions_count: 20,
    points: 7650,
    badge: "🎯 Consistency Pro",
    tier: "Bronze",
  },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState(DEMO_LEADERBOARD);
  const [currentUserRank, setCurrentUserRank] = useState({
    rank: 4,
    accuracy: 94.2,
    points: 10450,
    badge: "🥈 Form Elite",
  });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("all_time");

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/leaderboard?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 2500 }
      );
      if (res.data?.leaderboard?.length) {
        setLeaderboard(res.data.leaderboard);
      }
      if (res.data?.current_user) {
        setCurrentUserRank(res.data.current_user);
      }
    } catch {
      // Fallback silently remains on demo data
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const remainingList = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-cyan-600 selection:text-white">

      {/* ── BACKGROUND GLOWS ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[140px]" />
        <div className="absolute -right-40 top-[20%] h-[550px] w-[550px] rounded-full bg-blue-50 blur-[150px]" />
        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-amber-50/60 blur-[140px]" />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">

        {/* ── HERO HEADER ── */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 p-8 shadow-xl">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-cyan-100/60 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3.5 py-1 text-xs font-semibold text-cyan-700 mb-3">
                <Sparkles size={14} className="text-cyan-600 animate-pulse" />
                Gamified Correctness &amp; Ergonomics
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 flex items-center gap-3">
                Posture &amp; Movement{" "}
                <span className="text-cyan-600">Leaderboard</span>
                <Trophy className="text-amber-500 animate-bounce" size={32} />
              </h1>

              <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
                Earn biomechanics training points for holding correct postures and maintaining high movement accuracy across workouts.
              </p>
            </div>

            {/* Period filter */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm self-start md:self-auto">
              {[
                { key: "daily", label: "Daily" },
                { key: "weekly", label: "Weekly" },
                { key: "monthly", label: "Monthly" },
                { key: "all_time", label: "All-Time" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPeriod(tab.key)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                    period === tab.key
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 scale-105"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── CURRENT USER RANK BANNER ── */}
        {currentUserRank && (
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 font-extrabold text-lg ring-2 ring-cyan-300">
                #{currentUserRank.rank}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  Your Current Standing
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-700 font-bold">
                    {currentUserRank.badge}
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Accuracy:{" "}
                  <strong className="text-emerald-600">{currentUserRank.accuracy}%</strong>{" "}
                  | Points:{" "}
                  <strong className="text-amber-600">{currentUserRank.points?.toLocaleString()} pts</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <Flame size={16} className="text-amber-500" />
              Keep practicing to level up your rank tier!
            </div>
          </div>
        )}

        {/* ── TOP 3 PODIUM ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-500" />
          </div>
        ) : topThree.length >= 3 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">

            {/* 2nd Place */}
            <div className="order-2 md:order-1 relative rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl flex flex-col justify-between transform hover:-translate-y-1 transition duration-300">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-400 text-white font-bold shadow-lg ring-4 ring-white">
                2
              </div>
              <div className="pt-4">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
                  <Medal size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{topThree[1]?.name}</h3>
                <span className="inline-block mt-1 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-500">
                  {topThree[1]?.badge}
                </span>
              </div>
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 space-y-2 border border-slate-100">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Accuracy</span>
                  <span className="font-bold text-cyan-600">{topThree[1]?.accuracy}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Correct</span>
                  <span className="font-bold text-slate-700">{topThree[1]?.correct_reps}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-xs font-bold text-amber-600">
                  <span>Score Points</span>
                  <span>{topThree[1]?.points?.toLocaleString()} pts</span>
                </div>
              </div>
            </div>

            {/* 1st Place — Gold Podium */}
            <div className="order-1 md:order-2 relative rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 via-white to-white p-6 text-center shadow-2xl flex flex-col justify-between transform md:-translate-y-4 hover:-translate-y-5 transition duration-300 ring-1 ring-amber-200">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white font-extrabold shadow-xl ring-4 ring-white text-lg">
                <Crown size={22} />
              </div>
              <div className="pt-6">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 shadow-lg shadow-amber-100 animate-pulse">
                  <Trophy size={40} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">{topThree[0]?.name}</h3>
                <span className="inline-block mt-1 rounded-full bg-amber-100 px-3.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                  {topThree[0]?.badge}
                </span>
              </div>
              <div className="mt-6 rounded-2xl bg-amber-50 p-4 space-y-2 border border-amber-200">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Accuracy</span>
                  <span className="font-extrabold text-emerald-600">{topThree[0]?.accuracy}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Correct</span>
                  <span className="font-bold text-slate-800">{topThree[0]?.correct_reps}</span>
                </div>
                <div className="border-t border-amber-200 pt-2 flex justify-between text-sm font-extrabold text-amber-600">
                  <span>Score Points</span>
                  <span>{topThree[0]?.points?.toLocaleString()} pts</span>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="order-3 relative rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-xl flex flex-col justify-between transform hover:-translate-y-1 transition duration-300">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-white font-bold shadow-lg ring-4 ring-white">
                3
              </div>
              <div className="pt-4">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Award size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{topThree[2]?.name}</h3>
                <span className="inline-block mt-1 rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
                  {topThree[2]?.badge}
                </span>
              </div>
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 space-y-2 border border-slate-100">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Accuracy</span>
                  <span className="font-bold text-cyan-600">{topThree[2]?.accuracy}%</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Correct</span>
                  <span className="font-bold text-slate-700">{topThree[2]?.correct_reps}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-xs font-bold text-amber-600">
                  <span>Score Points</span>
                  <span>{topThree[2]?.points?.toLocaleString()} pts</span>
                </div>
              </div>
            </div>

          </section>
        )}

        {/* ── FULL LEADERBOARD TABLE ── */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-slate-50 p-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-cyan-600" />
              Full Rank Standing
            </h3>
            <span className="text-xs text-slate-400 font-medium">Updated Real-Time</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Badge &amp; Tier</th>
                  <th className="px-6 py-4 text-center">Accuracy %</th>
                  <th className="px-6 py-4 text-center">Correct Reps</th>
                  <th className="px-6 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((item) => (
                  <tr
                    key={item.rank}
                    className={`transition hover:bg-cyan-50/40 ${
                      item.rank <= 3 ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-slate-700">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs ${
                          item.rank === 1
                            ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 font-extrabold"
                            : item.rank === 2
                            ? "bg-slate-100 text-slate-600 ring-1 ring-slate-300"
                            : item.rank === 3
                            ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200"
                            : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        #{item.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 font-bold text-xs border border-cyan-100">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {item.badge}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-emerald-600">{item.accuracy}%</span>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-700">
                      {item.correct_reps}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-amber-600">
                      {item.points?.toLocaleString()} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Leaderboard;
