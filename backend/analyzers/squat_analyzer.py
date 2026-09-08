import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO
try:
    from analyzers.device_utils import load_yolo_model
except ImportError:
    from device_utils import load_yolo_model

# COCO Keypoints
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_CONFIDENCE_THRESHOLD = 0.25
STANDING_ANGLE_THRESHOLD = 160.0
SQUAT_DEPTH_ANGLE_THRESHOLD = 140.0
GOOD_DEPTH_ANGLE_THRESHOLD = 110.0
KNEE_ALIGNMENT_THRESHOLD = 0.08
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


def calculate_inward_deviation(hip, knee, ankle, hip_center):
    expected_knee_x = (hip[0] + ankle[0]) / 2.0
    inward_direction = np.sign(hip_center[0] - ankle[0])
    deviation = (knee[0] - expected_knee_x) * inward_direction
    leg_length = np.linalg.norm(np.array(hip[:2]) - np.array(ankle[:2]))
    return float(deviation / (leg_length + 1e-8))


class SquatAnalyzer:
    """
    Squat Posture & Repetition Analyzer.
    Detects knee valgus (inward knee collapse), squat depth, and tracks squat reps.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        self.model, self.device = load_yolo_model(model_path)

        self.angle_history = deque(maxlen=SMOOTHING_WINDOW)
        self.left_alignment_history = deque(maxlen=SMOOTHING_WINDOW)
        self.right_alignment_history = deque(maxlen=SMOOTHING_WINDOW)

        self.squat_stage = "standing"
        self.total_repetitions = 0
        self.correct_repetitions = 0
        self.incorrect_repetitions = 0
        self.current_rep_errors = set()
        self.min_angle_this_rep = 180.0
        self.last_rep_feedback = "स्क्वाट शुरू करने के लिए सीधे खड़े हों"
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, device=self.device, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        knee_angle = None
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()
            self.last_keypoints = person

            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_knee, r_knee = person[LEFT_KNEE], person[RIGHT_KNEE]
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]

            left_conf = min(l_hip[2], l_knee[2], l_ank[2])
            right_conf = min(r_hip[2], r_knee[2], r_ank[2])

            reliable_left = left_conf > KEYPOINT_CONFIDENCE_THRESHOLD
            reliable_right = right_conf > KEYPOINT_CONFIDENCE_THRESHOLD

            if reliable_left or reliable_right:
                angles = []
                if reliable_left:
                    angles.append(calculate_angle(l_hip[:2], l_knee[:2], l_ank[:2]))
                if reliable_right:
                    angles.append(calculate_angle(r_hip[:2], r_knee[:2], r_ank[:2]))

                current_angle = float(np.mean(angles))
                self.angle_history.append(current_angle)
                knee_angle = float(np.mean(self.angle_history))

                hip_center = (l_hip[:2] + r_hip[:2]) / 2.0
                frame_errors = set()

                if reliable_left and reliable_right:
                    left_dev = calculate_inward_deviation(l_hip[:2], l_knee[:2], l_ank[:2], hip_center)
                    right_dev = calculate_inward_deviation(r_hip[:2], r_knee[:2], r_ank[:2], hip_center)
                    self.left_alignment_history.append(left_dev)
                    self.right_alignment_history.append(right_dev)

                    left_in = np.mean(self.left_alignment_history) > KNEE_ALIGNMENT_THRESHOLD
                    right_in = np.mean(self.right_alignment_history) > KNEE_ALIGNMENT_THRESHOLD

                    if left_in and right_in:
                        frame_errors.add("both_knees_inward")
                    elif left_in:
                        frame_errors.add("left_knee_inward")
                    elif right_in:
                        frame_errors.add("right_knee_inward")

                feedback = self._run_state_machine(knee_angle, frame_errors)
            else:
                feedback = "पीछे हटें ताकि पैर दिखाई दें"

        return output_bgr, {
            "stage": self.squat_stage,
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "knee_angle": None if knee_angle is None else round(float(knee_angle), 1),
            "feedback": feedback,
        }

    def _run_state_machine(self, angle, frame_errors):
        if self.squat_stage == "standing":
            if angle < SQUAT_DEPTH_ANGLE_THRESHOLD:
                self.squat_stage = "squatting"
                self.current_rep_errors = set()
                self.min_angle_this_rep = angle
            return self.last_rep_feedback if self.total_repetitions else "नीचे बैठें"

        # squatting
        self.min_angle_this_rep = min(self.min_angle_this_rep, angle)
        self.current_rep_errors.update(frame_errors)

        if angle > STANDING_ANGLE_THRESHOLD:
            self.total_repetitions += 1
            if self.min_angle_this_rep > GOOD_DEPTH_ANGLE_THRESHOLD:
                self.current_rep_errors.add("shallow_squat")

            is_correct = len(self.current_rep_errors) == 0
            if is_correct:
                self.correct_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: बहुत अच्छा स्क्वाट!"
            else:
                self.incorrect_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: " + self._error_msg(self.current_rep_errors)

            self.rep_log.append({
                "rep_number": self.total_repetitions,
                "correct": is_correct,
                "errors": list(self.current_rep_errors),
                "min_angle": round(float(self.min_angle_this_rep), 1),
            })

            self.squat_stage = "standing"
            self.current_rep_errors = set()
            self.min_angle_this_rep = 180.0
            return self.last_rep_feedback

        if "both_knees_inward" in frame_errors:
            return "दोनों घुटने बाहर की तरफ रखें"
        if "left_knee_inward" in frame_errors:
            return "बायां घुटना बाहर की तरफ धकेलें"
        if "right_knee_inward" in frame_errors:
            return "दायां घुटना बाहर की तरफ धकेलें"
        return "अच्छी गहराई - एड़ियों से ऊपर उठें!"

    @staticmethod
    def _error_msg(errors):
        if "both_knees_inward" in errors:
            return "दोनों घुटने सीध में रखें"
        if "left_knee_inward" in errors:
            return "बायां घुटना बाहर ले जाएं"
        if "right_knee_inward" in errors:
            return "दायां घुटना बाहर ले जाएं"
        if "shallow_squat" in errors:
            return "थोड़ा और गहरा बैठें"
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