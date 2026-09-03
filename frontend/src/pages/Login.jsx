import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  Dumbbell,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  UserPlus,
  Zap,
} from "lucide-react";

import api from "../api/Api";

const Login = () => {
  const navigate = useNavigate();

  // Mode: "login" | "register"
  const [authMode, setAuthMode] = useState("login");
  const [showOtp, setShowOtp] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Switch between Login and Register tabs
  const switchMode = (mode) => {
    setAuthMode(mode);
    setShowOtp(false);
    setErrorMessage("");
    setSuccessMessage("");
    reset();
  };

  // ============================================================
  // SEND OTP (LOGIN)
  // ============================================================
  const handleMobileSubmit = async (data) => {
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        mobile: data.mobile,
      });

      setMobileNumber(data.mobile);
      setShowOtp(true);
      setSuccessMessage(response.data.message || "OTP sent successfully (Development OTP: 123456)");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send OTP";
      setErrorMessage(msg);

      if (error.response?.data?.not_registered) {
        // Offer quick switch to register
        setTimeout(() => {
          setAuthMode("register");
          setErrorMessage("Please complete registration to create your new PoseCare account.");
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VERIFY OTP (LOGIN)
  // ============================================================
  const handleOtpSubmit = async (data) => {
    setErrorMessage("");
    setLoading(true);

    try {
      const response = await api.post("/login", {
        mobile: mobileNumber,
        otp: data.otp,
      });

      const token = response.data.access_token;
      localStorage.setItem("token", token);
      if (response.data.user) {
        localStorage.setItem("posecare_user", JSON.stringify(response.data.user));
      }

      setSuccessMessage("Login successful! Redirecting to your dashboard...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Invalid OTP. Please try 123456.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REGISTER NEW USER (MANDATORY NAME, EMAIL, PHONE, GENDER)
  // ============================================================
  const handleRegisterSubmit = async (data) => {
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await api.post("/register", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
      });

      const token = response.data.access_token;
      localStorage.setItem("token", token);
      if (response.data.user) {
        localStorage.setItem("posecare_user", JSON.stringify(response.data.user));
      }

      setSuccessMessage("Registration successful! Welcome to PoseCare.");
      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[130px]" />
        <div className="absolute -right-40 top-[10%] h-[600px] w-[600px] rounded-full bg-blue-50 blur-[150px]" />
        <div className="absolute bottom-[-250px] left-[35%] h-[500px] w-[500px] rounded-full bg-violet-50 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 backdrop-blur-2xl lg:grid-cols-2">
          {/* =====================================================
              LEFT SIDE BRANDING & HIGHLIGHTS
          ===================================================== */}
          <div className="relative hidden overflow-hidden bg-gradient-to-b from-cyan-950/5 via-slate-900/5 to-slate-900/10 p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/50 border-dashed animate-[spin_35s_linear_infinite]" />
            <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100/50 blur-[70px]" />

            {/* Brand Logo */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-200/50">
                <Activity size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Pose<span className="text-cyan-600">Care</span>
                </h1>
                <p className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  <Sparkles size={11} className="text-cyan-600" />
                  AI Posture Intelligence
                </p>
              </div>
            </div>

            {/* Pitch / Features */}
            <div className="relative z-10 my-10 space-y-6">
              <h2 className="text-3xl font-black leading-tight text-slate-900 xl:text-4xl">
                Personalized AI Movement & Posture Guidance
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Real-time joint biomechanics, body calibration, adaptive limb tracking, and automated progress reports delivered to your inbox.
              </p>

              <div className="space-y-4 pt-2">
                <FeatureItem
                  icon={<Target size={18} />}
                  title="Personal Body Map"
                  text="Calibrates to your body and adapts metrics for accessibility."
                />
                <FeatureItem
                  icon={<Zap size={18} />}
                  title="Real-Time AI Coaching"
                  text="Live posture error detection with instant audio cues."
                />
                <FeatureItem
                  icon={<Mail size={18} />}
                  title="Automated Email Reports"
                  text="Daily & monthly performance digests powered by Celery."
                />
              </div>
            </div>

            {/* Bottom Badge */}
            <div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Secure, privacy-first computer vision on edge & cloud
            </div>
          </div>

          {/* =====================================================
              RIGHT SIDE: LOGIN / REGISTER AUTHENTICATION FORM
          ===================================================== */}
          <div className="relative flex flex-col justify-center p-6 sm:p-10 md:p-12">
            {/* Mobile Header */}
            <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white">
                <Activity size={20} />
              </div>
              <h1 className="text-xl font-black text-slate-900">PoseCare</h1>
            </div>

            {/* TAB SELECTOR: SIGN IN / REGISTER */}
            <div className="mb-6 flex rounded-2xl border border-slate-200 bg-slate-100 p-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  authMode === "login"
                    ? "bg-white text-slate-900 shadow-md shadow-slate-200/80"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LockKeyhole size={14} />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  authMode === "register"
                    ? "bg-white text-slate-900 shadow-md shadow-slate-200/80"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <UserPlus size={14} />
                Create Account
              </button>
            </div>

            {/* Status Messages */}
            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 animate-in fade-in">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 animate-in fade-in">
                {successMessage}
              </div>
            )}

            {/* =================================================
                MODE: REGISTER FORM
            ================================================= */}
            {authMode === "register" ? (
              <form onSubmit={handleSubmit(handleRegisterSubmit)} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    Create your account
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Mandatory registration to personalize your Body Map & reports.
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                    <User size={17} className="text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ananya Sharma"
                      {...register("name", {
                        required: "Full name is required",
                        minLength: { value: 2, message: "Name must be at least 2 characters" },
                      })}
                      className="w-full text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errors.name.message}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                    <Mail size={17} className="text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      placeholder="e.g. ananya@posecare.ai"
                      {...register("email", {
                        required: "Email address is required",
                        pattern: {
                          value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                          message: "Enter a valid email address",
                        },
                      })}
                      className="w-full text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errors.email.message}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Mobile Number (10 Digits) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                    <div className="flex items-center gap-1 border-r border-slate-200 pr-2.5 mr-2.5 text-xs font-bold text-slate-500">
                      <Phone size={14} />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      {...register("phone", {
                        required: "10-digit mobile number is required",
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: "Enter a valid 10-digit mobile number",
                        },
                      })}
                      className="w-full text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errors.phone.message}</p>}
                </div>

                {/* Gender (Mandatory) */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("gender", { required: "Please select your gender" })}
                    defaultValue=""
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-medium text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 shadow-sm"
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-Binary / Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errors.gender.message}</p>}
                </div>

                {/* Submit Register */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Register & Start AI Analysis"}
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              /* =================================================
                  MODE: LOGIN FORM (OTP)
              ================================================= */
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {showOtp ? "Verify OTP" : "Welcome back"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {showOtp
                      ? `Enter the 6-digit OTP code sent to +91 ${mobileNumber}`
                      : "Sign in with your registered 10-digit mobile number."}
                  </p>
                </div>

                {!showOtp ? (
                  <form onSubmit={handleSubmit(handleMobileSubmit)} className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Registered Mobile Number
                      </label>
                      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                        <div className="flex items-center gap-1 border-r border-slate-200 pr-2.5 mr-2.5 text-xs font-bold text-slate-500">
                          <Phone size={14} />
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="Enter 10-digit number"
                          {...register("mobile", {
                            required: "Mobile number is required",
                            pattern: {
                              value: /^[0-9]{10}$/,
                              message: "Enter a valid 10-digit mobile number",
                            },
                          })}
                          className="w-full text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                        />
                      </div>
                      {errors.mobile && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errors.mobile.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {loading ? "Sending OTP..." : "Continue"}
                      <ArrowRight size={16} />
                    </button>

                    <div className="text-center pt-2">
                      <p className="text-xs text-slate-500">
                        Don't have an account yet?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("register")}
                          className="font-bold text-cyan-600 hover:underline"
                        >
                          Register Now
                        </button>
                      </p>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit(handleOtpSubmit)} className="space-y-5">
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-center">
                      <p className="text-[11px] text-slate-600">Verification code sent to</p>
                      <p className="text-xs font-bold text-cyan-800">+91 {mobileNumber}</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        {...register("otp", {
                          required: "OTP is required",
                          pattern: { value: /^[0-9]{6}$/, message: "Enter a valid 6-digit OTP" },
                        })}
                        className="w-full text-center tracking-[8px] text-lg font-bold rounded-2xl border border-slate-200 bg-white py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 shadow-sm"
                      />
                      {errors.otp && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errors.otp.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      {loading ? "Verifying..." : "Verify & Sign In"}
                      <ArrowRight size={16} />
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setShowOtp(false)}
                        className="font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Change Number
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMobileSubmit({ mobile: mobileNumber })}
                        className="font-bold text-cyan-600 hover:underline"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const FeatureItem = ({ icon, title, text }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-3.5 shadow-sm backdrop-blur-md">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
      {icon}
    </div>
    <div>
      <h3 className="text-xs font-bold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{text}</p>
    </div>
  </div>
);

export default Login;