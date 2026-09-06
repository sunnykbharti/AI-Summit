"""
reaction_analyzer.py - Dedicated Facial Reaction, Emotion & Fatigue Analyzer.

Analyzes user expressions in real time, draws stylish HUD/face bounding,
and calculates mood, focus/engagement, tension, and drowsiness telemetry.
"""

from collections import deque
from typing import Optional

import cv2
import numpy as np
from analyzers.expression_analyzer import FacialExpressionAnalyzer, EMOTION_EMOJIS, STATE_LABELS

# --- Tunable thresholds (centralized so they're easy to sweep/calibrate) ---
TENSION_HIGH = 60          # >: counted as a "bad" frame / issue
TENSION_MED = 50           # >: amber HUD color, even if not yet "bad"
SMOOTHING_ALPHA = 0.35     # EMA weight given to the new sample (0-1, higher = less smoothing)
SCORE_TENSION_WEIGHT = 0.2
SCORE_FATIGUE_WEIGHT = 0.3
REP_LOG_MAXLEN = 300       # cap so long sessions don't grow rep_log unbounded


class ReactionAnalyzer:
    """
    Dedicated Facial Reaction, Emotion & Fatigue Analyzer for PostureTrek / PoseCare.
    """

    def __init__(self):
        self.expression_engine = FacialExpressionAnalyzer()
        self.rep_log = deque(maxlen=REP_LOG_MAXLEN)
        self.good_frames = 0
        self.bad_frames = 0
        self.frame_count = 0

        # Smoothed (EMA) telemetry, reduces frame-to-frame jitter in the HUD/score.
        self._smoothed_engagement: Optional[float] = None
        self._smoothed_tension: Optional[float] = None
        self._smoothed_fatigue: Optional[float] = None

    @staticmethod
    def _ema(prev: Optional[float], new: float, alpha: float = SMOOTHING_ALPHA) -> float:
        if prev is None:
            return new
        return alpha * new + (1 - alpha) * prev

    @staticmethod
    def _draw_corner_brackets(output, x, y, bw, bh, color, thickness=2):
        """Draw tech-style corner bracket overlay around a face bounding box."""
        line_len = max(12, min(28, bw // 4, bh // 4))
        corners = [
            ((x, y), (1, 0), (0, 1)),          # top-left
            ((x + bw, y), (-1, 0), (0, 1)),    # top-right
            ((x, y + bh), (1, 0), (0, -1)),    # bottom-left
            ((x + bw, y + bh), (-1, 0), (0, -1)),  # bottom-right
        ]
        for (cx, cy), (dx, dy), (ex, ey) in corners:
            cv2.line(output, (cx, cy), (cx + dx * line_len, cy), color, thickness)
            cv2.line(output, (cx, cy), (cx, cy + ey * line_len), color, thickness)

    def process_frame(self, frame):
        self.frame_count += 1
        output = frame.copy()
        h, w = frame.shape[:2]

        expr_data = self.expression_engine.process_frame(frame)
        face_detected = expr_data.get("face_detected", False)
        face_box = expr_data.get("face_box")
        dominant = expr_data.get("dominant_emotion", "neutral")
        confidence = expr_data.get("confidence", 80.0)
        drowsy = expr_data.get("drowsiness_warning", False)
        state_label = expr_data.get("state_label", "Focused")
        emoji = expr_data.get("emoji", "🙂")

        # Smooth the noisy scores before using them for anything (HUD, scoring, thresholds).
        raw_tension = expr_data.get("tension_score", 15)
        raw_fatigue = expr_data.get("fatigue_score", 10)
        raw_engagement = expr_data.get("engagement_score", 85)

        self._smoothed_tension = self._ema(self._smoothed_tension, raw_tension)
        self._smoothed_fatigue = self._ema(self._smoothed_fatigue, raw_fatigue)
        self._smoothed_engagement = self._ema(self._smoothed_engagement, raw_engagement)

        tension = self._smoothed_tension
        fatigue = self._smoothed_fatigue
        engagement = self._smoothed_engagement

        issues = []
        if drowsy:
            issues.append("Fatigue / Drowsiness Detected")
            self.bad_frames += 1
        elif tension > TENSION_HIGH:
            issues.append("High Muscle Tension Detected")
            self.bad_frames += 1
        else:
            self.good_frames += 1

        # Draw tech corner brackets face overlay if face is detected
        if face_detected and face_box:
            x, y, bw, bh = face_box
            # Clamp box to frame bounds so drawing never throws or draws off-canvas.
            x = max(0, min(x, w - 1))
            y = max(0, min(y, h - 1))
            bw = max(1, min(bw, w - x))
            bh = max(1, min(bh, h - y))

            color = (0, 0, 255) if drowsy else (0, 165, 255) if tension > TENSION_MED else (255, 180, 0)
            self._draw_corner_brackets(output, x, y, bw, bh, color)

            label = f"{dominant.upper()} {confidence:.0f}%"
            cv2.putText(output, label, (x, max(25, y - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
        else:
            cv2.putText(output, "No Face Detected - Center Face in Camera",
                        (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 165, 255), 2, cv2.LINE_AA)

        # Bottom HUD on video frame
        hud_text = f"REACTION: {dominant.upper()} | ENGAGEMENT: {engagement:.0f}% | TENSION: {tension:.0f}%"
        cv2.putText(output, hud_text, (20, h - 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        total_tracked = self.good_frames + self.bad_frames
        accuracy = round(100 * self.good_frames / total_tracked, 1) if total_tracked > 0 else 85.0

        # Score now reflects tension too (previously only engagement/fatigue), since tension
        # is what actually drives the "bad frame" / issue logic above.
        score = max(0, min(100, int(
            engagement - fatigue * SCORE_FATIGUE_WEIGHT - tension * SCORE_TENSION_WEIGHT
        )))

        feedback = f"प्रतिक्रिया: {dominant.capitalize()} - {state_label}"
        if drowsy:
            feedback = "चेतावनी: थकान या झपकी के लक्षण दिखे, कृपया ब्रेक लें।"
        elif tension > TENSION_HIGH:
            feedback = "चेहरे पर तनाव अधिक है, गहरी सांस लें और रिलैक्स करें।"

        metrics = {
            "stage": dominant.capitalize(),
            "total_reps": total_tracked,
            "correct_reps": self.good_frames,
            "incorrect_reps": self.bad_frames,
            "accuracy": accuracy,
            "score": score,
            "feedback": feedback,
            "issues": issues,
            "dominant_emotion": dominant,
            "confidence": confidence,
            "fatigue_score": round(fatigue, 1),
            "tension_score": round(tension, 1),
            "engagement_score": round(engagement, 1),
            "drowsiness_warning": drowsy,
            "state_label": state_label,
            "emoji": emoji,
            "emotion_scores": expr_data.get("emotion_scores", {}),
            "face_detected": face_detected,
            "is_reaction": True,
        }

        # Log frame telemetry for session summary
        self.rep_log.append({
            "frame": self.frame_count,
            "dominant_emotion": dominant,
            "score": score,
            "issues": issues,
        })

        return output, metrics

    def session_summary(self):
        total = self.good_frames + self.bad_frames
        accuracy = round(100 * self.good_frames / total, 1) if total > 0 else 88.0

        avg_score = round(sum(r["score"] for r in self.rep_log) / len(self.rep_log), 1) if self.rep_log else 0.0

        return {
            "total_reps": total,
            "correct_reps": self.good_frames,
            "incorrect_reps": self.bad_frames,
            "accuracy": accuracy,
            "average_score": avg_score,
            "rep_log": list(self.rep_log),
        }