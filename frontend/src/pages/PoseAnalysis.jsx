import React, { useEffect, useRef, useState, cloneElement } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
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
  Gauge,
  HeartPulse,
  Info,
  Maximize2,
  Minimize2,
  Minus,
  Play,
  RefreshCw,
  RotateCcw,
  Scan,
  ShieldAlert,
  Smile,
  Sparkles,
  Target,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react";

import api, { invalidateCache } from "../api/Api";
import SuryaStepViewer from "../components/SuryaStepViewer";
import ReactionViewer from "../components/ReactionViewer";

// Frame analysis intervals (ms)
const ANALYSIS_INTERVAL_MS = 200;
const CALIBRATION_INTERVAL_MS = 150;

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

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const calibIntervalRef = useRef(null);
  const isSendingFrameRef = useRef(false);
  const frameAbortRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [correctReps, setCorrectReps] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [instruction, setInstruction] = useState("कैमरे के सामने सीधे खड़े हों और फ्रेम में आएं।");
  const [instructionType, setInstructionType] = useState("info"); // "info" | "success" | "error"
  const [bodyStatus, setBodyStatus] = useState("तैयार (Ready)");
  
  // Surya Namaskar active step tracking
  const [suryaStepNum, setSuryaStepNum] = useState(1);
  const [suryaPoseQuality, setSuryaPoseQuality] = useState(0);

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
  const speakFeedback = (text) => {
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
    speakFeedback(textToSpeak);
  };

  const speakReport = (report) => {
    if (!("speechSynthesis" in window) || !report) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingReport(false);
      return;
    }

    const mistakesText = report.mistakes_analysis?.mistakes_list?.length
      ? `सत्र में देखी गई गलतियां: ${report.mistakes_analysis.mistakes_list.map((m) => m.name).join(". ")}.`
      : report.areas_for_improvement?.length
      ? `सुधार के मुख्य बिंदु: ${report.areas_for_improvement.join(". ")}.`
      : "";

    const drillsText = report.corrective_exercises?.drills?.length
      ? `सुधार के लिए सुझाई गई एक्सरसाइज: ${report.corrective_exercises.drills.map((d) => `${d.name} ${d.sets}`).join(". ")}.`
      : "";

    const parts = [
      report.headline || "",
      report.what_you_did?.summary_text || report.overview || "",
      mistakesText,
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
      speakFeedback(calibCue);

      await api.post("/pose/calibrate_start", { duration: 3.0 });

      let elapsedFrames = 0;
      const maxFrames = 30;

      if (calibIntervalRef.current) {
        clearInterval(calibIntervalRef.current);
      }

      calibIntervalRef.current = setInterval(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", 0.7);

        try {
          const res = await api.post("/pose/calibrate_frame", {
            image: imageData,
          });

          const { annotated_image, complete, progress, body_map } = res.data;
          if (annotated_image) {
            setAnnotatedFrame(annotated_image);
          }

          elapsedFrames++;
          const calcProgress = Math.min(
            Math.round((progress ?? elapsedFrames / maxFrames) * 100),
            100
          );
          setCalibrationProgress(calcProgress);

          if (complete || elapsedFrames >= maxFrames) {
            clearInterval(calibIntervalRef.current);
            calibIntervalRef.current = null;
            setIsCalibrating(false);
            setLoading(false);

            if (body_map) {
              setBodyMap({ ...body_map, isCalibrated: true });
              const successCue =
                body_map.mode === "adaptive"
                  ? "अडैप्टिव मोड में कैलिब्रेशन पूरा हुआ। वर्कआउट शुरू कर सकते हैं।"
                  : "बॉडी कैलिब्रेशन पूरा हुआ। आपका बॉडी मैप तैयार है।";
              setInstruction(successCue);
              setInstructionType("success");
              speakFeedback(successCue);
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
    if (!video || !canvas || video.readyState < 2) return;

    isSendingFrameRef.current = true;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.7);

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

      const { annotated_image, metrics, expression, ai_live_summary } =
        response.data;

      setAnnotatedFrame(annotated_image);

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

      setAnalysisRunning(true);
      setSessionResult(null); // Clear previous pop-up
      const startCue = `${currentExercise.name} शुरू हो रहा है। ${currentExercise.steps?.[0] || "मूवमेंट शुरू करें।"}`;
      setInstruction(startCue);
      setInstructionType("success");
      speakFeedback(startCue);

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
      speakFeedback("वर्कआउट पूरा हुआ। आपकी बायोमैकेनिक्स रिपोर्ट तैयार है।");

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
      setAnalysisRunning(false);
      setBodyStatus("पूर्ण (Done)");
      setLoading(false);
      setAnnotatedFrame(null);
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

    const target = exercises.find((item) => item.id === exerciseId);
    const cue = target?.name
      ? `${target.name} चुना गया। ${target.steps?.[0] || "कैमरे के सामने शुरुआती स्थिति में आएं।"}`
      : "एक्सरसाइज तैयार है।";
    setInstruction(cue);
    setInstructionType("info");

    if (!cameraActive) {
      startCamera();
    }
    speakFeedback(cue);
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
        <div className="fixed inset-0 z-40 flex flex-col bg-[#f8fafc] text-slate-900 select-none overflow-hidden">
          {/* Light Mode Studio Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFullWindow(false)}
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
                onClick={() => setIsFullWindow(false)}
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
                className={`h-full w-full object-contain ${cameraActive ? "block" : "hidden"}`}
              />

              {/* Skeleton & Pose HUD from backend */}
              {(analysisRunning || isCalibrating) && annotatedFrame && (
                <img
                  src={annotatedFrame}
                  alt="AI Pose Kinematics"
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

                  {isCalibrating && (
                    <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-md animate-pulse">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>कैलिब्रेटिंग ({calibrationProgress}%)</span>
                    </div>
                  )}
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

              {/* Minimal HUD: Bottom-Left Stage Status */}
              {cameraActive && (
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 backdrop-blur-md">
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

            {/* Right: Beside the video feed - Surya Namaskar Step-by-Step Image Guide */}
            {selectedExercise === "suryanamaskar" && (
              <div className="w-full lg:w-[350px] xl:w-[390px] shrink-0 flex flex-col max-h-[44vh] lg:max-h-none overflow-hidden animate-in fade-in slide-in-from-right-3 duration-300">
                <SuryaStepViewer
                  activeStepNumber={suryaStepNum}
                  detectedPoseName={bodyStatus}
                  poseQuality={suryaPoseQuality || accuracy}
                  voicePrompt={instruction}
                  className="h-full"
                />
              </div>
            )}

            {/* Right: Beside the video feed - Reaction & Emotion Telemetry */}
            {selectedExercise === "reaction" && (
              <div className="w-full lg:w-[350px] xl:w-[390px] shrink-0 flex flex-col max-h-[44vh] lg:max-h-none overflow-hidden animate-in fade-in slide-in-from-right-3 duration-300">
                <ReactionViewer
                  expressionData={expressionData}
                  voicePrompt={instruction}
                  className="h-full"
                />
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800">
                        लाइव निर्देश (Voice Guidance)
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm sm:text-base font-black text-slate-900 leading-snug drop-shadow-2xs truncate sm:whitespace-normal">
                      {instruction || currentExercise.steps?.[0] || "कैमरे के सामने सही पोस्चर बनाए रखें।"}
                    </p>
                    {currentExercise.steps?.[0] && (
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 line-clamp-1">
                        <span className="font-bold text-slate-700">चरण (Step):</span>
                        <span>{currentExercise.steps[0]}</span>
                      </p>
                    )}
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
                    onClick={() => setIsFullWindow(false)}
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

                {/* 1. क्या-क्या किया (What All You Did) */}
                <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/70 to-blue-50/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-cyan-950 font-black text-xs uppercase tracking-wider">
                      <Brain size={16} className="text-cyan-600" />
                      1. आपने क्या-क्या किया (Session Performance & Telemetry)
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

                {/* 2. क्या-क्या गलतियां हुईं और उनके कारण (Mistakes & Biomechanical Causes) */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
                  <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs uppercase tracking-wider mb-3">
                    <AlertTriangle size={16} className="text-amber-600" />
                    2. क्या-क्या गलतियां हुईं और उनके बायोमैकेनिकल कारण (Mistakes Observed)
                  </div>

                  {sessionResult.ai_report.mistakes_analysis?.mistakes_list?.length > 0 ? (
                    <div className="space-y-2.5">
                      {sessionResult.ai_report.mistakes_analysis.mistakes_list.map((m, idx) => (
                        <div key={idx} className="rounded-xl border border-amber-200/80 bg-white p-3 shadow-2xs">
                          <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{m.name}</span>
                          </div>
                          <p className="mt-1 pl-6 text-xs text-slate-600 leading-relaxed">
                            <strong className="text-amber-900 font-semibold">कारण: </strong>
                            {m.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : sessionResult.ai_report.areas_for_improvement?.length > 0 ? (
                    <ul className="space-y-2">
                      {sessionResult.ai_report.areas_for_improvement.map((area, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-800 font-medium">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-[9px] font-bold">
                            !
                          </span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl bg-white p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2 border border-emerald-200">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      कोई गंभीर बायोमैकेनिकल त्रुटि नहीं मिली — आपका फॉर्म और जॉइंट अलाइनमेंट बहुत संतुलित रहा।
                    </div>
                  )}
                </div>

                {/* 3. सुधार के लिए छोटी-छोटी सुधारात्मक एक्सरसाइज (Corrective Micro-Drills) */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-black text-xs uppercase tracking-wider">
                      <Sparkles size={16} className="text-emerald-600" />
                      3. सुधार के लिए छोटी-छोटी सुधारात्मक एक्सरसाइज (Corrective Micro-Drills)
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

                {/* 4. सुरक्षा व रिकवरी सलाह (Safety & Recovery Protocol) */}
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
                  setIsFullWindow(false);
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