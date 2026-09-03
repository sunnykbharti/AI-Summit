import cv2
import numpy as np
from ultralytics import YOLO

NOSE = 0
LEFT_EYE, RIGHT_EYE = 1, 2
LEFT_EAR, RIGHT_EAR = 3, 4
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12

KEYPOINT_CONFIDENCE_THRESHOLD = 0.25
MAX_TORSO_LEAN_DEGREES = 12.0
MAX_SHOULDER_TILT = 20.0
MAX_HEAD_FORWARD_PX = 45.0


def midpoint(a, b):
    return (np.array(a[:2]) + np.array(b[:2])) / 2.0


class DeskPostureAnalyzer:
    """
    Specialized Desk Posture Corrector for Studying, Working & Remote Interviews.
    Monitors webcam feed for slouching, neck forward tilt (text neck), shoulder tilt,
    and proximity/leaning too close to screen.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.good_frames = 0
        self.bad_frames = 0
        self.consecutive_bad_frames = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot()
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
                sh_c = midpoint(l_sh, r_sh)
                hip_c = midpoint(l_hip, r_hip) if (l_hip[2] > 0.2 and r_hip[2] > 0.2) else sh_c + np.array([0, 140])

                # Torso Vertical Alignment (Slouching / Leaning back or sideways)
                dx = abs(sh_c[0] - hip_c[0])
                dy = abs(sh_c[1] - hip_c[1]) + 1e-8
                lean_deg = float(np.degrees(np.arctan2(dx, dy)))

                # Shoulder Imbalance (Leaning to one side)
                shoulder_tilt = abs(l_sh[1] - r_sh[1])

                # Head Forward Position relative to shoulders
                head_forward = abs(nose[0] - sh_c[0])

                # Screen Proximity Check (Eye distance in pixels)
                eye_dist = abs(l_eye[0] - r_eye[0]) if (l_eye[2] > 0.2 and r_eye[2] > 0.2) else 0

                if lean_deg > MAX_TORSO_LEAN_DEGREES:
                    issues.append("झुककर बैठना (Slouching)")
                    score -= 30

                if shoulder_tilt > MAX_SHOULDER_TILT:
                    issues.append("कंधे असमान हैं (Shoulder Tilt)")
                    score -= 20

                if head_forward > MAX_HEAD_FORWARD_PX:
                    issues.append("गर्दन आगे की ओर झुकी (Forward Neck / Text Neck)")
                    score -= 25

                if eye_dist > 120:
                    issues.append("स्क्रीन के बहुत पास (Too Close to Screen)")
                    score -= 15

                score = max(10, score)

                if not issues:
                    self.good_frames += 1
                    self.consecutive_bad_frames = 0
                    feedback = "उत्कृष्ट स्टडी पोज़! पीठ और गर्दन का संतुलन बहुत अच्छा है।"
                else:
                    self.bad_frames += 1
                    self.consecutive_bad_frames += 1
                    
                    # Construct clear human-friendly feedback phrase
                    clean_issues = []
                    if "झुककर बैठना (Slouching)" in issues:
                        clean_issues.append("पीठ सीधी रखें")
                    if "गर्दन आगे की ओर झुकी (Forward Neck / Text Neck)" in issues:
                        clean_issues.append("गर्दन पीछे लाएं")
                    if "कंधे असमान हैं (Shoulder Tilt)" in issues:
                        clean_issues.append("कंधे सीधे रखें")
                    if "स्क्रीन के बहुत पास (Too Close to Screen)" in issues:
                        clean_issues.append("स्क्रीन से दूरी बनाएं")
                        
                    feedback = "कृपया ध्यान दें: " + ", ".join(clean_issues if clean_issues else issues)

                    # Trigger alert if poor posture persists for > 15 consecutive frames
                    if self.consecutive_bad_frames > 15:
                        alert_triggered = True

            else:
                feedback = "कृपया कैमरे के सामने सीधे स्टडी पोज़िशन में बैठें।"

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
