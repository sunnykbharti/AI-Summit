import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO

NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12

KEYPOINT_CONFIDENCE_THRESHOLD = 0.25
MAX_TORSO_LEAN_DEGREES = 15.0
MAX_SHOULDER_TILT = 25.0


def midpoint(a, b):
    return (np.array(a[:2]) + np.array(b[:2])) / 2.0


class PostureAnalyzer:
    """
    General Posture Analyzer.
    Evaluates sitting/standing posture, detects slouching, shoulder imbalance, and head-forward drift.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.good_frames = 0
        self.bad_frames = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot()
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
                sh_c = midpoint(l_sh, r_sh)
                hip_c = midpoint(l_hip, r_hip) if (l_hip[2] > 0.2 and r_hip[2] > 0.2) else sh_c + np.array([0, 150])

                # Vertical torso angle
                dx = abs(sh_c[0] - hip_c[0])
                dy = abs(sh_c[1] - hip_c[1]) + 1e-8
                lean_deg = float(np.degrees(np.arctan2(dx, dy)))

                # Shoulder imbalance
                shoulder_tilt = abs(l_sh[1] - r_sh[1])

                # Head forward ratio relative to shoulders
                head_forward = nose[0] - sh_c[0]

                issues = []
                if lean_deg > MAX_TORSO_LEAN_DEGREES:
                    issues.append("झुकाव / धड़ झुक रहा है")
                    score -= 30
                if shoulder_tilt > MAX_SHOULDER_TILT:
                    issues.append("कंधे असमान हैं")
                    score -= 20
                if abs(head_forward) > 55:
                    issues.append("सिर आगे झुका हुआ है")
                    score -= 25

                if not issues:
                    self.good_frames += 1
                    feedback = f"GOOD: बहुत अच्छी मुद्रा (Score: {score}/100)"
                else:
                    self.bad_frames += 1
                    feedback = "मुद्रा में समस्या: " + ", ".join(issues)
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
