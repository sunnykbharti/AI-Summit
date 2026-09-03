import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO

LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_CONFIDENCE_THRESHOLD = 0.25
PRAYER_POSE = "Pranamasana (Prayer)"
FORWARD_FOLD_POSE = "Hastapadasana (Forward Fold)"
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


def midpoint(a, b):
    return (np.array(a[:2]) + np.array(b[:2])) / 2.0


class SuryaAnalyzer:
    """
    Surya Namaskar Posture & Sequence Analyzer.
    Evaluates transitions between Pranamasana (Prayer Pose) and Hastapadasana (Forward Fold).
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.current_pose = PRAYER_POSE
        self.completed_transitions = 0
        self.correct_transitions = 0
        self.incorrect_transitions = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot()
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]
            l_wr, r_wr = person[LEFT_WRIST], person[RIGHT_WRIST]
            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]

            confs = [l_sh[2], r_sh[2], l_wr[2], r_wr[2], l_hip[2], r_hip[2], l_ank[2], r_ank[2]]
            reliable = sum(c > KEYPOINT_CONFIDENCE_THRESHOLD for c in confs) >= 4

            if reliable:
                wrists_center = midpoint(l_wr, r_wr)
                shoulders_center = midpoint(l_sh, r_sh)
                hips_center = midpoint(l_hip, r_hip)
                ankles_center = midpoint(l_ank, r_ank)

                hands_near_chest = (
                    abs(wrists_center[0] - shoulders_center[0]) < 80 and
                    shoulders_center[1] <= wrists_center[1] <= hips_center[1] + 30
                )

                spine_angle = calculate_angle(shoulders_center, hips_center, ankles_center)
                hands_near_feet = (
                    abs(wrists_center[1] - ankles_center[1]) < 120 or
                    spine_angle < 130
                )

                if self.current_pose == PRAYER_POSE:
                    if hands_near_feet:
                        self.current_pose = FORWARD_FOLD_POSE
                        self.completed_transitions += 1
                        self.correct_transitions += 1
                        self.rep_log.append({
                            "rep_number": self.completed_transitions,
                            "correct": True,
                            "errors": [],
                            "min_angle": round(float(spine_angle), 1),
                        })
                        feedback = "GOOD: हस्तपादासन में आ गए"
                    elif hands_near_chest:
                        feedback = "GOOD: प्रणामासन की मुद्रा सही है"
                    else:
                        feedback = "प्रणामासन के लिए हाथ छाती के बीच लाएं"
                else: # FORWARD_FOLD_POSE
                    if hands_near_chest and spine_angle > 145:
                        self.current_pose = PRAYER_POSE
                        self.completed_transitions += 1
                        self.correct_transitions += 1
                        self.rep_log.append({
                            "rep_number": self.completed_transitions,
                            "correct": True,
                            "errors": [],
                            "min_angle": round(float(spine_angle), 1),
                        })
                        feedback = "GOOD: प्रणामासन में वापस आ गए"
                    elif hands_near_feet:
                        feedback = "GOOD: हस्तपादासन गहरा आगे झुकाव"
                    else:
                        feedback = "पैर सीधे रखकर आगे झुकें"
            else:
                feedback = "पूरा शरीर कैमरे में दिखाएं"

        return output_bgr, {
            "stage": self.current_pose,
            "total_reps": self.completed_transitions,
            "correct_reps": self.correct_transitions,
            "incorrect_reps": self.incorrect_transitions,
            "feedback": feedback,
        }

    def session_summary(self):
        accuracy = round(100 * self.correct_transitions / self.completed_transitions, 1) if self.completed_transitions else 0
        return {
            "total_reps": self.completed_transitions,
            "correct_reps": self.correct_transitions,
            "incorrect_reps": self.incorrect_transitions,
            "accuracy": accuracy,
            "rep_log": self.rep_log,
        }
