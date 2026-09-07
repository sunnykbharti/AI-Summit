import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Wind,
  Info,
  Layers,
  Activity,
  Eye,
  Zap
} from "lucide-react";

export const SURYA_STEPS = [
  {
    stepNumber: 1,
    id: "pranamasana",
    name_hi: "प्रणामासन",
    name_en: "Pranamasana (Prayer Pose)",
    breath: "सामान्य सांस (Normal Breathing)",
    breathType: "normal",
    cue: "सीधे खड़े हों, दोनों हथेलियों को चेस्ट के सामने जोड़ें (Prayer Pose)। दोनों पैरों पर बराबर वजन रखें।",
    alignmentTips: [
      "Spine को बिल्कुल सीधा और vertical रखें",
      "Shoulders को relax और नीचे रखें",
      "Palms चेस्ट के सेंटर (Heart Chakra) पर जोड़ें",
    ],
    targetMuscles: "Core, Postural Spine, Calves",
    image: "/surya/step1.svg",
  },
  {
    stepNumber: 2,
    id: "hasta_uttanasana",
    name_hi: "हस्त उत्तानासन",
    name_en: "Hasta Uttanasana (Raised Arms)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "गहरी सांस लेते हुए दोनों बाहें सिर के ऊपर उठाएं। Biceps कानों के पास रखें और हल्का सा backbend करें।",
    alignmentTips: [
      "Pelvis को हल्का आगे push करें, lower back पर दबाव न दें",
      "Chest को छत की तरफ open करें",
      "Arms सीधे रखें और उंगलियों को ऊपर stretch करें",
    ],
    targetMuscles: "Abdominals, Chest, Shoulders, Spinal Extensors",
    image: "/surya/step2.svg",
  },
  {
    stepNumber: 3,
    id: "padahastasana",
    name_hi: "पादहस्तासन",
    name_en: "Padahastasana (Forward Fold)",
    breath: "सांस बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "सांस छोड़ते हुए hips से आगे झुकें। हथेलियों को पैरों के दोनों तरफ जमीन पर रखें।",
    alignmentTips: [
      "कमर मोड़ने के बजाय Hip Joint से hinge करें",
      "Hamstrings tight हों तो घुटनों को हल्का bend कर सकते हैं",
      "गर्दन और सिर को पूरी तरह ढीला छोड़ें",
    ],
    targetMuscles: "Hamstrings, Calves, Lower Back, Glutes",
    image: "/surya/step3.svg",
  },
  {
    stepNumber: 4,
    id: "ashwa_sanchalanasana_right",
    name_hi: "अश्व संचालनासन (दायां पैर पीछे)",
    name_en: "Ashwa Sanchalanasana (Equestrian Pose)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "दायां पैर पीछे ले जाएं, बायां घुटना 90° angle पर रखें। Chest उठाएं और सामने या हल्का ऊपर देखें।",
    alignmentTips: [
      "Front knee सीधे टखने (ankle) के ऊपर 90° पर हो",
      "Back leg को सीधा लंबा stretch करें",
      "Palms जमीन पर firmly टिकी रहें",
    ],
    targetMuscles: "Hip Flexors, Quadriceps, Psoas, Chest",
    image: "/surya/step4.svg",
  },
  {
    stepNumber: 5,
    id: "dandasana",
    name_hi: "दंडासन (प्लैंक पोज़)",
    name_en: "Dandasana (Plank / Stick Pose)",
    breath: "सांस रोकें या धीमी सांस (Retain)",
    breathType: "retain",
    cue: "बायां पैर भी पीछे ले जाएं। शरीर को सिर से एड़ी तक एक सीधी रेखा (Straight Line) में रखें।",
    alignmentTips: [
      "Wrists सीधे shoulders के नीचे vertically aligned हों",
      "Hips न तो ऊपर उठें और न ही नीचे लटकें",
      "Core और glutes को actively engage रखें",
    ],
    targetMuscles: "Full Core, Deltoids, Triceps, Quads",
    image: "/surya/step5.svg",
  },
  {
    stepNumber: 6,
    id: "ashtanga_namaskara",
    name_hi: "अष्टांग नमस्कार (8 अंग जमीन पर)",
    name_en: "Ashtanga Namaskara (Salute with 8 Limbs)",
    breath: "सांस बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "8 अंग जमीन पर लगाएं: दो पंजे, दो घुटने, दो हथेलियां, छाती और ठुड्डी। Hips हल्के ऊपर उठे रहेंगे।",
    alignmentTips: [
      "Elbows को पसलियों (ribs) के पास tucked रखें",
      "Hips को जमीन से थोड़ा ऊपर arch में रखें",
      "Chest और chin हल्के से floor पर touch करें",
    ],
    targetMuscles: "Triceps, Chest, Upper Back, Neck stabilizers",
    image: "/surya/step6.svg",
  },
  {
    stepNumber: 7,
    id: "bhujangasana",
    name_hi: "भुजंगासन (कोबरा पोज़)",
    name_en: "Bhujangasana (Cobra Pose)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "सांस लेते हुए chest और सिर को आगे-ऊपर उठाएं। Shoulders को कानों से दूर और नीचे roll करें।",
    alignmentTips: [
      "Pelvis और पैरों की उंगलियों को जमीन पर press करें",
      "सारा वजन हाथों पर न डालें, back muscles का उपयोग करें",
      "Shoulders को squeeze न करें, collarbone चौड़ी रखें",
    ],
    targetMuscles: "Spinal Extensors, Glutes, Chest, Shoulders",
    image: "/surya/step7.svg",
  },
  {
    stepNumber: 8,
    id: "adho_mukha_svanasana",
    name_hi: "अधोमुख श्वानासन (डाउनवर्ड डॉग)",
    name_en: "Adho Mukha Svanasana (Downward Dog)",
    breath: "सांस बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "Hips को ऊपर और पीछे push करें। शरीर से उल्टा 'V' आकार बनाएं, एड़ियों को जमीन की ओर दबाएं।",
    alignmentTips: [
      "हथेलियों की सभी उंगलियों को फैलाकर floor पर grip बनाएं",
      "रीढ़ (Spine) को सीधा और लंबा रखने पर focus करें",
      "सिर को बाहों के बीच relax रहने दें",
    ],
    targetMuscles: "Hamstrings, Calves, Lats, Shoulders, Spine",
    image: "/surya/step8.svg",
  },
  {
    stepNumber: 9,
    id: "ashwa_sanchalanasana_left",
    name_hi: "अश्व संचालनासन (बायां पैर आगे)",
    name_en: "Ashwa Sanchalanasana (Left Leg Forward)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "दायां पैर आगे दोनों हाथों के बीच लाएं। बायां पैर पीछे सीधा रखें और छाती खोलकर सामने देखें।",
    alignmentTips: [
      "Front knee 90° पर टखने के ऊपर steady रखें",
      "Hips को नीचे sink होने दें ताकि hip flexor stretch हो",
      "गहरी सांस लेते हुए chest को expand करें",
    ],
    targetMuscles: "Hip Flexors, Quadriceps, Pelvic Floor",
    image: "/surya/step9.svg",
  },
  {
    stepNumber: 10,
    id: "padahastasana_return",
    name_hi: "पादहस्तासन (वापसी)",
    name_en: "Padahastasana (Forward Fold Return)",
    breath: "सांस बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "पीछे वाले पैर को भी आगे लाएं। सांस छोड़ते हुए पूरी तरह आगे झुकें और माथा घुटनों के करीब लाएं।",
    alignmentTips: [
      "Hips से bend बनाए रखें",
      "Weight पंजों और एड़ियों पर evenly distribute करें",
      "सांस पूरी तरह बाहर छोड़कर fold को गहरा करें",
    ],
    targetMuscles: "Hamstrings, Calves, Lower Back",
    image: "/surya/step10.svg",
  },
  {
    stepNumber: 11,
    id: "hasta_uttanasana_return",
    name_hi: "हस्त उत्तानासन (वापसी)",
    name_en: "Hasta Uttanasana (Raised Arms Return)",
    breath: "सांस अंदर लें (Inhale)",
    breathType: "inhale",
    cue: "सांस लेते हुए सीधे ऊपर उठें। बाहों को सिर के ऊपर फैलाएं और हल्का सा backbend करें।",
    alignmentTips: [
      "Core को steady रखकर धीरे-धीरे ऊपर आएं",
      "Arms को आसमान की ओर पूरा stretch करें",
      "Inhale के साथ फेफड़ों में पूरी हवा भरें",
    ],
    targetMuscles: "Spinal Extensors, Chest, Shoulders, Core",
    image: "/surya/step11.svg",
  },
  {
    stepNumber: 12,
    id: "pranamasana_end",
    name_hi: "प्रणामासन (समापन)",
    name_en: "Pranamasana (Prayer Pose Return)",
    breath: "सांस बाहर छोड़ें (Exhale)",
    breathType: "exhale",
    cue: "सांस छोड़ते हुए हथेलियों को छाती के पास लाएं (Prayer Pose)। शांत और स्थिर खड़े रहकर विश्राम करें।",
    alignmentTips: [
      "हृदय गति और सांस को सामान्य होने दें",
      "रीढ़ को सीधा और मन को एकाग्र रखें",
      "एक चक्र (Round) पूरा हुआ, अगले चक्र के लिए तैयार हों",
    ],
    targetMuscles: "Whole Body Balance, Postural Core",
    image: "/surya/step12.svg",
  },
];

