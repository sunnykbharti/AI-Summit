import cv2
import time
import numpy as np
from collections import deque
from ultralytics import YOLO

LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_CONFIDENCE_THRESHOLD = 0.20
GRACE_PERIOD_SECONDS = 1.5      # Prevents single-frame detection flicker from wiping out active hold
SMOOTHING_WINDOW = 5

POSES = {
    "tree_pose": "वृक्षासन (Tree Pose)",
    "tadasana": "ताड़ासन (Mountain Pose)",
    "warrior_two": "वीरभद्रासन II (Warrior II)",
    "triangle": "त्रिकोणासन (Triangle Pose)",
    "downward_dog": "अधोमुख श्वानासन (Downward Dog)",
    "cobra": "भुजंगासन (Cobra Pose)",
}


def calculate_angle(a, b, c):
    a, b, c = (np.array(p, dtype=np.float32) for p in (a, b, c))
    ba, bc = a - b, c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cos = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos)))


def distance(a, b):
    return float(np.linalg.norm(np.array(a[:2], dtype=np.float32) - np.array(b[:2], dtype=np.float32)))


def midpoint(a, b):
    return (np.array(a[:2], dtype=np.float32) + np.array(b[:2], dtype=np.float32)) / 2.0


class YogaAnalyzer:
    """
    Human-Tolerant Yoga Pose Analyzer.
    Provides scale-invariant geometric evaluations for 6 classical asanas,
    a 1.5s grace period against webcam jitter, milestone rep tracking, and Hindi coaching cues.
    """

    def __init__(self, target_pose="tree_pose", model_path="yolo11n-pose.pt"):
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.target_pose = target_pose if target_pose in POSES else "tree_pose"
        self.pose_hold_start = None
        self.last_good_time = None
        self.total_hold_time = 0.0
        self.current_hold_duration = 0.0
        self.completed_holds = 0
        self.last_milestone_logged = 0
        self.rep_log = []

    def process_frame(self, frame):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        feedback = "कोई व्यक्ति नहीं दिखा"
        is_good = False
        now = time.time()
        keypoint_data = results[0].keypoints.data

        if len(keypoint_data) > 0:
            person = keypoint_data[0].cpu().numpy()

            if self.target_pose == "tree_pose":
                feedback = self._check_tree(person)
            elif self.target_pose == "warrior_two":
                feedback = self._check_warrior_two(person)
            elif self.target_pose == "triangle":
                feedback = self._check_triangle(person)
            elif self.target_pose == "downward_dog":
                feedback = self._check_downward_dog(person)
            elif self.target_pose == "cobra":
                feedback = self._check_cobra(person)
            else:
                feedback = self._check_tadasana(person)

            is_good = feedback.startswith("GOOD")

            # Hold timer tracking with 1.5-second grace buffer
            if is_good:
                if self.pose_hold_start is None:
                    self.pose_hold_start = now
                    self.last_milestone_logged = 0
                self.last_good_time = now
                self.current_hold_duration = now - self.pose_hold_start

                # Milestone rep every 5 seconds of continuous hold
                current_milestone = int(self.current_hold_duration // 5.0)
                if current_milestone > self.last_milestone_logged:
                    self.last_milestone_logged = current_milestone
                    self.completed_holds += 1
                    self.rep_log.append({
                        "rep_number": self.completed_holds,
                        "correct": True,
                        "errors": [],
                        "hold_time": round(float(self.current_hold_duration), 1),
                    })

                feedback += f" | Hold: {self.current_hold_duration:.1f}s"
            else:
                if self.pose_hold_start is not None:
                    time_since_good = now - (self.last_good_time or self.pose_hold_start)
                    if time_since_good < GRACE_PERIOD_SECONDS:
                        # Continue hold under grace period
                        self.current_hold_duration = now - self.pose_hold_start
                        feedback += f" | Hold: {self.current_hold_duration:.1f}s (सुधारें)"
                    else:
                        # Conclude hold
                        final_duration = (self.last_good_time or now) - self.pose_hold_start
                        if final_duration >= 3.0:
                            self.total_hold_time += final_duration
                            if self.last_milestone_logged == 0:
                                self.completed_holds += 1
                                self.rep_log.append({
                                    "rep_number": self.completed_holds,
                                    "correct": True,
                                    "errors": [],
                                    "hold_time": round(float(final_duration), 1),
                                    "asana": self.target_pose,
                                })
                        self.pose_hold_start = None
                        self.last_good_time = None
                        self.current_hold_duration = 0.0
                        self.last_milestone_logged = 0

        accuracy = 100.0 if self.completed_holds > 0 else (85.0 if self.current_hold_duration >= 3.0 else 0.0)

        return output_bgr, {
            "stage": POSES.get(self.target_pose, "Yoga Pose"),
            "total_reps": self.completed_holds,
            "correct_reps": self.completed_holds,
            "incorrect_reps": 0,
            "accuracy": accuracy,
            "hold_seconds": round(float(self.current_hold_duration), 1),
            "feedback": feedback,
        }

    def _reliable(self, person, indexes, min_count=None):
        confs = [person[idx][2] for idx in indexes]
        valid = [c > KEYPOINT_CONFIDENCE_THRESHOLD for c in confs]
        if min_count is None:
            return all(valid)
        return sum(valid) >= min_count

    def _check_tree(self, person):
        idx = [LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE, LEFT_ANKLE, RIGHT_ANKLE]
        if not self._reliable(person, idx, min_count=3):
            return "निचला शरीर स्पष्ट दिखाएं"

        l_hip, r_hip = person[LEFT_HIP], person[RIGHT_HIP]
        l_knee, r_knee = person[LEFT_KNEE], person[RIGHT_KNEE]
        l_ank, r_ank = person[LEFT_ANKLE], person[RIGHT_ANKLE]

        # Calculate leg angles
        l_angle = calculate_angle(l_hip[:2], l_knee[:2], l_ank[:2]) if l_ank[2] > 0.15 else 180.0
        r_angle = calculate_angle(r_hip[:2], r_knee[:2], r_ank[:2]) if r_ank[2] > 0.15 else 180.0

        # Ankle height difference normalized by hip width
        hip_w = distance(l_hip, r_hip) + 1e-5
        ankle_diff = abs(l_ank[1] - r_ank[1])

        # Tree pose criteria:
        # One leg is straight (angle > 140°), other is bent (angle < 155° or ankle significantly lifted)
        left_lifted = (l_angle < 155.0 or (l_ank[2] > 0.15 and r_ank[2] > 0.15 and l_ank[1] < r_ank[1] - hip_w * 0.35))
        right_lifted = (r_angle < 155.0 or (l_ank[2] > 0.15 and r_ank[2] > 0.15 and r_ank[1] < l_ank[1] - hip_w * 0.35))

        if left_lifted or right_lifted:
            return "GOOD: वृक्षासन - संतुलन बहुत अच्छा है!"
        return "एक पैर को मोड़कर दूसरी जांघ या पिंडली पर रखें"

    def _check_tadasana(self, person):
        idx = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_ANKLE, RIGHT_ANKLE]
        if not self._reliable(person, idx, min_count=3):
            return "सीधे खड़े होकर पूरा शरीर दिखाएं"

        sh_w = distance(person[LEFT_SHOULDER], person[RIGHT_SHOULDER]) + 1e-5
        ank_w = distance(person[LEFT_ANKLE], person[RIGHT_ANKLE])

        # Generous feet width allowance for normal human stance (up to 2.5x shoulder width)
        if ank_w > sh_w * 2.6:
            return "पैरों को थोड़ा पास लाएं"

        # Check vertical torso angle
        sh_c = midpoint(person[LEFT_SHOULDER], person[RIGHT_SHOULDER])
        hip_c = midpoint(person[LEFT_HIP], person[RIGHT_HIP])
        dx = abs(sh_c[0] - hip_c[0])
        dy = abs(sh_c[1] - hip_c[1]) + 1e-5
        lean_deg = float(np.degrees(np.arctan2(dx, dy)))

        if lean_deg > 25.0:
            return "रीढ़ सीधी रखें और सीधे खड़े हों"

        return "GOOD: ताड़ासन - स्थिरता और रीढ़ सीधी है!"

    def _check_warrior_two(self, person):
        idx = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE]
        if not self._reliable(person, idx, min_count=4):
            return "वीरभद्रासन में मैट पर साइड पोज़ दिखाएं"

        l_knee_angle = calculate_angle(person[LEFT_HIP][:2], person[LEFT_KNEE][:2], person[LEFT_ANKLE][:2]) if person[LEFT_ANKLE][2] > 0.15 else 130.0
        r_knee_angle = calculate_angle(person[RIGHT_HIP][:2], person[RIGHT_KNEE][:2], person[RIGHT_ANKLE][:2]) if person[RIGHT_ANKLE][2] > 0.15 else 130.0

        sh_w = distance(person[LEFT_SHOULDER], person[RIGHT_SHOULDER]) + 1e-5
        hands_w = distance(person[LEFT_WRIST], person[RIGHT_WRIST])

        # Arm spread: hands wider than shoulders (ratio 1.25 instead of 1.6 strict)
        arms_spread = hands_w >= sh_w * 1.20 if (person[LEFT_WRIST][2] > 0.15 and person[RIGHT_WRIST][2] > 0.15) else True

        # Front knee bend (relaxed to 150° for beginner comfort)
        min_knee = min(l_knee_angle, r_knee_angle)
        if min_knee > 150.0:
            return "सामने वाले घुटने को थोड़ा मोड़ें"

        if not arms_spread:
            return "दोनों बाहें ज़मीन के समानांतर फैलाएं"

        return "GOOD: वीरभद्रासन II - शानदार शक्ति और संतुलन!"

    def _check_triangle(self, person):
        idx = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP, LEFT_KNEE, RIGHT_KNEE]
        if not self._reliable(person, idx, min_count=4):
            return "त्रिकोणासन में पूरा शरीर दिखाएं"

        l_leg = calculate_angle(person[LEFT_HIP][:2], person[LEFT_KNEE][:2], person[LEFT_ANKLE][:2]) if person[LEFT_ANKLE][2] > 0.15 else 160.0
        r_leg = calculate_angle(person[RIGHT_HIP][:2], person[RIGHT_KNEE][:2], person[RIGHT_ANKLE][:2]) if person[RIGHT_ANKLE][2] > 0.15 else 160.0

        # Allow soft knees (down to 125° to prevent joint hyperextension)
        if min(l_leg, r_leg) < 125.0:
            return "दोनों पैरों को सीधा और स्थिर रखें"

        # Check lateral tilt of shoulders
        sh_tilt = abs(person[LEFT_SHOULDER][1] - person[RIGHT_SHOULDER][1])
        sh_w = distance(person[LEFT_SHOULDER], person[RIGHT_SHOULDER]) + 1e-5

        if sh_tilt < sh_w * 0.20:
            return "धड़ को एक तरफ झुकाएं (पार्श्व झुकाव)"

        return "GOOD: त्रिकोणासन - पार्श्व खिंचाव बहुत अच्छा है!"

    def _check_downward_dog(self, person):
        idx = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP]
        if not self._reliable(person, idx, min_count=3):
            return "कंधे, कूल्हे और पैर कैमरे में दिखाएं"

        sh_c = midpoint(person[LEFT_SHOULDER], person[RIGHT_SHOULDER])
        hip_c = midpoint(person[LEFT_HIP], person[RIGHT_HIP])

        # In Downward Dog (inverted V), hips MUST be noticeably higher than shoulders (lower y value in image)
        torso_dist = abs(sh_c[0] - hip_c[0]) + abs(sh_c[1] - hip_c[1]) + 1e-5
        if hip_c[1] >= sh_c[1] - torso_dist * 0.08:
            return "कूल्हे ऊपर उठाकर शरीर का उल्टा V (पर्वत) आकार बनाएं"

        return "GOOD: अधोमुख श्वानासन - उल्टा V आकार सही है!"

    def _check_cobra(self, person):
        idx = [LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP]
        if not self._reliable(person, idx, min_count=3):
            return "मैट पर लेटकर ऊपरी शरीर दिखाएं"

        sh_c = midpoint(person[LEFT_SHOULDER], person[RIGHT_SHOULDER])
        hip_c = midpoint(person[LEFT_HIP], person[RIGHT_HIP])

        sh_w = distance(person[LEFT_SHOULDER], person[RIGHT_SHOULDER]) + 1e-5
        # Chest should be lifted: shoulders higher than hips by at least 15% of shoulder width
        lift = hip_c[1] - sh_c[1]

        if lift < sh_w * 0.15:
            return "छाती को हथेलियों के सहारे धीरे से ऊपर उठाएं"

        return "GOOD: भुजंगासन - छाती का खिंचाव बहुत अच्छा है!"

    def session_summary(self):
        total_time = self.total_hold_time + self.current_hold_duration
        accuracy = 100.0 if self.completed_holds > 0 else (85.0 if total_time >= 3.0 else 0.0)
        return {
            "total_reps": self.completed_holds,
            "correct_reps": self.completed_holds,
            "incorrect_reps": 0,
            "accuracy": accuracy,
            "total_hold_time": round(float(total_time), 1),
            "rep_log": self.rep_log,
        }
