# """Surya Namaskar full-flow analyzer for PostureTrek / PoseCare.

# Includes:
# 1. SuryaNamaskarAnalyzer: Core 12-step sequence detection engine using 2D pose keypoints.
# 2. SuryaAnalyzer: Full frame-processing pipeline with YOLO inference, visual HUD overlay,
#    and standard PostureTrek analyzer interface (process_frame, session_summary).
# """

# from __future__ import annotations

# from collections import Counter, deque
# from dataclasses import dataclass, field
# from enum import Enum
# from math import acos, degrees
# from typing import Any, Dict, List, Optional, Sequence, Tuple
# import time

# import cv2
# import numpy as np
# from ultralytics import YOLO


# # Ultralytics COCO-17 keypoint indices.
# NOSE = 0
# LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
# LEFT_ELBOW, RIGHT_ELBOW = 7, 8
# LEFT_WRIST, RIGHT_WRIST = 9, 10
# LEFT_HIP, RIGHT_HIP = 11, 12
# LEFT_KNEE, RIGHT_KNEE = 13, 14
# LEFT_ANKLE, RIGHT_ANKLE = 15, 16

# # --- Padahastasana (forward fold) tuning ---
# # Detection is angle-only now — it no longer requires the shoulders to drop
# # physically below the hip line in the image. That vertical-position check
# # assumed a deep fold (roughly hands-to-floor); shorter hamstrings, a hands-to-shins
# # fold, or a slightly different camera angle/framing all bend forward at the hips
# # without ever putting the shoulders below the hips in 2D, so it under-fired for
# # a lot of real, valid folds. Instead this purely measures how much the body has
# # hinged forward at the hips (an angle, independent of where things land vertically).
# # Tolerance (degrees) for how far the hip-hinge angle (shoulder-hip-knee) and the
# # torso angle (shoulder-hip-ankle) can be from straight (180) while still building
# # up the "how much did you bend" score. Lower tolerance = a smaller bend already
# # counts as a strong fold; PostureTrek testing can raise this if it's now too lenient.
# PADAHASTASANA_BEND_TOLERANCE = 60
# PADAHASTASANA_ACCEPT_SCORE = 0.50


# class SuryaStep(str, Enum):
#     PRANAMASANA = "pranamasana"
#     HASTA_UTTANASANA = "hasta_uttanasana"
#     PADAHASTASANA = "padahastasana"
#     ASHWA_RIGHT = "ashwa_sanchalanasana_right"
#     DANDASANA = "dandasana"
#     ASHTANGA = "ashtanga_namaskara"
#     BHUJANGASANA = "bhujangasana"
#     ADHO_MUKHA = "adho_mukha_svanasana"
#     ASHWA_LEFT = "ashwa_sanchalanasana_left"
#     PADAHASTASANA_RETURN = "padahastasana_return"
#     HASTA_UTTANASANA_RETURN = "hasta_uttanasana_return"
#     PRANAMASANA_END = "pranamasana_end"


# SEQUENCE: List[SuryaStep] = [
#     SuryaStep.PRANAMASANA,
#     SuryaStep.HASTA_UTTANASANA,
#     SuryaStep.PADAHASTASANA,
#     SuryaStep.ASHWA_RIGHT,
#     SuryaStep.DANDASANA,
#     SuryaStep.ASHTANGA,
#     SuryaStep.BHUJANGASANA,
#     SuryaStep.ADHO_MUKHA,
#     SuryaStep.ASHWA_LEFT,
#     SuryaStep.PADAHASTASANA_RETURN,
#     SuryaStep.HASTA_UTTANASANA_RETURN,
#     SuryaStep.PRANAMASANA_END,
# ]

# DISPLAY_NAMES: Dict[SuryaStep, str] = {
#     SuryaStep.PRANAMASANA: "Pranamasana (Prayer Pose)",
#     SuryaStep.HASTA_UTTANASANA: "Hasta Uttanasana (Raised Arms)",
#     SuryaStep.PADAHASTASANA: "Padahastasana (Forward Fold)",
#     SuryaStep.ASHWA_RIGHT: "Ashwa Sanchalanasana (Right Leg Back)",
#     SuryaStep.DANDASANA: "Dandasana (Plank)",
#     SuryaStep.ASHTANGA: "Ashtanga Namaskara",
#     SuryaStep.BHUJANGASANA: "Bhujangasana (Cobra)",
#     SuryaStep.ADHO_MUKHA: "Adho Mukha Svanasana (Downward Dog)",
#     SuryaStep.ASHWA_LEFT: "Ashwa Sanchalanasana (Left Leg Forward)",
#     SuryaStep.PADAHASTASANA_RETURN: "Padahastasana (Forward Fold)",
#     SuryaStep.HASTA_UTTANASANA_RETURN: "Hasta Uttanasana (Raised Arms)",
#     SuryaStep.PRANAMASANA_END: "Pranamasana (Prayer Pose)",
# }

# HINGLISH_CUES: Dict[SuryaStep, str] = {
#     SuryaStep.PRANAMASANA: "Seedhe khade raho, shoulders relax aur haath chest ke paas rakho.",
#     SuryaStep.HASTA_UTTANASANA: "Haath upar le jao aur spine ko lamba rakho.",
#     SuryaStep.PADAHASTASANA: "Hips se fold karo, zarurat ho to knees thode bend rakho.",
#     SuryaStep.ASHWA_RIGHT: "Front knee ko ankle ke upar rakho aur chest upar uthao.",
#     SuryaStep.DANDASANA: "Body ko ek straight line mein rakho, hips na neeche girne do.",
#     SuryaStep.ASHTANGA: "Chest aur chin ko gently neeche lao, hips ko control mein rakho.",
#     SuryaStep.BHUJANGASANA: "Chest ko lift karo aur shoulders ko kaanon se door rakho.",
#     SuryaStep.ADHO_MUKHA: "Hips upar push karo, back ko lamba rakho.",
#     SuryaStep.ASHWA_LEFT: "Front knee ankle ke upar aur chest open rakho.",
#     SuryaStep.PADAHASTASANA_RETURN: "Forward fold mein hips se bend karo.",
#     SuryaStep.HASTA_UTTANASANA_RETURN: "Arms up, spine lambi aur movement smooth rakho.",
#     SuryaStep.PRANAMASANA_END: "Bahut badhiya. Prayer pose mein balance aur breathing maintain karo.",
# }


# @dataclass
# class PoseMatch:
#     step: Optional[SuryaStep]
#     confidence: float
#     quality: float
#     issues: List[str] = field(default_factory=list)


# @dataclass
# class StepLog:
#     step: str
#     entered_at: float
#     quality: float
#     issues: List[str]


# def _xy(kpts: np.ndarray, index: int) -> Optional[np.ndarray]:
#     """Return x,y point only if its confidence is adequate."""
#     if index >= len(kpts):
#         return None
#     p = kpts[index]
#     if len(p) >= 3 and float(p[2]) < 0.35:
#         return None
#     return np.asarray(p[:2], dtype=np.float32)


# def _midpoint(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> Optional[np.ndarray]:
#     if a is None or b is None:
#         return None
#     return (a + b) / 2.0


# def _distance(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> Optional[float]:
#     if a is None or b is None:
#         return None
#     return float(np.linalg.norm(a - b))


# def _angle(a: Optional[np.ndarray], b: Optional[np.ndarray], c: Optional[np.ndarray]) -> Optional[float]:
#     """Angle ABC in degrees, safe for missing or nearly overlapping points."""
#     if a is None or b is None or c is None:
#         return None
#     ba = a - b
#     bc = c - b
#     norm = np.linalg.norm(ba) * np.linalg.norm(bc)
#     if norm < 1e-6:
#         return None
#     cosine = float(np.clip(np.dot(ba, bc) / norm, -1.0, 1.0))
#     return degrees(acos(cosine))


