"""
Vision-Based Breath Detection (Pranayama-Kinematics Sync Engine).
Tracks subtle vertical and lateral displacements of clavicle, sternum, and rib cage keypoints
to estimate the respiratory cycle (Inhale vs. Exhale vs. Hold).
Scores and prompts users to synchronize asana transitions to their breathing cadence.
"""

import time
import numpy as np
from collections import deque
from typing import Dict, Any, List, Optional, Tuple

# COCO Keypoint indexes
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12
NOSE = 0


class VisionBreathDetector:
    """
    Vision-based respiration phase detector using upper thoracic & clavicular displacement.
    """

    def __init__(self, history_len: int = 45):
        self.history_len = history_len
        self.displacement_history = deque(maxlen=history_len)
        self.time_history = deque(maxlen=history_len)
        self.reset()
        
        # Canonical breath mapping for exercises / asanas
        self.target_breath_table = {
            "pranamasana": "EXHALE",           # Normal / Exhale
            "hasta_uttanasana": "INHALE",      # Raised arms / chest opener -> Inhale
            "padahastasana": "EXHALE",         # Forward fold -> Exhale
            "ashwa_sanchalanasana": "INHALE",  # Equestrian pose / chest expansion -> Inhale
            "dandasana": "EXHALE",             # Plank -> Retain / Exhale
            "ashtanga_namaskara": "HOLD",      # 8 limbs hold breath
            "bhujangasana": "INHALE",          # Cobra backbend -> Inhale
            "adho_mukha_svanasana": "EXHALE",  # Downward dog -> Exhale
            "tadasana": "INHALE",              # Mountain pose -> Inhale
            "squat": "INHALE",                 # Inhale on descent, exhale on ascent
            "pushup": "INHALE",                # Inhale down, exhale push up
            "plank": "HOLD",                   # Steady rhythmic breath
            "lunges": "INHALE",                # Inhale down, exhale up
        }

    def reset(self):
        self.displacement_history.clear()
        self.time_history.clear()
        self.current_phase = "INHALE"
        self.phase_confidence = 0.85
        self.breath_rate_bpm = 14.0
        self.chest_expansion_pct = 50.0
        self.last_phase_change_time = time.time()
        self.last_trough_time = time.time()
        self.last_peak_time = time.time()

    def process_frame(
        self,
        person_keypoints: Optional[np.ndarray],
        exercise_name: str = "surya_namaskar",
        current_step_id: Optional[str] = None,
        exercise: Optional[str] = None,
        exercise_metrics: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Calculates respiration displacement, detects phase, and computes Pranayama sync score.
        """
        if exercise:
            exercise_name = exercise
        if current_step_id is None and exercise_metrics:
            current_step_id = exercise_metrics.get("current_step_id") or exercise_metrics.get("stage")
        now = time.time()
        
        if person_keypoints is None or len(person_keypoints) < 17:
            return self._fallback_response(exercise_name, current_step_id)

        l_sh = person_keypoints[LEFT_SHOULDER]
        r_sh = person_keypoints[RIGHT_SHOULDER]
        l_hp = person_keypoints[LEFT_HIP]
        r_hp = person_keypoints[RIGHT_HIP]

        # Check keypoint reliability
        sh_conf = min(l_sh[2], r_sh[2])
        hp_conf = min(l_hp[2], r_hp[2])
        if sh_conf < 0.20:
            return self._fallback_response(exercise_name, current_step_id)

        # Thoracic center of clavicle / sternum
        sternum_y = (l_sh[1] + r_sh[1]) / 2.0
        biacromial_width = np.linalg.norm(l_sh[:2] - r_sh[:2]) + 1e-5

        # Torso reference length for scale normalization
        if hp_conf > 0.20:
            hip_center_y = (l_hp[1] + r_hp[1]) / 2.0
            torso_length = max(30.0, abs(hip_center_y - sternum_y))
        else:
            torso_length = biacromial_width * 1.6

        # Normalized thoracic displacement:
        # Inhalation: Clavicle elevates slightly (y decreases in screen coordinates) and chest widens (width increases)
        vertical_metric = - (sternum_y / torso_length)
        lateral_metric = biacromial_width / torso_length
        combined_signal = float(vertical_metric * 0.65 + lateral_metric * 0.35)

        self.displacement_history.append(combined_signal)
        self.time_history.append(now)

        # Smooth signal over recent history
        if len(self.displacement_history) >= 5:
            arr = np.array(self.displacement_history)
            # Remove baseline drift using rolling mean
            smoothed = float(np.mean(arr[-5:]))
            baseline = float(np.mean(arr))
            signal_delta = smoothed - baseline
            
            # Dynamic min-max range for expansion percentage
            min_val = float(np.min(arr))
            max_val = float(np.max(arr))
            spread = max(1e-4, max_val - min_val)
            self.chest_expansion_pct = float(np.clip((smoothed - min_val) / spread * 100.0, 5.0, 95.0))

            # Trend direction: derivative over last 8 frames
            if len(arr) >= 8:
                slope = float(arr[-1] - arr[-8])
                phase_threshold = 0.0015

                if slope > phase_threshold:
                    new_phase = "INHALE"
                elif slope < -phase_threshold:
                    new_phase = "EXHALE"
                else:
                    new_phase = "HOLD"

                if new_phase != self.current_phase and (now - self.last_phase_change_time > 1.2):
                    self.current_phase = new_phase
                    self.last_phase_change_time = now

                    if new_phase == "INHALE":
                        period = max(1.5, now - self.last_trough_time)
                        self.last_trough_time = now
                        if 1.5 <= period <= 9.0:
                            calc_bpm = 60.0 / period
                            self.breath_rate_bpm = float(np.clip(calc_bpm, 8.0, 26.0))
                    elif new_phase == "EXHALE":
                        self.last_peak_time = now

        # Compute Pranayama-Kinematics Sync Score
        target_phase = self._get_target_phase(exercise_name, current_step_id)
        
        if target_phase == "ANY":
            sync_match = True
            sync_score = 90
            cue_text = "सहज श्वास प्रवाह बनाए रखें (Natural Breathing)"
        elif target_phase == self.current_phase:
            sync_match = True
            sync_score = 95
            cue_text = f"उत्तम तालमेल: {self._phase_to_hindi(target_phase)} सही समय पर है"
        elif target_phase == "HOLD" and self.current_phase in ["HOLD", "INHALE"]:
            sync_match = True
            sync_score = 85
            cue_text = "श्वास रोकें व स्थिरता बनाए रखें (Hold breath gently)"
        else:
            sync_match = False
            sync_score = 45
            cue_text = f"श्वास सुधारें: इस मुद्रा में {self._phase_to_hindi(target_phase)} करें"

        return {
            "phase": self.current_phase,
            "phase_hi": self._phase_to_hindi(self.current_phase),
            "target_phase": target_phase,
            "target_phase_hi": self._phase_to_hindi(target_phase),
            "sync_match": sync_match,
            "sync_score": sync_score,
            "breath_rate_bpm": round(self.breath_rate_bpm, 1),
            "chest_expansion_pct": round(self.chest_expansion_pct, 1),
            "cue": cue_text,
            "guidance": f"{self._phase_to_hindi(self.current_phase)} ({round(self.breath_rate_bpm, 0)} श्वास/मिनट)",
        }

    def _get_target_phase(self, exercise_name: str, step_id: Optional[str]) -> str:
        if step_id and step_id.lower() in self.target_breath_table:
            return self.target_breath_table[step_id.lower()]
        
        ex = exercise_name.lower().replace(" ", "_")
        for key, val in self.target_breath_table.items():
            if key in ex:
                return val
        return "ANY"

    def _phase_to_hindi(self, phase: str) -> str:
        mapping = {
            "INHALE": "पूरक (Inhale - सांस लें)",
            "EXHALE": "रेचक (Exhale - सांस छोड़ें)",
            "HOLD": "कुंभक (Hold - सांस रोकें)",
            "ANY": "सहज श्वास (Normal Breath)"
        }
        return mapping.get(phase, "सामान्य श्वास")

    def _fallback_response(self, exercise_name: str, current_step_id: Optional[str]) -> Dict[str, Any]:
        target_phase = self._get_target_phase(exercise_name, current_step_id)
        return {
            "phase": self.current_phase,
            "phase_hi": self._phase_to_hindi(self.current_phase),
            "target_phase": target_phase,
            "target_phase_hi": self._phase_to_hindi(target_phase),
            "sync_match": True,
            "sync_score": 80,
            "breath_rate_bpm": round(self.breath_rate_bpm, 1),
            "chest_expansion_pct": round(self.chest_expansion_pct, 1),
            "cue": "कैमरे के सामने सामान्य श्वास प्रवाह बनाए रखें",
            "guidance": "सामान्य श्वास (Normal Breath)",
        }
