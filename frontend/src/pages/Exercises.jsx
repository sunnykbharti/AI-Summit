import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Dumbbell,
  HeartPulse,
  Play,
  Search,
  Sparkles,
  StretchHorizontal,
  Target,
  Wind,
  X,
} from "lucide-react";

const exercises = [
  {
    id: 0,
    name: "Study & Interview Posture Guard",
    category: "Ergonomics",
    difficulty: "All Levels",
    duration: "Continuous",
    calories: "Focus Mode",
    description:
      "Monitors text neck, slouching, shoulder tilt, and proximity during study sessions and remote interviews.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=RqcOCb4IAL8",
    tags: ["Ergonomics", "Study", "Interview", "Text Neck"],
  },
  {
    id: 100,
    name: "Facial Reaction & Emotion Analysis",
    category: "Reaction & Emotion",
    difficulty: "All Levels",
    duration: "Continuous",
    calories: "Mind & Focus",
    description:
      "Real-time AI recognition of facial micro-expressions, physical tension, engagement levels, and fatigue.",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=RqcOCb4IAL8",
    tags: ["Facial AI", "Emotion", "Reaction", "Fatigue"],
    link: "/reaction-analysis",
  },
  {
    id: 1,
    name: "Squats",
    category: "Strength",
    difficulty: "Beginner",
    duration: "10 min",
    calories: "80 kcal",
    description:
      "A fundamental lower-body exercise that strengthens the legs and improves overall stability.",
    image:
      "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=aclHkVaku9U",
    tags: ["Legs", "Strength", "Lower Body"],
  },

  {
    id: 2,
    name: "Push Ups",
    category: "Strength",
    difficulty: "Beginner",
    duration: "8 min",
    calories: "70 kcal",
    description:
      "A classic bodyweight exercise targeting the chest, shoulders, arms and core.",
    image:
      "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=IODxDxX7oi4",
    tags: ["Chest", "Arms", "Core"],
  },

  {
    id: 3,
    name: "Surya Namaskar",
    category: "Yoga",
    difficulty: "Beginner",
    duration: "15 min",
    calories: "100 kcal",
    description:
      "A flowing sequence of yoga postures designed to improve flexibility, mobility and body awareness.",
    image:
      "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=6IUy8rFfB9E",
    tags: ["Yoga", "Flexibility", "Mobility"],
  },

  {
    id: 4,
    name: "Plank",
    category: "Core",
    difficulty: "Beginner",
    duration: "5 min",
    calories: "45 kcal",
    description:
      "An isometric exercise that develops core stability and improves body control.",
    image:
      "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=pSHjTRCQxIw",
    tags: ["Core", "Stability", "Balance"],
  },

  {
    id: 5,
    name: "Lunges",
    category: "Strength",
    difficulty: "Beginner",
    duration: "10 min",
    calories: "85 kcal",
    description:
      "A lower-body movement that helps develop leg strength, balance and coordination.",
    image:
      "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=QOVaHwm-Q6U",
    tags: ["Legs", "Balance", "Strength"],
  },

  {
    id: 6,
    name: "Mountain Pose",
    category: "Yoga",
    difficulty: "Beginner",
    duration: "5 min",
    calories: "25 kcal",
    description:
      "A foundational yoga posture that encourages posture awareness and controlled breathing.",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=NYhH8Gr35cI",
    tags: ["Yoga", "Posture", "Breathing"],
  },

  {
    id: 7,
    name: "Warrior II",
    category: "Yoga",
    difficulty: "Intermediate",
    duration: "8 min",
    calories: "50 kcal",
    description:
      "A standing yoga posture focused on leg strength, balance and controlled positioning.",
    image:
      "https://images.unsplash.com/photo-1599447292180-45fd84092ef4?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=Mn6RSIRCV3w",
    tags: ["Yoga", "Balance", "Legs"],
  },

  {
    id: 8,
    name: "Jumping Jacks",
    category: "Cardio",
    difficulty: "Beginner",
    duration: "7 min",
    calories: "90 kcal",
    description:
      "A simple cardio movement that increases heart rate and warms up the whole body.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=c4DAnQ6DtF8",
    tags: ["Cardio", "Warm Up", "Full Body"],
  },

  {
    id: 9,
    name: "Glute Bridge",
    category: "Strength",
    difficulty: "Beginner",
    duration: "8 min",
    calories: "60 kcal",
    description:
      "A controlled movement that targets the glutes and posterior chain while developing hip stability.",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=wPM8icPu6H8",
    tags: ["Glutes", "Hips", "Strength"],
  },

  {
    id: 10,
    name: "Child's Pose",
    category: "Yoga",
    difficulty: "Beginner",
    duration: "5 min",
    calories: "20 kcal",
    description:
      "A gentle yoga posture commonly used for relaxation and stretching.",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=2MJGg-dUKh0",
    tags: ["Yoga", "Stretching", "Relaxation"],
  },

  {
    id: 11,
    name: "High Knees",
    category: "Cardio",
    difficulty: "Intermediate",
    duration: "6 min",
    calories: "95 kcal",
    description:
      "A dynamic cardio movement that challenges coordination and lower-body endurance.",
    image:
      "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=8opcQdC-V-U",
    tags: ["Cardio", "Endurance", "Full Body"],
  },

  {
    id: 12,
    name: "Cat Cow Stretch",
    category: "Mobility",
    difficulty: "Beginner",
    duration: "6 min",
    calories: "30 kcal",
    description:
      "A gentle mobility exercise that moves the spine through controlled flexion and extension.",
    image:
      "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=900&q=80",
    video:
      "https://www.youtube.com/watch?v=y39PrKY_4JM",
    tags: ["Mobility", "Stretching", "Spine"],
  },
];