# def _near(value: Optional[float], target: float, tolerance: float) -> float:
#     """Returns a normalized 0..1 score for closeness to a target."""
#     if value is None:
#         return 0.0
#     return float(max(0.0, 1.0 - abs(value - target) / tolerance))


# def _above(a: Optional[np.ndarray], b: Optional[np.ndarray], margin: float = 0.0) -> bool:
#     """Image coordinates: smaller y means physically higher."""
#     return a is not None and b is not None and float(a[1]) < float(b[1]) - margin


# def _below(a: Optional[np.ndarray], b: Optional[np.ndarray], margin: float = 0.0) -> bool:
#     return a is not None and b is not None and float(a[1]) > float(b[1]) + margin


# class SuryaNamaskarAnalyzer:
#     """Detects a full, continuous 12-step Surya Namaskar flow.

#     Input expected by analyze(): a single person's YOLO keypoints array of
#     shape (17, 3) or (17, 2), ordered in COCO-17 order.
#     """

#     def __init__(
#         self,
#         stable_frames: int = 4,
#         minimum_pose_confidence: float = 0.58,
#         voice_cooldown_seconds: float = 4.0,
#     ) -> None:
#         self.stable_frames = stable_frames
#         self.minimum_pose_confidence = minimum_pose_confidence
#         self.voice_cooldown_seconds = voice_cooldown_seconds

#         self.expected_index = 0
#         self.round_count = 0
#         self.total_pose_quality: List[float] = []
#         self.step_logs: List[StepLog] = []
#         self.recent_candidates: deque[SuryaStep] = deque(maxlen=stable_frames)
#         self.last_voice_at = 0.0
#         self.last_entered_step: Optional[SuryaStep] = None
#         self.sequence_errors = 0

#     def reset(self) -> None:
#         self.__init__(
#             stable_frames=self.stable_frames,
#             minimum_pose_confidence=self.minimum_pose_confidence,
#             voice_cooldown_seconds=self.voice_cooldown_seconds,
#         )

#     @property
#     def expected_step(self) -> SuryaStep:
#         return SEQUENCE[self.expected_index]

#     def _features(self, kpts: np.ndarray) -> Dict[str, Any]:
#         ls, rs = _xy(kpts, LEFT_SHOULDER), _xy(kpts, RIGHT_SHOULDER)
#         le, re = _xy(kpts, LEFT_ELBOW), _xy(kpts, RIGHT_ELBOW)
#         lw, rw = _xy(kpts, LEFT_WRIST), _xy(kpts, RIGHT_WRIST)
#         lh, rh = _xy(kpts, LEFT_HIP), _xy(kpts, RIGHT_HIP)
#         lk, rk = _xy(kpts, LEFT_KNEE), _xy(kpts, RIGHT_KNEE)
#         la, ra = _xy(kpts, LEFT_ANKLE), _xy(kpts, RIGHT_ANKLE)
#         nose = _xy(kpts, NOSE)

#         shoulder_mid = _midpoint(ls, rs)
#         hip_mid = _midpoint(lh, rh)
#         ankle_mid = _midpoint(la, ra)
#         torso_angle = _angle(shoulder_mid, hip_mid, ankle_mid)
#         left_knee_angle = _angle(lh, lk, la)
#         right_knee_angle = _angle(rh, rk, ra)
#         left_elbow_angle = _angle(ls, le, lw)
#         right_elbow_angle = _angle(rs, re, rw)
#         left_hip_angle = _angle(ls, lh, lk)
#         right_hip_angle = _angle(rs, rh, rk)

#         body_scale = _distance(shoulder_mid, hip_mid) or 1.0
#         wrist_distance = _distance(lw, rw) or 9999.0

#         return {
#             "nose": nose, "ls": ls, "rs": rs, "le": le, "re": re,
#             "lw": lw, "rw": rw, "lh": lh, "rh": rh, "lk": lk,
#             "rk": rk, "la": la, "ra": ra, "shoulder_mid": shoulder_mid,
#             "hip_mid": hip_mid, "ankle_mid": ankle_mid, "torso_angle": torso_angle,
#             "left_knee_angle": left_knee_angle, "right_knee_angle": right_knee_angle,
#             "left_elbow_angle": left_elbow_angle, "right_elbow_angle": right_elbow_angle,
#             "left_hip_angle": left_hip_angle, "right_hip_angle": right_hip_angle,
#             "body_scale": body_scale, "wrist_distance": wrist_distance,
#         }

#     def _classify(self, kpts: np.ndarray) -> PoseMatch:
#         f = self._features(kpts)
#         required = [f["ls"], f["rs"], f["lh"], f["rh"], f["lk"], f["rk"]]
#         if any(point is None for point in required):
#             return PoseMatch(None, 0.0, 0.0, ["Body keypoints not visible clearly"])

#         candidates: List[PoseMatch] = []
#         scale = f["body_scale"]

#         # Prayer pose: upright body + wrists close together near chest.
#         upright = _near(f["torso_angle"], 180, 35)
#         hands_together = _near(f["wrist_distance"] / scale, 0.25, 0.45)
#         wrists_chest = 1.0 if (
#             f["lw"] is not None and f["rw"] is not None and f["shoulder_mid"] is not None
#             and abs(float((_midpoint(f["lw"], f["rw"])[1]) - f["shoulder_mid"][1])) < scale * 1.2
#         ) else 0.0
#         score = 0.45 * upright + 0.35 * hands_together + 0.20 * wrists_chest
#         candidates.append(PoseMatch(SuryaStep.PRANAMASANA, score, score * 100,
#                                     [] if score > .65 else ["Stand upright with palms together near chest"]))

#         # Raised-arms pose: upright-ish + both wrists above shoulders.
#         arms_up = 1.0 if _above(f["lw"], f["ls"], scale * .25) and _above(f["rw"], f["rs"], scale * .25) else 0.0
#         score = 0.60 * arms_up + 0.40 * upright
#         candidates.append(PoseMatch(SuryaStep.HASTA_UTTANASANA, score, score * 100,
#                                     [] if arms_up else ["Raise both arms above your head"]))

#         # Forward fold: purely angular now, no vertical shoulder-vs-hip position
#         # check (see PADAHASTASANA_BEND_TOLERANCE comment above) — a moderate
#         # bend at the hips is enough to register, not just a deep hands-to-floor fold.
#         hip_hinge = 1.0 - ((_near(f["left_hip_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)
#                              + _near(f["right_hip_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)) / 2)
#         torso_bend = 1.0 - _near(f["torso_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)
#         fold_amount = 0.60 * hip_hinge + 0.40 * torso_bend
#         leg_straight = (_near(f["left_knee_angle"], 170, 55) + _near(f["right_knee_angle"], 170, 55)) / 2
#         score = 0.75 * fold_amount + 0.25 * leg_straight
#         candidates.append(PoseMatch(SuryaStep.PADAHASTASANA, score, score * 100,
#                                     [] if score > PADAHASTASANA_ACCEPT_SCORE
#                                     else ["Bend forward from the hips a bit more"]))

#         # Low lunges. Determine side using which knee is more flexed.
#         left_bent = _near(f["left_knee_angle"], 95, 50)
#         right_bent = _near(f["right_knee_angle"], 95, 50)
#         lunge_torso = _near(f["torso_angle"], 170, 55)
#         if left_bent >= right_bent:
#             lunge_score = 0.65 * left_bent + 0.35 * lunge_torso
#             candidates.append(PoseMatch(SuryaStep.ASHWA_LEFT, lunge_score, lunge_score * 100,
#                                         [] if lunge_score > .60 else ["Bend the front knee toward 90 degrees"]))
#         else:
#             lunge_score = 0.65 * right_bent + 0.35 * lunge_torso
#             candidates.append(PoseMatch(SuryaStep.ASHWA_RIGHT, lunge_score, lunge_score * 100,
#                                         [] if lunge_score > .60 else ["Bend the front knee toward 90 degrees"]))

