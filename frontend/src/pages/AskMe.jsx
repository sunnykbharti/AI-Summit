import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bot,
  Compass,
  CornerDownLeft,
  Dumbbell,
  Eye,
  Flame,
  Footprints,
  HeartPulse,
  HelpCircle,
  Mic,
  MicOff,
  Monitor,
  Play,
  RefreshCw,
  RotateCw,
  Send,
  Shield,
  ShieldAlert,
  Sliders,
  Smile,
  Sparkles,
  User,
  Volume1,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
  CheckCircle2,
  Clock,
} from "lucide-react";
import api from "../api/Api";

const EXERCISE_ICONS = {
  desk_posture: Monitor,
  suryanamaskar: Sparkles,
  cobra: Flame,
  squat: Dumbbell,
  plank: Shield,
  tree_pose: Activity,
  downward_dog: Activity,
  lunges: Dumbbell,
  pushup: Dumbbell,
  warrior_two: Activity,
  triangle: Activity,
  reaction: Smile,
};

const HABIT_ICONS = {
  Eye: Eye,
  Footprints: Footprints,
  Flame: Flame,
  RotateCw: RotateCw,
  Clock: Clock,
  CheckCircle2: CheckCircle2,
};

const INITIAL_WELCOME_MSG = {
  id: "welcome",
  sender: "ai",
  text: `नमस्ते! मैं आपका **PoseCare AI लाइफस्टाइल व स्वास्थ्य सलाहकार (Ask Me)** हूँ।\n\nआपकी दिनचर्या के अनुसार सबसे उपयुक्त और सुरक्षित व्यायाम व आदतें तय करने के लिए, कृपया बताएं:\n• **आप रोज़ाना लगभग कितने घंटे कंप्यूटर या डेस्क पर बैठकर काम करते हैं?**\n• **क्या आपको गर्दन, कंधे या कमर में अकड़न या दर्द महसूस होता है?**\n• **क्या दिनभर में वॉक या एक्सरसाइज करने का समय मिल पाता है?**\n\nआप नीचे दिए गए विकल्पों में से चुन सकते हैं, बोलकर बता सकते हैं या अपना सवाल लिख सकते हैं!`,
  voice_summary: "नमस्ते! आपके लिए सही व्यायाम चुनने के लिए, आप रोज़ाना कितने घंटे कंप्यूटर पर बैठते हैं और क्या कहीं दर्द रहता है?",
  consultation_chips: [
    "💻 मैं 8+ घंटे कंप्यूटर पर बैठता हूँ",
    "🎒 4 से 6 घंटे बैठता हूँ",
    "⚡ गर्दन व कंधों में खिंचाव (Text Neck)",
    "🛌 कमर दर्द व L5-S1 जकड़न",
    "🚶 बिल्कुल वॉक नहीं हो पाती",
    "🏃 सुबह रनिंग और सूर्य नमस्कार रूटीन चाहिए",
  ],
  beyond_app_habits: [
    {
      id: "look_away_20_20",
      title: "20-20-20 स्क्रीन नियम (Look Away)",
      subtitle: "कंप्यूटर व स्क्रीन से नजर हटाएं",
      icon: "Eye",
      action: "हर 20 मिनट काम के बाद 20 सेकंड के लिए 20 फीट दूर किसी वस्तु को देखें।",
      benefits: "आंखों का सूखापन, सिरदर्द और गर्दन के पिछले हिस्से के खिंचाव को तुरंत दूर करता है।",
      frequency: "हर 20 मिनट",
    },
    {
      id: "micro_walk_5min",
      title: "5 मिनट की माइक्रो-वॉक (Hourly Walk)",
      subtitle: "कुर्सी से उठकर टहलें",
      icon: "Footprints",
      action: "हर 1 घंटे बैठने के बाद 5 मिनट कुर्सी से उठकर घूमें और पानी पिएं।",
      benefits: "कमर की लम्बर डिस्क (L5-S1) को डीकंप्रेस करता है और सोए हुए ग्लूट्स जगाता है।",
      frequency: "प्रति घंटा",
    },
    {
      id: "running_brisk_walk",
      title: "20 मिनट आउटडोर रनिंग / ब्रिस्क वॉक",
      subtitle: "दैनिक कार्डियो एरोबिक मूवमेंट",
      icon: "Flame",
      action: "सुबह या शाम 15-20 मिनट खुली हवा में तेज चाल (Brisk Walk) या हल्की जॉगिंग / रनिंग करें।",
      benefits: "हार्ट और फेफड़ों को मजबूत बनाता है, स्टैमिना बढ़ाता है और मानसिक ताजगी देता है।",
      frequency: "दैनिक (सुबह/शाम)",
    },
  ],
  suggested_exercises: [
    {
      id: "desk_posture",
      name_hi: "डेस्क व स्टडी पोस्चर",
      name_en: "Desk Ergonomics",
      category: "Desk Ergonomics",
      target_muscles: "गर्दन, शोल्डर ब्लेड्स, रीढ़",
      benefits: "गर्दन दर्द, झुके हुए कंधे और टेक्स्ट-नेक से बचाव।",
      duration: "5 मिनट",
    },
    {
      id: "suryanamaskar",
      name_hi: "सूर्य नमस्कार (12 आसन)",
      name_en: "Surya Namaskar Flow",
      category: "Traditional Yoga Flow",
      target_muscles: "संपूर्ण शारीरिक काइनेटिक चेन",
      benefits: "रीढ़ का लचीलापन और दिनभर ऊर्जा।",
      duration: "10 मिनट",
    },
    {
      id: "cobra",
      name_hi: "भुजंगासन (Cobra Pose)",
      name_en: "Cobra Pose",
      category: "Hatha Yoga & Balance",
      target_muscles: "लोअर बैक, स्पाइनल एक्सटेंसर्स",
      benefits: "कंप्यूटर पर आगे झुकने से दबी रीढ़ को खोलता है।",
      duration: "3 मिनट",
    },
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const AskMe = () => {
  const navigate = useNavigate();

  // Chat conversation state
  const [messages, setMessages] = useState([INITIAL_WELCOME_MSG]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Audio Voice Speaking State
  const [autoVoice, setAutoVoice] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);

  // Voice Speech Recognition (Speech-to-Text)
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Lifestyle Intake Drawer / Modal State
  const [showLifestyleModal, setShowLifestyleModal] = useState(false);
  const [lifestyleProfile, setLifestyleProfile] = useState({
    occupation: "Software Engineer / Student",
    hours_sitting: 8,
    pain_areas: ["neck", "lower_back"],
    fitness_level: "beginner",
    primary_goal: "posture_and_pain_relief",
  });
  const [assessmentPlan, setAssessmentPlan] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Speech synthesis natural voice playback: speaks ONLY the short, crisp 1-2 sentence line
  const speakVoiceLine = (textToSpeak, msgId) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text: keep only the natural spoken words
    const cleanText = (textToSpeak || "")
      .replace(/[*#•_`]/g, "")
      .replace(/\(.*?\)/g, "")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick Indian Hindi or English voice
    const voices = window.speechSynthesis.getVoices();
    const hiVoice =
      voices.find((v) => v.lang.toLowerCase().includes("hi")) ||
      voices.find((v) => v.lang.toLowerCase().includes("in")) ||
      voices[0];

    if (hiVoice) {
      utterance.voice = hiVoice;
    }

    utterance.onstart = () => setSpeakingId(msgId);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "hi-IN";

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsRecording(false);
          // Directly auto-send voice query for hands-free flow
          handleSendMessage(transcript);
        };

        recognition.onerror = (err) => {
          console.error("Speech recognition error:", err);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert("आपके ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। कृपया लिखकर पूछें।");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          setSpeakingId(null);
        }
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Send message
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsgId = Date.now().toString();
    const newMsg = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await api.post("/ask_ai/chat", {
        message: query,
      });

      const voiceLine = res.data.voice_summary || res.data.audio_speech;
      const aiMsgId = (Date.now() + 1).toString();

      const aiMsg = {
        id: aiMsgId,
        sender: "ai",
        text: res.data.reply,
        voice_summary: voiceLine,
        audio_speech: voiceLine,
        suggested_exercises: res.data.suggested_exercises || [],
        beyond_app_habits: res.data.beyond_app_habits || [],
        preventive_tips: res.data.preventive_tips || [],
        quick_replies: res.data.quick_replies || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Automatically speak the concise voice line if autoVoice is on!
      if (autoVoice && voiceLine) {
        speakVoiceLine(voiceLine, aiMsgId);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errMsgText =
        err.response?.data?.reply ||
        err.response?.data?.error ||
        "माफ कीजिए, AI अभी प्रोसेस नहीं कर पा रहा है। कृपया पुनः प्रयास करें।";
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: errMsgText,
        voice_summary: "माफ कीजिए, AI अभी प्रोसेस नहीं कर पा रहा है। कृपया पुनः प्रयास करें।",
        suggested_exercises: [],
        beyond_app_habits: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      if (autoVoice) {
        speakVoiceLine(errorMsg.voice_summary, errorMsg.id);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate Lifestyle Assessment Plan
  const handleGenerateAssessment = async () => {
    setLoading(true);
    try {
      const res = await api.post("/ask_ai/lifestyle_assessment", lifestyleProfile);
      setAssessmentPlan(res.data);
      setShowLifestyleModal(false);

      const aiMsgId = Date.now().toString();
      const voiceLine = `आपकी ${lifestyleProfile.hours_sitting} घंटे की सिटिंग के अनुसार दैनिक रूटीन तैयार किया गया है।`;

      const aiMsg = {
        id: aiMsgId,
        sender: "ai",
        text: `🎯 **आपके लिए वैयक्तिकृत लाइफस्टाइल असेसमेंट व पोस्चर प्लान तैयार है!**\n\n${res.data.summary_text}\n\nनीचे दिए गए रूटीन को अपनी दिनचर्या में शामिल करें ताकि लंबे समय तक रीढ़, घुटनों और गर्दन पर पड़ने वाले तनाव से बचाव हो सके:`,
        voice_summary: voiceLine,
        suggested_exercises: res.data.prescribed_exercises || [],
        assessment_data: res.data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (autoVoice) {
        speakVoiceLine(voiceLine, aiMsgId);
      }
    } catch (err) {
      console.error("Lifestyle assessment error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchExercise = (exerciseId) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
    if (exerciseId === "reaction") {
      navigate("/reaction-analysis");
    } else {
      navigate(`/pose-analysis?exercise=${exerciseId}`);
    }
  };

  const QUICK_PROMPTS = [
    "💻 9 घंटे डेस्क सिटिंग से कमर और गर्दन दर्द होता है, क्या करूँ?",
    "🧘 शुरुआती अभ्यासियों के लिए 10-मिनट का सुबह का योग रूटीन",
    "🛡️ टेक्स्ट-नेक और झुके हुए कंधों (Rounded Shoulders) को कैसे ठीक करें?",
    "⚡ घुटनों के दर्द या कमज़ोरी में कौन से व्यायाम सुरक्षित हैं?",
    "🌙 दिनभर की मानसिक थकान और तनाव दूर करने के लिए ब्रीदिंग रूटीन",
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f8fafc] flex flex-col">
      {/* Header Banner with Voice Toggle & Lifestyle Profile */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-8 py-3.5 sm:py-4 sticky top-18 z-20 shadow-xs">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 blur-md opacity-40 animate-pulse" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25">
                <Bot size={24} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  PoseCare AI • <span className="text-cyan-600">Ask Me</span>
                </h1>
                <span className="rounded-full bg-cyan-100 border border-cyan-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-800">
                  लाइफस्टाइल डॉक्टर
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                इंटरैक्टिव वॉइस, एर्गोनॉमिक्स व दैनिक आदतें सलाहकार
              </p>
            </div>
          </div>

          {/* Action controls: Auto-Voice Toggle + Lifestyle Profile */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextState = !autoVoice;
                setAutoVoice(nextState);
                if (!nextState && typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setSpeakingId(null);
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-2xs cursor-pointer ${
                autoVoice
                  ? "bg-cyan-50 border border-cyan-300 text-cyan-800 hover:bg-cyan-100"
                  : "bg-slate-100 border border-slate-300 text-slate-500 hover:bg-slate-200"
              }`}
              title={autoVoice ? "ऑटो-वॉइस चालू है (क्लिक करके म्यूट करें)" : "ऑटो-वॉइस बंद है (क्लिक करके चालू करें)"}
            >
              {autoVoice ? (
                <>
                  <Volume2 size={16} className="text-cyan-600 animate-pulse" />
                  <span>वॉइस: चालू</span>
                </>
              ) : (
                <>
                  <VolumeX size={16} className="text-slate-400" />
                  <span>वॉइस: म्यूट</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowLifestyleModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Sliders size={14} className="text-cyan-600" />
              <span>प्रोफाइल ({lifestyleProfile.hours_sitting}h सिटिंग)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-8 py-6 flex flex-col gap-6">
        {/* Messages Stream */}
        <div className="flex-1 space-y-5">
          {messages.map((msg) => {
            const isAi = msg.sender === "ai";
            const voiceLine = msg.voice_summary || msg.audio_speech;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 animate-in fade-in duration-200 ${
                  isAi ? "justify-start" : "justify-end"
                }`}
              >
                {isAi && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm mt-1">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-3xl p-4 sm:p-5 shadow-xs ${
                    isAi
                      ? "bg-white border border-slate-200 text-slate-800"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        isAi ? "text-cyan-700" : "text-cyan-100"
                      }`}
                    >
                      {isAi ? "PoseCare AI हेल्थ एडवाइजर" : "आप (You)"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium ${
                          isAi ? "text-slate-400" : "text-cyan-200"
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Concise Audio Speech Pill: speaks only 1-2 friendly lines */}
                  {isAi && voiceLine && (
                    <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/80 px-3 py-2 text-xs text-cyan-950 mb-3 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => speakVoiceLine(voiceLine, msg.id)}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-black shadow-2xs transition active:scale-95 cursor-pointer shrink-0 ${
                          speakingId === msg.id
                            ? "bg-rose-500 text-white animate-pulse"
                            : "bg-cyan-600 hover:bg-cyan-500 text-white"
                        }`}
                        title={speakingId === msg.id ? "ऑडियो रोकें" : "सुनें (Listen Voice)"}
                      >
                        {speakingId === msg.id ? (
                          <>
                            <VolumeX size={13} />
                            <span>रोकें</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={13} />
                            <span>बोलकर सुनें</span>
                          </>
                        )}
                      </button>

                      <span className="font-semibold italic text-slate-700 truncate text-[11px]">
                        "{voiceLine}"
                      </span>

                      {speakingId === msg.id && (
                        <div className="flex items-center gap-0.5 ml-auto shrink-0">
                          <span className="h-3 w-1 bg-cyan-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-4 w-1 bg-cyan-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-2 w-1 bg-cyan-600 rounded-full animate-bounce" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-line space-y-2">
                    {msg.text}
                  </div>

                  {/* Interactive Consultation Chips (for asking/clarifying lifestyle) */}
                  {msg.consultation_chips && msg.consultation_chips.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
                        <Sliders size={13} className="text-cyan-600" />
                        <span>अपनी दिनचर्या चुनें (Tap to Answer):</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.consultation_chips.map((chip, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => handleSendMessage(chip)}
                            disabled={loading}
                            className="rounded-full bg-cyan-50/90 hover:bg-cyan-100 border border-cyan-200 text-cyan-900 px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Beyond App Habits Section (Screen look-away, 5-min walk, running, desk reset) */}
                  {msg.beyond_app_habits && msg.beyond_app_habits.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                        <Footprints size={14} className="text-emerald-600" />
                        <span>दैनिक जीवनशैली आदतें (Beyond App - स्क्रीन, वॉक व रनिंग):</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.beyond_app_habits.map((habit, hIdx) => {
                          const HIcon = HABIT_ICONS[habit.icon] || Footprints;
                          return (
                            <div
                              key={hIdx}
                              className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-3 flex flex-col justify-between shadow-2xs"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white border border-emerald-200 text-emerald-600 shadow-2xs shrink-0">
                                      <HIcon size={14} />
                                    </div>
                                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                                      {habit.title}
                                    </h4>
                                  </div>
                                  <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                                    {habit.frequency || "दैनिक"}
                                  </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-700 font-medium leading-snug">
                                  {habit.action}
                                </p>
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-emerald-200/50 text-[10px] text-emerald-900 font-medium">
                                ✓ {habit.benefits}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Assessment Plan Box if present */}
                  {msg.assessment_data?.routine_plan && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {Object.entries(msg.assessment_data.routine_plan).map(
                        ([key, routine]) => (
                          <div
                            key={key}
                            className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 flex flex-col justify-between"
                          >
                            <div>
                              <h4 className="text-xs font-black text-slate-900">
                                {routine.title}
                              </h4>
                              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                {routine.description}
                              </p>
                            </div>
                            {routine.recommended_exercise && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleLaunchExercise(routine.recommended_exercise.id)
                                }
                                className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1.5 text-[11px] font-black transition shadow-2xs cursor-pointer"
                              >
                                <Play size={11} fill="currentColor" />
                                <span>{routine.recommended_exercise.name_hi}</span>
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Suggested Actionable Exercise Cards (In-App Workouts) */}
                  {msg.suggested_exercises && msg.suggested_exercises.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
                        <Sparkles size={13} className="text-cyan-600" />
                        <span>PostureTrek AI कैमरा व्यायाम (Click to Launch):</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.suggested_exercises.map((ex) => {
                          const IconComp = EXERCISE_ICONS[ex.id] || Dumbbell;

                          return (
                            <div
                              key={ex.id}
                              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 hover:border-cyan-400 hover:bg-cyan-50/30 transition shadow-2xs"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-cyan-600 shadow-2xs group-hover:bg-cyan-500 group-hover:text-white transition">
                                  <IconComp size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-black text-slate-900 truncate">
                                      {ex.name_hi}
                                    </h4>
                                    <span className="rounded bg-white px-1.5 py-0.2 text-[9px] font-bold text-slate-500 border border-slate-200">
                                      {ex.duration || "5 min"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium truncate">
                                    {ex.name_en} • {ex.category || "Fitness"}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 leading-tight">
                                    {ex.benefits}
                                  </p>
                                </div>
                              </div>

                              {/* Direct Launch Button to Camera Pose Tracking */}
                              <button
                                type="button"
                                onClick={() => handleLaunchExercise(ex.id)}
                                className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 py-1.5 text-xs font-black shadow-sm transition active:scale-98 cursor-pointer"
                              >
                                <Play size={12} fill="currentColor" />
                                <span>शुरू करें (Launch AI Trainer)</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preventive Tips if present */}
                  {msg.preventive_tips && msg.preventive_tips.length > 0 && (
                    <div className="mt-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-2.5 text-[11px] text-emerald-900 leading-snug">
                      <strong className="font-black text-emerald-950 flex items-center gap-1">
                        <ShieldAlert size={13} className="text-emerald-600" />
                        दीर्घकालिक बीमारी से बचाव:
                      </strong>
                      <ul className="mt-1 space-y-0.5 list-disc list-inside">
                        {msg.preventive_tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {!isAi && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm mt-1">
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 animate-in fade-in">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
                <Bot size={18} />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500">
                <RefreshCw size={14} className="animate-spin text-cyan-600" />
                <span>AI आपकी दिनचर्या का बायोमैकेनिकल विश्लेषण कर रहा है...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            त्वरित प्रश्न (Quick Questions):
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
                className="shrink-0 rounded-full border border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Dock with Speech-to-Text */}
        <div className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl p-2 sm:p-2.5 shadow-xl ring-1 ring-black/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition cursor-pointer ${
                isRecording
                  ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
              title={isRecording ? "रिकॉर्डिंग रोकें" : "बोलकर पूछें (Voice Input)"}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isRecording
                  ? "सुन रहा हूँ... अपनी समस्या बोलें..."
                  : "अपनी दिनचर्या या समस्या बताएं (उदा: 8 घंटे बैठकर कमर दर्द, टेक्स्ट नेक)..."
              }
              className="flex-1 bg-transparent px-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white shadow-md shadow-cyan-600/20 transition active:scale-95 cursor-pointer"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* =======================================================
          LIFESTYLE ASSESSMENT CONFIGURATION MODAL
      ======================================================= */}
      {showLifestyleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    आपकी लाइफस्टाइल व पोस्चर प्रोफाइल
                  </h3>
                  <p className="text-xs text-slate-500">
                    सटीक व अनुकूलित निवारक योजना के लिए विवरण चुनें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLifestyleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Sitting Hours */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  दैनिक बैठने का समय (Daily Sitting Hours):{" "}
                  <span className="font-mono text-cyan-700 font-black">
                    {lifestyleProfile.hours_sitting} घंटे
                  </span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="14"
                  step="1"
                  value={lifestyleProfile.hours_sitting}
                  onChange={(e) =>
                    setLifestyleProfile({
                      ...lifestyleProfile,
                      hours_sitting: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-cyan-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>2h (सक्रिय)</span>
                  <span>6h (सामान्य)</span>
                  <span>9h (डेस्क जॉब)</span>
                  <span>14h+ (अत्यधिक)</span>
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  पेशा / दिनचर्या (Occupation / Routine):
                </label>
                <select
                  value={lifestyleProfile.occupation}
                  onChange={(e) =>
                    setLifestyleProfile({
                      ...lifestyleProfile,
                      occupation: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-cyan-500 focus:outline-hidden"
                >
                  <option value="student_or_wfh">
                    विद्यार्थी / WFH रिमोट वर्कर (Student / WFH)
                  </option>
                  <option value="desk_bound">
                    डेस्क-बाउंड / लंबे समय सिटिंग (Desk Bound 8-9h)
                  </option>
                  <option value="early_riser_active">
                    सक्रिय व प्रातःकालीन दिनचर्या (Early Riser / Active)
                  </option>
                  <option value="Software Engineer / Coder">
                    सॉफ्टवेयर इंजीनियर / कोडर (लंबे समय स्क्रीन)
                  </option>
                  <option value="Corporate / Desk Executive">
                    कॉर्पोरेट / डेस्क जॉब (बैठकें व लैपटॉप)
                  </option>
                  <option value="Driver / Commuter">
                    चालक / लंबी यात्रा (वाहन सीटिंग)
                  </option>
                  <option value="Homemaker / Active">
                    गृहणी / घरेलू कार्य
                  </option>
                </select>
              </div>

              {/* Pain Areas */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  शरीर में दर्द या तनाव के क्षेत्र (Pain / Discomfort Areas):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "neck", label: "गर्दन (Neck / Upper Back)" },
                    { id: "lower_back", label: "कमर का निचला हिस्सा (L5-S1)" },
                    { id: "eye_strain_fatigue", label: "आंखों का तनाव व थकान (Eye Strain / Fatigue)" },
                    { id: "shoulders", label: "कंधे (Rounded Shoulders)" },
                    { id: "knees", label: "घुटने (Knees)" },
                    { id: "wrist", label: "कलाई (Carpal Tunnel)" },
                  ].map((area) => {
                    const checked = lifestyleProfile.pain_areas.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => {
                          const newAreas = checked
                            ? lifestyleProfile.pain_areas.filter(
                                (a) => a !== area.id
                              )
                            : [...lifestyleProfile.pain_areas, area.id];
                          setLifestyleProfile({
                            ...lifestyleProfile,
                            pain_areas: newAreas,
                          });
                        }}
                        className={`rounded-xl border p-2 text-left font-bold transition flex items-center justify-between cursor-pointer ${
                          checked
                            ? "border-cyan-500 bg-cyan-50 text-cyan-800"
                            : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{area.label}</span>
                        {checked && (
                          <span className="text-cyan-600 font-bold">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Goal */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  प्राथमिक लक्ष्य (Primary Health Goal):
                </label>
                <select
                  value={lifestyleProfile.primary_goal}
                  onChange={(e) =>
                    setLifestyleProfile({
                      ...lifestyleProfile,
                      primary_goal: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-cyan-500 focus:outline-hidden"
                >
                  <option value="posture_and_pain_relief">
                    पोस्चर सुधार व दर्द से राहत (कमर/गर्दन)
                  </option>
                  <option value="disease_prevention">
                    दीर्घकालिक रोग निवारण (L5-S1 व रीढ़ सुरक्षा)
                  </option>
                  <option value="energy_and_flexibility">
                    ऊर्जा व शारीरिक लचीलापन (सूर्य नमस्कार)
                  </option>
                  <option value="general_fitness">
                    दैनिक तंदुरुस्ती व संतुलन
                  </option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLifestyleModal(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleGenerateAssessment}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-cyan-500 hover:to-blue-500 cursor-pointer"
              >
                रूटीन तैयार करें (Generate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskMe;