const categories = [
  "All",
  "Strength",
  "Yoga",
  "Cardio",
  "Core",
  "Mobility",
];

const difficulties = ["All", "Beginner", "Intermediate"];

const Exercises = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [selectedExercise, setSelectedExercise] = useState(null);

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(search.toLowerCase()) ||
        exercise.description
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        exercise.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        );

      const matchesCategory =
        category === "All" || exercise.category === category;

      const matchesDifficulty =
        difficulty === "All" || exercise.difficulty === difficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [search, category, difficulty]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[140px]" />

        <div className="absolute -right-40 top-[20%] h-[550px] w-[550px] rounded-full bg-blue-50 blur-[150px]" />

        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-50 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* =========================================================
          CONTENT
      ========================================================= */}

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        {/* =======================================================
            HEADER
        ======================================================= */}

        <section className="mb-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">
            <Sparkles size={14} />
            Movement Library
          </div>

          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Explore Your
                <span className="block bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 bg-clip-text text-transparent">
                  Movement Library
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                Learn exercises, yoga movements, mobility drills and
                strength routines with simple guided demonstrations.
              </p>
            </div>

            {/* Stats */}

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <LibraryStat
                icon={<Activity size={17} />}
                value="12+"
                label="Exercises"
              />

              <LibraryStat
                icon={<HeartPulse size={17} />}
                value="5"
                label="Categories"
              />

              <LibraryStat
                icon={<Target size={17} />}
                value="2"
                label="Levels"
              />
            </div>
          </div>
        </section>

        {/* =======================================================
            SEARCH
        ======================================================= */}

        <section className="mb-8">
          <div className="relative max-w-2xl">
            <Search
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises, yoga, mobility..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-12 text-sm text-slate-900 outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-cyan-400/40 focus:ring-4 focus:ring-cyan-200"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </section>

        {/* =======================================================
            FILTERS
        ======================================================= */}

        <section className="mb-10 space-y-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Category
            </p>

            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <FilterButton
                  key={item}
                  active={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </FilterButton>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Difficulty
            </p>

            <div className="flex flex-wrap gap-2">
              {difficulties.map((item) => (
                <FilterButton
                  key={item}
                  active={difficulty === item}
                  onClick={() => setDifficulty(item)}
                >
                  {item}
                </FilterButton>
              ))}
            </div>
          </div>
        </section>

        {/* =======================================================
            RESULTS HEADER
        ======================================================= */}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Exercises
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {filteredExercises.length} movement
              {filteredExercises.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* =======================================================
            EXERCISE GRID
        ======================================================= */}

        {filteredExercises.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onOpen={() => setSelectedExercise(exercise)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            onReset={() => {
              setSearch("");
              setCategory("All");
              setDifficulty("All");
            }}
          />
        )}
      </main>

      {/* =========================================================
          MODAL
      ========================================================= */}

      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
};

/* ===============================================================
   EXERCISE CARD
================================================================ */

