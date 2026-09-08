import cv2
import time
import numpy as np
from collections import deque
from ultralytics import YOLO
try:
    from analyzers.device_utils import load_yolo_model
except ImportError:
    from device_utils import load_yolo_model

LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_CONFIDENCE_THRESHOLD = 0.20
# Biomechanically realistic range for 2D projected plank posture (accounting for camera angle and natural lumbar lordosis)
PLANK_MIN_STRAIGHT_ANGLE = 138.0    # Relaxed from 158.0
PLANK_MAX_STRAIGHT_ANGLE = 180.0
GRACE_PERIOD_SECONDS = 1.5          # Prevents single-frame detection jitter from wiping out active hold
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


class PlankAnalyzer:
    """
    Human-Tolerant Plank Analyzer.
    Monitors body straightness with angle smoothing, provides a 1.5-second grace buffer
    against momentary camera dropouts, and tracks hold time and milestone reps cleanly.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        self.model, self.device = load_yolo_model(model_path)

        self.angle_history = deque(maxlen=SMOOTHING_WINDOW)

        self.hold_start_time = None
        self.last_good_time = None
        self.total_hold_seconds = 0.0
        self.current_hold_seconds = 0.0
        self.completed_holds = 0
        self.last_milestone_logged = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, device=self.device, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        smoothed_body_angle = None
        is_good = False
        now = time.time()

        keypoint_data = results[0].keypoints.data
        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]
            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_knee, r_knee = person[LEFT_KNEE], person[RIGHT_KNEE]
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]

            left_conf = (l_sh[2] + l_hip[2]) / 2.0
            right_conf = (r_sh[2] + r_hip[2]) / 2.0

            reliable_left = left_conf > KEYPOINT_CONFIDENCE_THRESHOLD and l_sh[2] > 0.15 and l_hip[2] > 0.15
            reliable_right = right_conf > KEYPOINT_CONFIDENCE_THRESHOLD and r_sh[2] > 0.15 and r_hip[2] > 0.15

            if reliable_left or reliable_right:
                angles = []
                if reliable_left:
                    lower_pt = l_ank[:2] if l_ank[2] > 0.15 else (l_knee[:2] if l_knee[2] > 0.15 else l_hip[:2] + np.array([0, 70]))
                    angles.append(calculate_angle(l_sh[:2], l_hip[:2], lower_pt))
                if reliable_right:
                    lower_pt = r_ank[:2] if r_ank[2] > 0.15 else (r_knee[:2] if r_knee[2] > 0.15 else r_hip[:2] + np.array([0, 70]))
                    angles.append(calculate_angle(r_sh[:2], r_hip[:2], lower_pt))

                if angles:
                    self.angle_history.append(float(np.mean(angles)))
                    smoothed_body_angle = float(np.mean(self.angle_history))

                sh = l_sh if left_conf >= right_conf else r_sh
                hip = l_hip if left_conf >= right_conf else r_hip
                ank = l_ank if left_conf >= right_conf else r_ank
                if ank[2] < 0.15:
                    ank = l_knee if left_conf >= right_conf else r_knee

                if smoothed_body_angle is not None:
                    if PLANK_MIN_STRAIGHT_ANGLE <= smoothed_body_angle <= PLANK_MAX_STRAIGHT_ANGLE:
                        is_good = True
                        if smoothed_body_angle >= 150.0:
                            feedback = f"GOOD: बेहतरीन प्लैंक फॉर्म ({smoothed_body_angle:.0f}°)"
                        else:
                            feedback = f"GOOD: अच्छा प्लैंक होल्ड ({smoothed_body_angle:.0f}°)"
                    else:
                        expected_hip_y = (sh[1] + ank[1]) / 2.0
                        torso_h = abs(sh[1] - hip[1]) + 1e-5
                        if hip[1] > expected_hip_y + torso_h * 0.25:
                            feedback = "कोर टाइट रखें - कूल्हे नीचे झुक रहे हैं"
                        else:
                            feedback = "कूल्हे थोड़े नीचे लाएं - पीठ सीधी रखें"

                # Hold timer tracking with 1.5s grace period
                if is_good:
                    if self.hold_start_time is None:
                        self.hold_start_time = now
                        self.last_milestone_logged = 0
                    self.last_good_time = now
                    self.current_hold_seconds = now - self.hold_start_time

                    # Log a milestone rep every 5 seconds of steady hold
                    current_milestone = int(self.current_hold_seconds // 5.0)
                    if current_milestone > self.last_milestone_logged:
                        self.last_milestone_logged = current_milestone
                        self.completed_holds += 1
                        self.rep_log.append({
                            "rep_number": self.completed_holds,
                            "correct": True,
                            "errors": [],
                            "hold_time": round(float(self.current_hold_seconds), 1),
                        })

                    feedback += f" | Hold: {self.current_hold_seconds:.1f}s"
                else:
                    # In grace buffer window: do not wipe out hold time instantly
                    if self.hold_start_time is not None:
                        time_since_good = now - (self.last_good_time or self.hold_start_time)
                        if time_since_good < GRACE_PERIOD_SECONDS:
                            # Hold continues under grace
                            self.current_hold_seconds = now - self.hold_start_time
                            feedback += f" | Hold: {self.current_hold_seconds:.1f}s (Adjusting)"
                        else:
                            # Grace period expired, conclude this hold sequence
                            final_duration = (self.last_good_time or now) - self.hold_start_time
                            if final_duration >= 3.0:
                                self.total_hold_seconds += final_duration
                                if self.last_milestone_logged == 0:
                                    self.completed_holds += 1
                                    self.rep_log.append({
                                        "rep_number": self.completed_holds,
                                        "correct": True,
                                        "errors": [],
                                        "hold_time": round(float(final_duration), 1),
                                    })
                            self.hold_start_time = None
                            self.last_good_time = None
                            self.current_hold_seconds = 0.0
                            self.last_milestone_logged = 0
            else:
                feedback = "प्लैंक में कैमरे के सामने साइड से पूरा शरीर दिखाएं"
                if self.hold_start_time is not None:
                    time_since_good = now - (self.last_good_time or self.hold_start_time)
                    if time_since_good >= GRACE_PERIOD_SECONDS:
                        self.hold_start_time = None
                        self.last_good_time = None
                        self.current_hold_seconds = 0.0

        return output_bgr, {
            "stage": "Plank Hold",
            "total_reps": self.completed_holds,
            "correct_reps": self.completed_holds,
            "incorrect_reps": 0,
            "accuracy": 100.0 if self.completed_holds > 0 else 0.0,
            "body_angle": None if smoothed_body_angle is None else round(float(smoothed_body_angle), 1),
            "hold_seconds": round(float(self.current_hold_seconds), 1),
            "feedback": feedback,
        }

    def session_summary(self):
        total_time = self.total_hold_seconds + self.current_hold_seconds
        return {
            "total_reps": self.completed_holds,
            "correct_reps": self.completed_holds,
            "incorrect_reps": 0,
            "accuracy": 100.0 if self.completed_holds > 0 else (80.0 if total_time >= 3.0 else 0.0),
            "total_hold_time": round(float(total_time), 1),
            "rep_log": self.rep_log,
        }
