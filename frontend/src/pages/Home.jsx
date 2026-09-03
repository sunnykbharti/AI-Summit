import { useNavigate } from "react-router-dom";

import {
  Activity,
  Brain,
  Camera,
  Dumbbell,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Play,
  Zap,
  Target,
  HeartPulse,
  CheckCircle2,
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  // ============================================================
  // START ANALYSIS
  // ============================================================

  const handleStartAnalysis = () => {
    const token = localStorage.getItem("token");

    if (token) {
      navigate("/pose-analysis");
    } else {
      navigate("/login");
    }
  };

  // ============================================================
  // HOME
  // ============================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">

      {/* ========================================================
          BACKGROUND
      ======================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Cyan glow */}
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-100 blur-[130px]" />

        {/* Blue glow */}
        <div className="absolute right-[-10%] top-[20%] h-[600px] w-[600px] rounded-full bg-blue-50 blur-[150px]" />

        {/* Purple glow */}
        <div className="absolute bottom-[-20%] left-[25%] h-[500px] w-[500px] rounded-full bg-violet-100 blur-[140px]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

      </div>


      {/* ========================================================
          HERO
      ======================================================== */}

      <section className="relative mx-auto max-w-7xl px-6 pt-20">

        <div className="grid min-h-[85vh] items-center gap-16 lg:grid-cols-2">

          {/* ====================================================
              LEFT SIDE
          ==================================================== */}

          <div className="relative z-10">

            {/* Badge */}

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 shadow-lg shadow-cyan-100/40 backdrop-blur-xl">

              <span className="relative flex h-2 w-2">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />

              </span>

              AI Powered Movement Intelligence

              <Sparkles size={15} />

            </div>


            {/* Heading */}

            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl xl:text-8xl">

              Understand

              <span className="block bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">
                Every Move.
              </span>

            </h1>


            {/* Description */}

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400 md:text-xl">

              AI-powered pose detection that transforms your camera into an
              intelligent movement analysis system.

            </p>


            {/* ==================================================
                BUTTONS
            ================================================== */}

            <div className="mt-9 flex flex-wrap gap-4">

              {/* START ANALYSIS */}

              <button
                type="button"
                onClick={handleStartAnalysis}
                className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-7 py-4 font-bold text-white shadow-xl shadow-cyan-200/30 transition duration-300 hover:-translate-y-1 hover:shadow-cyan-300/40"
              >

                <Play
                  size={19}
                  fill="currentColor"
                />

                Start Analysis

                <ArrowRight
                  size={19}
                  className="transition group-hover:translate-x-1"
                />

              </button>


              {/* EXPLORE PLATFORM */}

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-7 py-4 font-semibold text-slate-900 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-slate-100"
              >

                Explore Platform

              </button>

            </div>


            {/* Trust */}

            <div className="mt-9 flex items-center gap-3 text-sm text-slate-500">

              <CheckCircle2
                size={17}
                className="text-cyan-600"
              />

              Real-time AI movement analysis

            </div>


            {/* ==================================================
                STATS
            ================================================== */}

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4">

              <Stat
                value="96%"
                label="Pose Accuracy"
              />

              <Stat
                value="24/7"
                label="AI Monitoring"
              />

              <Stat
                value="30+"
                label="Movements"
              />

            </div>

          </div>


          {/* ====================================================
              RIGHT SIDE — AI VISUAL
          ==================================================== */}

          <div className="relative flex min-h-[600px] items-center justify-center">

            {/* Main Glow */}

            <div className="absolute h-[420px] w-[420px] rounded-full bg-cyan-50 blur-[100px]" />


            {/* Rotating Rings */}

            <div className="absolute h-[480px] w-[480px] animate-[spin_25s_linear_infinite] rounded-full border border-cyan-100 border-dashed" />

            <div className="absolute h-[390px] w-[390px] animate-[spin_18s_linear_infinite_reverse] rounded-full border border-blue-400/10" />


            {/* ==================================================
                MAIN AI CARD
            ================================================== */}

            <div
              className="relative z-10 w-full max-w-[500px] rounded-[35px] border border-slate-200 bg-slate-50 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl transition-all duration-700"
              style={{
                transform:
                  "perspective(1200px) rotateY(-8deg) rotateX(5deg)",
              }}
            >

              {/* ==================================================
                  CARD HEADER
              ================================================== */}

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-cyan-50 p-3 text-cyan-600">
                    <Activity />
                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      LIVE ANALYSIS
                    </p>

                    <h3 className="font-bold">
                      Pose Intelligence
                    </h3>

                  </div>

                </div>


                {/* Active */}

                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

                  ACTIVE

                </div>

              </div>


              {/* ==================================================
                  HUMAN POSE
              ================================================== */}

              <div className="relative mx-auto my-8 h-[320px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-cyan-50/80 to-slate-100">

                {/* Scanning line */}

                <div className="absolute left-0 right-0 top-1/2 h-px animate-pulse bg-cyan-400/30 " />


                {/* Outer circle */}

                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100" />


                {/* Inner circle */}

                <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/10" />


                {/* HEAD */}

                <div className="absolute left-1/2 top-8 h-14 w-14 -translate-x-1/2 rounded-full border-[3px] border-cyan-300 bg-cyan-50 " />


                {/* BODY */}

                <div className="absolute left-1/2 top-[80px] h-[110px] w-[4px] -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500 " />


                {/* LEFT ARM */}

                <div className="absolute left-[29%] top-[105px] h-[4px] w-[150px] rotate-[18deg] rounded-full bg-cyan-300 " />


                {/* RIGHT ARM */}

                <div className="absolute right-[29%] top-[105px] h-[4px] w-[150px] -rotate-[18deg] rounded-full bg-cyan-300 " />


                {/* LEFT LEG */}

                <div className="absolute left-[43%] top-[185px] h-[125px] w-[4px] -rotate-[14deg] rounded-full bg-gradient-to-b from-blue-400 to-violet-600 " />


                {/* RIGHT LEG */}

                <div className="absolute right-[43%] top-[185px] h-[125px] w-[4px] rotate-[14deg] rounded-full bg-gradient-to-b from-blue-400 to-violet-600 " />


                {/* JOINTS */}

                {[
                  "top-16 left-1/2",
                  "top-[105px] left-[30%]",
                  "top-[105px] right-[30%]",
                  "top-[185px] left-1/2",
                  "bottom-5 left-[42%]",
                  "bottom-5 right-[42%]",
                ].map((position, index) => (

                  <div
                    key={index}
                    className={`absolute ${position} h-4 w-4 rounded-full border-2 border-white bg-cyan-400 `}
                  />

                ))}


                {/* AI TRACKING */}

                <div className="absolute left-5 top-5 rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-xs text-cyan-700 backdrop-blur-xl">

                  AI TRACKING

                </div>


                {/* LANDMARKS */}

                <div className="absolute bottom-5 right-5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-400 backdrop-blur-xl">

                  17 LANDMARKS

                </div>

              </div>


              {/* ==================================================
                  METRICS
              ================================================== */}

              <div className="grid grid-cols-3 gap-3">

                <Metric
                  icon={<Target size={15} />}
                  title="Accuracy"
                  value="96.8%"
                />

                <Metric
                  icon={<Activity size={15} />}
                  title="Posture"
                  value="Excellent"
                />

                <Metric
                  icon={<Zap size={15} />}
                  title="Reps"
                  value="24"
                />

              </div>

            </div>


            {/* ==================================================
                FLOATING POSTURE CARD
            ================================================== */}

            <div className="absolute -left-4 top-24 z-20 hidden animate-bounce rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-2xl backdrop-blur-xl md:block">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <HeartPulse size={20} />
                </div>

                <div>

                  <p className="text-xs text-slate-500">
                    POSTURE
                  </p>

                  <p className="font-bold text-emerald-600">
                    Excellent
                  </p>

                </div>

              </div>

            </div>


            {/* ==================================================
                FLOATING CONFIDENCE CARD
            ================================================== */}

            <div className="absolute -right-5 bottom-32 z-20 hidden rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-2xl backdrop-blur-xl md:block">

              <p className="text-xs text-slate-500">
                AI CONFIDENCE
              </p>

              <div className="mt-2 flex items-center gap-3">

                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">

                  <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-cyan-600 to-blue-600" />

                </div>

                <span className="text-sm font-bold">
                  94%
                </span>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================
          FEATURES
      ======================================================== */}

      <section className="relative mx-auto max-w-7xl px-6 py-28">

        <div className="mb-16 text-center">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-600">

            <Sparkles size={14} />

            Intelligent Platform

          </div>


          <h2 className="text-4xl font-black md:text-6xl">

            Built Around Your

            <span className="block bg-gradient-to-r from-cyan-400 to-violet-600 bg-clip-text text-transparent">

              Movement

            </span>

          </h2>


          <p className="mx-auto mt-5 max-w-2xl text-slate-400">

            Advanced AI tools designed to understand your movement,
            analyze your performance and provide meaningful insights.

          </p>

        </div>


        {/* ======================================================
            FEATURE CARDS
        ====================================================== */}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          <Feature
            icon={<Camera />}
            title="Pose Detection"
            text="Real-time body landmark detection through your camera."
            onExplore={handleStartAnalysis}
          />

          <Feature
            icon={<Brain />}
            title="AI Analysis"
            text="Intelligent analysis of movement patterns and posture."
            onExplore={handleStartAnalysis}
          />

          <Feature
            icon={<Dumbbell />}
            title="Exercise Tracking"
            text="Automatically recognize exercises and count repetitions."
            onExplore={handleStartAnalysis}
          />

          <Feature
            icon={<ShieldCheck />}
            title="Smart Monitoring"
            text="Identify incorrect movements and improve your technique."
            onExplore={handleStartAnalysis}
          />

        </div>

      </section>


      {/* ========================================================
          CTA
      ======================================================== */}

      <section className="relative mx-6 mb-20 overflow-hidden rounded-[35px] border border-slate-200 bg-gradient-to-br from-cyan-50 via-blue-50 to-violet-600/10 px-6 py-24 text-center shadow-2xl">

        {/* Glow */}

        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-50 blur-[100px]" />


        <div className="relative">

          {/* Icon */}

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-600 shadow-lg shadow-cyan-200/30">

            <Brain size={30} />

          </div>


          {/* Heading */}

          <h2 className="text-4xl font-black md:text-6xl">

            Your Movement.

            <br />

            <span className="bg-gradient-to-r from-cyan-400 to-violet-600 bg-clip-text text-transparent">

              Understood by AI.

            </span>

          </h2>


          {/* Description */}

          <p className="mx-auto mt-6 max-w-xl text-slate-400">

            Start your intelligent movement analysis journey today.

          </p>


          {/* CTA BUTTON */}

          <button
            type="button"
            onClick={handleStartAnalysis}
            className="mt-9 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-9 py-4 font-bold text-white shadow-xl shadow-cyan-200/30 transition hover:-translate-y-1 hover:shadow-cyan-300/40"
          >

            Start Analysis

          </button>

        </div>

      </section>

    </div>
  );
};