const ExerciseCard = ({ exercise, onOpen }) => {
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-cyan-400/25 hover:bg-white/[0.055] hover:shadow-cyan-500/5">
      {/* Image */}

      <div className="relative h-56 overflow-hidden">
        <img
          src={exercise.image}
          alt={exercise.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-black/10" />

        {/* Category */}

        <div className="absolute left-4 top-4 rounded-full border border-slate-200 bg-black/50 px-3 py-1.5 text-xs font-semibold text-cyan-700 backdrop-blur-xl">
          {exercise.category}
        </div>

        {/* Difficulty */}

        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-black/50 px-3 py-1.5 text-xs font-medium text-slate-900 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {exercise.difficulty}
        </div>

        {/* Play */}

        <button
          onClick={onOpen}
          className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 transition duration-300 hover:scale-110"
        >
          <Play size={19} fill="currentColor" />
        </button>
      </div>

      {/* Content */}

      <div className="p-6">
        <h3 className="text-xl font-bold transition group-hover:text-cyan-700">
          {exercise.name}
        </h3>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
          {exercise.description}
        </p>

        {/* Meta */}

        <div className="mt-5 flex items-center gap-4 border-y border-slate-100 py-4">
          <MetaItem
            icon={<Clock3 size={15} />}
            value={exercise.duration}
          />

          <MetaItem
            icon={<Activity size={15} />}
            value={exercise.calories}
          />
        </div>

        {/* Tags */}

        <div className="mt-4 flex flex-wrap gap-2">
          {exercise.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Button */}

        <button
          onClick={onOpen}
          className="group/btn mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/[0.03] py-3 text-sm font-semibold text-slate-500 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
        >
          View Exercise

          <ArrowRight
            size={16}
            className="transition group-hover/btn:translate-x-1"
          />
        </button>
      </div>
    </article>
  );
};

/* ===============================================================
   MODAL
================================================================ */

const ExerciseModal = ({ exercise, onClose }) => {
  const navigate = useNavigate();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-[#07101f] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}

        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-black/50 text-slate-400 backdrop-blur-xl transition hover:text-slate-900"
        >
          <X size={20} />
        </button>

        {/* Image */}

        <div className="relative h-64 overflow-hidden sm:h-80">
          <img
            src={exercise.image}
            alt={exercise.name}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#07101f] via-transparent to-transparent" />

          <div className="absolute bottom-6 left-6">
            <p className="mb-2 text-sm font-semibold text-cyan-700">
              {exercise.category}
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              {exercise.name}
            </h2>
          </div>
        </div>

        {/* Body */}

        <div className="p-6 sm:p-8">
          <p className="leading-7 text-slate-400">
            {exercise.description}
          </p>

          {/* Stats */}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailBox
              icon={<Clock3 size={17} />}
              title="Duration"
              value={exercise.duration}
            />

            <DetailBox
              icon={<Activity size={17} />}
              title="Calories"
              value={exercise.calories}
            />

            <DetailBox
              icon={<Target size={17} />}
              title="Difficulty"
              value={exercise.difficulty}
            />
          </div>

          {/* Tags */}

          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Focus Areas
            </p>

            <div className="flex flex-wrap gap-2">
              {exercise.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Video & Start Analysis */}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => navigate(exercise.link || "/pose-analysis")}
              className="flex items-center justify-center gap-3 rounded-2xl bg-cyan-600 py-4 font-bold text-white shadow-xl shadow-cyan-200/30 transition hover:-translate-y-1 hover:bg-cyan-500"
            >
              <Sparkles size={19} />
              {exercise.link ? "Analyse Reaction" : "Start AI Pose Analysis"}
            </button>

            <a
              href={exercise.video}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-700 shadow-xl transition hover:-translate-y-1 hover:bg-slate-50"
            >
              <Play size={19} fill="currentColor" />
              Watch Demo
            </a>
          </div>

          {/* Disclaimer */}

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-cyan-600"
            />

            <p className="text-xs leading-5 text-slate-400">
              Perform movements at a comfortable pace and stop if
              you experience pain or discomfort.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===============================================================
   SMALL COMPONENTS
================================================================ */

const FilterButton = ({ active, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-cyan-300 bg-cyan-50 text-cyan-700 shadow-lg shadow-cyan-500/5"
          : "border-slate-200 bg-white text-slate-500 hover:border-white/20 hover:text-slate-500"
      }`}
    >
      {children}
    </button>
  );
};

const MetaItem = ({ icon, value }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="text-cyan-600">{icon}</span>
      {value}
    </div>
  );
};

const DetailBox = ({ icon, title, value }) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-xs">{title}</span>
      </div>

      <p className="mt-2 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
};

const LibraryStat = ({ icon, value, label }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-cyan-600">
        {icon}

        <span className="text-lg font-black text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-1 text-[10px] text-slate-400">{label}</p>
    </div>
  );
};

const EmptyState = ({ onReset }) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/[0.03] px-6 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
        <Search size={27} />
      </div>

      <h3 className="mt-5 text-xl font-bold">
        No exercises found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try another search term or change the filters to find
        available exercises.
      </p>

      <button
        onClick={onReset}
        className="mt-6 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-500"
      >
        Reset Filters
      </button>
    </div>
  );
};

export default Exercises;