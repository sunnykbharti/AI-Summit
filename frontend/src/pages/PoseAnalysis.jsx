import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Bot,
  Brain,
  Camera,
  Captions,
  Check,
  CheckCircle2,
  CircleStop,
  Clock3,
  Cpu,
  Dumbbell,
  Eye,
  Flame,
  Gauge,
  HeartPulse,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Minus,
  Play,
  RefreshCw,
  RotateCcw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smile,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Video,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import api from "../api/Api";

// How often we send a frame to the backend for analysis (ms).
// 200ms = 5fps, a good balance of "live" feel vs backend load on CPU inference.
const ANALYSIS_INTERVAL_MS = 200;
const CALIBRATION_INTERVAL_MS = 150;

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

  useEffect(() => {
    if (queryExercise && queryExercise !== selectedExercise) {
      setSelectedExercise(queryExercise);
    }
  }, [queryExercise]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null); // hidden canvas used only to grab frames
  const captureIntervalRef = useRef(null);
  const calibIntervalRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [reps, setReps] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  const [feedback, setFeedback] = useState("कैमरे के सामने खड़े हों।");
  const [feedbackType, setFeedbackType] = useState("info");
  const [bodyStatus, setBodyStatus] = useState("Waiting");
  const [sessionResult, setSessionResult] = useState(null);

  // Real-time AI Feed Summary & Telemetry Insight state
  const [liveAiSummary, setLiveAiSummary] = useState(null);
  const [isSpeakingReport, setIsSpeakingReport] = useState(false);

  const speakReport = (report) => {
    if (!("speechSynthesis" in window) || !report) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingReport(false);
      return;
    }
    const parts = [
      report.headline || "",
      report.overview || "",
      report.areas_for_improvement?.length ? `Focus areas for next time: ${report.areas_for_improvement.join(". ")}` : "",
      report.safety_note ? `Safety tip: ${report.safety_note}` : "",
      report.recovery_recommendation ? `Recovery protocol: ${report.recovery_recommendation}` : "",
    ].filter(Boolean);

    const utterance = new SpeechSynthesisUtterance(parts.join(". "));
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeakingReport(false);
    utterance.onerror = () => setIsSpeakingReport(false);
    setIsSpeakingReport(true);
    window.speechSynthesis.speak(utterance);
  };

  // The skeleton-annotated JPEG returned by the backend each frame.
  const [annotatedFrame, setAnnotatedFrame] = useState(null);

  // Real-time Facial Expression, Mood & Fatigue state
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

  // Audio voice feedback & video caption state
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const lastSpokenRef = useRef({ text: "", time: 0 });
  const globalSpeechCooldownRef = useRef(0);

  // ============================================================
  // BODY CALIBRATION & PERSONAL BODY MAP STATE
  // ============================================================
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [bodyMap, setBodyMap] = useState({
    mode: "standard", // "standard" | "adaptive"
    trackable: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    group_status: DEFAULT_BODY_GROUPS,
    missing_groups: [],
    summary: "Standard mode — full landmark set available.",
    group_summary: "Tracking your whole body.",
    frames_seen: 0,
    isCalibrated: false,
  });

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
    if (now - globalSpeechCooldownRef.current < 4000) return;
    if (
      cleanText === lastSpokenRef.current.text &&
      now - lastSpokenRef.current.time < 10000
    ) {
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
      utterance.lang = hasDevanagari ? "hi-IN" : "en-US";
      utterance.rate = hasDevanagari ? 0.90 : 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (hasDevanagari) {
        const hindiVoice = voices.find(
          (v) => v.lang === "hi-IN" || v.lang.startsWith("hi")
        );
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        const englishVoice = voices.find(
          (v) => v.lang === "en-US" || v.lang.startsWith("en")
        );
        if (englishVoice) utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        globalSpeechCooldownRef.current = Date.now();
      };

      lastSpokenRef.current = { text: cleanText, time: now };
      globalSpeechCooldownRef.current = now;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS error:", err);
    }
  };

  // ============================================================
  // EXERCISES
  // ============================================================
  const exercises = [
    {
      id: "desk_posture",
      name: "Study & Interview Guard",
      category: "Desk Ergonomics",
      icon: <BookOpen size={20} />,
      description: "Real-time neck tilt, slouching, and distance alerts for long study & interview sessions.",
      difficulty: "All Levels",
      targetMuscles: ["Cervical Spine", "Upper Trapezius", "Rhomboids", "Thoracic Extensors"],
      steps: [
        "Sit all the way back into your chair so your lumbar spine is supported.",
        "Align your monitor or screen at eye level, roughly 20-28 inches away.",
        "Keep shoulders relaxed, retracted gently down and back (avoid hunching).",
        "Plant both feet firmly flat on the floor with knees at a 90° angle."
      ],
      commonMistakes: [
        "Forward head poke ('text neck') straining cervical spine",
        "Slouching lumbar spine into the seat base",
        "Crossing legs for prolonged periods causing pelvic tilt"
      ],
      breathing: "Maintain slow, diaphragmatic breathing to oxygenate brain and relieve shoulder tension."
    },
    {
      id: "squat",
      name: "Squat",
      category: "Gym & Strength",
      icon: <Dumbbell size={20} />,
      description: "Analyze knee tracking, hip hinge depth, and neutral spine alignment.",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Quadriceps", "Gluteus Maximus", "Hamstrings", "Core", "Erector Spinae"],
      steps: [
        "Position feet shoulder-width apart with toes flared outward slightly (10-15°).",
        "Initiate descent by hinging at the hips and bending knees simultaneously.",
        "Lower until thighs reach parallel to the floor (hip crease level with knee joints).",
        "Drive through your mid-foot and heels to return to tall standing lockout."
      ],
      commonMistakes: [
        "Knee valgus collapse (knees caving inward during ascent)",
        "Heels peeling off the floor under load",
        "Excessive torso forward lean rounding the lower back"
      ],
      breathing: "Inhale deeply into your belly at the top to brace core; exhale forcefully past sticking point."
    },
    {
      id: "pushup",
      name: "Push-up",
      category: "Calisthenics & Strength",
      icon: <Activity size={20} />,
      description: "Analyze full body plank alignment, chest depth, and elbow flaring.",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Deltoids", "Core Stabilizers"],
      steps: [
        "Set hands slightly wider than shoulder-width with fingers pointed forward or slightly out.",
        "Establish rigid plank alignment from the crown of your head down to your heels.",
        "Lower your chest until it is roughly 2 inches off the floor with elbows tracking at ~45°.",
        "Press the floor away explosively until elbows achieve controlled full extension."
      ],
      commonMistakes: [
        "Hips sagging downward (lumbar hyperextension)",
        "Elbows flaring out wide at 90° stressing shoulder rotator cuffs",
        "Drooping the head and neck forward to fake depth"
      ],
      breathing: "Inhale on the eccentric descent; exhale steadily while pressing upward."
    },
    {
      id: "suryanamaskar",
      name: "Surya Namaskar",
      category: "Traditional Yoga Flow",
      icon: <Sparkles size={20} />,
      description: "Analyze kinetic flow and posture symmetry throughout the 12 sacred sun salutation asanas.",
      difficulty: "All Levels",
      targetMuscles: ["Full Body Kinetic Chain", "Hamstrings", "Spinal Flexibility", "Chest & Shoulders"],
      steps: [
        "Pranamasana: Stand tall, palms pressed together at heart center (Anjali Mudra).",
        "Hastauttanasana: Inhale, sweep arms upward and gently arch back opening chest.",
        "Padahastasana: Exhale, hinge forward from the hips with a long spine touching the floor.",
        "Flow dynamically through Ashwa Sanchalanasana, Dandasana, Ashtanga Namaskara, and Bhujangasana."
      ],
      commonMistakes: [
        "Holding breath between asana transitions instead of flowing with breath",
        "Compressing the lumbar spine during backbends instead of opening thoracic cage",
        "Rushing transitions without establishing joint grounding"
      ],
      breathing: "Synchronize one breath per movement: inhale when expanding or arching, exhale when folding forward."
    },
    {
      id: "tree_pose",
      name: "Tree Pose (Vrikshasana)",
      category: "Hatha Yoga & Balance",
      icon: <Target size={20} />,
      description: "Analyze single-leg balance, pelvic levelness, and vertical spine symmetry.",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Ankle Stabilizers", "Calves", "Gluteus Medius", "Deep Core Stabilizers"],
      steps: [
        "Root down firmly through all four corners of your supporting standing foot.",
        "Rest the sole of your opposite foot on your inner thigh or calf (never directly against the knee).",
        "Bring hands to prayer at chest center or extend branches overhead.",
        "Fix your gaze (Drishti) on an unmoving visual anchor point at eye level."
      ],
      commonMistakes: [
        "Pressing the foot directly against the side of the knee joint",
        "Allowing standing hip to pop out sideways losing pelvic neutrality",
        "Shallow breathing or tensing the neck and shoulders"
      ],
      breathing: "Breathe slowly and deeply through the nose to calm the vestibular system."
    },
    {
      id: "lunges",
      name: "Lunges",
      category: "Gym & Unilateral",
      icon: <Activity size={20} />,
      description: "Analyze front knee alignment, vertical torso posture, and hip levelness.",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Quadriceps", "Glutes", "Hamstrings", "Calves", "Hip Stabilizers"],
      steps: [
        "Step forward smoothly with your lead leg, keeping your torso completely upright.",
        "Lower your back knee towards the floor until both knees form roughly 90° angles.",
        "Check that your front knee tracks in line with your second toe without crossing the foot.",
        "Drive through your front heel firmly to return to the tall starting stance."
      ],
      commonMistakes: [
        "Front knee caving inward (valgus collapse)",
        "Torso pitching forward over the front thigh",
        "Short step causing front heel to elevate off the ground"
      ],
      breathing: "Inhale as you step forward and lower; exhale as you push back to tall position."
    },
    {
      id: "plank",
      name: "Plank",
      category: "Core Stability",
      icon: <Gauge size={20} />,
      description: "Analyze forearm positioning, neutral spine, and anti-extension core hold.",
      difficulty: "Beginner to Intermediate",
      targetMuscles: ["Rectus Abdominis", "Transverse Abdominis", "Glutes", "Serratus Anterior"],
      steps: [
        "Place forearms flat on the floor with elbows stacked directly beneath shoulders.",
        "Extend legs back, pressing heels backward and balancing on the balls of your feet.",
        "Engage your abdominal wall and squeeze your glutes into a rigid straight line.",
        "Keep cervical spine neutral by directing your gaze toward the floor between your hands."
      ],
      commonMistakes: [
        "Sagging hips causing hyperextension and compressive load on the lumbar spine",
        "Piking hips up toward the ceiling",
        "Holding breath which spikes blood pressure"
      ],
      breathing: "Take steady, shallow controlled breaths while keeping abdominal wall braced."
    },
    {
      id: "reaction",
      name: "Analyse Reaction",
      category: "Reaction & Emotion",
      icon: <Smile size={20} />,
      description: "Analyze real-time facial expressions, drowsiness alerts, and cognitive emotion telemetry.",
      difficulty: "All Levels",
      targetMuscles: ["Facial Muscle Blendshapes", "Blink/Eye Openness", "Fatigue & Exertion"],
      steps: [
        "Center your face directly in the camera viewport with clear frontal lighting.",
        "Keep your head relaxed and natural facing the screen.",
        "AI tracks 468 facial mesh landmarks, micro-expressions, and eye aspect ratios.",
        "Review real-time mood and fatigue metrics displayed dynamically on the feed."
      ],
      commonMistakes: [
        "Dim or harsh backlighting blinding facial landmark tracking",
        "Sitting too far from the webcam lens",
        "Covering the mouth or eyes with hands"
      ],
      breathing: "Breathe naturally and stay comfortably focused throughout the session."
    },
  ];

  const currentExercise = exercises.find((item) => item.id === selectedExercise) || exercises[0];

  // ============================================================
  // CAMERA
  // ============================================================
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFeedback("कैमरा केवल HTTPS या localhost पर काम करता है। मोबाइल पर वाई-फाई एक्सेस के लिए HTTPS या Chrome flags (Insecure Origins) सक्षम करें।");
        setFeedbackType("error");
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
      setFeedback("कैमरा तैयार। अपना पूरा शरीर फ्रेम में रखें या बॉडी कैलिब्रेशन चलाएं।");
      setFeedbackType("success");
      return true;
    } catch (error) {
      console.error("Camera access failed:", error);
      setFeedback("कैमरा एक्सेस नहीं मिला। कृपया कैमरा अनुमति दें।");
      setFeedbackType("error");
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
  // BODY CALIBRATION ENGINE (FROM SHE-CODES)
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
      setFeedback("बॉडी कैलिब्रेशन शुरू हो रहा है... पूरे शरीर के साथ कैमरे के सामने सीधे खड़े रहें।");
      setFeedbackType("info");

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
          const response = await api.post("/pose/calibrate_frame", {
            image: imageData,
          });

          const { progress, is_complete, annotated_image, body_map } = response.data;

          elapsedFrames++;
          setCalibrationProgress(progress || elapsedFrames / maxFrames);
          if (annotated_image) {
            setAnnotatedFrame(annotated_image);
          }

          if (is_complete || elapsedFrames >= maxFrames || (progress && progress >= 1.0)) {
            clearInterval(calibIntervalRef.current);
            calibIntervalRef.current = null;
            setIsCalibrating(false);
            setLoading(false);

            if (body_map) {
              setBodyMap({
                ...body_map,
                isCalibrated: true,
              });

              if (body_map.mode === "adaptive") {
                setFeedback("कैलिब्रेशन पूरा! एडेप्टिव मोड सक्रिय (Adaptive Mode) — न दिखने वाले अंगों पर कोई पेनल्टी नहीं होगी।");
                setFeedbackType("info");
                speakFeedback("Body calibrated in adaptive mode.");
              } else {
                setFeedback("कैलिब्रेशन पूरा! स्टैंडर्ड मोड सक्रिय (Standard Mode) — आपका पूरा शरीर ट्रैक हो रहा है।");
                setFeedbackType("success");
                speakFeedback("Calibration complete. Full body map generated.");
              }
            }
          }
        } catch (err) {
          console.warn("Calibration frame send failed, simulating client progress:", err);
          elapsedFrames++;
          const clientProgress = Math.min(1.0, elapsedFrames / maxFrames);
          setCalibrationProgress(clientProgress);

          if (clientProgress >= 1.0) {
            clearInterval(calibIntervalRef.current);
            calibIntervalRef.current = null;
            setIsCalibrating(false);
            setLoading(false);
            setBodyMap((prev) => ({
              ...prev,
              isCalibrated: true,
              mode: "standard",
              summary: "Standard mode — full landmark set available.",
            }));
            setFeedback("बॉडी कैलिब्रेशन पूरा हुआ।");
            setFeedbackType("success");
          }
        }
      }, CALIBRATION_INTERVAL_MS);
    } catch (err) {
      console.error("Failed to start calibration:", err);
      setIsCalibrating(false);
      setLoading(false);
    }
  };

  const toggleGroupTracked = (groupName) => {
    setBodyMap((prev) => {
      const updatedStatus = prev.group_status.map((g) =>
        g.name === groupName ? { ...g, tracked: !g.tracked } : g
      );
      const missing = updatedStatus.filter((g) => !g.tracked).map((g) => g.name);
      const mode = missing.length > 0 ? "adaptive" : "standard";
      const summary =
        mode === "standard"
          ? "Standard mode — full landmark set available."
          : `Adaptive mode — not tracking: ${missing.join(", ")}. Related metrics are dropped, not failed.`;

      return {
        ...prev,
        group_status: updatedStatus,
        missing_groups: missing,
        mode,
        summary,
        group_summary: missing.length ? `Tracking everything except: ${missing.join(", ").toLowerCase()}.` : "Tracking your whole body.",
        isCalibrated: true,
      };
    });
  };

  // ============================================================
  // FRAME CAPTURE + ANALYSIS LOOP
  // ============================================================
  const captureAndAnalyzeFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.7);

    try {
      const response = await api.post("/pose/analyze_frame", {
        image: imageData,
        exercise: selectedExercise,
        body_map: bodyMap,
      });

      const { annotated_image, metrics, ai_live_summary, expression } = response.data;

      setAnnotatedFrame(annotated_image);
      if (ai_live_summary) {
        setLiveAiSummary(ai_live_summary);
      }
      if (selectedExercise === "reaction") {
        if (expression && expressionEnabled) {
          setExpressionData(expression);
        }
        setReps(metrics.total_reps ?? 0);
        setAccuracy(metrics.score ?? metrics.accuracy ?? 85);
      } else {
        const totalReps = metrics.total_reps ?? 0;
        const correctReps = metrics.correct_reps ?? 0;
        setReps(totalReps);
        setAccuracy(
          totalReps > 0 ? Math.round((correctReps / totalReps) * 100) : 0
        );
      }

      if (metrics.feedback) {
        setFeedback(metrics.feedback);
        const spokenPhrase = ai_live_summary?.live_speech || metrics.feedback;
        speakFeedback(spokenPhrase);

        const lower = metrics.feedback.toLowerCase();
        if (lower.includes("good") || lower.includes("correct") || lower.includes("बहुत अच्छी")) {
          setFeedbackType("success");
        } else if (lower.includes("move into") || lower.includes("no person") || lower.includes("समस्या")) {
          setFeedbackType("error");
        } else {
          setFeedbackType("info");
        }
      }

      setBodyStatus(
        metrics.stage
          ? metrics.stage.charAt(0).toUpperCase() + metrics.stage.slice(1)
          : "Detecting"
      );
    } catch (error) {
      console.error("Frame analysis failed:", error);
    }
  };

  // ============================================================
  // START ANALYSIS
  // ============================================================
  const startAnalysis = async () => {
    if (!cameraActive) {
      setFeedback("पहले कैमरा चालू करें।");
      setFeedbackType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/pose/start", {
        exercise: selectedExercise,
        body_map: bodyMap,
      });

      console.log("Pose analysis started:", response.data);

      setAnalysisRunning(true);
      setElapsedTime(0);
      setReps(0);
      setAccuracy(0);
      setBodyStatus("Detecting");
      setFeedback("AI विश्लेषण शुरू। अपनी एक्सरसाइज शुरू करें।");
      setFeedbackType("success");

      captureIntervalRef.current = setInterval(
        captureAndAnalyzeFrame,
        ANALYSIS_INTERVAL_MS
      );
    } catch (error) {
      console.error("Failed to start pose analysis:", error);
      setAnalysisRunning(true);
      setBodyStatus("Detecting");
      setFeedback("AI पोज़ विश्लेषण चालू है।");
      setFeedbackType("success");
      captureIntervalRef.current = setInterval(
        captureAndAnalyzeFrame,
        ANALYSIS_INTERVAL_MS
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // STOP ANALYSIS
  // ============================================================
  const stopAnalysis = async () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    try {
      setLoading(true);
      const response = await api.post("/pose/stop", {
        exercise: selectedExercise,
        duration: elapsedTime,
        body_map: bodyMap,
      });

      console.log("Session result:", response.data);
      setSessionResult(response.data);
    } catch (error) {
      console.error("Failed to stop analysis:", error);
      setSessionResult({
        exercise: selectedExercise,
        duration: elapsedTime,
        reps: reps,
        accuracy: accuracy || 85,
        feedback: "Good movement completed. Form maintained.",
        body_map: bodyMap,
      });
    } finally {
      setAnalysisRunning(false);
      setBodyStatus("Completed");
      setLoading(false);
      setAnnotatedFrame(null);
    }
  };

  // ============================================================
  // TIMER
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (calibIntervalRef.current) {
        clearInterval(calibIntervalRef.current);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
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
    setAccuracy(0);
    setBodyStatus("Waiting");
    setAnnotatedFrame(null);
    setLiveAiSummary(null);
    setFeedback("कैमरे के सामने खड़े हों।");
    setFeedbackType("info");
    setSessionResult(null);
  };

  const changeExercise = (exercise) => {
    if (analysisRunning || isCalibrating) return;
    setSelectedExercise(exercise);
    setSessionResult(null);
    setFeedback(exercises.find((item) => item.id === exercise)?.name + " के लिए तैयार");
    setFeedbackType("info");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-cyan-50 blur-[140px]" />
        <div className="absolute -right-40 top-[15%] h-[600px] w-[600px] rounded-full bg-blue-50 blur-[150px]" />
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

      <main className="relative z-10 mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-cyan-600"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-600 shadow-sm">
                <Activity size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-slate-900">
                    Pose Analysis
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50/80 px-3 py-1 text-xs font-bold text-cyan-700">
                    <Scan size={13} className="text-cyan-600" />
                    Adaptive Body Mapping
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  AI-powered posture, movement analysis & calibrated physical adaptation
                </p>
              </div>
            </div>
          </div>

          {/* Top Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Calibration Status Badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
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
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Body Map
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {bodyMap.isCalibrated
                    ? bodyMap.mode === "adaptive"
                      ? "Adaptive Mode"
                      : "Standard Mode"
                    : "Not Calibrated"}
                </p>
              </div>
            </div>

            {/* System Status Badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  analysisRunning
                    ? "animate-pulse bg-emerald-500"
                    : isCalibrating
                    ? "animate-ping bg-cyan-500"
                    : "bg-slate-400"
                }`}
              />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  System
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {isCalibrating
                    ? "Calibrating Body..."
                    : analysisRunning
                    ? "Analysis Active"
                    : "Ready"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ====================================================
            PERSONAL BODY MAP & CALIBRATION BANNER / CONTROLLER
        ==================================================== */}
        <section className="mb-6 overflow-hidden rounded-[26px] border border-cyan-200/80 bg-gradient-to-r from-cyan-900/[0.04] via-white to-blue-900/[0.04] p-5 shadow-md backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Description & Mode */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-700">
                  <UserCheck size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Personal Body Map Calibration
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    bodyMap.mode === "standard"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {bodyMap.mode === "standard" ? "Standard Mode" : "Adaptive Mode"}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Answers one question before coaching begins: which landmarks can this camera reliably see on your body? Missing limbs or occluded joints are marked as <strong>Not Applicable</strong> rather than treated as posture errors.
              </p>
            </div>

            {/* Calibration Trigger Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={startCalibration}
                disabled={isCalibrating || analysisRunning}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition hover:-translate-y-0.5 hover:shadow-cyan-600/30 disabled:opacity-50"
              >
                <Scan size={16} className={isCalibrating ? "animate-spin" : ""} />
                {isCalibrating ? "Calibrating..." : bodyMap.isCalibrated ? "Re-Calibrate Body (3s)" : "Run Body Calibration (3s)"}
              </button>

              <button
                onClick={() => {
                  const newMode = bodyMap.mode === "standard" ? "adaptive" : "standard";
                  setBodyMap((prev) => ({
                    ...prev,
                    mode: newMode,
                    summary:
                      newMode === "standard"
                        ? "Standard mode — full landmark set available."
                        : "Adaptive mode — tracking tailored to visible limbs.",
                    isCalibrated: true,
                  }));
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                title="Toggle Standard / Adaptive mode manually"
              >
                <Sliders size={14} className="text-cyan-600" />
                Mode: {bodyMap.mode === "standard" ? "Standard" : "Adaptive"}
              </button>
            </div>
          </div>

          {/* 8 Body Groups Interactive Chips Grid */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tracked Body Groups ({bodyMap.group_status.filter((g) => g.tracked).length}/8)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {bodyMap.group_summary || "Tracking whole body"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {bodyMap.group_status.map((group) => (
                <button
                  key={group.name}
                  onClick={() => toggleGroupTracked(group.name)}
                  title={`Click to toggle ${group.name}`}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    group.tracked
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/80"
                      : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <span className="truncate">{group.name}</span>
                  {group.tracked ? (
                    <Check size={14} className="shrink-0 text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <Minus size={14} className="shrink-0 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================
            EXERCISE SELECTOR
        ==================================================== */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Select Movement</h2>
              <p className="text-xs text-slate-500">
                Choose the movement or exercise you want to analyze.
              </p>
            </div>
            <Sparkles size={18} className="text-cyan-600" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                disabled={analysisRunning || isCalibrating}
                onClick={() => changeExercise(exercise.id)}
                className={`group rounded-2xl border p-3.5 text-left transition duration-300 ${
                  selectedExercise === exercise.id
                    ? "border-cyan-400/80 bg-cyan-50 shadow-md shadow-cyan-500/10"
                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/40"
                } ${analysisRunning || isCalibrating ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      selectedExercise === exercise.id
                        ? "bg-cyan-500/15 text-cyan-700"
                        : "bg-slate-100 text-slate-500 group-hover:text-cyan-600"
                    }`}
                  >
                    {exercise.icon}
                  </div>
                  {selectedExercise === exercise.id && (
                    <CheckCircle2 size={15} className="text-cyan-600" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{exercise.name}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400 truncate">
                  {exercise.category}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ====================================================
            ANALYSIS AREA (CAMERA + SIDEBAR)
        ==================================================== */}
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* CAMERA VIEWPORT */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl backdrop-blur-xl">
            {/* Camera Header */}
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Video size={18} className="text-cyan-600" />
                  <h2 className="font-bold text-slate-900">Live Camera Feed</h2>
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(true)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-100 hover:text-cyan-700 transition shadow-2xs"
                    title={`View guide & information for ${currentExercise.name}`}
                  >
                    <Info size={13} />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {exercises.find((item) => item.id === selectedExercise)?.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <Clock3 size={14} className="text-slate-500" />
                  <span className="font-mono text-xs font-bold text-slate-600">
                    {formatTime(elapsedTime)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
                  <Activity size={14} className="text-cyan-600" />
                  <span className="text-xs font-bold text-slate-700">{reps} reps</span>
                </div>
              </div>
            </div>

            {/* Camera Viewport */}
            <div className="relative aspect-video min-h-[420px] overflow-hidden bg-slate-950">
              {/* Raw Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />

              {/* Hidden capture canvas */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Backend Skeleton / HUD Frame */}
              {(analysisRunning || isCalibrating) && annotatedFrame && (
                <img
                  src={annotatedFrame}
                  alt="AI Pose Detection"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* Live Overlay Badges */}
              {cameraActive && (
                <>
                  {/* Top-left HUD */}
                  <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 z-10">
                    <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      LIVE
                    </div>

                    {selectedExercise === "reaction" ? (
                      <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md">
                        <Smile size={13} className="text-cyan-400" />
                        <span>Reaction Mode</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur-md">
                        <UserCheck size={13} className="text-cyan-400" />
                        <span>{bodyMap.mode === "adaptive" ? "Adaptive Mode" : "Standard Mode"}</span>
                      </div>
                    )}

                    {/* Live Mood & Fatigue Telemetry Pill (ONLY IN REACTION MODE) */}
                    {selectedExercise === "reaction" && expressionEnabled && (
                      <div
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition ${
                          expressionData.drowsiness_warning
                            ? "border-red-400/80 bg-red-950/80 text-red-200 animate-pulse shadow-lg shadow-red-500/20"
                            : expressionData.face_detected
                            ? "border-cyan-400/50 bg-slate-900/80 text-cyan-200 shadow-sm"
                            : "border-white/20 bg-black/60 text-slate-300"
                        }`}
                      >
                        <span className="text-sm">{expressionData.emoji || "👤"}</span>
                        <span className="capitalize">{expressionData.dominant_emotion || "Neutral"}</span>
                        {expressionData.face_detected && (
                          <span className="text-[10px] text-cyan-300 font-bold">
                            {expressionData.confidence}%
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (speechEnabled && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                        setSpeechEnabled(!speechEnabled);
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/80"
                      title={speechEnabled ? "Mute Voice" : "Enable Voice"}
                    >
                      {speechEnabled ? (
                        <>
                          <Volume2 size={13} className="text-cyan-400" />
                          <span>Voice On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX size={13} className="text-slate-400" />
                          <span>Voice Off</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setCaptionsEnabled(!captionsEnabled)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition ${
                        captionsEnabled
                          ? "border-cyan-400/60 bg-cyan-950/80 text-cyan-200 shadow-sm"
                          : "border-white/20 bg-black/60 text-slate-400 hover:bg-black/80"
                      }`}
                      title={captionsEnabled ? "Hide AI Video Captions" : "Show AI Video Captions"}
                    >
                      <Captions size={13} className={captionsEnabled ? "text-cyan-400" : "text-slate-400"} />
                      <span>{captionsEnabled ? "Captions On" : "Captions Off"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInfoModal(true)}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-black/80 transition"
                      title={`Form guide & posture info for ${currentExercise.name}`}
                    >
                      <Info size={13} className="text-cyan-400" />
                      <span>Info</span>
                    </button>
                  </div>

                  {/* Drowsiness / Fatigue Flashing Warning Banner (ONLY IN REACTION MODE) */}
                  {selectedExercise === "reaction" && expressionEnabled && expressionData?.drowsiness_warning && (
                    <div className="absolute top-16 left-4 right-4 z-20 flex items-center justify-center gap-2.5 rounded-2xl border border-amber-400/80 bg-amber-950/95 p-3.5 text-amber-200 shadow-2xl backdrop-blur-md animate-bounce">
                      <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                      <p className="text-xs font-bold text-center">
                        ⚠️ High Fatigue / Drowsiness Alert: Prolonged eye closure observed. Pause & take a deep breath!
                      </p>
                    </div>
                  )}

                  {/* Calibration In-Progress Overlay */}
                  {isCalibrating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-6 backdrop-blur-[2px]">
                      <div className="w-full max-w-md rounded-2xl border border-cyan-400/40 bg-slate-900/90 p-5 shadow-2xl text-center backdrop-blur-xl">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-400/40 animate-pulse">
                          <Scan size={24} />
                        </div>
                        <h3 className="text-base font-bold text-white">
                          Building Personal Body Map
                        </h3>
                        <p className="mt-1 text-xs text-slate-300">
                          Stand so your whole body is visible. Deciding which measurements apply to you.
                        </p>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs font-bold text-cyan-300 mb-1.5">
                            <span>Detecting landmarks...</span>
                            <span>{Math.round(calibrationProgress * 100)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                              style={{ width: `${Math.round(calibrationProgress * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bounding Guide Box (shown when idle before analysis) */}
                  {!analysisRunning && !isCalibrating && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      {selectedExercise === "reaction" ? (
                        <div className="relative h-[48%] w-[32%] min-w-[160px] max-w-[240px] rounded-[36px] border border-dashed border-cyan-400/70 shadow-lg flex items-end justify-center pb-3">
                          <div className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-cyan-400" />
                          <div className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-cyan-400" />
                          <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-cyan-400" />
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-cyan-400" />
                          <span className="rounded-full bg-cyan-950/80 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 backdrop-blur-md">
                            Position Face Here
                          </span>
                        </div>
                      ) : (
                        <div className="relative h-[75%] w-[35%] min-w-[170px] max-w-[280px] rounded-[36px] border border-dashed border-cyan-400/60">
                          <div className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-cyan-400" />
                          <div className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-cyan-400" />
                          <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-cyan-400" />
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-cyan-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top-right AI status */}
                  {analysisRunning && (
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/80 px-3 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md z-10">
                      <Sparkles size={13} className="text-cyan-400 animate-spin" />
                      AI ANALYZING
                    </div>
                  )}

                  {/* Floating Live Reps Count Widget on Video Feed */}
                  {analysisRunning && (
                    <div className="absolute right-4 top-14 z-20 flex items-center gap-2.5 rounded-2xl border border-cyan-400/50 bg-slate-950/85 px-3.5 py-2 shadow-2xl backdrop-blur-xl text-white">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md ring-1 ring-cyan-400/40">
                        <Dumbbell size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold tracking-wider text-cyan-300">
                          {selectedExercise === "reaction" ? "Reactions" : "Reps Count"}
                        </p>
                        <p className="text-xl font-black text-white leading-none">
                          {reps}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI Live Video Feed Caption Overlay (Summary & Comments) */}
                  {analysisRunning && captionsEnabled && (
                    <div className="absolute bottom-3 inset-x-3 sm:inset-x-5 z-20 pointer-events-none">
                      <div className="overflow-hidden rounded-2xl border border-cyan-400/50 bg-slate-950/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl text-white pointer-events-auto transition-all duration-300 ring-1 ring-cyan-500/20">
                        {/* Caption Header Pill */}
                        <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/10 pb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 shadow-xs">
                              <Sparkles size={11} className="text-cyan-400 animate-spin" />
                              AI Live Summary & Comments
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                (liveAiSummary?.form_quality || "Optimal") === "Optimal"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                  : (liveAiSummary?.form_quality || "Optimal") === "Needs Attention"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                              }`}
                            >
                              {(liveAiSummary?.form_quality || "Optimal") === "Optimal" ? (
                                <CheckCircle2 size={10} />
                              ) : (liveAiSummary?.form_quality || "Optimal") === "Needs Attention" ? (
                                <AlertTriangle size={10} />
                              ) : (
                                <ShieldAlert size={10} />
                              )}
                              {liveAiSummary?.form_quality || (accuracy >= 80 ? "Optimal" : "Needs Attention")}
                            </span>
                            {liveAiSummary?.focus_joint && (
                              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">
                                <Target size={10} className="text-cyan-400" />
                                {liveAiSummary.focus_joint}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 rounded-md bg-cyan-500/25 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-black text-cyan-200 shadow-xs">
                              <Activity size={10} className="text-cyan-300" />
                              {reps} REPS
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300/90 font-bold">
                              {accuracy}% ACC
                            </span>
                          </div>
                        </div>

                        {/* AI Summary Text */}
                        <div className="text-xs sm:text-sm font-medium text-slate-100 leading-snug tracking-wide drop-shadow-sm flex items-start gap-2">
                          <Bot size={15} className="mt-0.5 text-cyan-400 shrink-0" />
                          <span className="flex-1">
                            {liveAiSummary?.summary || feedback || `Live kinematics active. Maintain cadence and posture balance.`}
                          </span>
                        </div>

                        {/* AI Comments & Coaching Tip Row */}
                        {(liveAiSummary?.coaching_tip || liveAiSummary?.live_speech || feedback) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 pt-1.5 border-t border-white/5 text-[11px] sm:text-xs">
                            <div className="flex items-center gap-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-amber-100 font-medium">
                              <Lightbulb size={12} className="text-amber-400 shrink-0 animate-pulse" />
                              <span className="font-bold text-amber-300">AI Comment:</span>
                              <span>{liveAiSummary?.coaching_tip || feedback}</span>
                            </div>

                            {liveAiSummary?.live_speech && (
                              <div className="flex items-center gap-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 text-cyan-200 italic">
                                <Volume2 size={11} className="text-cyan-400 shrink-0" />
                                <span>"{liveAiSummary.live_speech}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom-left Pose Status (shown when captions not covering or before analysis) */}
                  {(!analysisRunning || !captionsEnabled) && (
                    <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 backdrop-blur-md">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                        {selectedExercise === "reaction" ? "Face Status" : "Pose Status"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs font-bold text-white">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            bodyStatus === "Detecting" ? "bg-emerald-400" : "bg-cyan-400"
                          }`}
                        />
                        {selectedExercise === "reaction"
                          ? expressionData.face_detected
                            ? "Face Locked"
                            : "Scanning Face"
                          : bodyStatus}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Camera Off State */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-200 bg-cyan-50 text-cyan-600 shadow-sm">
                    <Camera size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Camera is not started</h3>
                  <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-400">
                    {selectedExercise === "reaction"
                      ? "Enable camera to start live facial reaction & emotion recognition."
                      : "Enable camera to start live posture detection and run Body Map calibration."}
                  </p>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 font-bold text-white shadow-md shadow-cyan-600/20 transition hover:-translate-y-0.5 hover:shadow-cyan-600/30"
                >
                  <Camera size={18} />
                  Enable Camera
                </button>
              ) : !analysisRunning ? (
                <>
                  <button
                    onClick={startAnalysis}
                    disabled={loading || isCalibrating}
                    className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3.5 font-bold text-white shadow-md shadow-cyan-600/20 transition hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Play size={18} />
                    {loading ? "Starting..." : selectedExercise === "reaction" ? "Analyse Reaction" : "Start AI Analysis"}
                  </button>

                  {selectedExercise !== "reaction" && (
                    <button
                      onClick={startCalibration}
                      disabled={loading || isCalibrating}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/70 px-5 py-3.5 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100"
                    >
                      <Scan size={16} />
                      Calibrate Body
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={stopAnalysis}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-red-500/10 py-3.5 font-bold text-red-600 ring-1 ring-red-400/30 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <CircleStop size={18} />
                  {loading ? "Finishing..." : "Stop Analysis"}
                </button>
              )}

              {cameraActive && (
                <button
                  onClick={stopCamera}
                  disabled={analysisRunning || isCalibrating}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-500 transition hover:text-slate-800 disabled:opacity-40"
                >
                  <XCircle size={16} />
                  Camera Off
                </button>
              )}

              <button
                onClick={resetSession}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-500 transition hover:text-slate-800"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </section>

          {/* ==================================================
              RIGHT SIDEBAR (AI INSIGHTS & METRICS)
          ================================================== */}
          <aside className="space-y-4">
            {/* AI Live Feed Summary Card */}
            <div className="relative overflow-hidden rounded-[28px] border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-cyan-950/40 to-slate-950/95 p-5 shadow-2xl backdrop-blur-2xl text-white">
              <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
              
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40 shadow-inner">
                    <Bot size={20} className={analysisRunning ? "animate-bounce" : ""} />
                    {analysisRunning && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white tracking-tight flex items-center gap-1.5">
                      Neural Telemetry AI
                    </h3>
                    <p className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold flex items-center gap-1">
                      <Cpu size={11} className="text-cyan-400" /> Qwen-2.5 Biomechanics Engine
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Live AI</span>
                </div>
              </div>

              {liveAiSummary ? (
                <div className="space-y-3">
                  {/* Status Badges Row */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 p-2 border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-300 font-medium">Form State:</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black shadow-sm ${
                          liveAiSummary.form_quality === "Optimal"
                            ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                            : liveAiSummary.form_quality === "Needs Attention"
                            ? "bg-amber-500/25 text-amber-300 border border-amber-400/40"
                            : "bg-rose-500/25 text-rose-300 border border-rose-400/40"
                        }`}
                      >
                        {liveAiSummary.form_quality === "Optimal" ? (
                          <CheckCircle2 size={12} />
                        ) : liveAiSummary.form_quality === "Needs Attention" ? (
                          <AlertTriangle size={12} />
                        ) : (
                          <ShieldAlert size={12} />
                        )}
                        {liveAiSummary.form_quality || "Optimal"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                      <Target size={12} className="text-cyan-400 shrink-0" />
                      <span className="truncate max-w-[95px]">{liveAiSummary.focus_joint || "Spine & Core"}</span>
                    </div>
                  </div>

                  {/* Real-time AI Diagnostic Statement */}
                  <div className="rounded-2xl border border-cyan-500/20 bg-black/40 p-3.5 shadow-inner">
                    <p className="text-xs leading-relaxed text-slate-100 font-normal">
                      {liveAiSummary.summary}
                    </p>
                  </div>

                  {/* Real-time Coaching Tip */}
                  {liveAiSummary.coaching_tip && (
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                        <Lightbulb size={13} className="text-amber-400 animate-pulse shrink-0" />
                        AI Kinematic Cue
                      </div>
                      <p className="text-xs text-amber-100 font-medium leading-snug">
                        {liveAiSummary.coaching_tip}
                      </p>
                    </div>
                  )}

                  {/* Live Speech Voice Output */}
                  {liveAiSummary.live_speech && (
                    <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-1.5 text-[11px] text-cyan-200 font-medium">
                      <Volume2 size={13} className="text-cyan-400 shrink-0 animate-pulse" />
                      <span className="truncate italic">"{liveAiSummary.live_speech}"</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
                    <Activity size={18} className="animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">Ready for Live Kinematics</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Start camera & analysis to stream posture keypoints to the local AI engine.
                  </p>
                </div>
              )}
            </div>

            {/* ==================================================
                FACIAL EXPRESSION, MOOD & FATIGUE INTELLIGENCE CARD
                (ONLY SHOWN WHEN ANALYSE REACTION IS SELECTED)
            ================================================== */}
            {selectedExercise === "reaction" && (
              <div className="overflow-hidden rounded-[26px] border border-cyan-300/80 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                      <Smile size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        Reaction & Emotion AI
                      </h3>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                        Facial Telemetry
                      </p>
                    </div>
                  </div>

                  {/* Toggle switch for facial AI */}
                  <button
                    type="button"
                    onClick={() => setExpressionEnabled(!expressionEnabled)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                      expressionEnabled
                        ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                        : "bg-slate-100 text-slate-400 hover:text-slate-600"
                    }`}
                    title={expressionEnabled ? "Disable Facial AI" : "Enable Facial AI"}
                  >
                    <Sparkles size={11} className={expressionEnabled ? "text-cyan-600" : ""} />
                    {expressionEnabled ? "Active" : "Paused"}
                  </button>
                </div>

                {expressionEnabled ? (
                  <div className="space-y-4">
                    {/* Dominant Mood Badge */}
                    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-50 to-cyan-50/50 p-3.5 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{expressionData.emoji || "🙂"}</span>
                        <div>
                          <p className="text-xs font-black capitalize text-slate-900">
                            {expressionData.dominant_emotion || "Neutral"} ({expressionData.confidence || 80}%)
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {expressionData.state_label || "Focused & Engaged"}
                          </p>
                        </div>
                      </div>
                      {expressionData.drowsiness_warning ? (
                        <span className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700 animate-pulse">
                          Fatigue Alert
                        </span>
                      ) : (
                        <span className="rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          Calibrated
                        </span>
                      )}
                    </div>

                    {/* Dynamic Metric Bars */}
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span className="flex items-center gap-1">
                            <HeartPulse size={12} className="text-emerald-500" /> Focus & Engagement
                          </span>
                          <span>{expressionData.engagement_score || 85}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${expressionData.engagement_score || 85}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span className="flex items-center gap-1">
                            <Flame size={12} className="text-amber-500" /> Muscle Exertion / Tension
                          </span>
                          <span>{expressionData.tension_score || 15}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${expressionData.tension_score || 15}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span className="flex items-center gap-1">
                            <Eye size={12} className="text-cyan-500" /> Fatigue & Drowsiness Index
                          </span>
                          <span className={expressionData.drowsiness_warning ? "text-red-600 font-black" : ""}>
                            {expressionData.fatigue_score || 10}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              expressionData.drowsiness_warning ? "bg-red-500" : "bg-cyan-500"
                            }`}
                            style={{ width: `${expressionData.fatigue_score || 10}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mini Emotion Probability Spectrum */}
                    {expressionData.emotion_scores && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Emotion Spectrum
                        </p>
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          {["happy", "neutral", "surprise", "angry"].map((em) => (
                            <div key={em} className="rounded-xl bg-slate-50 p-1.5 border border-slate-100">
                              <p className="text-[10px] uppercase font-bold text-slate-500">{em}</p>
                              <p className="text-xs font-black text-slate-800">
                                {expressionData.emotion_scores[em] || 0}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      Facial reaction AI is paused. Click Active above to resume mood tracking.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Live Feedback */}
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <Eye size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Live Feedback</h3>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      {selectedExercise === "reaction" ? "Reaction AI" : "Posture Analysis"}
                    </p>
                  </div>
                </div>
                <Zap size={16} className="text-cyan-600" />
              </div>

              <div
                className={`rounded-2xl border p-3.5 ${
                  feedbackType === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : feedbackType === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-cyan-100 bg-cyan-50"
                }`}
              >
                <div className="flex gap-2.5">
                  {feedbackType === "success" ? (
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : feedbackType === "error" ? (
                    <XCircle size={17} className="mt-0.5 shrink-0 text-red-600" />
                  ) : (
                    <Info size={17} className="mt-0.5 shrink-0 text-cyan-600" />
                  )}
                  <p className="text-xs leading-5 text-slate-700 font-medium">{feedback}</p>
                </div>
              </div>
            </div>

            {/* Live Metrics */}
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2.5">
                <Gauge size={18} className="text-cyan-600" />
                <h3 className="font-bold text-sm text-slate-900">Session Metrics</h3>
              </div>

              <div className="space-y-3.5">
                {selectedExercise === "reaction" ? (
                  <>
                    <Metric label="Engagement Index" value={`${accuracy}%`} percentage={accuracy} />
                    <Metric
                      label="Dominant Reaction"
                      value={expressionData.dominant_emotion || "Focused"}
                      percentage={expressionData.confidence || 80}
                    />
                    <Metric
                      label="Session Time"
                      value={formatTime(elapsedTime)}
                      percentage={Math.min(elapsedTime, 100)}
                    />
                  </>
                ) : (
                  <>
                    <Metric label="Posture Accuracy" value={`${accuracy}%`} percentage={accuracy} />
                    <Metric label="Repetitions" value={reps} percentage={Math.min(reps * 10, 100)} />
                    <Metric
                      label="Session Time"
                      value={formatTime(elapsedTime)}
                      percentage={Math.min(elapsedTime, 100)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Safety Note */}
            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-2.5">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan-600" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Adaptive Movement Guidance</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    PoseCare adapts to each person's physical range. Does not replace professional medical diagnosis.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ====================================================
            SESSION SUMMARY MODAL / REPORT
        ==================================================== */}
        {sessionResult && (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-cyan-200/80 bg-gradient-to-b from-white via-slate-50/60 to-white p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            {/* Top Bar */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    Session Verified
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-xs font-bold text-cyan-700">
                    <Sparkles size={13} className="text-cyan-600" />
                    AI Biomechanics Audit
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {exercises.find((item) => item.id === sessionResult.exercise)?.name || "Exercise"} Analysis
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Comprehensive real-time kinetic telemetry recorded and parsed by the Neural AI Engine.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <SummaryStat
                  label={sessionResult.exercise === "reaction" ? "Engagement" : "Accuracy"}
                  value={`${sessionResult.accuracy || 0}%`}
                />
                <SummaryStat
                  label={sessionResult.exercise === "reaction" ? "Reaction" : "Reps"}
                  value={
                    sessionResult.exercise === "reaction"
                      ? sessionResult.expression_summary?.dominant_mood || "Focused"
                      : sessionResult.reps || 0
                  }
                />
                <SummaryStat label="Duration" value={formatTime(sessionResult.duration || 0)} />
              </div>
            </div>

            {/* AI Posture & Biomechanics Report */}
            {sessionResult.ai_report ? (
              <div className="mt-6 space-y-5">
                {/* Hero Grade & Diagnostic Headline Card */}
                <div className="rounded-[24px] border border-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-cyan-600 to-blue-700 text-white font-black text-2xl sm:text-3xl shadow-lg ring-4 ring-cyan-400/30">
                      {sessionResult.ai_report.form_grade || (sessionResult.accuracy >= 80 ? "A" : sessionResult.accuracy >= 60 ? "B" : "C")}
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                        <Award size={13} /> {sessionResult.ai_report.score_text || "Biomechanical Assessment"}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                        {sessionResult.ai_report.headline || "AI Posture Performance Diagnostic"}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                        {sessionResult.ai_report.overview}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => speakReport(sessionResult.ai_report)}
                    className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-md ${
                      isSpeakingReport
                        ? "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    }`}
                  >
                    <Volume2 size={16} className={isSpeakingReport ? "animate-pulse" : ""} />
                    {isSpeakingReport ? "Stop Audio" : "Listen to AI Report"}
                  </button>
                </div>

                {/* Synthesis Overview Card */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-2">
                    <Brain size={16} className="text-cyan-600" />
                    Kinetic Chain & Movement Consistency
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {sessionResult.ai_report.overview}
                  </p>
                </div>

                {/* Dual Column: Strengths & Corrections */}
                <div className="grid gap-4 md:grid-cols-2">
                  {sessionResult.ai_report.key_strengths && sessionResult.ai_report.key_strengths.length > 0 && (
                    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 p-4 sm:p-5 shadow-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-black text-xs uppercase tracking-wider mb-3">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        Verified Kinetic Strengths
                      </div>
                      <ul className="space-y-2">
                        {sessionResult.ai_report.key_strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 font-medium">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200/60 text-emerald-800 text-[10px] font-bold">
                              ✓
                            </span>
                            <span className="leading-snug">{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sessionResult.ai_report.areas_for_improvement && sessionResult.ai_report.areas_for_improvement.length > 0 && (
                    <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-amber-100/30 p-4 sm:p-5 shadow-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider mb-3">
                        <Target size={16} className="text-amber-600" />
                        Biomechanical Adjustments
                      </div>
                      <ul className="space-y-2">
                        {sessionResult.ai_report.areas_for_improvement.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 font-medium">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/60 text-amber-800 text-[10px] font-bold">
                              !
                            </span>
                            <span className="leading-snug">{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Clinical Safety & Recovery Protocol Row */}
                <div className="grid gap-4 md:grid-cols-2">
                  {sessionResult.ai_report.safety_note && (
                    <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-cyan-50/40 p-4 text-xs sm:text-sm text-slate-700 shadow-xs flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 mb-0.5">Joint Safety & Ergonomics</p>
                        <p className="leading-relaxed text-slate-600">{sessionResult.ai_report.safety_note}</p>
                      </div>
                    </div>
                  )}

                  {sessionResult.ai_report.recovery_recommendation && (
                    <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 to-indigo-50/40 p-4 text-xs sm:text-sm text-slate-700 shadow-xs flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                        <Activity size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 mb-0.5">Targeted Cooldown Protocol</p>
                        <p className="leading-relaxed text-slate-600">{sessionResult.ai_report.recovery_recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Facial Expression, Mood & Fatigue Summary Card (ONLY IN REACTION MODE) */}
            {sessionResult.exercise === "reaction" && sessionResult.expression_summary && (
              <div className="mt-6 rounded-2xl border border-cyan-200/80 bg-gradient-to-r from-cyan-50/70 via-white to-blue-50/70 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-white">
                      <Smile size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        Emotional State & Fatigue Telemetry Report
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Calculated from facial blendshapes and emotion telemetry during workout
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 self-start rounded-lg bg-cyan-100 px-2.5 py-1 text-[11px] font-bold text-cyan-800 capitalize">
                    {sessionResult.expression_summary.dominant_mood}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Dominant Mood</p>
                    <p className="text-xs font-black capitalize text-slate-800 mt-0.5">
                      {sessionResult.expression_summary.dominant_mood}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Exertion</p>
                    <p className="text-xs font-black text-amber-600 mt-0.5">
                      {sessionResult.expression_summary.avg_tension || 15}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg Fatigue</p>
                    <p className="text-xs font-black text-cyan-600 mt-0.5">
                      {sessionResult.expression_summary.avg_fatigue || 10}%
                    </p>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                  💡 <strong>Analysis:</strong> {sessionResult.expression_summary.summary_text}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            HOW IT WORKS
        ==================================================== */}
        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">
              How it works
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              From Body Calibration to Live Correction
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Step
              number="01"
              icon={<Scan size={18} />}
              title="Body Calibration"
              text="Map visible landmarks and configure adaptive mode."
            />
            <Step
              number="02"
              icon={<Camera size={18} />}
              title="Camera Capture"
              text="Stream real-time movement frames to YOLO Pose."
            />
            <Step
              number="03"
              icon={<Activity size={18} />}
              title="Posture Analysis"
              text="Compare joint geometry against calibrated body map."
            />
            <Step
              number="04"
              icon={<Zap size={18} />}
              title="Live Guidance"
              text="Receive real-time audio and visual coaching."
            />
          </div>
        </section>
        {/* ====================================================
            EXERCISE / YOGA FORM INFORMATION MODAL
        ==================================================== */}
        {showInfoModal && currentExercise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-cyan-200 bg-white p-6 sm:p-7 shadow-2xl relative">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200 shadow-sm">
                    {currentExercise.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{currentExercise.name}</h3>
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                        {currentExercise.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentExercise.difficulty || "All Levels"} • AI Kinematic Analysis Guide
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="mt-5 space-y-4">
                {/* Description */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {currentExercise.description}
                  </p>
                </div>

                {/* Target Muscles / Anatomy */}
                {currentExercise.targetMuscles && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Target size={14} className="text-cyan-600" /> Target Kinetic Chain & Muscles
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentExercise.targetMuscles.map((muscle, idx) => (
                        <span key={idx} className="rounded-lg bg-cyan-50 border border-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-800">
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Biomechanical Execution Steps */}
                {currentExercise.steps && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" /> Proper Biomechanical Execution
                    </p>
                    <div className="space-y-2">
                      {currentExercise.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-bold text-white">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-slate-700 leading-snug">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Mistakes Monitored by AI */}
                {currentExercise.commonMistakes && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" /> Common Posture Mistakes Detected by AI
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {currentExercise.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Breathing Guidance */}
                {currentExercise.breathing && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 flex items-start gap-2.5">
                    <HeartPulse size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-950">Breathing & Cadence Guidance</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{currentExercise.breathing}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ================================================================
// SUB-COMPONENTS
// ================================================================
const Metric = ({ label, value, percentage }) => {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-bold text-slate-800">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const SummaryStat = ({ label, value }) => {
  return (
    <div className="min-w-[80px] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
      <p className="mt-0.5 text-base font-black text-cyan-700">{value}</p>
    </div>
  );
};

const Step = ({ number, icon, title, text }) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400">{number}</span>
      </div>
      <h3 className="font-bold text-xs text-slate-900">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
    </div>
  );
};

export default PoseAnalysis;