import cv2
import numpy as np
from collections import deque, Counter
from ultralytics import YOLO
try:
    from analyzers.device_utils import load_yolo_model
except ImportError:
    from device_utils import load_yolo_model

# Keypoint indexes
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_CONFIDENCE_THRESHOLD = 0.20
UP_ANGLE_THRESHOLD = 145.0          # Relaxed from 155.0 to avoid joint lockout requirement
DOWN_ANGLE_THRESHOLD = 125.0        # Relaxed from 110.0 to detect descent naturally
GOOD_DEPTH_ELBOW_ANGLE = 115.0      # Relaxed from 95.0 to reflect realistic human push-ups
BODY_STRAIGHT_THRESHOLD = 140.0     # Relaxed from 160.0 for 2D camera perspective & spine curvature
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


class PushupAnalyzer:
    """
    Human-Tolerant Push-up Analyzer.
    Features smoothed joint tracking, scale-aware body alignment, progressive depth assessment,
    and debounced error detection to prevent single-frame noise from failing reps.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        self.model, self.device = load_yolo_model(model_path)

        self.elbow_angle_history = deque(maxlen=SMOOTHING_WINDOW)
        self.body_angle_history = deque(maxlen=SMOOTHING_WINDOW)

        self.pushup_stage = "up"
        self.total_repetitions = 0
        self.correct_repetitions = 0
        self.incorrect_repetitions = 0
        self.rep_frames = 0
        self.error_counts = Counter()
        self.min_elbow_this_rep = 180.0
        self.last_rep_feedback = "प्लैंक पोज़िशन में आकर पुश-अप शुरू करें"
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, device=self.device, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        avg_elbow = None
        avg_body = None
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            l_sh, r_sh = person[LEFT_SHOULDER], person[RIGHT_SHOULDER]
            l_el, r_el = person[LEFT_ELBOW], person[RIGHT_ELBOW]
            l_wr, r_wr = person[LEFT_WRIST], person[RIGHT_WRIST]
            l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
            l_knee, r_knee = person[LEFT_KNEE], person[RIGHT_KNEE]
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]

            # Primary joints for pushup side detection: Shoulder, Elbow, Hip
            left_core_conf = (l_sh[2] + l_el[2] + l_hip[2]) / 3.0
            right_core_conf = (r_sh[2] + r_el[2] + r_hip[2]) / 3.0

            reliable_left = (left_core_conf > KEYPOINT_CONFIDENCE_THRESHOLD and
                             l_sh[2] > 0.15 and l_el[2] > 0.15 and l_hip[2] > 0.15)
            reliable_right = (right_core_conf > KEYPOINT_CONFIDENCE_THRESHOLD and
                              r_sh[2] > 0.15 and r_el[2] > 0.15 and r_hip[2] > 0.15)

            if reliable_left or reliable_right:
                elbow_angles = []
                body_angles = []
                frame_errors = set()

                if reliable_left:
                    wrist_pt = l_wr[:2] if l_wr[2] > 0.15 else l_el[:2] + np.array([0, 50])
                    elbow_angles.append(calculate_angle(l_sh[:2], l_el[:2], wrist_pt))

                    # For lower body, use ankle if visible, otherwise use knee
                    lower_pt = l_ank[:2] if l_ank[2] > 0.15 else (l_knee[:2] if l_knee[2] > 0.15 else l_hip[:2] + np.array([0, 80]))
                    body_angles.append(calculate_angle(l_sh[:2], l_hip[:2], lower_pt))

                if reliable_right:
                    wrist_pt = r_wr[:2] if r_wr[2] > 0.15 else r_el[:2] + np.array([0, 50])
                    elbow_angles.append(calculate_angle(r_sh[:2], r_el[:2], wrist_pt))

                    lower_pt = r_ank[:2] if r_ank[2] > 0.15 else (r_knee[:2] if r_knee[2] > 0.15 else r_hip[:2] + np.array([0, 80]))
                    body_angles.append(calculate_angle(r_sh[:2], r_hip[:2], lower_pt))

                if elbow_angles:
                    self.elbow_angle_history.append(float(np.mean(elbow_angles)))
                if body_angles:
                    self.body_angle_history.append(float(np.mean(body_angles)))

                avg_elbow = float(np.mean(self.elbow_angle_history)) if self.elbow_angle_history else 160.0
                avg_body = float(np.mean(self.body_angle_history)) if self.body_angle_history else 160.0

                if avg_body < BODY_STRAIGHT_THRESHOLD:
                    # Select active side keypoints
                    sh = l_sh if left_core_conf >= right_core_conf else r_sh
                    hip = l_hip if left_core_conf >= right_core_conf else r_hip
                    ank = l_ank if left_core_conf >= right_core_conf else r_ank
                    if ank[2] < 0.15:
                        ank = l_knee if left_core_conf >= right_core_conf else r_knee

                    expected_hip_y = (sh[1] + ank[1]) / 2.0
                    # Allow 15% vertical leeway relative to torso height before erroring
                    torso_h = abs(sh[1] - hip[1]) + 1e-5
                    if hip[1] > expected_hip_y + torso_h * 0.20:
                        frame_errors.add("hips_sagging")
                    elif hip[1] < expected_hip_y - torso_h * 0.20:
                        frame_errors.add("hips_piked")

                feedback = self._run_state_machine(avg_elbow, avg_body, frame_errors)
            else:
                feedback = "कैमरे के सामने साइड एंगल से दिखें ताकि हाथ और पीठ स्पष्ट हों"

        accuracy = round(100 * self.correct_repetitions / self.total_repetitions, 1) if self.total_repetitions else 0.0

        return output_bgr, {
            "stage": self.pushup_stage,
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "accuracy": accuracy,
            "elbow_angle": None if avg_elbow is None else round(float(avg_elbow), 1),
            "body_angle": None if avg_body is None else round(float(avg_body), 1),
            "feedback": feedback,
        }

    def _run_state_machine(self, elbow_angle, body_angle, frame_errors):
        if self.pushup_stage == "up":
            # Start descent when elbow bends past threshold
            if elbow_angle < DOWN_ANGLE_THRESHOLD:
                self.pushup_stage = "down"
                self.rep_frames = 1
                self.error_counts = Counter()
                self.min_elbow_this_rep = elbow_angle
                for err in frame_errors:
                    self.error_counts[err] += 1

            if "hips_sagging" in frame_errors:
                return "कोर को टाइट रखें (कूल्हे सीधे रखें)"
            if "hips_piked" in frame_errors:
                return "कूल्हे ज्यादा ऊपर न उठाएं"
            return self.last_rep_feedback if self.total_repetitions else "छाती नीचे लाकर पुश-अप शुरू करें"

        # In "down" or pushing up stage
        self.rep_frames += 1
        self.min_elbow_this_rep = min(self.min_elbow_this_rep, elbow_angle)
        for err in frame_errors:
            self.error_counts[err] += 1

        # Completed repetition when elbows extend back up
        if elbow_angle > UP_ANGLE_THRESHOLD:
            self.total_repetitions += 1

            rep_errors = set()
            # Only persistent errors (present in >= 35% of rep frames and at least 3 frames) count
            error_threshold_frames = max(3, int(self.rep_frames * 0.35))
            for err, count in self.error_counts.items():
                if count >= error_threshold_frames:
                    rep_errors.add(err)

            # Check depth with realistic human tolerance:
            # Under 115 degrees is valid, under 100 degrees is excellent
            if self.min_elbow_this_rep > GOOD_DEPTH_ELBOW_ANGLE:
                rep_errors.add("shallow_pushup")

            is_correct = len(rep_errors) == 0
            if is_correct:
                self.correct_repetitions += 1
                if self.min_elbow_this_rep <= 95.0:
                    self.last_rep_feedback = "शानदार! बेहतरीन गहराई के साथ पूरा पुश-अप!"
                else:
                    self.last_rep_feedback = "बहुत बढ़िया पुश-अप! अच्छा फॉर्म।"
            else:
                self.incorrect_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: " + self._error_msg(rep_errors)

            self.rep_log.append({
                "rep_number": self.total_repetitions,
                "correct": is_correct,
                "errors": list(rep_errors),
                "min_angle": round(float(self.min_elbow_this_rep), 1),
            })

            self.pushup_stage = "up"
            self.rep_frames = 0
            self.error_counts = Counter()
            self.min_elbow_this_rep = 180.0
            return self.last_rep_feedback

        if "hips_sagging" in frame_errors:
            return "कोर टाइट रखें - शरीर सीधा रखें"
        if "hips_piked" in frame_errors:
            return "रीढ़ को समतल रखें"
        if self.min_elbow_this_rep <= GOOD_DEPTH_ELBOW_ANGLE:
            return "बहुत अच्छी गहराई! अब ऊपर उठें!"
        return "छाती को थोड़ा और नीचे लाएं"

    @staticmethod
    def _error_msg(errors):
        if "hips_sagging" in errors:
            return "कूल्हे नीचे झुक रहे थे, कोर टाइट रखें"
        if "hips_piked" in errors:
            return "कूल्हे ज्यादा ऊपर थे, शरीर सीधा रखें"
        if "shallow_pushup" in errors:
            return "छाती थोड़ी और नीचे लाएं (गहराई बढ़ाएं)"
        return "अच्छा प्रयास, निरंतरता बनाए रखें"

    def session_summary(self):
        accuracy = round(100 * self.correct_repetitions / self.total_repetitions, 1) if self.total_repetitions else 0.0
        return {
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "accuracy": accuracy,
            "rep_log": self.rep_log,
        }