#         # Plank: body long/near straight, hips not far from shoulder-ankle line.
#         plank_line = _near(f["torso_angle"], 180, 45)
#         elbows_straight = (_near(f["left_elbow_angle"], 175, 45) + _near(f["right_elbow_angle"], 175, 45)) / 2
#         score = 0.70 * plank_line + 0.30 * elbows_straight
#         candidates.append(PoseMatch(SuryaStep.DANDASANA, score, score * 100,
#                                     [] if score > .65 else ["Keep shoulders, hips and heels in one line"]))

#         # Ashtanga Namaskara: elbows bent + hips raised relative to shoulders/chest in side view.
#         elbows_bent = 1.0 - ((_near(f["left_elbow_angle"], 175, 70) + _near(f["right_elbow_angle"], 175, 70)) / 2)
#         hips_high = 1.0 if _above(f["hip_mid"], f["shoulder_mid"], scale * .10) else 0.0
#         score = 0.55 * elbows_bent + 0.45 * hips_high
#         candidates.append(PoseMatch(SuryaStep.ASHTANGA, score, score * 100,
#                                     [] if score > .60 else ["Bend elbows and keep hips gently lifted"]))

#         # Cobra: shoulders/chest visibly above hips, elbows moderately bent.
#         chest_lift = 1.0 if _above(f["shoulder_mid"], f["hip_mid"], scale * .25) else 0.0
#         elbow_bend = (_near(f["left_elbow_angle"], 130, 60) + _near(f["right_elbow_angle"], 130, 60)) / 2
#         score = 0.65 * chest_lift + 0.35 * elbow_bend
#         candidates.append(PoseMatch(SuryaStep.BHUJANGASANA, score, score * 100,
#                                     [] if chest_lift else ["Lift your chest and relax shoulders down"]))

#         # Downward dog: hips clearly raised vs shoulders and ankles.
#         hips_high_dog = 1.0 if (
#             _above(f["hip_mid"], f["shoulder_mid"], scale * .20)
#             and _above(f["hip_mid"], f["ankle_mid"], scale * .40)
#         ) else 0.0
#         hip_open = (_near(f["left_hip_angle"], 75, 55) + _near(f["right_hip_angle"], 75, 55)) / 2
#         score = 0.70 * hips_high_dog + 0.30 * hip_open
#         candidates.append(PoseMatch(SuryaStep.ADHO_MUKHA, score, score * 100,
#                                     [] if hips_high_dog else ["Push hips higher to make an inverted V shape"]))

#         best = max(candidates, key=lambda item: item.confidence)
#         return best

#     def _mapped_candidate_for_expected(self, match: PoseMatch) -> PoseMatch:
#         """Map repeated poses to the current phase of the sequence."""
#         if match.step == SuryaStep.PRANAMASANA and self.expected_step == SuryaStep.PRANAMASANA_END:
#             return PoseMatch(SuryaStep.PRANAMASANA_END, match.confidence, match.quality, match.issues)
#         if match.step == SuryaStep.HASTA_UTTANASANA and self.expected_step == SuryaStep.HASTA_UTTANASANA_RETURN:
#             return PoseMatch(SuryaStep.HASTA_UTTANASANA_RETURN, match.confidence, match.quality, match.issues)
#         if match.step == SuryaStep.PADAHASTASANA and self.expected_step == SuryaStep.PADAHASTASANA_RETURN:
#             return PoseMatch(SuryaStep.PADAHASTASANA_RETURN, match.confidence, match.quality, match.issues)
#         return match

#     def analyze(self, keypoints: Sequence[Sequence[float]], now: Optional[float] = None) -> Dict[str, Any]:
#         """Analyze one frame and return frontend-ready metrics."""
#         now = now if now is not None else time.time()
#         kpts = np.asarray(keypoints, dtype=np.float32)
#         if kpts.ndim != 2 or kpts.shape[0] < 17:
#             return self._response(None, 0.0, ["Full body is not visible"], None)

#         raw_match = self._classify(kpts)
#         match = self._mapped_candidate_for_expected(raw_match)
#         current_detected = match.step

#         expected = self.expected_step
#         accepted = False
#         voice_prompt: Optional[str] = None

#         if match.step == expected and match.confidence >= self.minimum_pose_confidence:
#             self.recent_candidates.append(match.step)
#             stable = len(self.recent_candidates) == self.stable_frames and all(
#                 step == expected for step in self.recent_candidates
#             )
#             if stable and self.last_entered_step != expected:
#                 accepted = True
#                 self.last_entered_step = expected
#                 self.total_pose_quality.append(match.quality)
#                 self.step_logs.append(StepLog(expected.value, now, match.quality, match.issues))

#                 if expected == SuryaStep.PRANAMASANA_END:
#                     self.round_count += 1
#                     self.expected_index = 0
#                     self.last_entered_step = None
#                     self.recent_candidates.clear()
#                     voice_prompt = "Round complete. Bahut badhiya! Agla round shuru kar sakte ho."
#                 else:
#                     self.expected_index += 1
#                     self.recent_candidates.clear()
#                     voice_prompt = HINGLISH_CUES.get(expected)
#         else:
#             self.recent_candidates.clear()
#             if raw_match.step is not None and raw_match.confidence >= self.minimum_pose_confidence:
#                 # It is a clear pose but not the next expected step.
#                 self.sequence_errors += 1

#         # Avoid speaking every frame. Safety/form feedback is only spoken on cooldown.
#         if not voice_prompt and match.issues and now - self.last_voice_at >= self.voice_cooldown_seconds:
#             voice_prompt = match.issues[0]

#         if voice_prompt:
#             self.last_voice_at = now

#         return self._response(current_detected, match.quality, match.issues, voice_prompt, accepted)

#     def _response(
#         self,
#         detected: Optional[SuryaStep],
#         quality: float,
#         issues: List[str],
#         voice_prompt: Optional[str],
#         accepted: bool = False,
#     ) -> Dict[str, Any]:
#         average_quality = float(np.mean(self.total_pose_quality)) if self.total_pose_quality else 0.0
#         return {
#             "mode": "surya_namaskar",
#             "round_count": self.round_count,
#             "current_step_number": self.expected_index + 1,
#             "expected_step": self.expected_step.value,
#             "expected_pose_name": DISPLAY_NAMES[self.expected_step],
#             "detected_pose": detected.value if detected else None,
#             "detected_pose_name": DISPLAY_NAMES[detected] if detected else "Body not detected",
#             "pose_quality": round(float(quality), 1),
#             "average_pose_quality": round(average_quality, 1),
#             "form_issues": issues,
#             "voice_prompt": voice_prompt,
#             "step_accepted": accepted,
#             "sequence_errors": self.sequence_errors,
#             "completed_steps": len(self.step_logs),
#         }

#     def end_session_summary(self) -> Dict[str, Any]:
#         average = float(np.mean(self.total_pose_quality)) if self.total_pose_quality else 0.0
#         if average >= 90:
#             grade = "A"
#         elif average >= 75:
#             grade = "B"
#         elif average >= 60:
#             grade = "C"
#         elif average >= 45:
#             grade = "D"
#         else:
#             grade = "E"

