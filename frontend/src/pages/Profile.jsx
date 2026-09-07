import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  User,
  CalendarDays,
  Ruler,
  Weight,
  Target,
  Activity,
  Dumbbell,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Mail,
  Send,
  Check,
  Loader2,
  Phone,
  Trophy,
  Flame,
} from "lucide-react";

import api, { fetchProfileData } from "../api/Api";

const CLEAN_DEFAULT_PROFILE = {
  name: "",
  email: "",
  phone: "",
  age: "",
  gender: "male",
  height: "",
  weight: "",
  fitnessGoal: "posture",
  activityLevel: "moderate",
  experience: "intermediate",
  report_frequency: "daily",
  email_reports_enabled: true,
  total_sessions: 0,
  total_reps: 0,
  avg_accuracy: 0,
};

const Profile = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(() => {
    try {
      const stored = localStorage.getItem("posecare_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...CLEAN_DEFAULT_PROFILE,
          name: parsed.name || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
          gender: parsed.gender || "male",
          age: parsed.age ? String(parsed.age) : "",
          height: parsed.height ? String(parsed.height) : "",
          weight: parsed.weight ? String(parsed.weight) : "",
          fitnessGoal: parsed.fitnessGoal || parsed.fitness_goal || "posture",
          activityLevel: parsed.activityLevel || parsed.activity_level || "moderate",
          experience: parsed.experience || "intermediate",
          report_frequency: parsed.report_frequency || "daily",
          email_reports_enabled: parsed.email_reports_enabled !== undefined ? parsed.email_reports_enabled : true,
          total_sessions: parsed.total_sessions || 0,
          total_reps: parsed.total_reps || 0,
          avg_accuracy: parsed.avg_accuracy || 0,
        };
      }
    } catch (_) {}
    return CLEAN_DEFAULT_PROFILE;
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem("posecare_user");
    } catch {
      return false;
    }
  });
  const [saving, setSaving] = useState(false);
  const [testReportLoading, setTestReportLoading] = useState(false);
  const [testReportMsg, setTestReportMsg] = useState("");

  // ============================================================
  // GET REAL USER PROFILE FROM BACKEND (SWR CACHED - 0ms navigation)
  // ============================================================

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const responseData = await fetchProfileData();
        const u = responseData?.user || responseData;

        if (u) {
          setFormData({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            age: u.age ? String(u.age) : "",
            gender: u.gender || "male",
            height: u.height ? String(u.height) : "",
            weight: u.weight ? String(u.weight) : "",
            fitnessGoal: u.fitnessGoal || u.fitness_goal || "posture",
            activityLevel: u.activityLevel || u.activity_level || "moderate",
            experience: u.experience || "intermediate",
            report_frequency: u.report_frequency || "daily",
            email_reports_enabled: u.email_reports_enabled !== undefined ? u.email_reports_enabled : true,
            total_sessions: u.total_sessions || 0,
            total_reps: u.total_reps || 0,
            avg_accuracy: u.avg_accuracy || 0,
          });

          // Sync localStorage
          localStorage.setItem("posecare_user", JSON.stringify(u));
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name";
    }

    if (!formData.email || !formData.email.includes("@")) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.age && (Number(formData.age) < 10 || Number(formData.age) > 100)) {
      newErrors.age = "Enter a valid age (10-100)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================
  // SAVE REAL PROFILE TO BACKEND
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        gender: formData.gender,
        age: formData.age ? Number(formData.age) : null,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        fitnessGoal: formData.fitnessGoal,
        activityLevel: formData.activityLevel,
        experience: formData.experience,
        report_frequency: formData.report_frequency,
        email_reports_enabled: formData.report_frequency !== "none",
      };

      const res = await api.put("/profile", payload);
      const updatedUser = res.data.user || payload;

      // Update local cache
      localStorage.setItem("posecare_user", JSON.stringify(updatedUser));

      alert("Your profile and preferences have been updated in the database!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Profile save failed:", error);
      alert(error.response?.data?.message || "Failed to save profile. Please check your network connection.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SEND TEST REPORT (CELERY & REDIS)
  // ============================================================

  const handleSendTestReport = async () => {
    if (!formData.email || !formData.email.includes("@")) {
      alert("Please enter a valid email address first.");
      return;
    }
    setTestReportLoading(true);
    setTestReportMsg("");
    try {
      const res = await api.post("/reports/send", {
        report_type: formData.report_frequency === "monthly" ? "monthly" : "daily",
        email: formData.email,
      });
      setTestReportMsg(res.data.message || "Test report queued successfully via Celery & Redis!");
    } catch (err) {
      setTestReportMsg(err.response?.data?.message || "Failed to trigger report.");
    } finally {
      setTestReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-500" />
          <p className="text-sm font-semibold text-slate-600">Loading your profile from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[130px]" />
        <div className="absolute -right-40 top-[20%] h-[600px] w-[600px] rounded-full bg-blue-50 blur-[150px]" />
      </div>

      <main className="relative z-10 px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-semibold text-cyan-700">
              <Sparkles size={14} />
              Real User Account Data
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
              User Profile & Biometrics
            </h1>
            <p className="mt-3 text-sm text-slate-500 font-medium">
              Update your real biometric data, email digest settings, and fitness goals.
            </p>

            {/* Quick Metrics Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
              {formData.phone && (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-slate-700 font-bold">
                  <Phone size={14} className="text-cyan-600" />
                  +91 {formData.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-slate-700 font-bold">
                <Dumbbell size={14} className="text-cyan-600" />
                {formData.total_sessions} Sessions Recorded
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm text-slate-700 font-bold">
                <Trophy size={14} className="text-amber-500" />
                {formData.avg_accuracy}% Form Accuracy
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl backdrop-blur-2xl">
              {/* ==================================================
                  PERSONAL INFORMATION
              ================================================== */}
              <section className="border-b border-slate-100 p-6 sm:p-8 lg:p-10">
                <SectionHeader
                  icon={<User size={20} />}
                  title="Personal & Account Information"
                  text="Your name, email address, and demographic details"
                />

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <InputField
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    icon={<User size={18} />}
                    error={errors.name}
                  />

                  <InputField
                    label="Email Address (for Reports & Digest)"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    icon={<Mail size={18} />}
                    error={errors.email}
                  />

                  <InputField
                    label="Age (Years)"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 25"
                    icon={<CalendarDays size={18} />}
                    error={errors.age}
                  />

                  <SelectField
                    label="Gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    icon={<User size={18} />}
                    error={errors.gender}
                    options={[
                      { label: "Male", value: "male" },
                      { label: "Female", value: "female" },
                      { label: "Non-Binary / Other", value: "non_binary" },
                      { label: "Prefer not to say", value: "prefer_not_to_say" },
                    ]}
                  />

                  <InputField
                    label="Height (cm)"
                    name="height"
                    type="number"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="e.g. 175"
                    icon={<Ruler size={18} />}
                    error={errors.height}
                  />

                  <InputField
                    label="Weight (kg)"
                    name="weight"
                    type="number"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="e.g. 70"
                    icon={<Weight size={18} />}
                    error={errors.weight}
                  />
                </div>
              </section>

              {/* ==================================================
                  EMAIL REPORTS (CELERY & REDIS)
              ================================================== */}
              <section className="border-b border-slate-100 p-6 sm:p-8 lg:p-10">
                <SectionHeader
                  icon={<Mail size={20} />}
                  title="Email Digest & Progress Reports (Celery & Redis)"
                  text="Choose how frequently PoseCare AI dispatches email digests to your inbox"
                />

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <RadioCard
                    title="Daily Digest"
                    description="Receive morning breakdown of yesterday's reps & posture tips"
                    selected={formData.report_frequency === "daily"}
                    onClick={() => setFormData((prev) => ({ ...prev, report_frequency: "daily" }))}
                  />
                  <RadioCard
                    title="Monthly Summary"
                    description="Comprehensive monthly review of accuracy & streaks"
                    selected={formData.report_frequency === "monthly"}
                    onClick={() => setFormData((prev) => ({ ...prev, report_frequency: "monthly" }))}
                  />
                  <RadioCard
                    title="Turn Off Reports"
                    description="Do not send automated email summaries"
                    selected={formData.report_frequency === "none"}
                    onClick={() => setFormData((prev) => ({ ...prev, report_frequency: "none" }))}
                  />
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 p-4">
                  <div>
                    <h4 className="text-xs font-bold text-cyan-900">Test Celery background worker delivery</h4>
                    <p className="text-[11px] text-cyan-700">Dispatches an instant report task to our background Redis queue.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestReport}
                    disabled={testReportLoading}
                    className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {testReportLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Test Report Now
                  </button>
                </div>

                {testReportMsg && (
                  <p className="mt-3 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <Check size={15} /> {testReportMsg}
                  </p>
                )}
              </section>

              {/* ==================================================
                  FITNESS GOAL
              ================================================== */}
              <section className="border-b border-slate-100 p-6 sm:p-8 lg:p-10">
                <SectionHeader
                  icon={<Target size={20} />}
                  title="Fitness Goal"
                  text="What do you want to achieve with PoseCare?"
                />

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <GoalCard
                    icon={<Dumbbell size={22} />}
                    title="Build Strength"
                    selected={formData.fitnessGoal === "strength"}
                    onClick={() => setFormData((prev) => ({ ...prev, fitnessGoal: "strength" }))}
                  />
                  <GoalCard
                    icon={<Activity size={22} />}
                    title="Improve Fitness"
                    selected={formData.fitnessGoal === "fitness"}
                    onClick={() => setFormData((prev) => ({ ...prev, fitnessGoal: "fitness" }))}
                  />
                  <GoalCard
                    icon={<HeartPulse size={22} />}
                    title="Stay Healthy"
                    selected={formData.fitnessGoal === "health"}
                    onClick={() => setFormData((prev) => ({ ...prev, fitnessGoal: "health" }))}
                  />
                  <GoalCard
                    icon={<Target size={22} />}
                    title="Improve Posture"
                    selected={formData.fitnessGoal === "posture"}
                    onClick={() => setFormData((prev) => ({ ...prev, fitnessGoal: "posture" }))}
                  />
                </div>
                {errors.fitnessGoal && <p className="mt-3 text-sm text-red-600">{errors.fitnessGoal}</p>}
              </section>

              {/* ==================================================
                  ACTIVITY LEVEL
              ================================================== */}
              <section className="border-b border-slate-100 p-6 sm:p-8 lg:p-10">
                <SectionHeader
                  icon={<Activity size={20} />}
                  title="Activity Level"
                  text="Tell us about your weekly workout frequency"
                />

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <RadioCard
                    title="Low"
                    description="Little or no regular exercise"
                    selected={formData.activityLevel === "low"}
                    onClick={() => setFormData((prev) => ({ ...prev, activityLevel: "low" }))}
                  />
                  <RadioCard
                    title="Moderate"
                    description="Exercise 3-4 times per week"
                    selected={formData.activityLevel === "moderate"}
                    onClick={() => setFormData((prev) => ({ ...prev, activityLevel: "moderate" }))}
                  />
                  <RadioCard
                    title="High"
                    description="Intense training 5+ days per week"
                    selected={formData.activityLevel === "high"}
                    onClick={() => setFormData((prev) => ({ ...prev, activityLevel: "high" }))}
                  />
                </div>
                {errors.activityLevel && <p className="mt-3 text-sm text-red-600">{errors.activityLevel}</p>}
              </section>

              {/* ==================================================
                  EXPERIENCE
              ================================================== */}
              <section className="p-6 sm:p-8 lg:p-10">
                <SectionHeader
                  icon={<Dumbbell size={20} />}
                  title="Exercise Experience"
                  text="Choose the level that best describes you"
                />

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <RadioCard
                    title="Beginner"
                    description="I'm just getting started"
                    selected={formData.experience === "beginner"}
                    onClick={() => setFormData((prev) => ({ ...prev, experience: "beginner" }))}
                  />
                  <RadioCard
                    title="Intermediate"
                    description="I exercise regularly"
                    selected={formData.experience === "intermediate"}
                    onClick={() => setFormData((prev) => ({ ...prev, experience: "intermediate" }))}
                  />
                  <RadioCard
                    title="Advanced"
                    description="I have extensive experience"
                    selected={formData.experience === "advanced"}
                    onClick={() => setFormData((prev) => ({ ...prev, experience: "advanced" }))}
                  />
                </div>
                {errors.experience && <p className="mt-3 text-sm text-red-600">{errors.experience}</p>}
              </section>

              {/* ==================================================
                  SAVE ACTION BAR
              ================================================== */}
              <div className="flex flex-col gap-5 border-t border-slate-100 bg-slate-50/80 p-6 sm:p-8 md:flex-row md:items-center md:justify-between lg:p-10">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={19} className="mt-0.5 shrink-0 text-cyan-600" />
                  <p className="max-w-md text-xs leading-5 text-slate-500">
                    Your real account data is securely saved to the database.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-7 py-4 font-bold text-white shadow-xl shadow-cyan-200/50 transition duration-300 hover:-translate-y-1 hover:shadow-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving Real Profile..." : "Update Profile Data"}
                  {!saving && <ArrowRight size={19} className="transition group-hover:translate-x-1" />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

// ============================================================
// REUSABLE HELPER SUBCOMPONENTS
// ============================================================

const SectionHeader = ({ icon, title, text }) => (
  <div>
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 font-medium">{text}</p>
      </div>
    </div>
  </div>
);

const InputField = ({ label, name, type = "text", value, onChange, placeholder, icon, error }) => (
  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</label>
    <div className={`relative flex items-center rounded-2xl border bg-white px-3.5 py-3 shadow-sm transition focus-within:ring-2 ${
      error ? "border-red-300 focus-within:ring-red-200" : "border-slate-200 focus-within:border-cyan-500 focus-within:ring-cyan-200"
    }`}>
      <span className="text-slate-400 mr-2.5 shrink-0">{icon}</span>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
      />
    </div>
    {error && <p className="mt-1 text-[11px] text-red-600 font-semibold">{error}</p>}
  </div>
);

const SelectField = ({ label, name, value, onChange, icon, error, options }) => (
  <div>
    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</label>
    <div className={`relative flex items-center rounded-2xl border bg-white px-3.5 py-3 shadow-sm transition focus-within:ring-2 ${
      error ? "border-red-300 focus-within:ring-red-200" : "border-slate-200 focus-within:border-cyan-500 focus-within:ring-cyan-200"
    }`}>
      <span className="text-slate-400 mr-2.5 shrink-0">{icon}</span>
      <select
        name={name}
        value={value || "male"}
        onChange={onChange}
        className="w-full bg-transparent text-xs font-medium text-slate-900 outline-none capitalize"
      >
        {options.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt.toLowerCase();
          const lbl = typeof opt === "object" ? opt.label : opt;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      <ChevronDown size={16} className="text-slate-400 pointer-events-none absolute right-3.5" />
    </div>
    {error && <p className="mt-1 text-[11px] text-red-600 font-semibold">{error}</p>}
  </div>
);

const GoalCard = ({ icon, title, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative rounded-2xl border p-4 text-left transition ${
      selected ? "border-cyan-500 bg-cyan-50/70 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
    }`}
  >
    {selected && <CheckCircle2 size={16} className="absolute right-3 top-3 text-cyan-600" />}
    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
      selected ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 group-hover:text-cyan-600"
    }`}>
      {icon}
    </div>
    <h3 className={`text-xs font-bold ${selected ? "text-cyan-900" : "text-slate-800"}`}>{title}</h3>
  </button>
);

const RadioCard = ({ title, description, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
      selected ? "border-cyan-500 bg-cyan-50/70 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
    }`}
  >
    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
      selected ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white"
    }`}>
      {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
    </div>
    <div>
      <h3 className={`text-xs font-bold ${selected ? "text-cyan-900" : "text-slate-800"}`}>{title}</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
    </div>
  </button>
);

export default Profile;