import cv2
import numpy as np
from collections import deque, Counter
from ultralytics import YOLO
try:
    from analyzers.device_utils import load_yolo_model
except ImportError:
    from device_utils import load_yolo_model

LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6

KEYPOINT_CONFIDENCE_THRESHOLD = 0.20
STANDING_KNEE_THRESHOLD = 145.0     # Relaxed from 155.0 so full lockout isn't strictly mandated
LUNGE_DESCENT_THRESHOLD = 135.0     # Relaxed from 120.0 to smoothly detect lunge initiation
GOOD_LUNGE_DEPTH_THRESHOLD = 125.0  # Relaxed from 105.0 to accommodate realistic range of motion
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


class LungeAnalyzer:
    """
    Human-Tolerant Lunge Analyzer.
    Detects front and back knee flexion, scale-normalized torso lean (allowing natural hip hinge),
    smooths landmark jitter, and tracks repetitions with debounced error tolerance.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        self.model, self.device = load_yolo_model(model_path)

        self.knee_angle_history = deque(maxlen=SMOOTHING_WINDOW)

        self.stage = "standing"
        self.total_repetitions = 0
        self.correct_repetitions = 0
        self.incorrect_repetitions = 0
        self.rep_frames = 0
        self.error_counts = Counter()
        self.min_knee_this_rep = 180.0
        self.last_rep_feedback = "आगे कदम बढ़ाकर लंज शुरू करें"
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, device=self.device, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        smoothed_knee = None
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_knee, r_knee = person[LEFT_KNEE], person[RIGHT_KNEE]
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]
            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]

            # Core leg points: hip and knee
            left_conf = (l_hip[2] + l_knee[2] + l_sh[2]) / 3.0
            right_conf = (r_hip[2] + r_knee[2] + r_sh[2]) / 3.0

            reliable_left = left_conf > KEYPOINT_CONFIDENCE_THRESHOLD and l_knee[2] > 0.15
            reliable_right = right_conf > KEYPOINT_CONFIDENCE_THRESHOLD and r_knee[2] > 0.15

            if reliable_left or reliable_right:
                knee_angles = []
                if reliable_left:
                    ank_pt = l_ank[:2] if l_ank[2] > 0.15 else l_knee[:2] + np.array([0, 60])
                    knee_angles.append(calculate_angle(l_hip[:2], l_knee[:2], ank_pt))
                if reliable_right:
                    ank_pt = r_ank[:2] if r_ank[2] > 0.15 else r_knee[:2] + np.array([0, 60])
                    knee_angles.append(calculate_angle(r_hip[:2], r_knee[:2], ank_pt))

                if knee_angles:
                    raw_min = float(np.min(knee_angles))
                    self.knee_angle_history.append(raw_min)
                    smoothed_knee = float(np.mean(self.knee_angle_history))

                frame_errors = set()
                sh = l_sh if left_conf >= right_conf else r_sh
                hp = l_hip if left_conf >= right_conf else r_hip

                # Scale-invariant torso lean: relative to torso length
                torso_len = float(np.linalg.norm(sh[:2] - hp[:2])) + 1e-5
                torso_horizontal_shift = abs(sh[0] - hp[0])
                torso_lean_ratio = torso_horizontal_shift / torso_len

                # Allow natural 20°-25° torso hinge; only flag if excessive forward slump (>35°)
                if torso_lean_ratio > 0.58:
                    frame_errors.add("leaning_forward")

                feedback = self._run_state_machine(smoothed_knee, frame_errors)
            else:
                feedback = "कैमरे के सामने खड़े हों ताकि पैर और शरीर स्पष्ट दिखें"

        accuracy = round(100 * self.correct_repetitions / self.total_repetitions, 1) if self.total_repetitions else 0.0

        return output_bgr, {
            "stage": self.stage,
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "accuracy": accuracy,
            "knee_angle": None if smoothed_knee is None else round(float(smoothed_knee), 1),
            "feedback": feedback,
        }

    def _run_state_machine(self, knee_angle, frame_errors):
        if knee_angle is None:
            return "लंज पोज़िशन में आएं"

        if self.stage == "standing":
            if knee_angle < LUNGE_DESCENT_THRESHOLD:
                self.stage = "lunging"
                self.rep_frames = 1
                self.error_counts = Counter()
                self.min_knee_this_rep = knee_angle
                for err in frame_errors:
                    self.error_counts[err] += 1

            if "leaning_forward" in frame_errors:
                return "छाती को सीधा और गर्व से उठाएं"
            return self.last_rep_feedback if self.total_repetitions else "आगे कदम बढ़ाकर लंज करें"

        # lunging stage
        self.rep_frames += 1
        self.min_knee_this_rep = min(self.min_knee_this_rep, knee_angle)
        for err in frame_errors:
            self.error_counts[err] += 1

        if knee_angle > STANDING_KNEE_THRESHOLD:
            self.total_repetitions += 1

            rep_errors = set()
            error_threshold_frames = max(3, int(self.rep_frames * 0.35))
            for err, count in self.error_counts.items():
                if count >= error_threshold_frames:
                    rep_errors.add(err)

            # Check lunge depth: <= 125 degrees is acceptable, <= 100 degrees is deep
            if self.min_knee_this_rep > GOOD_LUNGE_DEPTH_THRESHOLD:
                rep_errors.add("shallow_lunge")

            is_correct = len(rep_errors) == 0
            if is_correct:
                self.correct_repetitions += 1
                if self.min_knee_this_rep <= 105.0:
                    self.last_rep_feedback = "शानदार लंज! एकदम सटीक गहराई और संतुलन!"
                else:
                    self.last_rep_feedback = "बहुत बढ़िया लंज! अच्छा नियंत्रण।"
            else:
                self.incorrect_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: " + self._error_msg(rep_errors)

            self.rep_log.append({
                "rep_number": self.total_repetitions,
                "correct": is_correct,
                "errors": list(rep_errors),
                "min_angle": round(float(self.min_knee_this_rep), 1),
            })

            self.stage = "standing"
            self.rep_frames = 0
            self.error_counts = Counter()
            self.min_knee_this_rep = 180.0
            return self.last_rep_feedback

        if "leaning_forward" in frame_errors:
            return "धड़ को ज्यादा आगे न झुकाएं, रीढ़ सीधी रखें"
        if self.min_knee_this_rep <= GOOD_LUNGE_DEPTH_THRESHOLD:
            return "गहराई अच्छी है! अब वापस ऊपर उठें।"
        return "घुटना थोड़ा और नीचे लाएं"

    @staticmethod
    def _error_msg(errors):
        if "leaning_forward" in errors:
            return "धड़ ज्यादा आगे झुक रहा था, छाती सीधी रखें"
        if "shallow_lunge" in errors:
            return "पिछला घुटना थोड़ा और नीचे झुकाएं"
        return "अच्छा रेप, प्रयास जारी रखें"

    def session_summary(self):
        accuracy = round(100 * self.correct_repetitions / self.total_repetitions, 1) if self.total_repetitions else 0.0
        return {
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "accuracy": accuracy,
            "rep_log": self.rep_log,
        }
