import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

const Progress = () => {
  const navigate = useNavigate();
  // ============================================================
  // SAMPLE DATA
  // Later you can fetch this from your Flask backend using axios
  // ============================================================

  const weeklyData = [
    { day: "Mon", value: 72 },
    { day: "Tue", value: 85 },
    { day: "Wed", value: 64 },
    { day: "Thu", value: 92 },
    { day: "Fri", value: 78 },
    { day: "Sat", value: 96 },
    { day: "Sun", value: 88 },
  ];

  const recentSessions = [
    {
      exercise: "Squats",
      date: "Today, 10:30 AM",
      duration: "12 min",
      score: 94,
      reps: 32,
      icon: <Dumbbell size={18} />,
    },
    {
      exercise: "Push Ups",
      date: "Yesterday, 6:20 PM",
      duration: "8 min",
      score: 89,
      reps: 24,
      icon: <Activity size={18} />,
    },
    {
      exercise: "Surya Namaskar",
      date: "Aug 10, 7:15 AM",
      duration: "15 min",
      score: 92,
      reps: 12,
      icon: <Zap size={18} />,
    },
    {
      exercise: "Lunges",
      date: "Aug 9, 6:40 PM",
      duration: "10 min",
      score: 86,
      reps: 28,
      icon: <Dumbbell size={18} />,
    },
  ];

  const achievements = [
    {
      title: "7 Day Streak",
      description: "Completed exercise for 7 consecutive days",
      icon: <Flame size={22} />,
      unlocked: true,
    },
    {
      title: "100 Reps",
      description: "Completed more than 100 exercise reps",
      icon: <Target size={22} />,
      unlocked: true,
    },
    {
      title: "Perfect Form",
      description: "Achieved a 95%+ posture score",
      icon: <Award size={22} />,
      unlocked: true,
    },
    {
      title: "Consistency Pro",
      description: "Complete 30 sessions",
      icon: <Trophy size={22} />,
      unlocked: false,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">

      {/* ============================================================
          BACKGROUND
      ============================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute left-[-10%] top-[-10%] h-[450px] w-[450px] rounded-full bg-cyan-50 blur-[140px]" />

        <div className="absolute right-[-10%] top-[20%] h-[550px] w-[550px] rounded-full bg-blue-50 blur-[150px]" />

        <div className="absolute bottom-[-15%] left-[35%] h-[450px] w-[450px] rounded-full bg-violet-50 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

      </div>


      {/* ============================================================
          MAIN
      ============================================================ */}

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:px-8">

        {/* ============================================================
            HEADER
        ============================================================ */}

        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-600">

              <TrendingUp size={14} />

              PERFORMANCE OVERVIEW

            </div>

            <h1 className="text-3xl font-black tracking-tight md:text-4xl">

              Your Progress

            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 md:text-base">

              Track your workouts, monitor your consistency, and
              see how your movement performance is improving.

            </p>

          </div>


          {/* Date selector */}

          <button className="flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-cyan-200 hover:bg-white/[0.06]">

            <CalendarDays
              size={17}
              className="text-cyan-600"
            />

            This Week

            <ChevronRight size={15} />

          </button>

        </div>


        {/* ============================================================
            STATS
        ============================================================ */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <ProgressCard
            icon={<Activity size={20} />}
            title="Total Sessions"
            value="24"
            change="+12%"
            positive
            description="vs last week"
          />

          <ProgressCard
            icon={<Flame size={20} />}
            title="Current Streak"
            value="7 Days"
            change="+2"
            positive
            description="days completed"
          />

          <ProgressCard
            icon={<Target size={20} />}
            title="Avg. Score"
            value="91.4%"
            change="+4.8%"
            positive
            description="movement accuracy"
          />

          <ProgressCard
            icon={<Dumbbell size={20} />}
            title="Total Reps"
            value="486"
            change="+68"
            positive
            description="this week"
          />

        </div>


        {/* ============================================================
            MAIN GRID
        ============================================================ */}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">

          {/* ========================================================
              WEEKLY CHART
          ======================================================== */}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl lg:col-span-2">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Weekly Performance
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Movement Score
                </h2>

              </div>

              <div className="flex items-center gap-2 text-xs text-cyan-600">

                <span className="h-2 w-2 rounded-full bg-cyan-400" />

                Score

              </div>

            </div>


            {/* Chart */}

            <div className="mt-8">

              <div className="flex h-[260px] items-end justify-between gap-3 border-b border-slate-100 px-2">

                {weeklyData.map((item, index) => (

                  <div
                    key={item.day}
                    className="group flex h-full flex-1 flex-col items-center justify-end"
                  >

                    {/* Value */}

                    <span className="mb-2 text-xs font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
                      {item.value}%
                    </span>


                    {/* Bar */}

                    <div
                      className="relative w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-cyan-500/30 to-cyan-400 transition-all duration-500 group-hover:from-cyan-500/60 group-hover:to-cyan-300"
                      style={{
                        height: `${item.value * 2}px`,
                      }}
                    >

                      <div className="absolute left-1/2 top-0 h-1 w-2 -translate-x-1/2 rounded-full bg-cyan-300 opacity-0 shadow-[0_0_15px_#22d3ee] transition group-hover:opacity-100" />

                    </div>


                    {/* Day */}

                    <span className="mt-3 text-xs font-medium text-slate-400">
                      {item.day}
                    </span>

                  </div>

                ))}

              </div>

            </div>


            {/* Bottom insight */}

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-400/10 bg-emerald-500/[0.04] p-4">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">

                <TrendingUp size={18} />

              </div>

              <div>

                <p className="text-sm font-semibold text-slate-800">
                  You're improving!
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Your average movement score is 4.8% higher than last week.
                </p>

              </div>

            </div>

          </section>


          {/* ========================================================
              WEEKLY GOAL
          ======================================================== */}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Weekly Goal
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Stay Consistent
                </h2>

              </div>

              <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-600">

                <Target size={20} />

              </div>

            </div>


            {/* Circular progress */}

            <div className="relative mx-auto mt-10 flex h-48 w-48 items-center justify-center">

              <div className="absolute inset-0 rounded-full border-[14px] border-slate-100" />

              <div
                className="absolute inset-0 rounded-full border-[14px] border-transparent border-t-cyan-400 border-r-cyan-400 border-l-blue-500 rotate-[25deg]"
              />

              <div className="text-center">

                <p className="text-4xl font-black">
                  75%
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Goal completed
                </p>

              </div>

            </div>


            <div className="mt-8 space-y-4">

              <GoalRow
                label="Workout Sessions"
                current="6"
                target="8"
              />

              <GoalRow
                label="Exercise Reps"
                current="486"
                target="600"
              />

              <GoalRow
                label="Active Minutes"
                current="72"
                target="100"
              />

            </div>

          </section>

        </div>


        {/* ============================================================
            RECENT SESSIONS
        ============================================================ */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Activity
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Recent Sessions
              </h2>

            </div>

            <button className="flex items-center gap-1 text-sm font-semibold text-cyan-600 transition hover:text-cyan-700">

              View All

              <ChevronRight size={16} />

            </button>

          </div>


          <div className="mt-6 space-y-3">

            {recentSessions.map((session) => (

              <div
                key={`${session.exercise}-${session.date}`}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-cyan-400/15 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600 transition group-hover:scale-105">

                    {session.icon}

                  </div>

                  <div>

                    <p className="font-semibold text-slate-800">
                      {session.exercise}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {session.date} • {session.duration}
                    </p>

                  </div>

                </div>


                <div className="flex items-center gap-6">

                  <div>

                    <p className="text-xs text-slate-400">
                      REPS
                    </p>

                    <p className="mt-1 font-bold">
                      {session.reps}
                    </p>

                  </div>


                  <div>

                    <p className="text-xs text-slate-400">
                      SCORE
                    </p>

                    <p className="mt-1 font-bold text-cyan-600">
                      {session.score}%
                    </p>

                  </div>


                  <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-cyan-50 group-hover:text-cyan-600 sm:flex">

                    <ChevronRight size={17} />

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>


        {/* ============================================================
            ACHIEVEMENTS
        ============================================================ */}

        <section className="mt-6">

          <div className="mb-5">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Milestones
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Achievements
            </h2>

          </div>


          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {achievements.map((achievement) => (

              <div
                key={achievement.title}
                className={`relative overflow-hidden rounded-2xl border p-5 transition duration-300 ${
                  achievement.unlocked
                    ? "border-cyan-400/15 bg-cyan-400/[0.04] hover:-translate-y-1 hover:border-cyan-300"
                    : "border-slate-100 bg-white opacity-60"
                }`}
              >

                {achievement.unlocked && (

                  <div className="absolute right-4 top-4">

                    <CheckCircle2
                      size={16}
                      className="text-cyan-600"
                    />

                  </div>

                )}


                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    achievement.unlocked
                      ? "bg-cyan-50 text-cyan-600"
                      : "bg-slate-50 text-slate-400"
                  }`}
                >

                  {achievement.icon}

                </div>


                <h3 className="mt-5 font-bold text-slate-800">
                  {achievement.title}
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {achievement.description}
                </p>

              </div>

            ))}

          </div>

        </section>


        {/* ============================================================
            MOTIVATION
        ============================================================ */}

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-500/[0.08] via-blue-500/[0.06] to-violet-600/[0.08] p-7">

          <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-cyan-50 blur-[70px]" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">

                <Trophy size={23} />

              </div>

              <div>

                <h3 className="font-bold">
                  Keep going!
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  You're only 2 sessions away from your weekly goal.
                </p>

              </div>

            </div>


            <button
              onClick={() => navigate("/pose-analysis")}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-100/40 transition hover:-translate-y-0.5"
            >

              Start Workout

              <ArrowUp size={16} />

            </button>

          </div>

        </section>

      </main>

    </div>
  );
};


// ============================================================
// PROGRESS CARD
// ============================================================

const ProgressCard = ({
  icon,
  title,
  value,
  change,
  positive,
  description,
}) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:bg-slate-50">

      <div className="flex items-start justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600 transition group-hover:scale-105">

          {icon}

        </div>

        <div
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }`}
        >

          {positive ? (
            <ArrowUp size={11} />
          ) : (
            <ArrowDown size={11} />
          )}

          {change}

        </div>

      </div>


      <p className="mt-5 text-xs font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
};


// ============================================================
// GOAL ROW
// ============================================================

const GoalRow = ({ label, current, target }) => {

  const percentage = Math.min(
    100,
    Math.round((Number(current) / Number(target)) * 100)
  );

  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span className="text-xs text-slate-500">
          {label}
        </span>

        <span className="text-xs font-semibold text-slate-400">
          {current} / {target}
        </span>

      </div>


      <div className="h-1.5 overflow-hidden rounded-full bg-slate-50">

        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
};


export default Progress;