import React from "react";
import {
  Smile,
  Zap,
  Activity,
  AlertTriangle,
  Heart,
  Eye,
  Sparkles,
  ShieldCheck,
  BatteryCharging,
  Gauge
} from "lucide-react";

export default function ReactionViewer({
  expressionData = {},
  voicePrompt = "",
  className = "",
}) {
  const dominant = expressionData.dominant_emotion || "neutral";
  const confidence = Math.round(expressionData.confidence || 85);
  const emoji = expressionData.emoji || "🙂";
  const stateLabel = expressionData.state_label || "Calm & Focused";
  const engagement = Math.round(expressionData.engagement_score ?? 85);
  const tension = Math.round(expressionData.tension_score ?? 15);
  const fatigue = Math.round(expressionData.fatigue_score ?? 10);
  const drowsy = Boolean(expressionData.drowsiness_warning);
  const faceDetected = Boolean(expressionData.face_detected);
  const emotionScores = expressionData.emotion_scores || {};

  // Emotion Hindi / English map
  const emotionNames = {
    happy: { en: "Happy / Energetic", hi: "प्रसन्न व ऊर्जावान", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    neutral: { en: "Neutral / Focused", hi: "शांत व एकाग्र", color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
    surprise: { en: "Alert / Surprised", hi: "सजग व सतर्क", color: "text-amber-600 bg-amber-50 border-amber-200" },
    angry: { en: "High Exertion / Strain", hi: "उच्च तनाव / खिंचाव", color: "text-rose-600 bg-rose-50 border-rose-200" },
    sad: { en: "Low Energy / Tired", hi: "थकान / कम ऊर्जा", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    fear: { en: "Form Strain / Struggle", hi: "कठिनाई / फॉर्म तनाव", color: "text-purple-600 bg-purple-50 border-purple-200" },
    disgust: { en: "Discomfort Detected", hi: "असहजता के लक्षण", color: "text-orange-600 bg-orange-50 border-orange-200" },
  };

  const currentMeta = emotionNames[dominant] || emotionNames.neutral;

  return (
    <div
      className={`flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden ${className}`}
    >
      {/* Header Banner */}
      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-cyan-50/70 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Smile size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                  लाइव बायोमेट्रिक AI
                </span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                रिएक्शन व इमोशन टेलीमेट्री
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-indigo-100/70 border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-800">
            <Sparkles size={11} className="text-indigo-600" />
            <span>468-Mesh Face</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">
        {/* Dominant Reaction Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 text-white shadow-md">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-3xl shadow-inner backdrop-blur-md">
                {emoji}
              </div>
              <div>
                <span className="inline-block rounded-md bg-indigo-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 border border-indigo-400/30">
                  सक्रिय प्रतिक्रिया (Active Reaction)
                </span>
                <h4 className="text-lg font-black tracking-tight text-white mt-0.5 capitalize">
                  {dominant}
                </h4>
                <p className="text-xs text-indigo-200 font-semibold">
                  {currentMeta.hi}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                कॉन्फिडेंस
              </span>
              <span className="font-mono text-xl font-black text-cyan-300">
                {confidence}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 block">
                {faceDetected ? "Face Locked" : "Searching..."}
              </span>
            </div>
          </div>

          {/* State Label Pill */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            <Activity size={13} className="text-cyan-400 shrink-0" />
            <span className="truncate text-slate-200">{stateLabel}</span>
          </div>
        </div>

        {/* Telemetry Metric Bars */}
        <div className="space-y-2.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Gauge size={13} className="text-indigo-600" />
            लाइव बायोमेट्रिक संकेत (Live Signals)
          </span>

          {/* Engagement */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700 flex items-center gap-1">
                <Zap size={13} className="text-cyan-600" />
                एंगेजमेंट व फोकस (Engagement)
              </span>
              <span className="font-mono text-cyan-700">{engagement}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, engagement))}%` }}
              />
            </div>
          </div>

          {/* Tension */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-700 flex items-center gap-1">
                <Activity size={13} className={tension > 50 ? "text-rose-600" : "text-amber-600"} />
                चेहरे का तनाव (Muscle Tension)
              </span>
              <span className={`font-mono ${tension > 50 ? "text-rose-600" : "text-amber-600"}`}>
                {tension}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  tension > 50
                    ? "bg-gradient-to-r from-amber-500 to-rose-600"
                    : "bg-gradient-to-r from-emerald-400 to-amber-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(5, tension))}%` }}
              />
            </div>
          </div>

          {/* Fatigue Alert */}
          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-2.5">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  drowsy
                    ? "bg-rose-100 text-rose-700 border border-rose-300"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                }`}
              >
                {drowsy ? <AlertTriangle size={15} /> : <Eye size={15} />}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-800 leading-tight">
                  {drowsy ? "थकान / झपकी चेतावनी" : "सजगता स्थिति (Alertness)"}
                </p>
                <p className="text-[9px] text-slate-500">
                  {drowsy ? "कृपया ब्रेक लें और पानी पिएं" : "नेत्र खुलापन सामान्य है"}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                drowsy
                  ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-300"
              }`}
            >
              {drowsy ? "Alert" : "Normal"}
            </span>
          </div>
        </div>

        {/* Emotion Breakdown Bars */}
        {Object.keys(emotionScores).length > 0 && (
          <div className="space-y-2 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              इमोशन स्पेक्ट्रम (Emotion Breakdown)
            </span>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {["happy", "neutral", "surprise", "angry"].map((key) => {
                const val = Math.round(emotionScores[key] || 0);
                const isDominant = dominant === key;
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-2 transition ${
                      isDominant
                        ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-300"
                        : "border-slate-100 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="capitalize text-slate-700">{key}</span>
                      <span className="font-mono text-slate-900">{val}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          key === "happy"
                            ? "bg-emerald-500"
                            : key === "neutral"
                            ? "bg-cyan-500"
                            : key === "surprise"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, val)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Coach Advice */}
        {voicePrompt && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-indigo-900 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 block">
                AI कोच सुझाव
              </span>
              <p className="text-xs font-bold leading-snug mt-0.5">
                {voicePrompt}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Pill */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-2.5 text-center">
        <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>निजी व सुरक्षित — कोई भी वीडियो फ्रेम सर्वर पर स्टोर नहीं किया जाता</span>
        </span>
      </div>
    </div>
  );
}
