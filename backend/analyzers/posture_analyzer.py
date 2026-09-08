import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO
try:
    from analyzers.device_utils import load_yolo_model
except ImportError:
    from device_utils import load_yolo_model

NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12

KEYPOINT_CONFIDENCE_THRESHOLD = 0.20
MAX_TORSO_LEAN_DEGREES = 20.0       # Relaxed from 15.0 to accommodate natural comfortable posture
MAX_SHOULDER_TILT_RATIO = 0.22      # Normalized to shoulder width instead of raw 25px
MAX_HEAD_FORWARD_RATIO = 0.38       # Normalized to shoulder width instead of raw 55px
SMOOTHING_WINDOW = 5


def midpoint(a, b):
    return (np.array(a[:2], dtype=np.float32) + np.array(b[:2], dtype=np.float32)) / 2.0


def distance(a, b):
    return float(np.linalg.norm(np.array(a[:2], dtype=np.float32) - np.array(b[:2], dtype=np.float32)))


class PostureAnalyzer:
    """
    General Posture Analyzer.
    Evaluates sitting/standing posture, detects slouching, shoulder tilt, and head-forward drift
    with scale-normalized biomechanics and frame-to-frame stability smoothing.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        self.model, self.device = load_yolo_model(model_path)

        self.lean_history = deque(maxlen=SMOOTHING_WINDOW)
        self.good_frames = 0
        self.bad_frames = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, device=self.device, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        score = 100
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]
            nose = person[NOSE]
            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]

            confs = [l_sh[2], r_sh[2], nose[2]]
            reliable = sum(c > KEYPOINT_CONFIDENCE_THRESHOLD for c in confs) >= 2

            if reliable:
                sh_w = distance(l_sh, r_sh) + 1e-5
                sh_c = midpoint(l_sh, r_sh)
                hip_c = midpoint(l_hip, r_hip) if (l_hip[2] > 0.15 and r_hip[2] > 0.15) else sh_c + np.array([0, sh_w * 1.5])

                # Vertical torso angle
                dx = abs(sh_c[0] - hip_c[0])
                dy = abs(sh_c[1] - hip_c[1]) + 1e-5
                raw_lean = float(np.degrees(np.arctan2(dx, dy)))
                self.lean_history.append(raw_lean)
                lean_deg = float(np.mean(self.lean_history))

                # Scale-normalized shoulder imbalance
                shoulder_tilt_ratio = abs(l_sh[1] - r_sh[1]) / sh_w

                # Scale-normalized head forward ratio
                head_forward_ratio = abs(nose[0] - sh_c[0]) / sh_w

                issues = []
                if lean_deg > MAX_TORSO_LEAN_DEGREES:
                    issues.append("धड़ का झुकाव")
                    score -= 20
                if shoulder_tilt_ratio > MAX_SHOULDER_TILT_RATIO:
                    issues.append("कंधे थोड़े असमान हैं")
                    score -= 15
                if head_forward_ratio > MAX_HEAD_FORWARD_RATIO:
                    issues.append("गर्दन आगे की ओर झुकी है")
                    score -= 15

                score = max(50, score)

                if len(issues) <= 1 and score >= 80:
                    self.good_frames += 1
                    feedback = f"GOOD: संतुलित मुद्रा (Score: {score}/100)"
                else:
                    self.bad_frames += 1
                    feedback = "मुद्रा में सुधार करें: " + ", ".join(issues)
            else:
                feedback = "कैमरे के सामने सीधे बैठें या खड़े हों"

        total_tracked = self.good_frames + self.bad_frames
        accuracy = round(100 * self.good_frames / total_tracked, 1) if total_tracked > 0 else 0.0

        return output_bgr, {
            "stage": "Posture Monitoring",
            "total_reps": total_tracked,
            "correct_reps": self.good_frames,
            "incorrect_reps": self.bad_frames,
            "accuracy": accuracy,
            "score": score,
            "feedback": feedback,
        }

    def session_summary(self):
        total = self.good_frames + self.bad_frames
        accuracy = round(100 * self.good_frames / total, 1) if total > 0 else 0.0
        return {
            "total_reps": total,
            "correct_reps": self.good_frames,
            "incorrect_reps": self.bad_frames,
            "accuracy": accuracy,
            "rep_log": [],
        }
