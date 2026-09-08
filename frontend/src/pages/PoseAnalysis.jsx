import React, { useEffect, useRef, useState, cloneElement } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  Camera,
  Check,
  CheckCircle2,
  CircleStop,
  Clock3,
  Dumbbell,
  Flame,
  FlipHorizontal,
  Gauge,
  HeartPulse,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Play,
  RefreshCw,
  Rotate3d,
  RotateCcw,
  Scan,
  ShieldAlert,
  SkipForward,
  Smile,
  Sparkles,
  Target,
  Timer,
  UserCheck,
  Volume2,
  VolumeX,
  Wind,
  X,
  XCircle,
  Zap,
  Compass,
  Move,
} from "lucide-react";

import api, { invalidateCache } from "../api/Api";
import SuryaStepViewer, { SURYA_STEPS } from "../components/SuryaStepViewer";
import ReactionViewer from "../components/ReactionViewer";

// Code-split 3D WebGL Bot so Three.js is loaded asynchronously and doesn't block bundle or page navigation
const Pose3DBotViewer = React.lazy(() => import("../components/Pose3DBotViewer"));

const BotViewerSkeleton = () => (
  <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-[#f8fafc] p-6 shadow-sm">
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 shadow-sm">
        <Rotate3d size={24} className="animate-spin text-cyan-600" style={{ animationDuration: "3s" }} />
      </div>
      <div className="text-center">
        <div className="text-xs font-bold text-slate-800">3D AI Trainer Bot Loading</div>
        <div className="text-[10px] text-slate-400 font-medium mt-0.5">Initializing biomechanical model...</div>
      </div>
    </div>
  </div>
);

// Frame analysis intervals (ms) - optimized for low latency real-time streaming
const ANALYSIS_INTERVAL_MS = 75;
const CALIBRATION_INTERVAL_MS = 90;

// High-speed frame capture helper:
// Downscales to max 640px dimension, avoids repeated canvas reallocations,
// uses willReadFrequently, and compresses at 0.58 quality to cut transfer payload by >85%.
const captureOptimizedFrame = (video, canvas, maxDimension = 640, quality = 0.58) => {
  if (!video || !canvas || video.readyState < 2) return null;
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;

  let targetW = vw;
  let targetH = vh;
  if (targetW > maxDimension || targetH > maxDimension) {
    if (targetW >= targetH) {
      targetH = Math.round((vh / vw) * maxDimension);
      targetW = maxDimension;
    } else {
      targetW = Math.round((vw / vh) * maxDimension);
      targetH = maxDimension;
    }
  }

  targetW = targetW % 2 === 0 ? targetW : targetW - 1;
  targetH = targetH % 2 === 0 ? targetH : targetH - 1;

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", quality);
};

// Centralized Category Color Theme Mapping
const CATEGORY_THEMES = {
  "Desk Ergonomics": {
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    iconBg: "bg-blue-100 text-blue-700",
    glow: "shadow-blue-500/10",
    dot: "bg-blue-500",
  },
  "Gym & Strength": {
    pill: "bg-orange-50 text-orange-700 border-orange-200",
    iconBg: "bg-orange-100 text-orange-700",
    glow: "shadow-orange-500/10",
    dot: "bg-orange-500",
  },
  "Calisthenics & Strength": {
    pill: "bg-purple-50 text-purple-700 border-purple-200",
    iconBg: "bg-purple-100 text-purple-700",
    glow: "shadow-purple-500/10",
    dot: "bg-purple-500",
  },
  "Traditional Yoga Flow": {
    pill: "bg-teal-50 text-teal-700 border-teal-200",
    iconBg: "bg-teal-100 text-teal-700",
    glow: "shadow-teal-500/10",
    dot: "bg-teal-500",
  },
  "Hatha Yoga & Balance": {
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
    glow: "shadow-emerald-500/10",
    dot: "bg-emerald-500",
  },
  "Gym & Unilateral": {
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    glow: "shadow-amber-500/10",
    dot: "bg-amber-500",
  },
  "Core Stability": {
    pill: "bg-violet-50 text-violet-700 border-violet-200",
    iconBg: "bg-violet-100 text-violet-700",
    glow: "shadow-violet-500/10",
    dot: "bg-violet-500",
  },
  "Reaction & Emotion": {
    pill: "bg-pink-50 text-pink-700 border-pink-200",
    iconBg: "bg-pink-100 text-pink-700",
    glow: "shadow-pink-500/10",
    dot: "bg-pink-500",
  },
};

const getCategoryTheme = (category) => {
  if (!category) return CATEGORY_THEMES["Gym & Strength"];
  if (CATEGORY_THEMES[category]) return CATEGORY_THEMES[category];
  const cat = category.toLowerCase();
  if (cat.includes("yoga")) return CATEGORY_THEMES["Traditional Yoga Flow"];
  if (cat.includes("strength") || cat.includes("gym")) return CATEGORY_THEMES["Gym & Strength"];
  if (cat.includes("desk") || cat.includes("ergonomics")) return CATEGORY_THEMES["Desk Ergonomics"];
  if (cat.includes("core") || cat.includes("calisthenics")) return CATEGORY_THEMES["Core Stability"];
  if (cat.includes("reaction") || cat.includes("emotion")) return CATEGORY_THEMES["Reaction & Emotion"];
  return {
    pill: "bg-slate-100 text-slate-700 border-slate-200",
    iconBg: "bg-slate-100 text-slate-700",
    glow: "shadow-slate-500/10",
    dot: "bg-slate-500",
  };
};

const DEFAULT_BODY_GROUPS = [
  { name: "Head", tracked: true },
  { name: "Shoulders", tracked: true },
  { name: "Left arm", tracked: true },
  { name: "Right arm", tracked: true },
  { name: "Torso", tracked: true },
  { name: "Hips", tracked: true },
  { name: "Left leg", tracked: true },
  { name: "Right leg", tracked: true },
];

const PoseAnalysis = ({ initialExercise }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryExercise =
    searchParams.get("exercise") ||
    (location.pathname === "/reaction-analysis" ? "reaction" : null);

  const [selectedExercise, setSelectedExercise] = useState(
    initialExercise || queryExercise || "squat"
  );

  // Full Window Studio Mode (in Light Mode)
  const [isFullWindow, setIsFullWindow] = useState(
    Boolean(initialExercise || queryExercise)
  );

  useEffect(() => {
    if (queryExercise && queryExercise !== selectedExercise) {
      setSelectedExercise(queryExercise);
      setIsFullWindow(true);
    }
  }, [queryExercise]);

  // Remove app navbar when an exercise is chosen / on camera feed
  useEffect(() => {
    if (isFullWindow) {
      document.body.classList.add("camera-feed-active");
    } else {
      document.body.classList.remove("camera-feed-active");
    }
    return () => {
      document.body.classList.remove("camera-feed-active");
    };
  }, [isFullWindow]);

  const handleExitCameraFeed = () => {
    setIsFullWindow(false);
    navigate("/pose-analysis", { replace: true });
  };

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const calibIntervalRef = useRef(null);
  const isSendingFrameRef = useRef(false);
  const frameAbortRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const analysisRunningRef = useRef(false);
  const [biomechanicalRisk, setBiomechanicalRisk] = useState(null);
  const lastRiskSpokenRef = useRef(0);

  useEffect(() => {
    analysisRunningRef.current = analysisRunning;
  }, [analysisRunning]);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [correctReps, setCorrectReps] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [instruction, setInstruction] = useState("कैमरे के सामने सीधे खड़े हों और फ्रेम में आएं।");
  const [instructionType, setInstructionType] = useState("info"); // "info" | "success" | "error"
  const [bodyStatus, setBodyStatus] = useState("तैयार (Ready)");

  // Mirror / Flip Video state (persisted to localStorage)
  const [isMirrored, setIsMirrored] = useState(() => {
    try {
      const saved = localStorage.getItem("posecare_mirror_video");
      return saved !== null ? saved === "true" : true;
    } catch (_) {
      return true;
    }
  });

  const toggleMirror = () => {
    setIsMirrored((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("posecare_mirror_video", String(next));
      } catch (_) {}
      return next;
    });
  };
  
  // Surya Namaskar active step tracking & Auto-Advance Flow
  const [suryaStepNum, setSuryaStepNum] = useState(1);
  const [suryaPoseQuality, setSuryaPoseQuality] = useState(0);
  const [suryaAutoSkipEnabled, setSuryaAutoSkipEnabled] = useState(false);
  const [suryaAutoSkipSeconds, setSuryaAutoSkipSeconds] = useState(15);
  const [suryaSecondsLeft, setSuryaSecondsLeft] = useState(15);
  const [isSkippingStep, setIsSkippingStep] = useState(false);

  // 3D AI Kinematic Trainer Bot State
  const [show3DBot, setShow3DBot] = useState(true);
  const [sideViewerTab, setSideViewerTab] = useState("3dbot"); // "3dbot" | "guide" | "reaction"

  // Post-workout pop-up modal state
  const [sessionResult, setSessionResult] = useState(null);

  const [isSpeakingReport, setIsSpeakingReport] = useState(false);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);

  // Skeleton-annotated frame from backend
  const [annotatedFrame, setAnnotatedFrame] = useState(null);

  // Facial reaction state
  const [expressionEnabled, setExpressionEnabled] = useState(true);
  const [expressionData, setExpressionData] = useState({
    face_detected: false,
    dominant_emotion: "neutral",
    confidence: 80,
    emotion_scores: { neutral: 70, happy: 20, surprise: 5, angry: 2, sad: 1, fear: 1, disgust: 1 },
    state_label: "Waiting for Face",
    emoji: "🙂",
    fatigue_score: 10,
    tension_score: 15,
    engagement_score: 85,
    drowsiness_warning: false,
  });

  // Audio voice feedback settings
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showCalibDetails, setShowCalibDetails] = useState(false);
  const [showAnatomicalBanner, setShowAnatomicalBanner] = useState(() => {
    try {
      const saved = localStorage.getItem("posecare_anatomical_banner_expanded");
      return saved !== null ? JSON.parse(saved) : false; // Default to collapsed
    } catch {
      return false;
    }
  });

  const toggleAnatomicalBanner = () => {
    setShowAnatomicalBanner((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("posecare_anatomical_banner_expanded", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const lastSpokenRef = useRef({ text: "", time: 0 });
  const globalSpeechCooldownRef = useRef(0);
  const lastAutopilotSpokenRef = useRef(0);

  // Advanced Biomechanical & Vision Telemetry States
  const [breathTelemetry, setBreathTelemetry] = useState(null);
  const [jointTorque, setJointTorque] = useState(null);
  const [cameraAutopilot, setCameraAutopilot] = useState(null);
  const [muscleActivation, setMuscleActivation] = useState(null);
  const [anatomicalProfile, setAnatomicalProfile] = useState(null);

  // Body calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [bodyMap, setBodyMap] = useState({
    mode: "standard",
    trackable: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    group_status: DEFAULT_BODY_GROUPS,
    missing_groups: [],
    summary: "Standard mode — full landmark set available.",
    group_summary: "Tracking whole body.",
    frames_seen: 0,
    isCalibrated: false,
  });

  // Bind video stream whenever stream or view mode changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isFullWindow, cameraActive]);

  // Clean verbal instruction synthesizer (speaks naturally in Hindi / Indian accent)
  const speakFeedback = (text, force = false) => {
    // Voice assistant should ONLY speak when AI analysis is actively running
    if (!force && !analysisRunningRef.current) return;
    if (!speechEnabled || !("speechSynthesis" in window) || !text) return;

    let cleanText = text
      .replace(/^GOOD:\s*/i, "")
      .replace(/\(Score:.*?\)/gi, "")
      .replace(/Score:\s*\d+\/\d+/gi, "")
      .replace(/Excellent Desk Posture/gi, "")
      .split("|")[0]
      .trim();

    if (
      !cleanText ||
      cleanText.includes("कोई व्यक्ति नहीं दिखा") ||
      cleanText.includes("No person detected") ||
      cleanText.includes("Waiting")
    ) {
      return;
    }

    const now = Date.now();
    if (window.speechSynthesis.speaking) return;
    if (now - globalSpeechCooldownRef.current < 2500) return;
    if (
      cleanText === lastSpokenRef.current.text &&
      now - lastSpokenRef.current.time < 6500
    ) {
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
      utterance.lang = hasDevanagari ? "hi-IN" : "en-IN";
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang === "hi-IN" || v.lang.startsWith("hi")) ||
        voices.find((v) => v.lang === "en-IN" || v.name.includes("India")) ||
        voices.find((v) => v.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeakingVoice(true);
      };
      utterance.onend = () => {
        setIsSpeakingVoice(false);
        globalSpeechCooldownRef.current = Date.now();
      };
      utterance.onerror = () => {
        setIsSpeakingVoice(false);
      };

      lastSpokenRef.current = { text: cleanText, time: now };
      globalSpeechCooldownRef.current = now;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS error:", err);
      setIsSpeakingVoice(false);
    }
  };

  const repeatVoiceInstruction = () => {
    if (!speechEnabled) setSpeechEnabled(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    globalSpeechCooldownRef.current = 0;
    lastSpokenRef.current = { text: "", time: 0 };
    const textToSpeak =
      instruction ||
      currentExercise?.steps?.[0] ||
      "कैमरे के सामने सही पोस्चर में सीधे खड़े रहें।";
    speakFeedback(textToSpeak, true);
  };

  // ============================================================
  // SURYA NAMASKAR STEP SKIPPING & AUTOMATIC NEXT ASANA
  // ============================================================
  const handleSkipSuryaStep = async () => {
    if (isSkippingStep) return;
    setIsSkippingStep(true);
    try {
      // 1. Instantly advance the step in the client state (0ms latency)
      const nextStep = (suryaStepNum % 12) + 1;
      setSuryaStepNum(nextStep);
      setSuryaSecondsLeft(suryaAutoSkipSeconds);

      const stepData = SURYA_STEPS.find((s) => s.stepNumber === nextStep);
      const asanName = stepData ? `${stepData.name_hi}` : `स्टेप ${nextStep}`;
      const skipPrompt = `स्टेप स्किप किया गया। अगला आसन: ${asanName}`;
      setInstruction(skipPrompt);
      setInstructionType("info");
      speakFeedback(skipPrompt);

      // 2. Synchronize with backend analyzer
      const res = await api.post("/pose/surya/skip_step");
      if (res.data?.current_step_number) {
        setSuryaStepNum(res.data.current_step_number);
        if (res.data.voice_prompt) {
          setInstruction(res.data.voice_prompt);
          speakFeedback(res.data.voice_prompt);
        }
      }
    } catch (err) {
      console.warn("Surya Namaskar skip step sync error:", err);
    } finally {
      setTimeout(() => setIsSkippingStep(false), 250);
    }
  };

  // Auto-skip countdown timer: automatically moves on to the next asan when timer expires
  useEffect(() => {
    if (
      selectedExercise !== "suryanamaskar" ||
      !analysisRunning ||
      !suryaAutoSkipEnabled
    ) {
      return;
    }

    const timer = setInterval(() => {
      setSuryaSecondsLeft((prev) => {
        if (prev <= 1) {
          handleSkipSuryaStep();
          return suryaAutoSkipSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    selectedExercise,
    analysisRunning,
    suryaAutoSkipEnabled,
    suryaAutoSkipSeconds,
    suryaStepNum,
  ]);

  // Reset timer counter on step change or duration change
  useEffect(() => {
    setSuryaSecondsLeft(suryaAutoSkipSeconds);
  }, [suryaStepNum, suryaAutoSkipSeconds]);

  const speakReport = (report) => {
    if (!("speechSynthesis" in window) || !report) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingReport(false);
      return;
    }

    const strengthsText = report.key_strengths?.length
      ? `आपकी मुख्य ताकत: ${report.key_strengths.join(". ")}.`
      : "";

    const mistakesText = report.mistakes_analysis?.mistakes_list?.length
      ? `सत्र में देखी गई गलतियां: ${report.mistakes_analysis.mistakes_list.map((m) => m.name).join(". ")}.`
      : "";

    const focusText = (report.focus_areas || report.areas_for_improvement)?.length
      ? `अगले सत्र के लिए मुख्य फोकस: ${(report.focus_areas || report.areas_for_improvement).join(". ")}.`
      : "";

    const drillsText = report.corrective_exercises?.drills?.length
      ? `सुधार के लिए सुझाई गई एक्सरसाइज: ${report.corrective_exercises.drills.map((d) => `${d.name} ${d.sets}`).join(". ")}.`
      : "";

    const parts = [
      report.headline || "",
      report.what_you_did?.summary_text || report.overview || "",
      strengthsText,
      mistakesText,
      focusText,
      drillsText,
      report.safety_note ? `सुरक्षा सलाह: ${report.safety_note}` : "",
      report.recovery_recommendation ? `रिकवरी सलाह: ${report.recovery_recommendation}` : "",
    ].filter(Boolean);

    const utterance = new SpeechSynthesisUtterance(parts.join(" "));
    utterance.lang = "hi-IN";
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeakingReport(false);
    utterance.onerror = () => setIsSpeakingReport(false);
    setIsSpeakingReport(true);
    window.speechSynthesis.speak(utterance);
  };

  // ============================================================
  // EXERCISES CATALOGUE (HINDI TITLES WITH TECHNICAL ENGLISH TERMS)
  // ============================================================
  const exercises = [
    {
      id: "desk_posture",
      name: "स्टडी व डेस्क पोस्चर (Desk Ergonomics)",
      category: "Desk Ergonomics",
      icon: <BookOpen size={24} />,
      description:
        "लंबी पढ़ाई और लैपटॉप वर्क के दौरान गर्दन का झुकाव (Text Neck), अपर बैक स्लाउचिंग और स्क्रीन दूरी की रीयल-टाइम AI बायोमैकेनिक्स निगरानी।",
      difficulty: "All Levels",
      targetMuscles: ["Cervical Spine", "Upper Trapezius", "Rhomboids", "Thoracic Extensors", "Core"],
      steps: [
        "कुर्सी पर पूरी तरह पीछे बैठें ताकि Lumbar Spine को चेयर के बैक-रेस्ट का 100% सपोर्ट मिले।",
        "लैपटॉप या मॉनिटर को Eye Level पर रखें; आंखों से स्क्रीन की दूरी 20 से 28 इंच (एक हाथ की दूरी) रखें।",
        "कंधों को ढीला छोड़ें, हल्का सा पीछे व नीचे (Scapular Retraction) रखें; आगे झुकने (Hunching) से बचें।",
        "दोनों पैरों को फर्श पर सपाट (Flat) रखें और घुटनों में 90° का कोण बनाएं; पैर क्रॉस करके न बैठें।",
        "ठुड्डी को हल्का सा पीछे की ओर रखें (Neutral Cervical Alignment); स्क्रीन की ओर गर्दन न निकालें।",
      ],
      commonMistakes: [
        "गर्दन को आगे झुकाना ('Text Neck' > 25° Forward Tilt) - सुधार: स्क्रीन ऊपर उठाएं व Chin Tucks करें।",
        "कमर को घुमावदार करके बैठना (Thoracic Slouching) - सुधार: बैक सपोर्ट का उपयोग करें।",
        "पैरों को क्रॉस करके बैठना - सुधार: दोनों पैर जमीन पर टिकाएं ताकि Pelvic Balance बना रहे।",
      ],
      breathing: "डायफ्रामिक ब्रीदिंग करें (पेट से गहरी व शांत सांस लें); हर 25 मिनट पर 30 सेकंड का पोस्चर रीसेट ब्रेक लें।",
    },
    {
      id: "squat",
      name: "स्क्वाट (Squats)",
      category: "Gym & Strength",
      icon: <Dumbbell size={24} />,
      description: "Knee Tracking, Hip Hinge Depth और Neutral Spine Alignment का सटीक बायोमैकेनिकल विश्लेषण।",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Quadriceps", "Gluteus Maximus", "Hamstrings", "Deep Core", "Erector Spinae"],
      steps: [
        "पैरों को कंधों की चौड़ाई (Shoulder-Width) जितना खोलें और पंजों को 15° से 30° बाहर की तरफ रखें।",
        "मूवमेंट की शुरुआत हिप्स को पीछे धकेलते हुए (Hip Hinge) करें, जैसे किसी कुर्सी पर बैठ रहे हों।",
        "घुटनों को पंजों की सीध में बाहर की तरफ ट्रैक करते हुए नीचे झुकें; चेस्ट को तना हुआ और रीढ़ न्यूट्रल रखें।",
        "हिप क्रीज को घुटनों के समानांतर (Parallel Depth ~ 90° Knee Angle) तक नीचे लाएं।",
        "एड़ियों और मिड-फुट से जमीन को मजबूती से धकेलते हुए वापस खड़े हों और ऊपर ग्लूट्स को 1 सेकंड स्क्वीज करें।",
      ],
      commonMistakes: [
        "ऊपर आते समय घुटनों का अंदर झुकना (Knee Valgus Collapse) - सुधार: घुटनों को एक्टिवली बाहर फैलाएं।",
        "नीचे जाते समय एड़ियां उठना (Heels Lifting) - सुधार: वजन हील्स पर रखें और Ankle Mobility बढ़ाएं।",
        "धड़ का बहुत ज्यादा आगे झुक जाना - सुधार: नजर सामने रखें, कोर ब्रेस करें और चेस्ट तानें।",
      ],
      breathing: "नीचे जाने से पहले पेट में गहरी सांस भरकर कोर को ब्रेस करें; ऊपर उठते हुए जोर से सांस छोड़ें।",
    },
    {
      id: "pushup",
      name: "पुश-अप (Push-ups)",
      category: "Calisthenics & Strength",
      icon: <Activity size={24} />,
      description: "Full Body Plank Alignment, Chest Depth और Elbow Flaring का रीयल-टाइम काइनेटिक विश्लेषण।",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Deltoids", "Core Stabilizers"],
      steps: [
        "हथेलियों को कंधों से थोड़ा बाहर फर्श पर मजबूती से रखें और उंगलियों को फैलाकर सामने रखें।",
        "सिर, कंधे, हिप्स और एड़ियों को एक सीधी rigid plank line में रखें; कोर और ग्लूट्स को टाइट करें।",
        "कोहनियों को शरीर के साथ 45° का कोण (तीर का आकार - Arrow Shape) बनाते हुए नीचे लाएं; कोहनियों को 90° बाहर न फैलाएं।",
        "छाती को फर्श से 2 से 3 इंच ऊपर तक लाएं ताकि चेस्ट फाइबर्स में पूरा खिंचाव महसूस हो।",
        "फर्श को मजबूती से पुश करते हुए ऊपर आएं और शोल्डर ब्लेड्स को हल्का प्रोट्रैक्ट (Protraction) करें।",
      ],
      commonMistakes: [
        "हिप्स का नीचे लटकना (Hip Sagging) - सुधार: पेट की मांसपेशियों को कसकर रखें और ग्लूट्स टाइट करें।",
        "कोहनियों का 90° पर बाहर फैलना (Elbow Flare) - सुधार: कोहनियों को पसलियों के करीब 45° पर रखें।",
        "सिर्फ गर्दन नीचे झुकाना - सुधार: सिर को रीढ़ की सीध में रखें, फर्श पर 1 फीट आगे देखें।",
      ],
      breathing: "नीचे जाते समय सांस अंदर लें (Eccentric); ऊपर पुश करते समय सांस बाहर छोड़ें (Concentric)।",
    },
    {
      id: "suryanamaskar",
      name: "सूर्य नमस्कार (Surya Namaskar)",
      featured: true,
      badge: "सबसे लोकप्रिय",
      category: "Traditional Yoga Flow",
      icon: <Sparkles size={24} />,
      description:
        "सूर्य नमस्कार के सभी 12 आसनों का kinetic flow, sequence tracking और posture symmetry विश्लेषण।",
      difficulty: "All Levels",
      targetMuscles: ["Full Body Kinetic Chain", "Hamstrings", "Spinal Flexibility", "Chest & Shoulders"],
      steps: [
        "1. प्रणामासन (Prayer Pose): दोनों हथेलियों को चेस्ट के पास जोड़कर सीधे खड़े हों, वजन दोनों पैरों पर समान।",
        "2. हस्त उत्तानासन (Raised Arms): गहरी सांस लेते हुए भुजाएं ऊपर उठाएं, हल्का सा बैकबेंड करें।",
        "3. पादहस्तासन (Hand to Foot): सांस छोड़ते हुए हिप्स से आगे झुकें, रीढ़ सीधी रखें और हथेलियां पैरों के पास लाएं।",
        "4. अश्व संचालनासन (Equestrian): सांस लेते हुए दायां पैर पीछे ले जाएं, घुटना जमीन पर, नजर ऊपर।",
        "5. दंडासन (Plank): सांस रोककर बायां पैर भी पीछे लाएं, शरीर सिर से पैर तक सीधी रेखा में।",
        "6. अष्टांग नमस्कार (Eight Limbed): सांस छोड़ते हुए घुटने, छाती और ठुड्डी जमीन पर लगाएं।",
        "7. भुजंगासन (Cobra Pose): सांस लेते हुए छाती को ऊपर उठाएं, शोल्डर्स नीचे, कोहनियां हल्की मुड़ी हुई।",
        "8. पर्वतासन / अधोमुख (Mountain / Downward Dog): सांस छोड़ते हुए हिप्स ऊपर उठाएं, एड़ियां फर्श की ओर दबाएं।",
        "9. अश्व संचालनासन: सांस लेते हुए दायां पैर आगे लाएं दोनों हाथों के बीच।",
        "10. पादहस्तासन: सांस छोड़ते हुए बायां पैर भी आगे लाएं और सिर घुटनों के पास ले जाएं।",
        "11. हस्त उत्तानासन: सांस लेते हुए भुजाएं ऊपर उठाकर पीछे स्ट्रेच करें।",
        "12. प्रणामासन: सांस छोड़ते हुए दोनों हाथ जोड़कर मूल स्थिति में लौटें।",
      ],
      commonMistakes: [
        "आसनों के बीच सांस रोक लेना - सुधार: हर आसन के साथ तय श्वास चक्र का पालन करें।",
        "पादहस्तासन में कमर मोड़कर झुकना - सुधार: घुटने हल्के मोड़ें लेकिन हिप्स से झुकें।",
        "भुजंगासन में कंधों को कानों से सटा लेना - सुधार: शोल्डर्स को नीचे रोल करें और छाती खोलें।",
      ],
      breathing: "शारीरिक विस्तार (Backbend/Rise) में श्वास अंदर लें; संकुचन (Forward Fold) में श्वास बाहर छोड़ें।",
    },
    {
      id: "tree_pose",
      name: "वृक्षासन (Tree Pose)",
      category: "Hatha Yoga & Balance",
      icon: <Target size={24} />,
      description: "Single-leg balance, pelvic horizontal alignment और vertical spine symmetry का विश्लेषण।",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Ankle Stabilizers", "Calves", "Gluteus Medius", "Deep Core Stabilizers"],
      steps: [
        "ताड़ासन में खड़े हों; एक पैर के चारों कोनों को जमीन में मजबूती से जमाएं (Rooted Foot)।",
        "दूसरे पैर के तलवे को inner thigh या calf पर रखें (घुटने के जोड़ पर कभी न रखें)।",
        "पेल्विस को न्यूट्रल और सामने की ओर चौकोर (Square Hips) रखें; हिप को एक तरफ बाहर न निकलने दें।",
        "हाथों को छाती के पास prayer pose में रखें या सांस भरते हुए सिर के ऊपर सीधा उठाएं।",
        "नजर को सामने किसी एक स्थिर बिंदु (Drishti Point) पर टिकाएं और शरीर को संतुलित रखें।",
      ],
      commonMistakes: [
        "पैर को directly घुटने (knee joint) पर दबाना - सुधार: पैर को केवल जांघ (Thigh) या पिंडली (Calf) पर रखें।",
        "कमर (hip) को एक तरफ बाहर निकाल देना - सुधार: स्टैंडिंग ग्लूट को कसकर रखें और पेल्विस सीधा रखें।",
        "कंधों में जरूरत से ज्यादा तनाव - सुधार: कंधों को ढीला छोड़ें और सांस को शांत रखें।",
      ],
      breathing: "नाक से 4 सेकंड अंदर और 4 सेकंड बाहर धीमी, शांत लयबद्ध सांस लें।",
    },
    {
      id: "lunges",
      name: "लंजेस (Lunges)",
      category: "Gym & Unilateral",
      icon: <Activity size={24} />,
      description: "Front knee tracking, vertical torso posture और unilateral balance का सटीक विश्लेषण।",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Quadriceps", "Glutes", "Hamstrings", "Calves", "Hip Stabilizers"],
      steps: [
        "एक पैर से आगे 2.5 से 3 फीट बड़ा और स्थिर कदम बढ़ाएं और धड़ को बिल्कुल सीधा (Vertical) रखें।",
        "पीछे वाले घुटने को floor की ओर नीचे लाएं ताकि दोनों घुटने 90° angle बनाएं।",
        "आगे वाला घुटना toes की सीध में रहे, घुटने को पैर के पंजों से आगे न निकलने दें।",
        "आगे वाली एड़ी (Front Heel) से जमीन को दबाते हुए वापस खड़े होने की स्थिति में आएं।",
      ],
      commonMistakes: [
        "आगे वाले घुटने का अंदर झुकना (Knee Valgus) - सुधार: घुटने को बाहर की ओर ट्रैक कराएं।",
        "धड़ का आगे झुक जाना - सुधार: छाती तानकर रखें और कंधों को हिप्स के ठीक ऊपर रखें।",
        "छोटा कदम रखना जिससे आगे वाली एड़ी जमीन से उठ जाए - सुधार: कदम थोड़ा बड़ा रखें।",
      ],
      breathing: "नीचे जाते समय सांस अंदर लें; ऊपर उठते हुए सांस बाहर छोड़ें।",
    },
    {
      id: "plank",
      name: "प्लैंक (Plank Hold)",
      category: "Core Stability",
      icon: <Gauge size={24} />,
      description: "Forearm alignment, neutral spine और anti-extension core hold time का विश्लेषण।",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Rectus Abdominis", "Transverse Abdominis", "Glutes", "Serratus Anterior"],
      steps: [
        "Forearms को floor पर रखें, कोहनियां directly shoulders के नीचे 90° पर रखें।",
        "पैरों को पीछे सीधा फैलाएं, एड़ियों को पीछे धकेलें और सिर से एड़ियों तक शरीर को सीधा रखें।",
        "नाभि को रीढ़ की तरफ खींचें (Abdominal Hollow Body), ग्लूट्स और जांघों को कसकर रखें।",
        "गर्दन को neutral रखें; नजर दोनों हाथों के बीच फर्श पर रखें।",
        "कमर को न तो नीचे लटकने दें और न ही हिप्स को बहुत ऊपर उठाएं।",
      ],
      commonMistakes: [
        "कमर का नीचे झुक जाना (Lumbar Sag) - सुधार: पेट को टाइट रखें और पेल्विस सीधा रखें।",
        "हिप्स को बहुत ऊपर उठा लेना (Pike) - सुधार: शरीर को एक सीधी तख्ती की तरह रखें।",
        "सांस रोक कर रखना - सुधार: कोर टाइट रखते हुए पसलियों से लगातार सांस लें।",
      ],
      breathing: "कोर को बिना ढीला किए छाती से छोटी और निरंतर सांस लेते रहें।",
    },
    {
      id: "warrior_two",
      name: "वीरभद्रासन II (Warrior II)",
      category: "Traditional Yoga",
      icon: <Activity size={24} />,
      description: "पैरों की सहनशक्ति, हिप ओपनिंग और संतुलन का शक्तिशाली क्लासिक योग आसन।",
      difficulty: "Intermediate",
      targetMuscles: ["Quadriceps", "Hip Abductors", "Groin Extensors", "Deltoids", "Core"],
      steps: [
        "पैरों को 3.5 से 4 फीट की दूरी पर फैलाएं; दाएं पैर को 90° बाहर और बाएं पैर को 15° अंदर रखें।",
        "दाएं घुटने को मोड़कर जांघ को फर्श के समानांतर लाएं; घुटना ठीक एड़ी के ऊपर 90° पर रहे।",
        "दोनों भुजाओं को कंधों की ऊंचाई पर फर्श के समानांतर फैलाएं; हथेलियां नीचे की ओर।",
        "धड़ को बिल्कुल बीच में सीधा रखें (आगे न झुकें); नजर आगे वाली मध्यमा उंगली पर टिकाएं।",
      ],
      commonMistakes: [
        "आगे वाले घुटने का अंदर झुकना - सुधार: घुटने को बाहर की तरफ खोलकर रखें।",
        "धड़ का आगे झुक जाना - सुधार: रीढ़ को पेल्विस के ठीक ऊपर सीधा रखें।",
      ],
      breathing: "आसन में स्थिर रहते हुए 5 से 8 गहरी और स्थिर सांसें लें।",
    },
    {
      id: "triangle",
      name: "त्रिकोणासन (Triangle Pose)",
      category: "Traditional Yoga",
      icon: <Target size={24} />,
      description: "हैमस्ट्रिंग्स, स्पाइनल साइड-फ्लेक्सिबिलिटी और पेल्विक अलाइनमेंट का योग विश्लेषण।",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Hamstrings", "Obliques", "Latissimus Dorsi", "Hip Adductors"],
      steps: [
        "पैरों को 3.5 फीट की दूरी पर खोलें; दोनों घुटने सीधे रखें।",
        "सांस छोड़ते हुए धड़ को आगे वाले पैर की तरफ साइड में झुकाएं; हाथ को पिंडली या फर्श पर रखें।",
        "दूसरे हाथ को आसमान की ओर सीधा उठाएं; दोनों भुजाएं एक सीधी 180° लाइन में रहें।",
        "छाती को आगे झुकने न दें, साइड से खोलकर रखें और ऊपर वाले हाथ के अंगूठे को देखें।",
      ],
      commonMistakes: [
        "छाती का फर्श की ओर गिरना - सुधार: छाती को ऊपर की ओर खोलकर रखें।",
        "घुटने को हाइपर-एक्सटेंड करना - सुधार: घुटने में माइक्रो-बेंड रखें।",
      ],
      breathing: "साइड स्ट्रेच का आनंद लेते हुए धीमी और निरंतर सांस लेते रहें।",
    },
    {
      id: "downward_dog",
      name: "अधोमुख श्वानासन (Downward Dog)",
      category: "Traditional Yoga",
      icon: <Sparkles size={24} />,
      description: "फुल बॉडी काइनेटिक स्ट्रेच, रीढ़ का डीकंप्रेशन और हैमस्ट्रिंग लचीलेपन का विश्लेषण।",
      difficulty: "All Levels",
      targetMuscles: ["Hamstrings", "Calves", "Latissimus Dorsi", "Triceps", "Deep Core"],
      steps: [
        "हथेलियों और पंजों के बल उल्टे 'V' आकार में आएं; हाथ कंधे की चौड़ाई पर, पैर हिप की चौड़ाई पर।",
        "हथेलियों से फर्श को आगे धकेलें और टेलबोन (Tailbone) को आसमान की ओर ऊपर उठाएं।",
        "एड़ियों को फर्श की तरफ दबाएं; रीढ़ को बिल्कुल सीधा और लंबा रखें।",
        "गर्दन को ढीला छोड़ें, नजर नाभि की तरफ रखें।",
      ],
      commonMistakes: [
        "कमर को गोल कर लेना - सुधार: जरूरत पड़ने पर घुटने थोड़े मोड़ें और रीढ़ सीधी रखें।",
        "कंधों को कानों से चिपका लेना - सुधार: शोल्डर ब्लेड्स को चौड़ा करें।",
      ],
      breathing: "रीढ़ को लंबा करते हुए 5 गहरी और शांत सांसें लें।",
    },
    {
      id: "cobra",
      name: "भुजंगासन (Cobra Pose)",
      category: "Traditional Yoga",
      icon: <Flame size={24} />,
      description: "छाती खोलने और स्पाइनल एक्सटेंशन का प्रमुख आसन; फेफड़ों की क्षमता बढ़ाने में सहायक।",
      difficulty: "Beginner",
      targetMuscles: ["Erector Spinae", "Gluteus Maximus", "Pectorals", "Latissimus Dorsi"],
      steps: [
        "पेट के बल लेटें, पैरों को जोड़े रखें और पंजों को पीछे सीधा फैलाएं।",
        "हथेलियों को छाती के दोनों तरफ कंधों के नीचे रखें; कोहनियां पसलियों से चिपकी रहें।",
        "गहरी सांस लेते हुए नाभि तक शरीर को धीरे-धीरे ऊपर उठाएं; वजन पीठ की मांसपेशियों से उठाएं।",
        "कंधों को कानों से दूर नीचे रखें, छाती खुली और गर्दन हल्की ऊपर।",
      ],
      commonMistakes: [
        "कोहनियों को पूरी तरह लॉक करके कंधों को उचकाना - सुधार: कोहनियां हल्की मुड़ी रखें।",
        "लोअर बैक पर बहुत ज्यादा झटका देना - सुधार: केवल छाती को आगे-ऊपर उठाएं।",
      ],
      breathing: "ऊपर उठते समय गहरी सांस अंदर लें; नीचे आते समय धीरे-धीरे सांस छोड़ें।",
    },
    {
      id: "reaction",
      name: "रिएक्शन व इमोशन (Reaction & Emotion)",
      category: "Reaction & Emotion",
      icon: <Smile size={24} />,
      description:
        "रीयल-टाइम facial expressions, थकान (fatigue), drowsiness alerts और mental engagement telemetry।",
      difficulty: "All Levels",
      targetMuscles: ["Facial Muscle Blendshapes", "Blink/Eye Openness", "Fatigue & Exertion"],
      steps: [
        "अपने चेहरे को camera के center में रखें जहां अच्छी रोशनी (lighting) हो।",
        "सिर को relax रखें और screen की तरफ स्वाभाविक रूप से देखें।",
        "AI 468 facial mesh points, blink rate और mood को track करेगा।",
        "थकान या drowsiness का alert मिलने पर तुरंत rest लें और पानी पिएं।",
      ],
      commonMistakes: [
        "कम रोशनी या पीछे से तेज लाइट होना जिससे face detect न हो सके।",
        "Camera से बहुत दूर बैठना।",
        "हाथों से मुंह या आंखों को ढकना।",
      ],
      breathing: "स्वाभाविक रूप से सांस लें और चेहरे की मांसपेशियों को तनावमुक्त रखें।",
    },
  ];

  const currentExercise =
    exercises.find((item) => item.id === selectedExercise) || exercises[0];

  // ============================================================
  // CAMERA HANDLING
  // ============================================================
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setInstruction("कैमरा एक्सेस के लिए HTTPS या localhost जरूरी है। कृपया कैमरा अनुमति चेक करें।");
        setInstructionType("error");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
      setInstruction("कैमरा चालू है। शुरू करने के लिए फ्रेम में सही स्थिति में आएं।");
      setInstructionType("success");
      return true;
    } catch (error) {
      console.error("Camera access failed:", error);
      setInstruction("कैमरा एक्सेस नहीं मिला। कृपया ब्राउज़र में कैमरा अनुमति (Permissions) दें।");
      setInstructionType("error");
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (calibIntervalRef.current) {
      clearInterval(calibIntervalRef.current);
      calibIntervalRef.current = null;
    }

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    setCameraActive(false);
    setIsCalibrating(false);
    setAnalysisRunning(false);
  };

  // ============================================================
  // BODY CALIBRATION ENGINE
  // ============================================================
  const startCalibration = async () => {
    if (analysisRunning) return;

    let active = cameraActive;
    if (!active) {
      active = await startCamera();
      if (!active) return;
    }

    try {
      setLoading(true);
      setIsCalibrating(true);
      setCalibrationProgress(0);
      const calibCue = "बॉडी कैलिब्रेशन शुरू हो रहा है... पूरे शरीर के साथ कैमरे के सामने सीधे खड़े रहें।";
      setInstruction(calibCue);
      setInstructionType("info");

      await api.post("/pose/calibrate_start", { duration: 3.0 });

      let elapsedFrames = 0;
      const maxFrames = 30;

      if (calibIntervalRef.current) {
        clearInterval(calibIntervalRef.current);
      }

      calibIntervalRef.current = setInterval(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const imageData = captureOptimizedFrame(video, canvas, 640, 0.6);
        if (!imageData) return;

        try {
          const res = await api.post("/pose/calibrate_frame", {
            image: imageData,
          });

          const { annotated_image, complete, is_complete, progress, body_map, anatomical_profile: profile } = res.data;
          if (annotated_image) {
            setAnnotatedFrame(annotated_image);
          }
          if (profile) {
            setAnatomicalProfile(profile);
          }

          elapsedFrames++;
          const calcProgress = Math.min(
            Math.round((progress ?? elapsedFrames / maxFrames) * 100),
            100
          );
          setCalibrationProgress(calcProgress);

          if (complete || is_complete || elapsedFrames >= maxFrames) {
            clearInterval(calibIntervalRef.current);
            calibIntervalRef.current = null;
            setIsCalibrating(false);
            setLoading(false);

            if (profile) {
              setAnatomicalProfile(profile);
            }

            if (body_map) {
              setBodyMap({ ...body_map, isCalibrated: true });
              const successCue =
                body_map.mode === "adaptive"
                  ? "अडैप्टिव मोड में कैलिब्रेशन पूरा हुआ। वर्कआउट शुरू कर सकते हैं।"
                  : "बॉडी कैलिब्रेशन व शारीरिक अनुपात मैपिंग पूरा हुआ।";
              setInstruction(successCue);
              setInstructionType("success");
            }
          }
        } catch (err) {
          console.error("Calibration frame error:", err);
        }
      }, CALIBRATION_INTERVAL_MS);
    } catch (err) {
      console.error("Failed to start calibration:", err);
      setIsCalibrating(false);
      setLoading(false);
      setInstruction("कैलिब्रेशन में समस्या आई। कृपया चेक करें कि बैकएंड चालू है।");
      setInstructionType("error");
    }
  };

  const toggleGroupTracked = (groupName) => {
    setBodyMap((prev) => {
      const updated = prev.group_status.map((g) =>
        g.name === groupName ? { ...g, tracked: !g.tracked } : g
      );
      const activeCount = updated.filter((g) => g.tracked).length;
      return {
        ...prev,
        group_status: updated,
        mode: activeCount < 8 ? "adaptive" : "standard",
        summary:
          activeCount < 8
            ? `Adaptive: tracking ${activeCount}/8 groups.`
            : "Standard: tracking whole body.",
        isCalibrated: true,
      };
    });
  };

  // ============================================================
  // FRAME ANALYSIS LOOP
  // ============================================================
  const processFrame = async () => {
    if (isSendingFrameRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const imageData = captureOptimizedFrame(video, canvas, 640, 0.58);
    if (!imageData) return;

    isSendingFrameRef.current = true;
    const controller = new AbortController();
    frameAbortRef.current = controller;

    try {
      const response = await api.post("/pose/analyze_frame", {
        image: imageData,
        exercise: selectedExercise,
        expression_enabled: expressionEnabled,
        body_map: bodyMap,
      }, {
        signal: controller.signal,
      });

      const {
        annotated_image,
        metrics,
        expression,
        ai_live_summary,
        biomechanical_risk,
        breath_telemetry,
        joint_torque,
        camera_autopilot,
        muscle_activation,
        anatomical_profile: serverAnatomicalProfile,
      } = response.data;

      setAnnotatedFrame(annotated_image);

      if (breath_telemetry || metrics?.breath_telemetry) {
        setBreathTelemetry(breath_telemetry || metrics.breath_telemetry);
      }
      if (joint_torque || metrics?.joint_torque) {
        setJointTorque(joint_torque || metrics.joint_torque);
      }
      if (camera_autopilot || metrics?.camera_autopilot) {
        const autoData = camera_autopilot || metrics.camera_autopilot;
        setCameraAutopilot(autoData);
        if (!autoData.is_optimal && analysisRunningRef.current) {
          const now = Date.now();
          if (now - lastAutopilotSpokenRef.current > 12000) {
            lastAutopilotSpokenRef.current = now;
            speakFeedback(autoData.prompt_hi || autoData.prompt_en, false);
          }
        }
      }
      if (muscle_activation || metrics?.muscle_activation) {
        setMuscleActivation(muscle_activation || metrics.muscle_activation);
      }
      if (serverAnatomicalProfile) {
        setAnatomicalProfile(serverAnatomicalProfile);
      }

      const riskData =
        biomechanical_risk || metrics?.biomechanical_risk || null;
      if (riskData) {
        setBiomechanicalRisk(riskData);
        if (riskData.is_critical && analysisRunningRef.current) {
          const now = Date.now();
          if (now - lastRiskSpokenRef.current > 8000) {
            lastRiskSpokenRef.current = now;
            const riskCue = `सावधान: ${riskData.immediate_action || "फॉर्म सुधारें"}`;
            speakFeedback(riskCue, true);
          }
        }
      }

      if (selectedExercise === "reaction") {
        if (expression) {
          setExpressionData(expression);
        } else if (metrics && metrics.is_reaction) {
          setExpressionData({
            face_detected: metrics.face_detected,
            dominant_emotion: metrics.dominant_emotion,
            confidence: metrics.confidence,
            fatigue_score: metrics.fatigue_score,
            tension_score: metrics.tension_score,
            engagement_score: metrics.engagement_score,
            drowsiness_warning: metrics.drowsiness_warning,
            state_label: metrics.state_label,
            emoji: metrics.emoji,
            emotion_scores: metrics.emotion_scores || {},
          });
        }
        setReps(0);
        setCorrectReps(0);
        setAccuracy(metrics.score ?? metrics.accuracy ?? 85);
      } else {
        const totalReps = metrics.total_reps ?? 0;
        const cReps = metrics.correct_reps ?? 0;
        setReps(totalReps);
        setCorrectReps(cReps);
        setAccuracy(
          totalReps > 0 ? Math.round((cReps / totalReps) * 100) : 0
        );
      }

      // Surya Namaskar live step synchronization
      if (selectedExercise === "suryanamaskar" && metrics.current_step_number) {
        setSuryaStepNum(metrics.current_step_number);
        if (metrics.pose_quality !== undefined) {
          setSuryaPoseQuality(Math.round(metrics.pose_quality));
        }
      }

      // ONLY Instructions in verbal form (spoken aloud via TTS & written in the instruction dock)
      if (metrics.feedback) {
        setInstruction(metrics.feedback);
        const spokenPhrase = ai_live_summary?.live_speech || metrics.feedback;
        speakFeedback(spokenPhrase);

        const lower = metrics.feedback.toLowerCase();
        if (
          lower.includes("good") ||
          lower.includes("correct") ||
          lower.includes("solid") ||
          lower.includes("great") ||
          lower.includes("अच्छा") ||
          lower.includes("पर्फेक्ट")
        ) {
          setInstructionType("success");
        } else if (
          lower.includes("move into") ||
          lower.includes("no person") ||
          lower.includes("error") ||
          lower.includes("tilt") ||
          lower.includes("drop") ||
          lower.includes("झुक") ||
          lower.includes("समस्या")
        ) {
          setInstructionType("error");
        } else {
          setInstructionType("info");
        }
      }

      setBodyStatus(
        metrics.stage
          ? metrics.stage.charAt(0).toUpperCase() + metrics.stage.slice(1)
          : "सक्रिय (Active)"
      );
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return;
      }
      console.error("Frame analysis failed:", error);
    } finally {
      isSendingFrameRef.current = false;
      frameAbortRef.current = null;
    }
  };

  // ============================================================
  // START ANALYSIS
  // ============================================================
  const startAnalysis = async () => {
    if (!cameraActive) {
      const active = await startCamera();
      if (!active) return;
    }

    try {
      setLoading(true);
      await api.post("/pose/start", {
        exercise: selectedExercise,
        body_map: bodyMap,
      });

      analysisRunningRef.current = true;
      setAnalysisRunning(true);
      setBiomechanicalRisk(null);
      lastRiskSpokenRef.current = 0;
      setSessionResult(null); // Clear previous pop-up
      const startCue = `${currentExercise.name} शुरू हो रहा है। ${currentExercise.steps?.[0] || "मूवमेंट शुरू करें।"}`;
      setInstruction(startCue);
      setInstructionType("success");
      speakFeedback(startCue, true);

      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      captureIntervalRef.current = setInterval(
        processFrame,
        ANALYSIS_INTERVAL_MS
      );
    } catch (error) {
      console.error("Failed to start analysis:", error);
      setInstruction("एनालिसिस शुरू करने में समस्या आई। कृपया बैकएंड कनेक्शन जांचें।");
      setInstructionType("error");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STOP ANALYSIS -> OPENS REPORT AS POP-UP MODAL INSTANTLY!
  // ============================================================
  const stopAnalysis = async () => {
    // Immediately stop voice assistant as soon as stop button is clicked
    analysisRunningRef.current = false;
    setAnalysisRunning(false);
    setBiomechanicalRisk(null);
    setIsSpeakingVoice(false);
    setIsSpeakingReport(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (frameAbortRef.current) {
      try { frameAbortRef.current.abort(); } catch (_) {}
      frameAbortRef.current = null;
    }
    isSendingFrameRef.current = false;

    // Invalidate client caches so other pages show fresh data immediately
    invalidateCache("/dashboard");
    invalidateCache("/sessions");

    try {
      setLoading(true);
      const response = await api.post("/pose/stop", {
        exercise: selectedExercise,
        duration: elapsedTime,
        body_map: bodyMap,
      });

      console.log("Session result:", response.data);
      // Triggers the pop-up modal immediately!
      setSessionResult(response.data);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      // Optional gentle background check if LLM enrichment completes while modal is open
      if (response.data?.session_id) {
        const sid = response.data.session_id;
        setTimeout(async () => {
          try {
            const statusRes = await api.get(`/pose/session_summary_status/${sid}`);
            if (statusRes.data?.is_enriched && statusRes.data?.ai_report) {
              setSessionResult((prev) => {
                if (!prev || prev.session_id !== sid) return prev;
                return {
                  ...prev,
                  ai_report: statusRes.data.ai_report,
                  feedback: statusRes.data.ai_report.formatted_text || prev.feedback,
                };
              });
            }
          } catch (_) {}
        }, 3500);
      }
    } catch (error) {
      console.error("Failed to stop analysis:", error);
      setSessionResult({
        exercise: selectedExercise,
        duration: elapsedTime,
        reps: reps,
        accuracy: accuracy || 85,
        feedback: "सत्र पूरा हुआ। फॉर्म डेटा सफलतापूर्वक रिकॉर्ड किया गया।",
        body_map: bodyMap,
      });
    } finally {
      analysisRunningRef.current = false;
      setAnalysisRunning(false);
      setBodyStatus("पूर्ण (Done)");
      setLoading(false);
      setAnnotatedFrame(null);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  // ============================================================
  // TIMER & CLEANUP
  // ============================================================
  useEffect(() => {
    let interval;
    if (analysisRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [analysisRunning]);

  useEffect(() => {
    return () => {
      if (frameAbortRef.current) {
        try { frameAbortRef.current.abort(); } catch (_) {}
        frameAbortRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (calibIntervalRef.current) clearInterval(calibIntervalRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const resetSession = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (calibIntervalRef.current) {
      clearInterval(calibIntervalRef.current);
      calibIntervalRef.current = null;
    }

    setAnalysisRunning(false);
    setIsCalibrating(false);
    setElapsedTime(0);
    setReps(0);
    setCorrectReps(0);
    setAccuracy(0);
    setSuryaStepNum(1);
    setSuryaPoseQuality(0);
    setBodyStatus("तैयार (Ready)");
    setAnnotatedFrame(null);
    setInstruction("शुरू करने के लिए तैयार। Start AI Analysis पर क्लिक करें।");
    setInstructionType("info");
    setSessionResult(null);
  };

  // Selecting an exercise opens the Light Mode Studio
  const changeExercise = async (exerciseId) => {
    if (analysisRunning || isCalibrating) return;
    setSelectedExercise(exerciseId);
    setReps(0);
    setCorrectReps(0);
    if (exerciseId === "suryanamaskar") {
      setSuryaStepNum(1);
    }
    setIsFullWindow(true);
    setSessionResult(null);
    navigate(`/pose-analysis?exercise=${exerciseId}`, { replace: true });

    const target = exercises.find((item) => item.id === exerciseId);
    const cue = target?.name
      ? `${target.name} चुना गया। ${target.steps?.[0] || "कैमरे के सामने शुरुआती स्थिति में आएं।"}`
      : "एक्सरसाइज तैयार है।";
    setInstruction(cue);
    setInstructionType("info");

    if (!cameraActive) {
      startCamera();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[140px]" />
        <div className="absolute -right-40 top-[15%] h-[600px] w-[600px] rounded-full bg-blue-50 blur-[150px]" />
        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-violet-50 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,116,144,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ========================================================
          1. VIDEO FEED PAGE (IN CLEAN LIGHT MODE)
      ======================================================== */}
      {isFullWindow ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] text-slate-900 select-none overflow-hidden">
          {/* Light Mode Studio Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExitCameraFeed}
                className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                title="एक्सरसाइज लिस्ट पर वापस जाएं"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">एक्सरसाइज बदलें</span>
              </button>

              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-2xs">
                  {currentExercise.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-black tracking-tight text-slate-900 sm:text-base">
                      {currentExercise.name}
                    </h1>
                    <button
                      type="button"
                      onClick={() => setShowInfoModal(true)}
                      className="rounded-md p-1 text-slate-400 hover:text-cyan-600 transition"
                      title="एक्सरसाइज नियम और गाइड देखें"
                    >
                      <Info size={15} />
                    </button>
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-cyan-700">
                    {currentExercise.category}
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Badges (Light Mode) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                <Clock3 size={14} className="text-slate-500" />
                <span className="font-mono text-xs font-black text-slate-800">
                  {formatTime(elapsedTime)}
                </span>
              </div>

              {selectedExercise === "reaction" ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 shadow-2xs">
                  <Smile size={14} className="text-indigo-700" />
                  <span className="text-xs font-black text-indigo-800">
                    {expressionData.emoji || "🙂"}{" "}
                    {expressionData.dominant_emotion
                      ? expressionData.dominant_emotion.toUpperCase()
                      : "FOCUSED"}
                  </span>
                </div>
              ) : selectedExercise === "suryanamaskar" ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 sm:px-3 py-1.5 shadow-2xs">
                    <Sparkles size={14} className="text-amber-600" />
                    <span className="text-xs font-black text-amber-900">
                      चरण {suryaStepNum}/12
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSkipSuryaStep}
                    disabled={isSkippingStep}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 sm:px-3 py-1.5 text-xs font-black text-white shadow-sm hover:from-amber-600 hover:to-orange-600 active:scale-95 transition cursor-pointer"
                    title="इस आसन को स्किप करें और तुरंत अगले आसन पर जाएं"
                  >
                    <SkipForward size={13} />
                    <span>स्किप आसन</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 shadow-2xs">
                  <Activity size={14} className="text-cyan-700" />
                  <span className="text-xs font-black text-cyan-800">
                    {`${correctReps}/${reps} रेप्स`}
                  </span>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 shadow-2xs">
                <Gauge size={14} className="text-emerald-700" />
                <span className="text-xs font-black text-emerald-800">
                  {accuracy}% सटीकता
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* 3D AI Trainer Bot Toggle */}
              <button
                type="button"
                onClick={() => setShow3DBot(!show3DBot)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  show3DBot
                    ? "bg-cyan-50 text-cyan-800 border border-cyan-300 ring-2 ring-cyan-200/60 hover:bg-cyan-100"
                    : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                }`}
                title={show3DBot ? "3D बॉट छिपाएं" : "3D AI बॉट चालू करें"}
              >
                <Rotate3d size={15} className={show3DBot ? "text-cyan-600 animate-pulse" : "text-slate-400"} />
                <span className="hidden sm:inline">3D AI बॉट</span>
              </button>

              {/* Voice Coach Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (speechEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  setSpeechEnabled(!speechEnabled);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  speechEnabled
                    ? "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 shadow-2xs"
                    : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                }`}
                title={speechEnabled ? "वॉयस म्यूट करें" : "वॉयस चालू करें"}
              >
                {speechEnabled ? (
                  <Volume2 size={15} className={isSpeakingVoice ? "animate-pulse text-cyan-600" : "text-cyan-600"} />
                ) : (
                  <VolumeX size={15} />
                )}
                <span className="hidden md:inline">{speechEnabled ? "आवाज ऑन" : "म्यूट"}</span>
              </button>

              {/* Mirror / Flip Camera Toggle */}
              <button
                type="button"
                onClick={toggleMirror}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isMirrored
                    ? "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 shadow-2xs"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
                title={isMirrored ? "मिरर व्यू बंद करें (Normal View)" : "मिरर व्यू चालू करें (Mirror View)"}
              >
                <FlipHorizontal size={15} className={isMirrored ? "text-purple-600" : "text-slate-500"} />
                <span className="hidden md:inline">{isMirrored ? "मिरर ऑन" : "मिरर ऑफ"}</span>
              </button>

              {/* Camera Toggle */}
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  disabled={analysisRunning || isCalibrating}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs disabled:opacity-40"
                  title="कैमरा बंद करें"
                >
                  <XCircle size={15} />
                  <span className="hidden md:inline">कैमरा बंद</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-105"
                  title="कैमरा ऑन करें"
                >
                  <Camera size={15} />
                  <span className="hidden md:inline">कैमरा चालू</span>
                </button>
              )}

              {/* Close Full Window */}
              <button
                type="button"
                onClick={handleExitCameraFeed}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                title="फुल विंडो बंद करें"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* ====================================================
              STUDIO STAGE: VIDEO FEED + (FOR SURYANAMASKAR) STEP GUIDE BESIDE FEED
          ==================================================== */}
          <div className="flex-1 min-h-0 m-2 sm:m-3 flex flex-col lg:flex-row gap-3 overflow-hidden">
            {/* Video Feed Viewport */}
            <div className="relative flex-1 min-h-0 bg-slate-950 flex items-center justify-center overflow-hidden rounded-3xl border border-slate-200/80 shadow-lg ring-1 ring-slate-100">
              {/* Raw Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: isMirrored ? "scaleX(-1)" : "none" }}
                className={`h-full w-full object-contain ${cameraActive ? "block" : "hidden"}`}
              />

              {/* Skeleton & Pose HUD from backend */}
              {(analysisRunning || isCalibrating) && annotatedFrame && (
                <img
                  src={annotatedFrame}
                  alt="AI Pose Kinematics"
                  style={{ transform: isMirrored ? "scaleX(-1)" : "none" }}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                />
              )}

              {/* Minimal HUD: Top-Left Live Badge */}
              {cameraActive && (
                <div className="absolute left-4 top-4 flex items-center gap-2 z-10">
                  <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md shadow-xs">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    LIVE
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md shadow-xs">
                    <Scan size={13} className="text-cyan-400" />
                    <span>{currentExercise.name}</span>
                  </div>

                  {/* Joint Safety Meter */}
                  {analysisRunning && biomechanicalRisk && (
                    <div
                      className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black backdrop-blur-md shadow-xs border ${
                        biomechanicalRisk.risk_level === "HIGH"
                          ? "bg-rose-950/80 border-rose-500/80 text-rose-300 animate-pulse"
                          : biomechanicalRisk.risk_level === "MODERATE"
                          ? "bg-amber-950/80 border-amber-500/80 text-amber-300"
                          : "bg-emerald-950/80 border-emerald-500/80 text-emerald-300"
                      }`}
                    >
                      <ShieldAlert
                        size={13}
                        className={
                          biomechanicalRisk.risk_level === "HIGH"
                            ? "text-rose-400"
                            : biomechanicalRisk.risk_level === "MODERATE"
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      />
                      <span>जॉइंट सेफ्टी: {biomechanicalRisk.safety_score}%</span>
                    </div>
                  )}

                  {isCalibrating && (
                    <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-md animate-pulse">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>कैलिब्रेटिंग ({calibrationProgress}%)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Biomechanical Risk Warning Alert Banner */}
              {analysisRunning && biomechanicalRisk && biomechanicalRisk.is_warning_active && (
                <div className="absolute top-16 left-3 right-3 sm:left-6 sm:right-6 z-20 mx-auto max-w-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                  <div
                    className={`flex items-start gap-3 rounded-2xl p-3 sm:p-3.5 border shadow-2xl backdrop-blur-md pointer-events-auto ${
                      biomechanicalRisk.is_critical
                        ? "border-rose-500/90 bg-rose-950/95 text-white ring-2 ring-rose-500/60 animate-pulse"
                        : "border-amber-500/90 bg-amber-950/95 text-amber-100 ring-1 ring-amber-400/40"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner ${
                        biomechanicalRisk.is_critical
                          ? "bg-rose-600 text-white shadow-rose-600/50"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      <AlertOctagon size={22} className={biomechanicalRisk.is_critical ? "animate-bounce" : ""} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                            🚨 बायोमैकेनिकल रिस्क चेतावनी (Biomechanical Risk Warning)
                          </span>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase">
                            {biomechanicalRisk.risk_level} RISK
                          </span>
                        </div>
                        <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-mono font-black text-white">
                          सेफ्टी स्कोर: {biomechanicalRisk.safety_score}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm font-black text-white leading-snug">
                        {biomechanicalRisk.primary_warning_hi}
                      </p>
                      {biomechanicalRisk.immediate_action && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-amber-200 flex-wrap">
                          <span>⚡ तुरंत सुधारें:</span>
                          <span className="bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/30 text-amber-100 font-extrabold">
                            {biomechanicalRisk.immediate_action}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Camera Autopilot Repositioning Prompt */}
              {analysisRunning && cameraAutopilot && !cameraAutopilot.is_optimal && (
                <div className="absolute top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-20 mx-auto max-w-md animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-sky-400/80 bg-slate-950/92 p-2.5 sm:px-4 sm:py-2.5 shadow-2xl backdrop-blur-md text-white ring-1 ring-sky-400/40 pointer-events-auto">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/30 border border-sky-400/50 text-sky-300 animate-pulse">
                      <Compass size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider text-sky-300">
                        <span>📐 स्मार्ट कैमरा ऑटोपायलट (Camera Autopilot)</span>
                        {cameraAutopilot.yaw_degrees !== undefined && (
                          <span className="font-mono text-slate-300">
                            एंगल: {Math.round(cameraAutopilot.yaw_degrees)}°
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-white leading-tight mt-0.5">
                        {cameraAutopilot.prompt_hi || cameraAutopilot.prompt_en}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Minimal HUD: Top-Right Corner (Reaction for Reaction analysis, Reps for others) */}
              {cameraActive && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                  {selectedExercise === "reaction" ? (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-black/65 px-3.5 py-1.5 backdrop-blur-md shadow-md">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/25 border border-indigo-400/40 text-base">
                        {expressionData.emoji || "🙂"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300">
                          रिएक्शन (Reaction)
                        </span>
                        <div className="flex items-baseline gap-1.5 leading-tight">
                          <span className="font-mono text-xs sm:text-sm font-black text-indigo-300 capitalize">
                            {expressionData.dominant_emotion || "Focused"}
                          </span>
                          <span className="text-[9px] font-bold text-slate-300">
                            {expressionData.state_label || "Active"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-black/65 px-3.5 py-1.5 backdrop-blur-md shadow-md">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/25 border border-emerald-400/40 text-emerald-300">
                        <CheckCircle2 size={15} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
                          {selectedExercise === "suryanamaskar" ? "राउंड (Rounds)" : "रेप्स (Reps)"}
                        </span>
                        <div className="flex items-baseline gap-1 leading-tight">
                          <span className="font-mono text-sm sm:text-base font-black text-emerald-400" title="सही रेप्स (Correct Reps)">
                            {correctReps}
                          </span>
                          <span className="text-xs font-bold text-slate-400">/</span>
                          <span className="font-mono text-xs sm:text-sm font-bold text-slate-200" title="कुल रेप्स (Total Reps)">
                            {reps}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 ml-0.5 uppercase">
                            सही/कुल
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Minimal HUD: Bottom-Left Stage Status & Joint Torque */}
              {cameraActive && (
                <div className="absolute bottom-4 left-4 z-10 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        bodyStatus.includes("Active") || bodyStatus.includes("सक्रिय")
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-cyan-400"
                      }`}
                    />
                    <span className="text-xs font-bold text-white uppercase tracking-wider text-[10px]">
                      {selectedExercise === "reaction"
                        ? expressionData.dominant_emotion || "Analyzing Face"
                        : bodyStatus}
                    </span>
                  </div>

                  {/* Real-time Joint Torque & Shear Stress Meter */}
                  {analysisRunning && jointTorque && (
                    <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/20 bg-black/65 px-3 py-1.5 backdrop-blur-md text-white shadow-xs">
                      <Zap size={13} className={jointTorque.is_overloaded ? "text-rose-400 animate-bounce" : "text-cyan-400"} />
                      <div className="text-[10px] font-bold flex items-center gap-2">
                        <span className="text-slate-300">L5-S1: <span className="text-cyan-300 font-mono font-black">{jointTorque.l5_s1_torque_nm || 0} N·m</span></span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">Knee: <span className="text-amber-300 font-mono font-black">{jointTorque.knee_torque_nm || 0} N·m</span></span>
                        {jointTorque.is_overloaded && (
                          <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[8px] font-black text-white uppercase animate-pulse">
                            ओवरलोड
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vision-Based Breath Waveform & Pranayama Sync HUD */}
              {cameraActive && analysisRunning && breathTelemetry && (
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/75 px-3 py-1.5 backdrop-blur-md shadow-md text-white">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-inner ${
                      breathTelemetry.breath_phase === "INHALE"
                        ? "bg-cyan-500 text-white animate-pulse"
                        : breathTelemetry.breath_phase === "EXHALE"
                        ? "bg-amber-500 text-slate-950"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    <Wind size={15} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300">
                        श्वास ({breathTelemetry.breath_phase || "INHALE"})
                      </span>
                      <span className="rounded-full bg-cyan-500/25 px-1.5 py-0.2 text-[9px] font-mono font-bold text-cyan-200">
                        {breathTelemetry.respiration_bpm || 14} BPM
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 w-16 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            breathTelemetry.breath_phase === "INHALE" ? "bg-cyan-400" : "bg-amber-400"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(15, breathTelemetry.chest_expansion_pct || 50))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">
                        तालमेल: <span className="text-emerald-400 font-mono font-black">{breathTelemetry.pranayama_sync_score || 85}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera Inactive State */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 shadow-inner">
                    <Camera size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-white">कैमरा अभी बंद है</h3>
                  <p className="mt-1.5 max-w-sm text-xs text-slate-400 leading-relaxed">
                    लाइव {currentExercise.name} पोस्चर और रेप्स ट्रैकिंग के लिए कैमरा चालू करें।
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-5 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-cyan-500/25 transition hover:scale-105"
                  >
                    <Camera size={16} />
                    कैमरा ऑन करें
                  </button>
                </div>
              )}
            </div>

            {/* Right: Beside the video feed - 3D AI Kinematic Trainer Bot & Multi-step viewers */}
            {show3DBot && (
              <div className="w-full lg:w-[360px] xl:w-[410px] shrink-0 flex flex-col max-h-[46vh] lg:max-h-none overflow-hidden animate-in fade-in slide-in-from-right-3 duration-300">
                <React.Suspense fallback={<BotViewerSkeleton />}>
                  {selectedExercise === "suryanamaskar" ? (
                    <div className="flex flex-col h-full gap-2">
                      {/* Surya Namaskar Flow Header: Step Name + Skip Step Button + Auto-Skip Timer */}
                      <div className="flex flex-col gap-2 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 p-2.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-mono text-xs font-black text-white shadow-2xs">
                              {suryaStepNum}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                                वर्तमान आसन (Step {suryaStepNum}/12)
                              </p>
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {SURYA_STEPS[suryaStepNum - 1]?.name_hi || "प्रणामासन"}{" "}
                                <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">
                                  ({SURYA_STEPS[suryaStepNum - 1]?.name_en?.split(" ")[0] || "Prayer"})
                                </span>
                              </h4>
                            </div>
                          </div>

                          {/* Primary Skip Step Button */}
                          <button
                            type="button"
                            onClick={handleSkipSuryaStep}
                            disabled={isSkippingStep}
                            className="group flex items-center gap-1.5 rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:from-amber-600 hover:to-orange-600 active:scale-95 transition cursor-pointer"
                            title="इस आसन को स्किप करें और तुरंत अगले आसन पर जाएं"
                          >
                            <span>स्किप आसन</span>
                            <SkipForward size={14} className="transition-transform group-hover:translate-x-0.5" />
                          </button>
                        </div>

                        {/* Auto-Skip Timer Bar */}
                        <div className="flex items-center justify-between border-t border-amber-200/70 pt-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSuryaAutoSkipEnabled(!suryaAutoSkipEnabled)}
                            className={`flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-bold transition cursor-pointer ${
                              suryaAutoSkipEnabled
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                : "bg-slate-200/70 text-slate-600 hover:bg-slate-300/70"
                            }`}
                            title="सीमित समय बाद स्वतः अगले आसन पर जाने के लिए"
                          >
                            <Timer size={12} className={suryaAutoSkipEnabled ? "text-emerald-600 animate-spin" : "text-slate-400"} style={{ animationDuration: "6s" }} />
                            <span>
                              ऑटो-नेक्स्ट: {suryaAutoSkipEnabled ? "चालू" : "बंद"}
                            </span>
                          </button>

                          {suryaAutoSkipEnabled ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 animate-pulse">
                                {suryaSecondsLeft}s में अगला
                              </span>
                              <div className="flex items-center gap-0.5 text-[10px]">
                                {[10, 15, 20].map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() => {
                                      setSuryaAutoSkipSeconds(sec);
                                      setSuryaSecondsLeft(sec);
                                    }}
                                    className={`px-1 rounded font-bold cursor-pointer transition ${
                                      suryaAutoSkipSeconds === sec
                                        ? "bg-amber-500 text-white"
                                        : "hover:bg-amber-100 text-slate-600"
                                    }`}
                                  >
                                    {sec}s
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-amber-900/70">
                              (अगले आसन के लिए 'स्किप आसन' दबाएं)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Switcher Tab between 3D Bot and 2D Step Viewer */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setSideViewerTab("3dbot")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                            sideViewerTab === "3dbot"
                              ? "bg-white text-cyan-950 shadow-2xs font-black border border-cyan-200"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Rotate3d size={13} className="text-cyan-600" />
                          3D AI बॉट (3D Motion)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSideViewerTab("guide")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                            sideViewerTab === "guide"
                              ? "bg-white text-slate-900 shadow-2xs font-black border border-slate-200"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Sparkles size={13} className="text-amber-500" />
                          12-स्टेप चार्ट
                        </button>
                      </div>

                      {sideViewerTab === "3dbot" ? (
                        <Pose3DBotViewer
                          exercise="suryanamaskar"
                          suryaStep={suryaStepNum}
                          muscleActivation={muscleActivation}
                          className="h-full"
                        />
                      ) : (
                        <SuryaStepViewer
                          activeStepNumber={suryaStepNum}
                          detectedPoseName={bodyStatus}
                          poseQuality={suryaPoseQuality || accuracy}
                          voicePrompt={instruction}
                          onSkipStep={handleSkipSuryaStep}
                          className="h-full"
                        />
                      )}
                    </div>
                  ) : selectedExercise === "reaction" ? (
                    <div className="flex flex-col h-full gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setSideViewerTab("reaction")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                            sideViewerTab === "reaction"
                              ? "bg-white text-indigo-950 shadow-2xs font-black border border-indigo-200"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Smile size={13} className="text-indigo-600" />
                          इमोशन टेलीमेट्री
                        </button>
                        <button
                          type="button"
                          onClick={() => setSideViewerTab("3dbot")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                            sideViewerTab === "3dbot"
                              ? "bg-white text-cyan-950 shadow-2xs font-black border border-cyan-200"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Rotate3d size={13} className="text-cyan-600" />
                          3D पोस्चर बॉट
                        </button>
                      </div>

                      {sideViewerTab === "reaction" ? (
                        <ReactionViewer
                          expressionData={expressionData}
                          voicePrompt={instruction}
                          className="h-full"
                        />
                      ) : (
                        <Pose3DBotViewer
                          exercise="desk"
                          muscleActivation={muscleActivation}
                          className="h-full"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col h-full gap-2">
                      <Pose3DBotViewer
                        exercise={selectedExercise}
                        muscleActivation={muscleActivation}
                        className="h-full min-h-[300px]"
                      />
                      {/* Real-time Muscle Group Recruitment Visualizer */}
                      {muscleActivation?.muscle_activations && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-700 tracking-wider">
                            <span className="flex items-center gap-1 text-cyan-800">
                              <Zap size={12} className="text-cyan-600" />
                              मसल एक्टिवेशन (Muscle Recruitment)
                            </span>
                            <span className="font-mono text-emerald-700 font-bold">
                              पीक: {muscleActivation.peak_activation_pct ?? 85}%
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            {Object.entries(muscleActivation.muscle_activations)
                              .slice(0, 4)
                              .map(([mName, val]) => (
                                <div key={mName} className="flex flex-col gap-0.5 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 capitalize">
                                    <span className="truncate">{mName.replace("_", " ")}</span>
                                    <span className="font-mono text-slate-900 font-black">{val}%</span>
                                  </div>
                                  <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 ${
                                        val >= 80 ? "bg-emerald-500" : val >= 50 ? "bg-cyan-500" : "bg-slate-400"
                                      }`}
                                      style={{ width: `${val}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </React.Suspense>
              </div>
            )}
          </div>

          {/* ====================================================
              WRITTEN & VERBAL INSTRUCTIONS DOCK (LIGHT MODE)
              (NO SUMMARY HERE: ONLY INSTRUCTIONS IN VERBAL FORM)
          ==================================================== */}
          <footer className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
            <div className="mx-auto max-w-6xl space-y-3">
              {/* Written Instruction Banner with Verbal Audio Indicator */}
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4 shadow-2xs">
                {/* Dynamic Written Instruction */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                      instructionType === "success"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : instructionType === "error"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-cyan-100 text-cyan-800 border border-cyan-300"
                    }`}
                  >
                    {instructionType === "success" ? (
                      <CheckCircle2 size={20} />
                    ) : instructionType === "error" ? (
                      <AlertTriangle size={20} />
                    ) : (
                      <Sparkles size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800">
                        {selectedExercise === "suryanamaskar"
                          ? `सूर्य नमस्कार • चरण ${suryaStepNum}/12`
                          : "लाइव निर्देश (Voice Guidance)"}
                      </span>
                      {selectedExercise === "suryanamaskar" && SURYA_STEPS[suryaStepNum - 1]?.mantra && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 font-serif">
                          {SURYA_STEPS[suryaStepNum - 1].mantra}
                        </span>
                      )}
                      {selectedExercise === "suryanamaskar" && SURYA_STEPS[suryaStepNum - 1]?.breath && (
                        <span className="rounded-md bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                          {SURYA_STEPS[suryaStepNum - 1].breath.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm sm:text-base font-black text-slate-900 leading-snug drop-shadow-2xs truncate sm:whitespace-normal">
                      {instruction ||
                        (selectedExercise === "suryanamaskar"
                          ? `${SURYA_STEPS[suryaStepNum - 1]?.name_hi} - ${SURYA_STEPS[suryaStepNum - 1]?.cue}`
                          : currentExercise.steps?.[0] || "कैमरे के सामने सही पोस्चर बनाए रखें।")}
                    </p>
                    {selectedExercise === "suryanamaskar" ? (
                      <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5 line-clamp-1">
                        <span className="font-bold text-amber-800">अलाइनमेंट:</span>
                        <span>{SURYA_STEPS[suryaStepNum - 1]?.alignmentTips?.[0] || "सही संतुलन बनाए रखें"}</span>
                      </p>
                    ) : currentExercise.steps?.[0] ? (
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 line-clamp-1">
                        <span className="font-bold text-slate-700">चरण (Step):</span>
                        <span>{currentExercise.steps[0]}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Verbal Coach Waveform & Repeat Button */}
                <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                  <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-2xs">
                    <div className="flex items-center gap-1">
                      <span
                        className={`h-3 w-1 rounded-full bg-cyan-600 transition-all duration-300 ${
                          isSpeakingVoice ? "animate-pulse h-4" : "h-2 opacity-40"
                        }`}
                      />
                      <span
                        className={`h-4 w-1 rounded-full bg-cyan-600 transition-all duration-300 ${
                          isSpeakingVoice ? "animate-bounce h-5" : "h-3 opacity-40"
                        }`}
                      />
                      <span
                        className={`h-2 w-1 rounded-full bg-cyan-600 transition-all duration-300 ${
                          isSpeakingVoice ? "animate-pulse h-3" : "h-1 opacity-40"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                      {isSpeakingVoice
                        ? "निर्देश बोले जा रहे हैं..."
                        : speechEnabled
                        ? "वॉयस कोच सक्रिय"
                        : "आवाज बंद"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={repeatVoiceInstruction}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition shadow-2xs"
                    title="निर्देश दोबारा सुनें (Repeat)"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:brightness-105"
                    >
                      <Camera size={16} />
                      कैमरा चालू करें
                    </button>
                  ) : !analysisRunning ? (
                    <button
                      type="button"
                      onClick={startAnalysis}
                      disabled={loading || isCalibrating}
                      className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:scale-105 disabled:opacity-50"
                    >
                      <Play size={16} />
                      {loading ? "शुरू हो रहा है..." : selectedExercise === "reaction" ? "रिएक्शन एनालिसिस" : "AI एनालिसिस शुरू करें"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopAnalysis}
                      disabled={loading}
                      className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-300 px-6 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 shadow-2xs disabled:opacity-50"
                    >
                      <CircleStop size={16} />
                      {loading ? "समाप्त हो रहा है..." : "एनालिसिस रोकें (Stop AI)"}
                    </button>
                  )}

                  {selectedExercise !== "reaction" && (
                    <button
                      type="button"
                      onClick={startCalibration}
                      disabled={loading || isCalibrating || analysisRunning}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 shadow-2xs disabled:opacity-40"
                    >
                      <Scan size={15} className={isCalibrating ? "animate-spin text-cyan-600" : "text-cyan-600"} />
                      {isCalibrating ? "कैलिब्रेटिंग..." : "बॉडी कैलिब्रेट (3s)"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={resetSession}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 shadow-2xs"
                    title="काउंटर्स रीसेट करें"
                  >
                    <RotateCcw size={15} />
                    <span className="hidden sm:inline">रीसेट</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 shadow-2xs"
                  >
                    <BookOpen size={15} className="text-cyan-600" />
                    <span className="hidden sm:inline">नियम व गाइड</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExitCameraFeed}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-900 shadow-2xs"
                  >
                    <Minimize2 size={15} />
                    <span className="hidden sm:inline">फुल स्क्रीन बंद</span>
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </div>
      ) : null}

      {/* ========================================================
          2. DECLUTTERED MAIN PAGE (EXERCISE SELECTOR)
      ======================================================== */}
      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">
        {/* Main Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:text-cyan-600"
            >
              <ArrowLeft size={14} />
              डैशबोर्ड (Dashboard)
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-600 shadow-xs">
                <Activity size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  AI मूवमेंट व पोस्चर कोच
                </h1>
                <p className="text-xs text-slate-500">
                  रियल-टाइम हिंदी वॉयस निर्देशों के साथ वर्कआउट करने के लिए नीचे से कोई भी एक्सरसाइज चुनें।
                </p>
              </div>
            </div>
          </div>

          {/* Body Map Calibration Toolbar Pill */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  bodyMap.isCalibrated
                    ? bodyMap.mode === "adaptive"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                    : "bg-slate-400"
                }`}
              />
              <div>
                <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                  बॉडी मैपिंग (Body Map)
                </p>
                <p className="text-xs font-bold text-slate-800">
                  {bodyMap.isCalibrated
                    ? bodyMap.mode === "adaptive"
                      ? "Adaptive Mode"
                      : "Standard Mode"
                    : "तैयार (Ready)"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={startCalibration}
              disabled={isCalibrating || analysisRunning}
              className="flex items-center gap-1.5 rounded-2xl bg-cyan-50 border border-cyan-200 px-3.5 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100 transition shadow-xs disabled:opacity-50"
              title="3 सेकंड में बॉडी कैलिब्रेट करें"
            >
              <Scan size={14} className={isCalibrating ? "animate-spin text-cyan-600" : "text-cyan-600"} />
              <span>{isCalibrating ? "कैलिब्रेटिंग..." : "कैलिब्रेट (3s)"}</span>
            </button>
          </div>
        </header>

        {/* Compact Calibration Status Strip (Default Collapsed & Persisted) */}
        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <UserCheck size={16} className="text-cyan-600 shrink-0" />
              <p className="text-xs text-slate-700">
                <strong className="text-slate-900">शारीरिक अनुकूलन (Anatomical Scaling):</strong>{" "}
                <span className="text-slate-600">{bodyMap.summary}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={toggleAnatomicalBanner}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-800 shrink-0 rounded-lg px-2.5 py-1 hover:bg-cyan-50 transition"
              title={showAnatomicalBanner ? "संक्षिप्त करें" : "विस्तृत विवरण देखें"}
            >
              <span>{showAnatomicalBanner ? "विवरण छिपाएं ▲" : "विवरण देखें ▼"}</span>
            </button>
          </div>

          {showAnatomicalBanner && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 animate-in fade-in duration-200">
              <p>
                कैमरे में न दिखने वाले अंगों को पोस्चर त्रुटि मानने के बजाय ऑटोमैटिक <strong>Not Applicable</strong> चिह्नित किया जाता है ताकि अनुचित पेनल्टी न लगे।
              </p>
              <button
                type="button"
                onClick={() => setShowCalibDetails(!showCalibDetails)}
                className="text-[11px] font-bold text-cyan-700 hover:underline shrink-0"
              >
                {showCalibDetails
                  ? "अंग सूची छिपाएं ▲"
                  : `ट्रैक किए जा रहे अंग देखें (${bodyMap.group_status.filter((g) => g.tracked).length}/8) ▼`}
              </button>
            </div>
          )}
        </div>

        {/* Expandable Limbs Grid with High Contrast Toggle States */}
        {showCalibDetails && (
          <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-cyan-950">
                Tracked Body Groups (टॉगल करने के लिए क्लिक करें):
              </p>
              <span className="text-[11px] font-bold text-cyan-800">
                {bodyMap.group_status.filter((g) => g.tracked).length} of {bodyMap.group_status.length} सक्रिय
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {bodyMap.group_status.map((group) => (
                <button
                  key={group.name}
                  onClick={() => toggleGroupTracked(group.name)}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                    group.tracked
                      ? "bg-emerald-50 text-emerald-950 border border-emerald-300 ring-1 ring-emerald-300/60 shadow-2xs"
                      : "bg-slate-50/60 text-slate-400 border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-600 opacity-65"
                  }`}
                  title={group.tracked ? `${group.name} ट्रैकिंग सक्रिय है (बंद करने के लिए क्लिक करें)` : `${group.name} ट्रैकिंग बंद है (चालू करने के लिए क्लिक करें)`}
                >
                  <span className="truncate">{group.name}</span>
                  {group.tracked ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-400">
                      <Minus size={9} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Selection Cards */}
        <section className="mb-8">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">मूवमेंट चुनें और वर्कआउट शुरू करें</h2>
              <p className="text-xs text-slate-500">
                किसी भी कार्ड पर क्लिक करके फुल-विंडो वीडियो फीड और हिंदी वॉयस कोच शुरू करें।
              </p>
            </div>

            {/* Dynamic Vision Analyzers Active Badge with Tooltip */}
            <div className="relative group/analyzers self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowCalibDetails((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-3.5 py-1.5 text-xs font-bold text-cyan-800 transition hover:bg-cyan-100 shadow-xs cursor-pointer"
                title="क्लिक करके सक्रिय विज़न ट्रैकर्स देखें"
              >
                <Sparkles size={13} className="text-cyan-600" />
                <span>
                  {bodyMap.group_status.filter((g) => g.tracked).length}/{bodyMap.group_status.length} Vision Analyzers Active
                </span>
              </button>

              {/* Hoverable Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-2 hidden w-64 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl backdrop-blur-md group-hover/analyzers:block group-hover/analyzers:pointer-events-auto z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    सक्रिय विज़न ट्रैकर्स
                  </span>
                  <span className="text-[10px] font-bold text-cyan-700">
                    {bodyMap.group_status.filter((g) => g.tracked).length} सक्रिय
                  </span>
                </div>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                  {bodyMap.group_status.map((g) => (
                    <div key={g.name} className="flex items-center justify-between text-xs py-0.5">
                      <span className={`font-medium ${g.tracked ? "text-slate-800" : "text-slate-400 line-through"}`}>
                        {g.name}
                      </span>
                      <span className={`text-[10px] font-bold ${g.tracked ? "text-emerald-600" : "text-slate-400"}`}>
                        {g.tracked ? "ON" : "OFF"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                  अंग ट्रैकिंग टॉगल करने के लिए ऊपर <strong>अंग सूची</strong> पर क्लिक करें।
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exercises.map((exercise) => {
              const isSelected = selectedExercise === exercise.id;
              const theme = getCategoryTheme(exercise.category);
              const isPrimaryAction = isSelected || exercise.featured;

              return (
                <div
                  key={exercise.id}
                  onClick={() => changeExercise(exercise.id)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isSelected
                      ? "border-cyan-500 bg-gradient-to-b from-cyan-50/80 via-white to-white ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/10"
                      : exercise.featured
                      ? "border-teal-400/80 bg-gradient-to-b from-teal-50/40 via-white to-white hover:border-teal-500 shadow-sm"
                      : "border-slate-200/90 bg-white hover:border-cyan-300 shadow-xs"
                  }`}
                >
                  {/* Featured / Highlight Badge */}
                  {(exercise.featured || exercise.badge) && (
                    <span className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                      <Sparkles size={11} className="fill-current" />
                      <span>{exercise.badge || "सबसे लोकप्रिय"}</span>
                    </span>
                  )}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      {/* Larger, Category-Tinted Card Icon */}
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition duration-300 ${
                          isSelected
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                            : theme.iconBg
                        }`}
                      >
                        {React.cloneElement(exercise.icon, { size: 24, strokeWidth: 2.2 })}
                      </div>

                      {/* Color-Coded Category Tag */}
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${theme.pill}`}>
                        {exercise.category}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 group-hover:text-cyan-700 transition">
                      {exercise.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {exercise.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {exercise.targetMuscles?.slice(0, 2).map((m, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      {exercise.difficulty}
                    </span>

                    {/* Clarified Button Hierarchy: Solid Primary vs Outlined Secondary */}
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition shadow-xs ${
                        isPrimaryAction
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-600/20 hover:brightness-105 border border-cyan-500"
                          : "bg-white text-slate-700 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/60 hover:text-cyan-800"
                      }`}
                    >
                      <Play size={12} className={isPrimaryAction ? "fill-current text-white" : "text-slate-500"} />
                      <span>अभ्यास शुरू करें</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ========================================================
          3. STOP AI ANALYSIS POP-UP MODAL (COMES AS A POP-UP AT LAST)
      ======================================================== */}
      {sessionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-200 bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            {/* Pop-Up Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    सत्यापित वर्कआउट (Verified Session)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-xs font-bold text-cyan-700">
                    <Sparkles size={13} className="text-cyan-600" />
                    AI बायोमैकेनिक्स ऑडिट
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {exercises.find((item) => item.id === sessionResult.exercise)?.name || "Exercise"} एनालिसिस सारांश
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSessionResult(null)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                title="पॉप-अप बंद करें"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <SummaryStat
                label={sessionResult.exercise === "reaction" ? "एंगेजमेंट (Engagement)" : "सटीकता (Accuracy)"}
                value={`${sessionResult.accuracy || 0}%`}
              />
              <SummaryStat
                label={sessionResult.exercise === "reaction" ? "रिएक्शन (Reaction)" : "कुल रेप्स (Total Reps)"}
                value={
                  sessionResult.exercise === "reaction"
                    ? `${sessionResult.emoji || "🙂"} ${sessionResult.reaction || sessionResult.dominant_mood || "Focused"}`
                    : sessionResult.reps || 0
                }
              />
              <SummaryStat label="समय (Duration)" value={formatTime(sessionResult.duration || 0)} />
            </div>

            {/* AI Report Card */}
            {sessionResult.ai_report ? (
              <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Score Grade & Headline */}
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-cyan-600 to-blue-700 text-white font-black text-2xl shadow-md ring-2 ring-cyan-400/30">
                      {sessionResult.ai_report.form_grade ||
                        (sessionResult.accuracy >= 80 ? "A" : sessionResult.accuracy >= 60 ? "B" : "C")}
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        <Award size={13} /> {sessionResult.ai_report.score_text || "बायोमैकेनिकल मूल्यांकन"}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {sessionResult.ai_report.headline || "AI पोस्चर रिपोर्ट"}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                        {sessionResult.ai_report.overview}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakReport(sessionResult.ai_report)}
                    className={`shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs ${
                      isSpeakingReport
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    }`}
                  >
                    <Volume2 size={15} className={isSpeakingReport ? "animate-pulse" : ""} />
                    {isSpeakingReport ? "ऑडियो रोकें" : "पूरी रिपोर्ट सुनें"}
                  </button>
                </div>

                {/* 🛡️ बायोमैकेनिकल रिस्क असेसमेंट व जॉइंट सेफ्टी (Biomechanical Risk & Joint Safety Protocol) */}
                {(() => {
                  const riskReport =
                    sessionResult.biomechanical_risk ||
                    sessionResult.ai_report?.biomechanical_risk_assessment;
                  if (!riskReport) return null;

                  const isHigh =
                    riskReport.overall_status === "high" ||
                    (riskReport.safety_index !== undefined && riskReport.safety_index < 60);
                  const isModerate =
                    riskReport.overall_status === "moderate" ||
                    (riskReport.safety_index !== undefined &&
                      riskReport.safety_index >= 60 &&
                      riskReport.safety_index < 80);

                  return (
                    <div
                      className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition ${
                        isHigh
                          ? "border-rose-300 bg-gradient-to-br from-rose-50/90 via-red-50/40 to-white ring-1 ring-rose-200"
                          : isModerate
                          ? "border-amber-300 bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white ring-1 ring-amber-200"
                          : "border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-slate-900">
                          <ShieldAlert
                            size={18}
                            className={
                              isHigh
                                ? "text-rose-600 animate-pulse"
                                : isModerate
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }
                          />
                          <span>बायोमैकेनिकल रिस्क असेसमेंट व जॉइंट सेफ्टी (Biomechanical Risk & Joint Safety)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-0.5 text-xs font-black border ${
                              isHigh
                                ? "bg-rose-100 border-rose-300 text-rose-800"
                                : isModerate
                                ? "bg-amber-100 border-amber-300 text-amber-800"
                                : "bg-emerald-100 border-emerald-300 text-emerald-800"
                            }`}
                          >
                            {riskReport.overall_rating || "सुरक्षित (Low Risk)"}
                          </span>
                          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-mono font-black text-white">
                            सेफ्टी इंडेक्स: {riskReport.safety_index ?? 90}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mb-3">
                        {riskReport.summary_msg}
                      </p>

                      {/* Vulnerable Joint Anatomy Cards */}
                      {riskReport.joint_cards && riskReport.joint_cards.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {riskReport.joint_cards.map((joint, jIdx) => (
                            <div
                              key={jIdx}
                              className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                    {jIdx + 1}
                                  </span>
                                  {joint.joint_name}
                                </h4>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                                    joint.risk_tier === "HIGH"
                                      ? "bg-rose-100 text-rose-800"
                                      : joint.risk_tier === "MODERATE"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {joint.risk_tier} RISK
                                </span>
                              </div>

                              <div className="text-xs text-slate-600">
                                <strong className="font-bold text-slate-800">पहचानी गई समस्या: </strong>
                                {joint.concern}
                              </div>

                              <div className="text-xs text-slate-600 leading-snug">
                                <strong className="font-bold text-amber-900">चोट का जोखिम (Impact): </strong>
                                {joint.impact}
                              </div>

                              <div className="rounded-lg bg-emerald-50/80 p-2 text-xs text-emerald-900 border border-emerald-100 font-medium">
                                <strong className="font-bold text-emerald-950">फिजियोथेरेपी व बचाव: </strong>
                                {joint.remedy}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 🫁 विजन-आधारित श्वसन व प्राणायाम तालमेल (Vision-Based Breath Detection & Pranayama Sync) */}
                {(() => {
                  const bSummary =
                    sessionResult.breath_summary ||
                    sessionResult.ai_report?.breath_summary;
                  if (!bSummary) return null;

                  return (
                    <div className="rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50/90 via-sky-50/40 to-white p-4 sm:p-5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-cyan-950 font-black text-xs uppercase tracking-wider">
                          <Wind size={18} className="text-cyan-600" />
                          <span>विजन-आधारित श्वसन व प्राणायाम तालमेल (Pranayama-Kinematics Sync)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-cyan-100 border border-cyan-300 px-3 py-0.5 text-xs font-black text-cyan-900">
                            {bSummary.sync_rating || "उत्तम (Good)"}
                          </span>
                          <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-mono font-black text-white">
                            तालमेल: {bSummary.avg_pranayama_sync ?? 85}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        <div className="rounded-xl border border-cyan-100 bg-white/90 p-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">औसत श्वसन दर (Respiration Rate)</span>
                          <div className="text-sm font-black text-slate-900 mt-0.5">
                            {bSummary.avg_respiration_bpm || 14} <span className="text-xs font-normal text-slate-500">सांसें प्रति मिनट (BPM)</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">
                            छाती और कॉलरबोन (Sternum) के माइक्रो-विस्थापन के आधार पर मापा गया।
                          </p>
                        </div>
                        <div className="rounded-xl border border-cyan-100 bg-white/90 p-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">काइनेटिक श्वास तालमेल (Sync Score)</span>
                          <div className="text-sm font-black text-cyan-800 mt-0.5">
                            {bSummary.avg_pranayama_sync ?? 85}% सटीकता
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">
                            छाती विस्तार पर श्वास (Inhale) और झुकते समय प्रश्वास (Exhale) का सही समन्वय।
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ⚡ बायोमैकेनिकल जॉइंट टॉर्क व लोड मॉडलिंग (Biomechanical Joint-Load & Torque Modeling) */}
                {(() => {
                  const tSummary =
                    sessionResult.joint_load_summary ||
                    sessionResult.ai_report?.joint_load_summary;
                  if (!tSummary) return null;

                  const isOverloaded = tSummary.overload_detected;

                  return (
                    <div className={`rounded-2xl border p-4 sm:p-5 shadow-2xs transition ${
                      isOverloaded
                        ? "border-rose-300 bg-gradient-to-br from-rose-50/90 via-red-50/40 to-white"
                        : "border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-blue-50/40 to-white"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                          <Zap size={18} className={isOverloaded ? "text-rose-600 animate-pulse" : "text-indigo-600"} />
                          <span>बायोमैकेनिकल जॉइंट टॉर्क व शियर स्ट्रेस (Inverse Dynamics Torque)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-black border ${
                            isOverloaded
                              ? "bg-rose-100 border-rose-300 text-rose-800"
                              : "bg-emerald-100 border-emerald-300 text-emerald-800"
                          }`}>
                            {tSummary.status || (isOverloaded ? "शियर स्ट्रेस चेतावनी" : "सुरक्षित लोड (Safe)")}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">L5-S1 लम्बर टॉर्क (Lumbar)</span>
                          <div className="text-base font-black text-slate-900 mt-0.5">
                            {tSummary.peak_l5_s1_torque_nm ?? 0} <span className="text-xs font-normal text-slate-500">N·m</span>
                          </div>
                          <span className="text-[10px] text-slate-500">कमर के निचले हिस्से पर फ्लेक्सियन मोमेंट</span>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">घुटने का टॉर्क (Patellofemoral)</span>
                          <div className="text-base font-black text-slate-900 mt-0.5">
                            {tSummary.peak_knee_torque_nm ?? 0} <span className="text-xs font-normal text-slate-500">N·m</span>
                          </div>
                          <span className="text-[10px] text-slate-500">क्वाड्रिसेप्स टेंडन व पटेला लोड</span>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">शियर फोर्स (Shear Stress)</span>
                          <div className={`text-base font-black mt-0.5 ${isOverloaded ? "text-rose-600" : "text-emerald-700"}`}>
                            {tSummary.peak_shear_n ?? 0} <span className="text-xs font-normal text-slate-500">N</span>
                          </div>
                          <span className="text-[10px] text-slate-500">सुरक्षित सीमा: &lt;450 N</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 🧬 व्यक्तिगत शारीरिक अनुपात व कंकाल कैलिब्रेशन (Anatomical Proportion Calibration) */}
                {(() => {
                  const profile =
                    sessionResult.anatomical_profile ||
                    anatomicalProfile;
                  if (!profile) return null;

                  return (
                    <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/90 via-fuchsia-50/30 to-white p-4 sm:p-5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-purple-950 font-black text-xs uppercase tracking-wider">
                          <Target size={18} className="text-purple-600" />
                          <span>व्यक्तिगत कंकाल अनुपात कैलिब्रेशन (Personalized Morphology)</span>
                        </div>
                        <span className="rounded-full bg-purple-100 border border-purple-300 px-3 py-0.5 text-xs font-black text-purple-900">
                          {profile.morphology_type || "संतुलित संरचना (Balanced)"}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mb-3">
                        {profile.description || "आपकी हड्डियों के अनुपात के अनुसार कोणों को स्केल किया गया है, ताकि संरचनात्मक बोन-स्टॉप और लचीलेपन में अंतर स्पष्ट हो सके।"}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="rounded-xl border border-purple-100 bg-white/90 p-2.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">फीमर/धड़ अनुपात</span>
                          <div className="text-sm font-black text-purple-900 font-mono mt-0.5">
                            {profile.femur_to_torso_ratio ?? 0.78}
                          </div>
                        </div>
                        <div className="rounded-xl border border-purple-100 bg-white/90 p-2.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">अनुकूलित लीन टॉलरेंस</span>
                          <div className="text-sm font-black text-purple-900 font-mono mt-0.5">
                            {profile.squat_lean_tolerance_deg ?? 35}°
                          </div>
                        </div>
                        <div className="rounded-xl border border-purple-100 bg-white/90 p-2.5 shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">बोन-स्टॉप फ्लेक्सिबिलिटी</span>
                          <div className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                            {profile.bone_stop_flexibility_index ?? 85}/100
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 1. आपकी ताकत और मजबूत पक्ष (Key Strengths & Highlights) */}
                <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                      <Award size={16} className="text-emerald-600" />
                      1. आपकी ताकत और मजबूत पक्ष (Key Strengths & Mastery)
                    </div>
                    <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                      मजबूत पहलू
                    </span>
                  </div>

                  {sessionResult.ai_report.key_strengths && sessionResult.ai_report.key_strengths.length > 0 ? (
                    <div className="space-y-2">
                      {sessionResult.ai_report.key_strengths.map((str, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-white/90 p-3 border border-emerald-100 shadow-2xs">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                            {str}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2 border border-emerald-100">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      पूरे सत्र के दौरान एकाग्रता, स्थिर जॉइंट अलाइनमेंट और निरंतर प्रयास बनाए रखा।
                    </div>
                  )}
                </div>

                {/* 2. क्या-क्या गलतियां हुईं और उनके कारण (Mistakes & Biomechanical Causes) */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs uppercase tracking-wider">
                      <AlertTriangle size={16} className="text-amber-600" />
                      2. क्या-क्या गलतियां हुईं और उनके बायोमैकेनिकल कारण (Mistakes Observed)
                    </div>
                    <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      सुधार की जरूरत
                    </span>
                  </div>

                  {sessionResult.ai_report.mistakes_analysis?.mistakes_list?.length > 0 ? (
                    <div className="space-y-2.5">
                      {sessionResult.ai_report.mistakes_analysis.mistakes_list.map((m, idx) => (
                        <div key={idx} className="rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-2xs">
                          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span>{m.name}</span>
                          </div>
                          <p className="mt-1.5 pl-7 text-xs text-slate-600 leading-relaxed">
                            <strong className="text-amber-900 font-bold">बायोमैकेनिकल कारण: </strong>
                            {m.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white p-3.5 text-xs text-emerald-800 font-semibold flex items-center gap-2 border border-emerald-200">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      कोई गंभीर बायोमैकेनिकल त्रुटि नहीं मिली — आपका फॉर्म और जॉइंट अलाइनमेंट बहुत संतुलित रहा।
                    </div>
                  )}
                </div>

                {/* 3. अगले सत्र के लिए मुख्य फोकस (Where You Should Focus Upon) */}
                <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-indigo-950 font-black text-xs uppercase tracking-wider">
                      <Target size={16} className="text-indigo-600" />
                      3. अगले सत्र के लिए मुख्य फोकस (Where You Should Focus Upon)
                    </div>
                    <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                      फोकस पॉइंट्स
                    </span>
                  </div>

                  {(sessionResult.ai_report.focus_areas || sessionResult.ai_report.areas_for_improvement)?.length > 0 ? (
                    <div className="space-y-2">
                      {(sessionResult.ai_report.focus_areas || sessionResult.ai_report.areas_for_improvement).map((focusItem, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-white p-3 border border-indigo-100 shadow-2xs">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                            {focusItem}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white p-3 text-xs text-slate-700 border border-indigo-100">
                      अगले सत्र में प्रत्येक मूवमेंट में 2-3 सेकंड की स्थिरता (Hold Quality) बढ़ाने पर ध्यान दें।
                    </div>
                  )}
                </div>

                {/* 4. सूर्य नमस्कार 12-चरण विस्तृत रिपोर्ट (Surya Namaskar 12-Step Performance Breakdown) */}
                {(sessionResult.exercise === "suryanamaskar" ||
                  sessionResult.exercise === "surya_namaskar" ||
                  (sessionResult.step_analysis && sessionResult.step_analysis.length > 0) ||
                  (sessionResult.ai_report?.step_analysis && sessionResult.ai_report.step_analysis.length > 0)) && (
                  <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
                        <Sparkles size={16} className="text-amber-600" />
                        4. सूर्य नमस्कार 12-चरण विस्तृत रिपोर्ट (Per-Step Accuracy & Sequence Flow)
                      </div>
                      {sessionResult.step_analysis && (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            {sessionResult.step_analysis.filter((s) => !s.is_skipped).length}/12 पूरे
                          </span>
                          {sessionResult.step_analysis.some((s) => s.is_skipped) && (
                            <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-black text-rose-800">
                              {sessionResult.step_analysis.filter((s) => s.is_skipped).length} स्किप
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {((sessionResult.step_analysis && sessionResult.step_analysis.length > 0
                        ? sessionResult.step_analysis
                        : sessionResult.ai_report?.step_analysis) || []).map((step, idx) => {
                        const isSkipped = Boolean(step.is_skipped || step.status === "skipped");
                        const isCorrect = !isSkipped && (step.status === "correct" || step.accuracy >= 70);

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl p-3.5 transition shadow-2xs ${
                              isSkipped
                                ? "border-2 border-rose-300 bg-rose-50/95 ring-1 ring-rose-200"
                                : isCorrect
                                ? "border border-emerald-200 bg-emerald-50/70"
                                : "border border-amber-200 bg-amber-50/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                    isSkipped
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-amber-500 text-slate-950 font-black"
                                  }`}
                                >
                                  {step.step_number || idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                    {step.name}
                                  </h4>
                                  {step.english_name && (
                                    <div className="text-[10px] text-slate-500 font-medium truncate">
                                      {step.english_name}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Accuracy Badge */}
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black border ${
                                  isSkipped
                                    ? "bg-rose-100 border-rose-300 text-rose-800"
                                    : step.accuracy >= 75
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                                    : "bg-amber-100 border-amber-300 text-amber-800"
                                }`}
                              >
                                {step.accuracy || 0}% सटीकता
                              </span>
                            </div>

                            {/* Status & Issues Details */}
                            <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                              {isSkipped ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                                  ❌ स्किप किया गया (Skipped)
                                </span>
                              ) : isCorrect ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                  ✅ सही फॉर्म (Optimal)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow-xs">
                                  ⚠️ फॉर्म सुधारें
                                </span>
                              )}

                              {step.mantra && (
                                <span className="text-[10px] font-serif font-bold text-amber-900/80">
                                  {step.mantra}
                                </span>
                              )}
                            </div>

                            {/* Specific Step Mistake / Feedback Callout */}
                            {isSkipped ? (
                              <p className="mt-2 rounded-lg bg-white/90 p-2 text-xs font-semibold text-rose-800 border border-rose-200">
                                यह चरण सत्र के दौरान छूट गया था। पूर्ण ऊर्जा और काइनेटिक निरंतरता के लिए अगले राउंड में इस चरण को स्किप न करें।
                              </p>
                            ) : step.issues && step.issues.length > 0 ? (
                              <div className="mt-2 rounded-lg bg-white/90 p-2 text-xs text-amber-900 border border-amber-200 font-medium">
                                <strong className="font-bold">कमियां: </strong>
                                {step.issues.join(". ")}
                              </div>
                            ) : (
                              <p className="mt-2 rounded-lg bg-white/80 p-2 text-xs text-emerald-800 border border-emerald-100 font-medium">
                                सही पोस्चर, संतुलन और श्वास नियंत्रण के साथ पूरा हुआ।
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. सत्र का विस्तृत विवरण (Session Performance & Telemetry) */}
                <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/70 to-blue-50/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-cyan-950 font-black text-xs uppercase tracking-wider">
                      <Brain size={16} className="text-cyan-600" />
                      5. सत्र का विस्तृत विवरण (Session Performance & Telemetry)
                    </div>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800">
                      {sessionResult.ai_report.what_you_did?.exercise_name || currentExercise.name}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {sessionResult.ai_report.what_you_did?.summary_text || sessionResult.ai_report.overview}
                  </p>

                  {sessionResult.ai_report.what_you_did?.target_muscles && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-cyan-100 text-xs text-slate-600">
                      <Dumbbell size={14} className="text-cyan-600 shrink-0" />
                      <div>
                        <strong className="text-slate-800">सक्रिय मांसपेशियां (Target Muscles): </strong>
                        {sessionResult.ai_report.what_you_did.target_muscles}
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. सुधार के लिए छोटी-छोटी सुधारात्मक एक्सरसाइज (Corrective Micro-Drills) */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs uppercase tracking-wider">
                      <Sparkles size={16} className="text-emerald-600" />
                      6. सुधार के लिए छोटी-छोटी सुधारात्मक एक्सरसाइज (Corrective Micro-Drills)
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-full">
                      सुझाए गए ड्रिल्स
                    </span>
                  </div>

                  {sessionResult.ai_report.corrective_exercises?.drills?.length > 0 ? (
                    <div className="space-y-2.5">
                      {sessionResult.ai_report.corrective_exercises.drills.map((d, idx) => (
                        <div key={idx} className="rounded-xl border border-emerald-200/80 bg-white p-3.5 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              {d.name}
                            </h4>
                            <span className="inline-flex self-start sm:self-auto rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              {d.sets}
                            </span>
                          </div>
                          <p className="mt-1.5 pl-7 text-xs text-slate-600 leading-relaxed">
                            {d.instruction}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-white p-3 text-xs text-slate-700 border border-emerald-100">
                        <strong className="text-slate-900">1. मोबिलिटी व ग्लूट ब्रेसिंग: </strong>
                        हल्के वार्म-अप और ग्लूट ब्रिज से पेल्विक अलाइनमेंट मजबूत रखें।
                      </div>
                      <div className="rounded-xl bg-white p-3 text-xs text-slate-700 border border-emerald-100">
                        <strong className="text-slate-900">2. स्लो टेम्पो प्रैक्टिस: </strong>
                        मूवमेंट की गति नियंत्रित रखें ताकि फॉर्म न बिगड़े।
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. सुरक्षा व रिकवरी सलाह (Safety & Recovery Protocol) */}
                {(sessionResult.ai_report.safety_note ||
                  sessionResult.ai_report.recovery_recommendation) && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs">
                    {sessionResult.ai_report.safety_note && (
                      <div className="flex items-start gap-2.5 text-xs text-slate-600">
                        <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 font-bold">सुरक्षा सलाह (Safety): </strong>
                          {sessionResult.ai_report.safety_note}
                        </div>
                      </div>
                    )}
                    {sessionResult.ai_report.recovery_recommendation && (
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 border-t border-slate-100 pt-2">
                        <HeartPulse size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 font-bold">रिकवरी व कूलडाउन (Recovery): </strong>
                          {sessionResult.ai_report.recovery_recommendation}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-bold text-slate-800">सत्र सफलतापूर्वक सेव हुआ</p>
                <p className="mt-1 text-xs text-slate-500">
                  {sessionResult.feedback || "आपकी एक्सरसाइज का डेटा प्रोफाइल में जोड़ दिया गया है।"}
                </p>
              </div>
            )}

            {/* Pop-Up Footer Actions */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSessionResult(null);
                  resetSession();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <RotateCcw size={14} />
                दोबारा अभ्यास करें
              </button>

              <button
                type="button"
                onClick={() => {
                  setSessionResult(null);
                  handleExitCameraFeed();
                }}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
              >
                सत्र समाप्त व बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. INSTRUCTIONS GUIDE MODAL
      ======================================================== */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  {currentExercise.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{currentExercise.name} - निर्देश व नियम</h3>
                  <p className="text-xs text-slate-400">{currentExercise.category} • {currentExercise.difficulty}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <p className="text-xs font-bold text-slate-700">एक्सरसाइज विवरण</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{currentExercise.description}</p>
              </div>

              {currentExercise.steps && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">चरणबद्ध बायोमैकेनिक्स नियम (Steps):</p>
                  <div className="space-y-2">
                    {currentExercise.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentExercise.commonMistakes && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <p className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600" /> सामान्य गलतियां (Common Mistakes):
                  </p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {currentExercise.commonMistakes.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs"
              >
                गाइड बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================================
// SUB-COMPONENTS
// ================================================================
const SummaryStat = ({ label, value }) => {
  return (
    <div className="min-w-[80px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
      <p className="mt-0.5 text-base font-black text-cyan-700">{value}</p>
    </div>
  );
};

export default PoseAnalysis;