#         issue_counter = Counter(issue for log in self.step_logs for issue in log.issues)
#         return {
#             "exercise_mode": "surya_namaskar",
#             "rounds_completed": self.round_count,
#             "steps_logged": len(self.step_logs),
#             "average_pose_quality": round(average, 1),
#             "form_quality": grade,
#             "sequence_errors": self.sequence_errors,
#             "common_issues": [issue for issue, _ in issue_counter.most_common(3)],
#             "report_seed": (
#                 f"{self.round_count} Surya Namaskar rounds completed. "
#                 f"Average pose quality: {average:.1f}%. Form grade: {grade}."
#             ),
#         }


# class SuryaAnalyzer:
#     """Frame-processing wrapper for SuryaNamaskarAnalyzer.

#     Integrates seamlessly into the PostureTrek / PoseCare analysis pipeline,
#     satisfying both the standard analyzer interface (`process_frame`, `session_summary`)
#     and providing real-time visual skeleton and HUD overlay.
#     """

#     def __init__(self, model_path: str = "yolo11n-pose.pt") -> None:
#         try:
#             self.model = YOLO(model_path)
#         except Exception:
#             self.model = YOLO("yolov8n-pose.pt")

#         self.engine = SuryaNamaskarAnalyzer()
#         self.rep_log: List[Dict[str, Any]] = []
#         self._last_step_count: int = 0

#     def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
#         """Process BGR frame, run pose detection, compute Surya metrics, and return annotated frame + metrics."""
#         frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         results = self.model(frame_rgb, verbose=False)
#         output_rgb = results[0].plot(labels=False, conf=False)
#         output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

#         keypoint_data = results[0].keypoints.data if (results[0].keypoints is not None) else []
#         if len(keypoint_data) > 0:
#             kpts = keypoint_data[0].cpu().numpy()
#             metrics = self.engine.analyze(kpts)
#         else:
#             metrics = self.engine.analyze([])

#         # Sync new steps into rep_log
#         current_step_count = len(self.engine.step_logs)
#         if current_step_count > self._last_step_count:
#             for i in range(self._last_step_count, current_step_count):
#                 log = self.engine.step_logs[i]
#                 self.rep_log.append({
#                     "rep_number": i + 1,
#                     "step": log.step,
#                     "correct": len(log.issues) == 0,
#                     "errors": log.issues,
#                     "min_angle": log.quality,
#                 })
#             self._last_step_count = current_step_count

#         # Visual HUD overlay on output_bgr
#         h, w = output_bgr.shape[:2]
#         hud_w = min(w - 20, 500)
#         hud_h = 130
#         hud_roi = output_bgr[10:10 + hud_h, 10:10 + hud_w]
#         overlay = np.zeros_like(hud_roi, dtype=np.uint8)
#         overlay[:] = (15, 23, 42)  # Dark slate background
#         cv2.addWeighted(overlay, 0.85, hud_roi, 0.15, 0, hud_roi)
#         cv2.rectangle(output_bgr, (10, 10), (10 + hud_w, 10 + hud_h), (59, 130, 246), 2)

#         step_num = metrics.get("current_step_number", 1)
#         exp_name = metrics.get("expected_pose_name", "")
#         det_name = metrics.get("detected_pose_name", "Body not detected")
#         quality = metrics.get("pose_quality", 0.0)
#         rounds = metrics.get("round_count", 0)
#         cue = metrics.get("voice_prompt") or (metrics.get("form_issues")[0] if metrics.get("form_issues") else "")

#         # Top Header
#         cv2.putText(output_bgr, f"Surya Namaskar | Round {rounds + 1} (Step {step_num}/12)", (22, 36),
#                     cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 2, cv2.LINE_AA)
#         # Expected Step
#         cv2.putText(output_bgr, f"Target: {exp_name}", (22, 63),
#                     cv2.FONT_HERSHEY_SIMPLEX, 0.50, (147, 197, 253), 1, cv2.LINE_AA)
#         # Detected & Quality Badge
#         color_badge = (74, 222, 128) if quality >= 70 else ((251, 146, 60) if quality >= 40 else (239, 68, 68))
#         cv2.putText(output_bgr, f"Current: {det_name} ({quality:.0f}%)", (22, 90),
#                     cv2.FONT_HERSHEY_SIMPLEX, 0.50, color_badge, 1, cv2.LINE_AA)
#         # Form Guidance / Cue
#         if cue:
#             display_cue = (cue[:42] + "...") if len(cue) > 45 else cue
#             cv2.putText(output_bgr, f"Tip: {display_cue}", (22, 117),
#                         cv2.FONT_HERSHEY_SIMPLEX, 0.44, (254, 240, 138), 1, cv2.LINE_AA)

#         # Standard metrics for frontend and database compatibility
#         stage_str = f"Step {step_num}/12: {exp_name}"
#         feedback_str = metrics.get("voice_prompt") or (
#             f"Form Issue: {metrics['form_issues'][0]}" if metrics.get("form_issues")
#             else f"Moving well in {exp_name}"
#         )

#         total_reps = rounds
#         correct_reps = rounds
#         if rounds == 0 and len(self.engine.step_logs) > 0:
#             total_reps = len(self.engine.step_logs)
#             correct_reps = max(0, total_reps - self.engine.sequence_errors)

#         adapted_metrics = {
#             "stage": stage_str,
#             "total_reps": total_reps,
#             "correct_reps": correct_reps,
#             "incorrect_reps": self.engine.sequence_errors,
#             "score": quality,
#             "accuracy": metrics.get("average_pose_quality", quality),
#             "feedback": feedback_str,
#             "issues": metrics.get("form_issues", []),
#             **metrics,
#         }

#         return output_bgr, adapted_metrics

#     def session_summary(self) -> Dict[str, Any]:
#         """Summarize the entire session for database storage and AI reports."""
#         raw_summary = self.engine.end_session_summary()
#         rounds = raw_summary.get("rounds_completed", 0)
#         steps = raw_summary.get("steps_logged", 0)
#         seq_errs = raw_summary.get("sequence_errors", 0)
#         avg_qual = raw_summary.get("average_pose_quality", 0.0)

#         total = rounds if rounds > 0 else steps
#         correct = rounds if rounds > 0 else max(0, steps - seq_errs)
#         accuracy = avg_qual if avg_qual > 0 else (round(100.0 * correct / total, 1) if total > 0 else 0.0)

#         return {
#             "total_reps": total,
#             "correct_reps": correct,
#             "incorrect_reps": seq_errs,
#             "accuracy": accuracy,
#             "rep_log": self.rep_log,
#             "rounds_completed": rounds,
#             "steps_logged": steps,
#             "form_quality": raw_summary.get("form_quality", "B"),
#             "common_issues": raw_summary.get("common_issues", []),
#             "report_seed": raw_summary.get("report_seed", ""),
#             "exercise_mode": "surya_namaskar",
#         }


# __all__ = [
#     "SuryaNamaskarAnalyzer",
#     "SuryaAnalyzer",
#     "SuryaStep",
#     "SEQUENCE",
#     "DISPLAY_NAMES",
#     "HINGLISH_CUES",
# ]