/* ==============================================================
   STAT COMPONENT
================================================================ */

const Stat = ({ value, label }) => {
  return (
    <div className="border-l border-slate-200 pl-4">

      <p className="text-2xl font-black md:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>

    </div>
  );
};


/* ==============================================================
   METRIC COMPONENT
================================================================ */

const Metric = ({ icon, title, value }) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">

      <div className="flex items-center gap-2 text-slate-500">

        {icon}

        <span className="text-xs">
          {title}
        </span>

      </div>

      <p className="mt-1 text-sm font-bold">
        {value}
      </p>

    </div>
  );
};


/* ==============================================================
   FEATURE COMPONENT
================================================================ */

const Feature = ({
  icon,
  title,
  text,
  onExplore,
}) => {
  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-7
        backdrop-blur-xl
        transition-all
        duration-500
        hover:-translate-y-3
        hover:border-cyan-300
        hover:bg-slate-50
        hover:shadow-2xl
        hover:shadow-cyan-100/40
      "
    >

      {/* Hover glow */}

      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-50 blur-3xl transition group-hover:bg-cyan-500/20" />


      <div className="relative">

        {/* Icon */}

        <div className="mb-6 inline-flex rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-600 transition duration-500 group-hover:scale-110 group-hover:rotate-6">

          {icon}

        </div>


        {/* Title */}

        <h3 className="text-xl font-bold">
          {title}
        </h3>


        {/* Description */}

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {text}
        </p>


        {/* Explore */}

        <button
          type="button"
          onClick={onExplore}
          className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-600"
        >

          Explore

          <ArrowRight
            size={14}
            className="transition group-hover:translate-x-1"
          />

        </button>

      </div>

    </div>
  );
};


export default Home;