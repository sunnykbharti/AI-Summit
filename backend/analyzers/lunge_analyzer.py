import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO

LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6

KEYPOINT_CONFIDENCE_THRESHOLD = 0.25
STANDING_KNEE_THRESHOLD = 155.0
LUNGE_DEPTH_THRESHOLD = 120.0
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


class LungeAnalyzer:
    """
    Lunge Analyzer class.
    Detects front knee angle depth, back knee drop, torso uprightness, and counts repetitions.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.stage = "standing"
        self.total_repetitions = 0
        self.correct_repetitions = 0
        self.incorrect_repetitions = 0
        self.current_rep_errors = set()
        self.min_knee_this_rep = 180.0
        self.last_rep_feedback = "आगे कदम रखकर लंज करें"
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot()
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        min_knee = None
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_knee, r_knee = person[LEFT_KNEE], person[RIGHT_KNEE]
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]
            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]

            left_side_conf = min(l_hip[2], l_knee[2], l_ank[2], l_sh[2])
            right_side_conf = min(r_hip[2], r_knee[2], r_ank[2], r_sh[2])

            reliable_left = left_side_conf > KEYPOINT_CONFIDENCE_THRESHOLD
            reliable_right = right_side_conf > KEYPOINT_CONFIDENCE_THRESHOLD

            if reliable_left or reliable_right:
                knee_angles = []
                if reliable_left:
                    knee_angles.append(calculate_angle(l_hip[:2], l_knee[:2], l_ank[:2]))
                if reliable_right:
                    knee_angles.append(calculate_angle(r_hip[:2], r_knee[:2], r_ank[:2]))

                min_knee = float(np.min(knee_angles))

                frame_errors = set()
                sh = l_sh if left_side_conf >= right_side_conf else r_sh
                hp = l_hip if left_side_conf >= right_side_conf else r_hip

                torso_lean = abs(sh[0] - hp[0])
                if torso_lean > 70:
                    frame_errors.add("leaning_forward")

                feedback = self._run_state_machine(min_knee, frame_errors)
            else:
                feedback = "साइड व्यू में पूरा शरीर दिखाएं"

        return output_bgr, {
            "stage": self.stage,
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "knee_angle": None if min_knee is None else round(float(min_knee), 1),
            "feedback": feedback,
        }

    def _run_state_machine(self, min_knee_angle, frame_errors):
        if self.stage == "standing":
            if min_knee_angle < LUNGE_DEPTH_THRESHOLD:
                self.stage = "lunging"
                self.current_rep_errors = set()
                self.min_knee_this_rep = min_knee_angle

            if "leaning_forward" in frame_errors:
                return "छाती सीधी रखें"
            return self.last_rep_feedback if self.total_repetitions else "लंज करें"

        # lunging
        self.min_knee_this_rep = min(self.min_knee_this_rep, min_knee_angle)
        self.current_rep_errors.update(frame_errors)

        if min_knee_angle > STANDING_KNEE_THRESHOLD:
            self.total_repetitions += 1
            if self.min_knee_this_rep > 105:
                self.current_rep_errors.add("shallow_lunge")

            is_correct = len(self.current_rep_errors) == 0
            if is_correct:
                self.correct_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: बहुत अच्छा लंज!"
            else:
                self.incorrect_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: " + self._error_msg(self.current_rep_errors)

            self.rep_log.append({
                "rep_number": self.total_repetitions,
                "correct": is_correct,
                "errors": list(self.current_rep_errors),
                "min_angle": round(float(self.min_knee_this_rep), 1),
            })

            self.stage = "standing"
            self.current_rep_errors = set()
            self.min_knee_this_rep = 180.0
            return self.last_rep_feedback

        if "leaning_forward" in frame_errors:
            return "ऊपरी शरीर सीधा रखें"
        return "अच्छी गहराई - वापस ऊपर उठें!"

    @staticmethod
    def _error_msg(errors):
        if "leaning_forward" in errors:
            return "धड़ सीधा रखें"
        if "shallow_lunge" in errors:
            return "पिछला घुटना ज़मीन के नज़दीक लाएं"
        return "अच्छा रेप"

    def session_summary(self):
        accuracy = round(100 * self.correct_repetitions / self.total_repetitions, 1) if self.total_repetitions else 0
        return {
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "accuracy": accuracy,
            "rep_log": self.rep_log,
        }