"""Surya Namaskar full-flow analyzer for PostureTrek / PoseCare.

Includes:
1. SuryaNamaskarAnalyzer: Core 12-step sequence detection engine using 2D pose keypoints.
2. SuryaAnalyzer: Full frame-processing pipeline with YOLO inference, visual HUD overlay,
   and standard PostureTrek analyzer interface (process_frame, session_summary).

NOTE ON STRICTNESS (2026-09):
Detection was previously tuned for a "textbook" pose: tight angle tolerances and
several hard binary checks (e.g. "are the wrists above the shoulders?", yes/no).
That punishes normal variation — different flexibility, limb proportions, camera
angle — by scoring a near-miss the same as a total miss. Everything below has been
loosened in two ways:
  1. Wider angle tolerances and lower acceptance thresholds on every pose.
  2. Hard 0/1 position checks (`_above`/`_below`) replaced with `_position_score`,
     a graduated 0..1 score that gives partial credit as someone approaches the
     pose instead of gating on a fixed margin. Full marks are given at a somewhat
     easier bar than before, and quality decays smoothly rather than dropping off
     a cliff.
This keeps sequencing meaningful (you still can't skip a pose) while making the
per-pose scoring forgiving of real bodies rather than a single body type.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from enum import Enum
from math import acos, degrees
from typing import Any, Dict, List, Optional, Sequence, Tuple
import time

import cv2
import numpy as np
from ultralytics import YOLO


# Ultralytics COCO-17 keypoint indices.
NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

# --- Padahastasana (forward fold) tuning ---
# Detection is angle-only — it doesn't require the shoulders to drop physically
# below the hip line in the image, since that assumed a deep fold (hands-to-floor).
# Shorter hamstrings, a hands-to-shins fold, or a different camera angle all bend
# forward at the hips without ever putting the shoulders below the hips in 2D.
# Tolerance (degrees) for how far the hip-hinge angle (shoulder-hip-knee) and the
# torso angle (shoulder-hip-ankle) can be from straight (180) while still building
# up the "how much did you bend" score. Raised from 60 to give more credit to a
# moderate, realistic fold rather than requiring a near-maximal one.
PADAHASTASANA_BEND_TOLERANCE = 80
PADAHASTASANA_ACCEPT_SCORE = 0.35


class SuryaStep(str, Enum):
    PRANAMASANA = "pranamasana"
    HASTA_UTTANASANA = "hasta_uttanasana"
    PADAHASTASANA = "padahastasana"
    ASHWA_RIGHT = "ashwa_sanchalanasana_right"
    DANDASANA = "dandasana"
    ASHTANGA = "ashtanga_namaskara"
    BHUJANGASANA = "bhujangasana"
    ADHO_MUKHA = "adho_mukha_svanasana"
    ASHWA_LEFT = "ashwa_sanchalanasana_left"
    PADAHASTASANA_RETURN = "padahastasana_return"
    HASTA_UTTANASANA_RETURN = "hasta_uttanasana_return"
    PRANAMASANA_END = "pranamasana_end"


SEQUENCE: List[SuryaStep] = [
    SuryaStep.PRANAMASANA,
    SuryaStep.HASTA_UTTANASANA,
    SuryaStep.PADAHASTASANA,
    SuryaStep.ASHWA_RIGHT,
    SuryaStep.DANDASANA,
    SuryaStep.ASHTANGA,
    SuryaStep.BHUJANGASANA,
    SuryaStep.ADHO_MUKHA,
    SuryaStep.ASHWA_LEFT,
    SuryaStep.PADAHASTASANA_RETURN,
    SuryaStep.HASTA_UTTANASANA_RETURN,
    SuryaStep.PRANAMASANA_END,
]

DISPLAY_NAMES: Dict[SuryaStep, str] = {
    SuryaStep.PRANAMASANA: "Pranamasana (Prayer Pose)",
    SuryaStep.HASTA_UTTANASANA: "Hasta Uttanasana (Raised Arms)",
    SuryaStep.PADAHASTASANA: "Padahastasana (Forward Fold)",
    SuryaStep.ASHWA_RIGHT: "Ashwa Sanchalanasana (Right Leg Back)",
    SuryaStep.DANDASANA: "Dandasana (Plank)",
    SuryaStep.ASHTANGA: "Ashtanga Namaskara",
    SuryaStep.BHUJANGASANA: "Bhujangasana (Cobra)",
    SuryaStep.ADHO_MUKHA: "Adho Mukha Svanasana (Downward Dog)",
    SuryaStep.ASHWA_LEFT: "Ashwa Sanchalanasana (Left Leg Forward)",
    SuryaStep.PADAHASTASANA_RETURN: "Padahastasana (Forward Fold)",
    SuryaStep.HASTA_UTTANASANA_RETURN: "Hasta Uttanasana (Raised Arms)",
    SuryaStep.PRANAMASANA_END: "Pranamasana (Prayer Pose)",
}

HINGLISH_CUES: Dict[SuryaStep, str] = {
    SuryaStep.PRANAMASANA: "Seedhe khade raho, shoulders relax aur haath chest ke paas rakho.",
    SuryaStep.HASTA_UTTANASANA: "Haath upar le jao aur spine ko lamba rakho.",
    SuryaStep.PADAHASTASANA: "Hips se fold karo, zarurat ho to knees thode bend rakho.",
    SuryaStep.ASHWA_RIGHT: "Front knee ko ankle ke upar rakho aur chest upar uthao.",
    SuryaStep.DANDASANA: "Body ko ek straight line mein rakho, hips na neeche girne do.",
    SuryaStep.ASHTANGA: "Chest aur chin ko gently neeche lao, hips ko control mein rakho.",
    SuryaStep.BHUJANGASANA: "Chest ko lift karo aur shoulders ko kaanon se door rakho.",
    SuryaStep.ADHO_MUKHA: "Hips upar push karo, back ko lamba rakho.",
    SuryaStep.ASHWA_LEFT: "Front knee ankle ke upar aur chest open rakho.",
    SuryaStep.PADAHASTASANA_RETURN: "Forward fold mein hips se bend karo.",
    SuryaStep.HASTA_UTTANASANA_RETURN: "Arms up, spine lambi aur movement smooth rakho.",
    SuryaStep.PRANAMASANA_END: "Bahut badhiya. Prayer pose mein balance aur breathing maintain karo.",
}


@dataclass
class PoseMatch:
    step: Optional[SuryaStep]
    confidence: float
    quality: float
    issues: List[str] = field(default_factory=list)


@dataclass
class StepLog:
    step: str
    entered_at: float
    quality: float
    issues: List[str]


def _xy(kpts: np.ndarray, index: int) -> Optional[np.ndarray]:
    """Return x,y point only if its confidence is adequate."""
    if index >= len(kpts):
        return None
    p = kpts[index]
    if len(p) >= 3 and float(p[2]) < 0.35:
        return None
    return np.asarray(p[:2], dtype=np.float32)


def _midpoint(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> Optional[np.ndarray]:
    if a is None or b is None:
        return None
    return (a + b) / 2.0


def _distance(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> Optional[float]:
    if a is None or b is None:
        return None
    return float(np.linalg.norm(a - b))


def _angle(a: Optional[np.ndarray], b: Optional[np.ndarray], c: Optional[np.ndarray]) -> Optional[float]:
    """Angle ABC in degrees, safe for missing or nearly overlapping points."""
    if a is None or b is None or c is None:
        return None
    ba = a - b
    bc = c - b
    norm = np.linalg.norm(ba) * np.linalg.norm(bc)
    if norm < 1e-6:
        return None
    cosine = float(np.clip(np.dot(ba, bc) / norm, -1.0, 1.0))
    return degrees(acos(cosine))


def _near(value: Optional[float], target: float, tolerance: float) -> float:
    """Returns a normalized 0..1 score for closeness to a target."""
    if value is None:
        return 0.0
    return float(max(0.0, 1.0 - abs(value - target) / tolerance))


def _above(a: Optional[np.ndarray], b: Optional[np.ndarray], margin: float = 0.0) -> bool:
    """Image coordinates: smaller y means physically higher."""
    return a is not None and b is not None and float(a[1]) < float(b[1]) - margin


def _below(a: Optional[np.ndarray], b: Optional[np.ndarray], margin: float = 0.0) -> bool:
    return a is not None and b is not None and float(a[1]) > float(b[1]) + margin


def _position_score(a: Optional[np.ndarray], b: Optional[np.ndarray], full_credit_distance: float) -> float:
    """Graduated 0..1 score for how far `a` is above `b` (image coords: smaller y
    is higher), instead of a hard yes/no cutoff.

    Reaches 1.0 once `a` is `full_credit_distance` pixels above `b`, and gives
    smooth partial credit below that instead of scoring 0 the moment a fixed
    margin isn't cleared. This is what makes poses forgiving of different body
    proportions and flexibility levels: someone who gets most of the way there
    still shows a decent quality score rather than "wrong pose."
    """
    if a is None or b is None or full_credit_distance <= 1e-6:
        return 0.0
    diff = float(b[1]) - float(a[1])  # positive if a is above b
    return float(np.clip(diff / full_credit_distance, 0.0, 1.0))


class SuryaNamaskarAnalyzer:
    """Detects a full, continuous 12-step Surya Namaskar flow.

    Input expected by analyze(): a single person's YOLO keypoints array of
    shape (17, 3) or (17, 2), ordered in COCO-17 order.
    """

    def __init__(
        self,
        stable_frames: int = 3,
        minimum_pose_confidence: float = 0.45,
        voice_cooldown_seconds: float = 4.0,
    ) -> None:
        self.stable_frames = stable_frames
        self.minimum_pose_confidence = minimum_pose_confidence
        self.voice_cooldown_seconds = voice_cooldown_seconds

        self.expected_index = 0
        self.round_count = 0
        self.total_pose_quality: List[float] = []
        self.step_logs: List[StepLog] = []
        self.recent_candidates: deque[SuryaStep] = deque(maxlen=stable_frames)
        self.last_voice_at = 0.0
        self.last_entered_step: Optional[SuryaStep] = None
        self.sequence_errors = 0

    def reset(self) -> None:
        self.__init__(
            stable_frames=self.stable_frames,
            minimum_pose_confidence=self.minimum_pose_confidence,
            voice_cooldown_seconds=self.voice_cooldown_seconds,
        )

    @property
    def expected_step(self) -> SuryaStep:
        return SEQUENCE[self.expected_index]

    def _features(self, kpts: np.ndarray) -> Dict[str, Any]:
        ls, rs = _xy(kpts, LEFT_SHOULDER), _xy(kpts, RIGHT_SHOULDER)
        le, re = _xy(kpts, LEFT_ELBOW), _xy(kpts, RIGHT_ELBOW)
        lw, rw = _xy(kpts, LEFT_WRIST), _xy(kpts, RIGHT_WRIST)
        lh, rh = _xy(kpts, LEFT_HIP), _xy(kpts, RIGHT_HIP)
        lk, rk = _xy(kpts, LEFT_KNEE), _xy(kpts, RIGHT_KNEE)
        la, ra = _xy(kpts, LEFT_ANKLE), _xy(kpts, RIGHT_ANKLE)
        nose = _xy(kpts, NOSE)

        shoulder_mid = _midpoint(ls, rs)
        hip_mid = _midpoint(lh, rh)
        ankle_mid = _midpoint(la, ra)
        torso_angle = _angle(shoulder_mid, hip_mid, ankle_mid)
        left_knee_angle = _angle(lh, lk, la)
        right_knee_angle = _angle(rh, rk, ra)
        left_elbow_angle = _angle(ls, le, lw)
        right_elbow_angle = _angle(rs, re, rw)
        left_hip_angle = _angle(ls, lh, lk)
        right_hip_angle = _angle(rs, rh, rk)

        body_scale = _distance(shoulder_mid, hip_mid) or 1.0
        wrist_distance = _distance(lw, rw) or 9999.0

        return {
            "nose": nose, "ls": ls, "rs": rs, "le": le, "re": re,
            "lw": lw, "rw": rw, "lh": lh, "rh": rh, "lk": lk,
            "rk": rk, "la": la, "ra": ra, "shoulder_mid": shoulder_mid,
            "hip_mid": hip_mid, "ankle_mid": ankle_mid, "torso_angle": torso_angle,
            "left_knee_angle": left_knee_angle, "right_knee_angle": right_knee_angle,
            "left_elbow_angle": left_elbow_angle, "right_elbow_angle": right_elbow_angle,
            "left_hip_angle": left_hip_angle, "right_hip_angle": right_hip_angle,
            "body_scale": body_scale, "wrist_distance": wrist_distance,
        }

    def _classify(self, kpts: np.ndarray) -> PoseMatch:
        f = self._features(kpts)
        required = [f["ls"], f["rs"], f["lh"], f["rh"], f["lk"], f["rk"]]
        if any(point is None for point in required):
            return PoseMatch(None, 0.0, 0.0, ["Body keypoints not visible clearly"])

        candidates: List[PoseMatch] = []
        scale = f["body_scale"]

        # Prayer pose: upright body + wrists reasonably close together near chest.
        upright = _near(f["torso_angle"], 180, 50)
        hands_together = _near(f["wrist_distance"] / scale, 0.30, 0.65)
        wrists_chest = 1.0 if (
            f["lw"] is not None and f["rw"] is not None and f["shoulder_mid"] is not None
            and abs(float((_midpoint(f["lw"], f["rw"])[1]) - f["shoulder_mid"][1])) < scale * 1.2
        ) else 0.0
        score = 0.45 * upright + 0.35 * hands_together + 0.20 * wrists_chest
        candidates.append(PoseMatch(SuryaStep.PRANAMASANA, score, score * 100,
                                    [] if score > .50 else ["Stand upright with palms together near chest"]))

        # Raised-arms pose: upright-ish + both wrists above shoulders (graduated,
        # full credit once a wrist clears the shoulder by a modest margin).
        arms_up = 0.5 * _position_score(f["lw"], f["ls"], scale * .15) \
            + 0.5 * _position_score(f["rw"], f["rs"], scale * .15)
        score = 0.60 * arms_up + 0.40 * upright
        candidates.append(PoseMatch(SuryaStep.HASTA_UTTANASANA, score, score * 100,
                                    [] if arms_up > .5 else ["Raise both arms above your head"]))

        # Forward fold: purely angular, no vertical shoulder-vs-hip position
        # check (see PADAHASTASANA_BEND_TOLERANCE comment above) — a moderate
        # bend at the hips is enough to register, not just a deep hands-to-floor fold.
        hip_hinge = 1.0 - ((_near(f["left_hip_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)
                             + _near(f["right_hip_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)) / 2)
        torso_bend = 1.0 - _near(f["torso_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)
        fold_amount = 0.60 * hip_hinge + 0.40 * torso_bend
        leg_straight = (_near(f["left_knee_angle"], 170, 70) + _near(f["right_knee_angle"], 170, 70)) / 2
        score = 0.75 * fold_amount + 0.25 * leg_straight
        candidates.append(PoseMatch(SuryaStep.PADAHASTASANA, score, score * 100,
                                    [] if score > PADAHASTASANA_ACCEPT_SCORE
                                    else ["Bend forward from the hips a bit more"]))

        # Low lunges. Determine side using which knee is more flexed.
        left_bent = _near(f["left_knee_angle"], 95, 70)
        right_bent = _near(f["right_knee_angle"], 95, 70)
        lunge_torso = _near(f["torso_angle"], 170, 70)
        if left_bent >= right_bent:
            lunge_score = 0.65 * left_bent + 0.35 * lunge_torso
            candidates.append(PoseMatch(SuryaStep.ASHWA_LEFT, lunge_score, lunge_score * 100,
                                        [] if lunge_score > .45 else ["Bend the front knee toward 90 degrees"]))
        else:
            lunge_score = 0.65 * right_bent + 0.35 * lunge_torso
            candidates.append(PoseMatch(SuryaStep.ASHWA_RIGHT, lunge_score, lunge_score * 100,
                                        [] if lunge_score > .45 else ["Bend the front knee toward 90 degrees"]))

        # Plank: body long/near straight, hips not far from shoulder-ankle line.
        plank_line = _near(f["torso_angle"], 180, 60)
        elbows_straight = (_near(f["left_elbow_angle"], 175, 60) + _near(f["right_elbow_angle"], 175, 60)) / 2
        score = 0.70 * plank_line + 0.30 * elbows_straight
        candidates.append(PoseMatch(SuryaStep.DANDASANA, score, score * 100,
                                    [] if score > .50 else ["Keep shoulders, hips and heels in one line"]))

        # Ashtanga Namaskara: elbows bent + hips raised relative to shoulders/chest
        # in side view (graduated, small lift already earns partial credit).
        elbows_bent = 1.0 - ((_near(f["left_elbow_angle"], 175, 85) + _near(f["right_elbow_angle"], 175, 85)) / 2)
        hips_high = _position_score(f["hip_mid"], f["shoulder_mid"], scale * .18)
        score = 0.55 * elbows_bent + 0.45 * hips_high
        candidates.append(PoseMatch(SuryaStep.ASHTANGA, score, score * 100,
                                    [] if score > .45 else ["Bend elbows and keep hips gently lifted"]))

        # Cobra: shoulders/chest raised above hips (graduated), elbows moderately bent.
        chest_lift = _position_score(f["shoulder_mid"], f["hip_mid"], scale * .18)
        elbow_bend = (_near(f["left_elbow_angle"], 130, 75) + _near(f["right_elbow_angle"], 130, 75)) / 2
        score = 0.65 * chest_lift + 0.35 * elbow_bend
        candidates.append(PoseMatch(SuryaStep.BHUJANGASANA, score, score * 100,
                                    [] if chest_lift > .5 else ["Lift your chest and relax shoulders down"]))

        # Downward dog: hips raised vs shoulders and ankles (graduated on both,
        # combined so a partial lift on either axis still contributes).
        hips_vs_shoulders = _position_score(f["hip_mid"], f["shoulder_mid"], scale * .28)
        hips_vs_ankles = _position_score(f["hip_mid"], f["ankle_mid"], scale * .55)
        hips_high_dog = 0.5 * hips_vs_shoulders + 0.5 * hips_vs_ankles
        hip_open = (_near(f["left_hip_angle"], 75, 70) + _near(f["right_hip_angle"], 75, 70)) / 2
        score = 0.70 * hips_high_dog + 0.30 * hip_open
        candidates.append(PoseMatch(SuryaStep.ADHO_MUKHA, score, score * 100,
                                    [] if hips_high_dog > .5 else ["Push hips higher to make an inverted V shape"]))

        best = max(candidates, key=lambda item: item.confidence)
        return best

    def _mapped_candidate_for_expected(self, match: PoseMatch) -> PoseMatch:
        """Map repeated poses to the current phase of the sequence."""
        if match.step == SuryaStep.PRANAMASANA and self.expected_step == SuryaStep.PRANAMASANA_END:
            return PoseMatch(SuryaStep.PRANAMASANA_END, match.confidence, match.quality, match.issues)
        if match.step == SuryaStep.HASTA_UTTANASANA and self.expected_step == SuryaStep.HASTA_UTTANASANA_RETURN:
            return PoseMatch(SuryaStep.HASTA_UTTANASANA_RETURN, match.confidence, match.quality, match.issues)
        if match.step == SuryaStep.PADAHASTASANA and self.expected_step == SuryaStep.PADAHASTASANA_RETURN:
            return PoseMatch(SuryaStep.PADAHASTASANA_RETURN, match.confidence, match.quality, match.issues)
        return match

    def analyze(self, keypoints: Sequence[Sequence[float]], now: Optional[float] = None) -> Dict[str, Any]:
        """Analyze one frame and return frontend-ready metrics."""
        now = now if now is not None else time.time()
        kpts = np.asarray(keypoints, dtype=np.float32)
        if kpts.ndim != 2 or kpts.shape[0] < 17:
            return self._response(None, 0.0, ["Full body is not visible"], None)

        raw_match = self._classify(kpts)
        match = self._mapped_candidate_for_expected(raw_match)
        current_detected = match.step

        expected = self.expected_step
        accepted = False
        voice_prompt: Optional[str] = None

        if match.step == expected and match.confidence >= self.minimum_pose_confidence:
            self.recent_candidates.append(match.step)
            stable = len(self.recent_candidates) == self.stable_frames and all(
                step == expected for step in self.recent_candidates
            )
            if stable and self.last_entered_step != expected:
                accepted = True
                self.last_entered_step = expected
                self.total_pose_quality.append(match.quality)
                self.step_logs.append(StepLog(expected.value, now, match.quality, match.issues))

                if expected == SuryaStep.PRANAMASANA_END:
                    self.round_count += 1
                    self.expected_index = 0
                    self.last_entered_step = None
                    self.recent_candidates.clear()
                    voice_prompt = "Round complete. Bahut badhiya! Agla round shuru kar sakte ho."
                else:
                    self.expected_index += 1
                    self.recent_candidates.clear()
                    voice_prompt = HINGLISH_CUES.get(expected)
        else:
            self.recent_candidates.clear()
            if raw_match.step is not None and raw_match.confidence >= self.minimum_pose_confidence:
                # It is a clear pose but not the next expected step.
                self.sequence_errors += 1

        # Avoid speaking every frame. Safety/form feedback is only spoken on cooldown.
        if not voice_prompt and match.issues and now - self.last_voice_at >= self.voice_cooldown_seconds:
            voice_prompt = match.issues[0]

        if voice_prompt:
            self.last_voice_at = now

        return self._response(current_detected, match.quality, match.issues, voice_prompt, accepted)

    def _response(
        self,
        detected: Optional[SuryaStep],
        quality: float,
        issues: List[str],
        voice_prompt: Optional[str],
        accepted: bool = False,
    ) -> Dict[str, Any]:
        average_quality = float(np.mean(self.total_pose_quality)) if self.total_pose_quality else 0.0
        return {
            "mode": "surya_namaskar",
            "round_count": self.round_count,
            "current_step_number": self.expected_index + 1,
            "expected_step": self.expected_step.value,
            "expected_pose_name": DISPLAY_NAMES[self.expected_step],
            "detected_pose": detected.value if detected else None,
            "detected_pose_name": DISPLAY_NAMES[detected] if detected else "Body not detected",
            "pose_quality": round(float(quality), 1),
            "average_pose_quality": round(average_quality, 1),
            "form_issues": issues,
            "voice_prompt": voice_prompt,
            "step_accepted": accepted,
            "sequence_errors": self.sequence_errors,
            "completed_steps": len(self.step_logs),
        }

    def skip_step(self) -> Dict[str, Any]:
        """Manually or automatically skips current step and advances to the next step in Surya Namaskar sequence."""
        now = time.time()
        skipped_step = self.expected_step
        self.step_logs.append(StepLog(skipped_step.value, now, 60.0, ["Step skipped by user"]))
        self.total_pose_quality.append(60.0)

        if skipped_step == SuryaStep.PRANAMASANA_END or self.expected_index >= len(SEQUENCE) - 1:
            self.round_count += 1
            self.expected_index = 0
            self.last_entered_step = None
            self.recent_candidates.clear()
            voice_prompt = "Round पूरा हुआ! बहुत बढ़िया, अगला राउंड शुरू करें।"
        else:
            self.expected_index += 1
            self.last_entered_step = None
            self.recent_candidates.clear()
            next_step = self.expected_step
            voice_prompt = f"स्टेप स्किप किया गया। अगला आसन: {DISPLAY_NAMES.get(next_step, next_step.value)}"

        self.last_voice_at = now
        return self._response(None, 60.0, [], voice_prompt, accepted=True)

    def end_session_summary(self) -> Dict[str, Any]:
        average = float(np.mean(self.total_pose_quality)) if self.total_pose_quality else 0.0
        if average >= 90:
            grade = "A"
        elif average >= 75:
            grade = "B"
        elif average >= 60:
            grade = "C"
        elif average >= 45:
            grade = "D"
        else:
            grade = "E"

        issue_counter = Counter(issue for log in self.step_logs for issue in log.issues)
        return {
            "exercise_mode": "surya_namaskar",
            "rounds_completed": self.round_count,
            "steps_logged": len(self.step_logs),
            "average_pose_quality": round(average, 1),
            "form_quality": grade,
            "sequence_errors": self.sequence_errors,
            "common_issues": [issue for issue, _ in issue_counter.most_common(3)],
            "report_seed": (
                f"{self.round_count} Surya Namaskar rounds completed. "
                f"Average pose quality: {average:.1f}%. Form grade: {grade}."
            ),
        }


class SuryaAnalyzer:
    """Frame-processing wrapper for SuryaNamaskarAnalyzer.

    Integrates seamlessly into the PostureTrek / PoseCare analysis pipeline,
    satisfying both the standard analyzer interface (`process_frame`, `session_summary`)
    and providing real-time visual skeleton and HUD overlay.
    """

    def __init__(self, model_path: str = "yolo11n-pose.pt") -> None:
        try:
            self.model = YOLO(model_path)
        except Exception:
            self.model = YOLO("yolov8n-pose.pt")

        self.engine = SuryaNamaskarAnalyzer()
        self.rep_log: List[Dict[str, Any]] = []
        self._last_step_count: int = 0

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Process BGR frame, run pose detection, compute Surya metrics, and return annotated frame + metrics."""
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, verbose=False)
        output_rgb = results[0].plot(labels=False, conf=False)
        output_bgr = cv2.cvtColor(output_rgb, cv2.COLOR_RGB2BGR)

        keypoint_data = results[0].keypoints.data if (results[0].keypoints is not None) else []
        if len(keypoint_data) > 0:
            kpts = keypoint_data[0].cpu().numpy()
            metrics = self.engine.analyze(kpts)
        else:
            metrics = self.engine.analyze([])

        # Sync new steps into rep_log
        current_step_count = len(self.engine.step_logs)
        if current_step_count > self._last_step_count:
            for i in range(self._last_step_count, current_step_count):
                log = self.engine.step_logs[i]
                self.rep_log.append({
                    "rep_number": i + 1,
                    "step": log.step,
                    "correct": len(log.issues) == 0,
                    "errors": log.issues,
                    "min_angle": log.quality,
                })
            self._last_step_count = current_step_count

        # Visual HUD overlay on output_bgr
        h, w = output_bgr.shape[:2]
        hud_w = min(w - 20, 500)
        hud_h = 130
        hud_roi = output_bgr[10:10 + hud_h, 10:10 + hud_w]
        overlay = np.zeros_like(hud_roi, dtype=np.uint8)
        overlay[:] = (15, 23, 42)  # Dark slate background
        cv2.addWeighted(overlay, 0.85, hud_roi, 0.15, 0, hud_roi)
        cv2.rectangle(output_bgr, (10, 10), (10 + hud_w, 10 + hud_h), (59, 130, 246), 2)

        step_num = metrics.get("current_step_number", 1)
        exp_name = metrics.get("expected_pose_name", "")
        det_name = metrics.get("detected_pose_name", "Body not detected")
        quality = metrics.get("pose_quality", 0.0)
        rounds = metrics.get("round_count", 0)
        cue = metrics.get("voice_prompt") or (metrics.get("form_issues")[0] if metrics.get("form_issues") else "")

        # Top Header
        cv2.putText(output_bgr, f"Surya Namaskar | Round {rounds + 1} (Step {step_num}/12)", (22, 36),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 2, cv2.LINE_AA)
        # Expected Step
        cv2.putText(output_bgr, f"Target: {exp_name}", (22, 63),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (147, 197, 253), 1, cv2.LINE_AA)
        # Detected & Quality Badge
        color_badge = (74, 222, 128) if quality >= 70 else ((251, 146, 60) if quality >= 40 else (239, 68, 68))
        cv2.putText(output_bgr, f"Current: {det_name} ({quality:.0f}%)", (22, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, color_badge, 1, cv2.LINE_AA)
        # Form Guidance / Cue
        if cue:
            display_cue = (cue[:42] + "...") if len(cue) > 45 else cue
            cv2.putText(output_bgr, f"Tip: {display_cue}", (22, 117),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.44, (254, 240, 138), 1, cv2.LINE_AA)

        # Standard metrics for frontend and database compatibility
        stage_str = f"Step {step_num}/12: {exp_name}"
        feedback_str = metrics.get("voice_prompt") or (
            f"Form Issue: {metrics['form_issues'][0]}" if metrics.get("form_issues")
            else f"Moving well in {exp_name}"
        )

        total_reps = rounds
        correct_reps = rounds
        if rounds == 0 and len(self.engine.step_logs) > 0:
            total_reps = len(self.engine.step_logs)
            correct_reps = max(0, total_reps - self.engine.sequence_errors)

        adapted_metrics = {
            "stage": stage_str,
            "total_reps": total_reps,
            "correct_reps": correct_reps,
            "incorrect_reps": self.engine.sequence_errors,
            "score": quality,
            "accuracy": metrics.get("average_pose_quality", quality),
            "feedback": feedback_str,
            "issues": metrics.get("form_issues", []),
            **metrics,
        }

        return output_bgr, adapted_metrics

    def skip_step(self) -> Dict[str, Any]:
        """Skip step wrapper for SuryaAnalyzer."""
        res = self.engine.skip_step()
        self.rep_log.append({
            "rep_number": len(self.engine.step_logs),
            "step": res.get("expected_step", ""),
            "correct": True,
            "errors": ["Skipped by user"],
            "min_angle": 60.0,
        })
        self._last_step_count = len(self.engine.step_logs)
        return res

    def session_summary(self) -> Dict[str, Any]:
        """Summarize the entire session for database storage and AI reports."""
        raw_summary = self.engine.end_session_summary()
        rounds = raw_summary.get("rounds_completed", 0)
        steps = raw_summary.get("steps_logged", 0)
        seq_errs = raw_summary.get("sequence_errors", 0)
        avg_qual = raw_summary.get("average_pose_quality", 0.0)

        total = rounds if rounds > 0 else steps
        correct = rounds if rounds > 0 else max(0, steps - seq_errs)
        accuracy = avg_qual if avg_qual > 0 else (round(100.0 * correct / total, 1) if total > 0 else 0.0)

        return {
            "total_reps": total,
            "correct_reps": correct,
            "incorrect_reps": seq_errs,
            "accuracy": accuracy,
            "rep_log": self.rep_log,
            "rounds_completed": rounds,
            "steps_logged": steps,
            "form_quality": raw_summary.get("form_quality", "B"),
            "common_issues": raw_summary.get("common_issues", []),
            "report_seed": raw_summary.get("report_seed", ""),
            "exercise_mode": "surya_namaskar",
        }


__all__ = [
    "SuryaNamaskarAnalyzer",
    "SuryaAnalyzer",
    "SuryaStep",
    "SEQUENCE",
    "DISPLAY_NAMES",
    "HINGLISH_CUES",
]