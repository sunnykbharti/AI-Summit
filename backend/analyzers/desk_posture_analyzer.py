import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO

NOSE = 0
LEFT_EYE, RIGHT_EYE = 1, 2
LEFT_EAR, RIGHT_EAR = 3, 4
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12

KEYPOINT_CONFIDENCE_THRESHOLD = 0.20
MAX_TORSO_LEAN_DEGREES = 20.0       # Relaxed from 12.0 for natural ergonomic desk seating
MAX_SHOULDER_TILT_RATIO = 0.20      # Normalized to shoulder width
MAX_HEAD_FORWARD_RATIO = 0.35       # Normalized to shoulder width
SMOOTHING_WINDOW = 5


def midpoint(a, b):
    return (np.array(a[:2], dtype=np.float32) + np.array(b[:2], dtype=np.float32)) / 2.0


def distance(a, b):
    return float(np.linalg.norm(np.array(a[:2], dtype=np.float32) - np.array(b[:2], dtype=np.float32)))


class DeskPostureAnalyzer:
    """
    Specialized Desk Posture Corrector for Studying, Working & Remote Work.
    Monitors webcam feed for slouching, neck forward tilt, shoulder tilt,
    and proximity with scale-normalized metrics and debounced alert thresholds.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.lean_history = deque(maxlen=SMOOTHING_WINDOW)
        self.good_frames = 0
        self.bad_frames = 0
        self.consecutive_bad_frames = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कैमरे के सामने सीधे बैठें"
        score = 100
        issues = []
        alert_triggered = False

        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]
            nose = person[NOSE]
            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_eye, r_eye = person[LEFT_EYE], person[RIGHT_EYE]

            confs = [l_sh[2], r_sh[2], nose[2]]
            reliable = sum(c > KEYPOINT_CONFIDENCE_THRESHOLD for c in confs) >= 2

            if reliable:
                sh_w = distance(l_sh, r_sh) + 1e-5
                sh_c = midpoint(l_sh, r_sh)
                hip_c = midpoint(l_hip, r_hip) if (l_hip[2] > 0.15 and r_hip[2] > 0.15) else sh_c + np.array([0, sh_w * 1.5])

                # Torso Vertical Alignment with smoothing
                dx = abs(sh_c[0] - hip_c[0])
                dy = abs(sh_c[1] - hip_c[1]) + 1e-5
                raw_lean = float(np.degrees(np.arctan2(dx, dy)))
                self.lean_history.append(raw_lean)
                lean_deg = float(np.mean(self.lean_history))

                # Scale-normalized shoulder imbalance
                shoulder_tilt_ratio = abs(l_sh[1] - r_sh[1]) / sh_w

                # Scale-normalized head forward position
                head_forward_ratio = abs(nose[0] - sh_c[0]) / sh_w

                # Screen proximity normalized by frame width
                frame_w = frame.shape[1]
                eye_dist = distance(l_eye, r_eye) if (l_eye[2] > 0.15 and r_eye[2] > 0.15) else 0

                if lean_deg > MAX_TORSO_LEAN_DEGREES:
                    issues.append("झुककर बैठना (Slouching)")
                    score -= 20

                if shoulder_tilt_ratio > MAX_SHOULDER_TILT_RATIO:
                    issues.append("कंधे असमान हैं (Shoulder Tilt)")
                    score -= 15

                if head_forward_ratio > MAX_HEAD_FORWARD_RATIO:
                    issues.append("गर्दन आगे की ओर झुकी (Forward Neck)")
                    score -= 15

                if eye_dist > frame_w * 0.25:
                    issues.append("स्क्रीन के बहुत पास (Too Close to Screen)")
                    score -= 15

                score = max(50, score)

                if len(issues) <= 1 and score >= 80:
                    self.good_frames += 1
                    self.consecutive_bad_frames = 0
                    feedback = "उत्कृष्ट स्टडी पोज़! पीठ और गर्दन का संतुलन बहुत अच्छा है।"
                else:
                    self.bad_frames += 1
                    self.consecutive_bad_frames += 1

                    clean_issues = []
                    if any("Slouching" in i for i in issues):
                        clean_issues.append("पीठ सीधी रखें")
                    if any("Forward Neck" in i for i in issues):
                        clean_issues.append("गर्दन पीछे लाएं")
                    if any("Shoulder Tilt" in i for i in issues):
                        clean_issues.append("कंधे सीधे रखें")
                    if any("Too Close" in i for i in issues):
                        clean_issues.append("स्क्रीन से सुरक्षित दूरी बनाएं")

                    feedback = "कृपया ध्यान दें: " + ", ".join(clean_issues if clean_issues else issues)

                    # Trigger alert only if poor posture persists for > 25 consecutive frames (~5 sec)
                    if self.consecutive_bad_frames > 25:
                        alert_triggered = True

            else:
                feedback = "कृपया कैमरे के सामने स्टडी पोज़िशन में बैठें।"

        total_tracked = self.good_frames + self.bad_frames
        accuracy = round(100 * self.good_frames / total_tracked, 1) if total_tracked > 0 else 0.0

        return output_bgr, {
            "stage": "Study / Interview Posture Guard",
            "total_reps": total_tracked,
            "correct_reps": self.good_frames,
            "incorrect_reps": self.bad_frames,
            "accuracy": accuracy,
            "score": score,
            "feedback": feedback,
            "alert": alert_triggered,
            "issues": issues,
        }

    def session_summary(self):
        total = self.good_frames + self.bad_frames
        accuracy = round(100 * self.good_frames / total, 1) if total > 0 else 0.0
        return {
            "total_reps": total,
            "correct_reps": self.good_frames,
            "incorrect_reps": self.bad_frames,
            "accuracy": accuracy,
            "rep_log": self.rep_log,
        }