export default function SuryaStepViewer({
  activeStepNumber = 1,
  detectedPoseName = "",
  poseQuality = 0,
  voicePrompt = "",
  className = "",
  onSkipStep = null,
}) {
  const [selectedStep, setSelectedStep] = useState(activeStepNumber || 1);
  const [autoSync, setAutoSync] = useState(true);

  // Auto-sync viewed step with AI-detected step unless user manually overrode it
  useEffect(() => {
    if (activeStepNumber && autoSync) {
      setSelectedStep(activeStepNumber);
    }
  }, [activeStepNumber, autoSync]);

  const currentStepData =
    SURYA_STEPS.find((s) => s.stepNumber === selectedStep) || SURYA_STEPS[0];

  const isLiveStep = selectedStep === activeStepNumber;

  const handlePrev = () => {
    setAutoSync(false);
    setSelectedStep((prev) => (prev > 1 ? prev - 1 : 12));
  };

  const handleNext = () => {
    setAutoSync(false);
    setSelectedStep((prev) => (prev < 12 ? prev + 1 : 1));
  };

  const handleSelectStep = (num) => {
    setAutoSync(num === activeStepNumber);
    setSelectedStep(num);
  };

  const handleResumeSync = () => {
    setAutoSync(true);
    if (activeStepNumber) {
      setSelectedStep(activeStepNumber);
    }
  };

  // Breath styling
  const getBreathBadge = (type) => {
    switch (type) {
      case "inhale":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "exhale":
        return "bg-cyan-50 text-cyan-800 border-cyan-200";
      case "retain":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div
      className={`flex flex-col rounded-3xl border border-slate-200/90 bg-white/95 shadow-md backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Header with Step indicator and AutoSync toggle */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 font-black shadow-2xs">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                सूर्य नमस्कार गाइड
              </h3>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black text-cyan-800">
                12 Steps
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-500">
              चरण {selectedStep} / 12
            </p>
          </div>
        </div>

        {/* Sync Indicator / Button */}
        {autoSync ? (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI सिंक चालू
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResumeSync}
            className="flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-1 text-[10px] font-bold text-cyan-700 hover:bg-cyan-100 transition shadow-2xs"
            title="लाइव AI डिटेक्शन से पुनः सिंक करें"
          >
            <RefreshCw size={11} className="text-cyan-600" />
            AI सिंक करें
          </button>
        )}
      </div>

      {/* Progress Bar (1-12) */}
      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 transition-all duration-300"
          style={{ width: `${(selectedStep / 12) * 100}%` }}
        />
      </div>

      {/* Main Content Area (Scrollable if needed) */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
        {/* Step Image Card */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/40 via-white to-slate-50/60 p-2 shadow-2xs group">
          {/* Active Live AI Tracking Ribbon */}
          {isLiveStep && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TARGET
            </div>
          )}

          {/* Large Illustrated Step Vector Image */}
          <div className="w-full aspect-[4/3] max-h-52 sm:max-h-60 flex items-center justify-center overflow-hidden rounded-xl bg-white">
            <img
              src={currentStepData.image}
              alt={currentStepData.name_en}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="eager"
            />
          </div>

          {/* Floating Breath Cue Badge */}
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-black shadow-2xs ${getBreathBadge(
                currentStepData.breathType
              )}`}
            >
              <Wind size={13} />
              {currentStepData.breath}
            </span>

            <span className="text-[10px] font-bold text-slate-500">
              स्टेप {currentStepData.stepNumber} of 12
            </span>
          </div>
        </div>

        {/* Step Title & Sanskrit Name */}
        <div className="border-b border-slate-100 pb-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentStepData.name_hi}
            </h4>
            <span className="text-xs font-bold text-cyan-700">
              #{currentStepData.stepNumber}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600">
            {currentStepData.name_en}
          </p>
        </div>

        {/* Step Instructions (in Hindi with technical terms) */}
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-800 mb-1">
            <Zap size={12} className="text-cyan-600" />
            पोस्चर निर्देश (How to do):
          </div>
          <p className="text-xs font-bold text-slate-800 leading-relaxed">
            {currentStepData.cue}
          </p>
        </div>

        {/* Anatomical Alignment Checklist */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            अलाइनमेंट बिंदु (Key Alignment Points):
          </p>
          <ul className="space-y-1">
            {currentStepData.alignmentTips.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-700 font-medium leading-snug"
              >
                <CheckCircle2
                  size={14}
                  className="shrink-0 text-emerald-600 mt-0.5"
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Target Muscles */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] font-black uppercase text-slate-400">
            Muscles:
          </span>
          <span className="text-xs font-semibold text-slate-600 truncate">
            {currentStepData.targetMuscles}
          </span>
        </div>
      </div>

      {/* Footer Navigation Bar & 12-Step Strip */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 p-2.5 sm:p-3 space-y-2">
        {/* Next / Prev / Skip Controls */}
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            title="पिछला आसन"
          >
            <ChevronLeft size={14} />
            <span>पिछला</span>
          </button>

          {onSkipStep && (
            <button
              type="button"
              onClick={onSkipStep}
              className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition shadow-2xs"
              title="वर्तमान आसन को स्किप करें और तुरंत अगले आसन पर जाएं"
            >
              <span>स्किप आसन</span>
              <ChevronRight size={13} className="text-amber-700" />
            </button>
          )}

          <span className="font-mono text-xs font-black text-slate-800">
            {selectedStep} / 12
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            title="अगला आसन"
          >
            <span>अगला</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 12-Step Quick-Jump Thumbnail Strip */}
        <div className="grid grid-cols-6 gap-1 pt-1">
          {SURYA_STEPS.map((step) => {
            const isCurrent = selectedStep === step.stepNumber;
            const isLive = activeStepNumber === step.stepNumber;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => handleSelectStep(step.stepNumber)}
                className={`relative flex flex-col items-center justify-center rounded-lg p-1 text-[10px] font-black transition ${
                  isCurrent
                    ? "bg-cyan-600 text-white shadow-2xs ring-2 ring-cyan-400"
                    : isLive
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
                title={`${step.stepNumber}. ${step.name_hi} (${step.name_en})`}
              >
                <span>{step.stepNumber}</span>
                {isLive && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
