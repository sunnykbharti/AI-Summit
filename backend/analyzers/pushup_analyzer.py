import cv2
import numpy as np
from collections import deque
from ultralytics import YOLO

# Keypoint indexes
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_CONFIDENCE_THRESHOLD = 0.25
UP_ANGLE_THRESHOLD = 155.0
DOWN_ANGLE_THRESHOLD = 110.0
GOOD_DEPTH_ELBOW_ANGLE = 95.0
BODY_STRAIGHT_THRESHOLD = 160.0
SMOOTHING_WINDOW = 5


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


class PushupAnalyzer:
    """
    Push-up Analyzer class.
    Processes frames in real time and detects posture issues (hip sagging/hiking, shallow depth)
    and tracks repetition counts. Supports side-view analysis.
    """

    def __init__(self, model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.elbow_angle_history = deque(maxlen=SMOOTHING_WINDOW)
        self.body_angle_history = deque(maxlen=SMOOTHING_WINDOW)

        self.pushup_stage = "up"
        self.total_repetitions = 0
        self.correct_repetitions = 0
        self.incorrect_repetitions = 0
        self.current_rep_errors = set()
        self.min_elbow_this_rep = 180.0
        self.last_rep_feedback = "प्लैंक पोज़िशन में आएं"
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot()
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
            l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]

            left_side_conf = min(l_sh[2], l_el[2], l_wr[2], l_hip[2], l_ank[2])
            right_side_conf = min(r_sh[2], r_el[2], r_wr[2], r_hip[2], r_ank[2])

            reliable_left = left_side_conf > KEYPOINT_CONFIDENCE_THRESHOLD
            reliable_right = right_side_conf > KEYPOINT_CONFIDENCE_THRESHOLD

            if reliable_left or reliable_right:
                elbow_angles = []
                body_angles = []
                frame_errors = set()

                if reliable_left:
                    el_ang = calculate_angle(l_sh[:2], l_el[:2], l_wr[:2])
                    bd_ang = calculate_angle(l_sh[:2], l_hip[:2], l_ank[:2])
                    elbow_angles.append(el_ang)
                    body_angles.append(bd_ang)

                if reliable_right:
                    el_ang = calculate_angle(r_sh[:2], r_el[:2], r_wr[:2])
                    bd_ang = calculate_angle(r_sh[:2], r_hip[:2], r_ank[:2])
                    elbow_angles.append(el_ang)
                    body_angles.append(bd_ang)

                self.elbow_angle_history.append(np.mean(elbow_angles))
                self.body_angle_history.append(np.mean(body_angles))

                avg_elbow = float(np.mean(self.elbow_angle_history))
                avg_body = float(np.mean(self.body_angle_history))

                if avg_body < BODY_STRAIGHT_THRESHOLD:
                    # Select active side keypoints
                    sh, hip, ank = (l_sh, l_hip, l_ank) if left_side_conf >= right_side_conf else (r_sh, r_hip, r_ank)
                    expected_hip_y = (sh[1] + ank[1]) / 2.0
                    if hip[1] > expected_hip_y:
                        frame_errors.add("hips_sagging")
                    else:
                        frame_errors.add("hips_piked")

                feedback = self._run_state_machine(avg_elbow, avg_body, frame_errors)
            else:
                feedback = "साइड व्यू में पूरा शरीर दिखाएं"

        return output_bgr, {
            "stage": self.pushup_stage,
            "total_reps": self.total_repetitions,
            "correct_reps": self.correct_repetitions,
            "incorrect_reps": self.incorrect_repetitions,
            "elbow_angle": None if avg_elbow is None else round(float(avg_elbow), 1),
            "body_angle": None if avg_body is None else round(float(avg_body), 1),
            "feedback": feedback,
        }

    def _run_state_machine(self, elbow_angle, body_angle, frame_errors):
        if self.pushup_stage == "up":
            if elbow_angle < DOWN_ANGLE_THRESHOLD:
                self.pushup_stage = "down"
                self.current_rep_errors = set()
                self.min_elbow_this_rep = elbow_angle

            if "hips_sagging" in frame_errors:
                return "कूल्हे ऊपर रखें - झुकने न दें"
            if "hips_piked" in frame_errors:
                return "कूल्हे नीचे लाएं - शरीर सीधा रखें"
            return self.last_rep_feedback if self.total_repetitions else "छाती नीचे लाकर पुश-अप करें"

        # down / moving up
        self.min_elbow_this_rep = min(self.min_elbow_this_rep, elbow_angle)
        self.current_rep_errors.update(frame_errors)

        if elbow_angle > UP_ANGLE_THRESHOLD:
            self.total_repetitions += 1
            if self.min_elbow_this_rep > GOOD_DEPTH_ELBOW_ANGLE:
                self.current_rep_errors.add("shallow_pushup")

            is_correct = len(self.current_rep_errors) == 0
            if is_correct:
                self.correct_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: बहुत अच्छा पुश-अप!"
            else:
                self.incorrect_repetitions += 1
                self.last_rep_feedback = "पिछला रेप: " + self._error_msg(self.current_rep_errors)

            self.rep_log.append({
                "rep_number": self.total_repetitions,
                "correct": is_correct,
                "errors": list(self.current_rep_errors),
                "min_angle": round(float(self.min_elbow_this_rep), 1),
            })

            self.pushup_stage = "up"
            self.current_rep_errors = set()
            self.min_elbow_this_rep = 180.0
            return self.last_rep_feedback

        if "hips_sagging" in frame_errors:
            return "कोर टाइट रखें - कूल्हे झुक रहे हैं"
        if "hips_piked" in frame_errors:
            return "रीढ़ सीधी रखें"
        return "अच्छी गहराई - ऊपर उठें!"

    @staticmethod
    def _error_msg(errors):
        if "hips_sagging" in errors:
            return "कूल्हे पीठ के साथ सीध में रखें"
        if "hips_piked" in errors:
            return "कूल्हे ऊपर न उठाएं"
        if "shallow_pushup" in errors:
            return "पुश-अप में और नीचे जाएं"
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
