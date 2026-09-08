"""Surya Namaskar full-flow analyzer for PostureTrek / PoseCare.

Includes:
1. SuryaNamaskarAnalyzer: Core 12-step sequence detection engine using 2D pose keypoints.
2. SuryaAnalyzer: Full frame-processing pipeline with YOLO inference, visual HUD overlay,
   and standard PostureTrek analyzer interface (process_frame, session_summary).
3. SURYA_STEP_DETAILS: Authoritative Vedic mantras, breath cues, Drishti, chakras,
   biomechanical alignment checkpoints, and common mistakes for all 12 steps.
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
try:
    from analyzers.device_utils import load_yolo_model
except ImportError:
    from device_utils import load_yolo_model


# Ultralytics COCO-17 keypoint indices.
NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

# --- Tolerances and Acceptance Thresholds ---
# Relaxed to allow natural anatomical variance, stiff hamstrings, soft knees,
# profile/side-camera angles, and limb occlusions.
PADAHASTASANA_BEND_TOLERANCE = 100
PADAHASTASANA_ACCEPT_SCORE = 0.25


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
    SuryaStep.ASHTANGA: "Ashtanga Namaskara (8 Limbs)",
    SuryaStep.BHUJANGASANA: "Bhujangasana (Cobra)",
    SuryaStep.ADHO_MUKHA: "Adho Mukha Svanasana (Downward Dog)",
    SuryaStep.ASHWA_LEFT: "Ashwa Sanchalanasana (Left Leg Forward)",
    SuryaStep.PADAHASTASANA_RETURN: "Padahastasana (Forward Fold)",
    SuryaStep.HASTA_UTTANASANA_RETURN: "Hasta Uttanasana (Raised Arms)",
    SuryaStep.PRANAMASANA_END: "Pranamasana (Prayer Pose)",
}

HINGLISH_CUES: Dict[SuryaStep, str] = {
    SuryaStep.PRANAMASANA: "Seedhe khade hoiye, shoulders relax aur haath chest ke paas Anjali Mudra mein rakhein.",
    SuryaStep.HASTA_UTTANASANA: "Deep Inhale! Haath upar le jao aur spine ko lamba karte hue gentle arch karein.",
    SuryaStep.PADAHASTASANA: "Exhale! Hips se fold karein, zaroorat ho to ghutne halke se bend rakhein.",
    SuryaStep.ASHWA_RIGHT: "Inhale! Daayan pair peeche le jaayein, samne ka knee ankle ke upar 90° rakhein.",
    SuryaStep.DANDASANA: "Breath Hold/Normal! Poori body ko ek straight plank line mein rakhein.",
    SuryaStep.ASHTANGA: "Exhale! Ghutne, chest aur chin floor par lagayein, hips thode uthe rahein.",
    SuryaStep.BHUJANGASANA: "Inhale! Chest ko aage aur upar lift karein, shoulders kaanon se door rakhein.",
    SuryaStep.ADHO_MUKHA: "Exhale! Hips ko upar aur peeche push karein, inverted 'V' shape banayein.",
    SuryaStep.ASHWA_LEFT: "Inhale! Baayan pair dono haathon ke beech laayein, chest open rakhein.",
    SuryaStep.PADAHASTASANA_RETURN: "Exhale! Dono pair saath laakar hips se forward fold karein.",
    SuryaStep.HASTA_UTTANASANA_RETURN: "Inhale! Reech upward, spine ko lamba karke gentle backward bend karein.",
    SuryaStep.PRANAMASANA_END: "Exhale! Haath wapas chest par prayer pose mein laayein. Bahut badhiya!",
}

SURYA_STEP_DETAILS: Dict[SuryaStep, Dict[str, Any]] = {
    SuryaStep.PRANAMASANA: {
        "step_number": 1,
        "sanskrit": "प्रणामासन (Pranamasana)",
        "english": "Prayer Pose",
        "mantra": "ॐ मित्राय नमः",
        "mantra_translit": "Om Mitrāya Namaḥ",
        "mantra_meaning": "Salutations to the friend of all beings.",
        "breathing": "Exhale (रेचक) / Normal Breathing",
        "breathing_type": "exhale",
        "drishti": "भ्रूमध्ये (Bhrumadhya - Eyebrow Center / Straight ahead)",
        "chakra": "अनाहत चक्र (Anahata / Heart Chakra)",
        "alignment_checkpoints": [
            "Feet together or hip-width apart with weight balanced evenly.",
            "Palms pressed together at heart center (Anjali Mudra).",
            "Shoulders relaxed downward, spine tall and lengthened.",
            "Chin parallel to floor, facial muscles relaxed."
        ],
        "common_mistakes": [
            "Hunching or tensing shoulders near ears — keep shoulder blades relaxed.",
            "Arching lower back excessively — gently engage core.",
            "Flaring elbows too high or pressing palms too forcefully."
        ]
    },
    SuryaStep.HASTA_UTTANASANA: {
        "step_number": 2,
        "sanskrit": "हस्त उत्तानासन (Hasta Uttanasana)",
        "english": "Raised Arms Pose",
        "mantra": "ॐ रवये नमः",
        "mantra_translit": "Om Ravaye Namaḥ",
        "mantra_meaning": "Salutations to the radiant, shining one.",
        "breathing": "Inhale (पूरक - Deep Inhalation)",
        "breathing_type": "inhale",
        "drishti": "हस्ताग्र (Hastagra - Upward toward thumbs)",
        "chakra": "विशुद्धि चक्र (Vishuddha / Throat Chakra)",
        "alignment_checkpoints": [
            "Inhale deeply while sweeping arms overhead, biceps beside ears.",
            "Lift the ribcage up out of the pelvis before arching gently back.",
            "Keep knees soft, glutes gently engaged to support the sacrum.",
            "Open the chest upward toward the ceiling, keeping neck neutral."
        ],
        "common_mistakes": [
            "Hinging sharply at the lumbar spine — lengthen upward first, arch thoracic spine.",
            "Letting arms drop behind head while chest stays flat.",
            "Locking or hyper-extending knees."
        ]
    },
    SuryaStep.PADAHASTASANA: {
        "step_number": 3,
        "sanskrit": "पादहस्तासन (Padahastasana)",
        "english": "Hand to Foot Pose (Forward Fold)",
        "mantra": "ॐ सूर्याय नमः",
        "mantra_translit": "Om Sūryāya Namaḥ",
        "mantra_meaning": "Salutations to the inspirer of life and activity.",
        "breathing": "Exhale (रेचक - Full Exhalation)",
        "breathing_type": "exhale",
        "drishti": "नासाग्र (Nasagra - Tip of nose / Shin level)",
        "chakra": "स्वाधिष्ठान चक्र (Swadhisthana / Sacral Chakra)",
        "alignment_checkpoints": [
            "Hinge forward directly from the hip joints, not the waist.",
            "Keep spine long as you lower; soft knees are encouraged for tight hamstrings.",
            "Fingertips or palms resting comfortably beside feet or on shins.",
            "Allow the neck and crown of head to release fully downward."
        ],
        "common_mistakes": [
            "Rounding the upper back excessively to reach the floor — bend knees instead.",
            "Locking knees stiffly, straining hamstring tendons.",
            "Craning the neck upward — let head hang naturally."
        ]
    },
    SuryaStep.ASHWA_RIGHT: {
        "step_number": 4,
        "sanskrit": "अश्व संचालासना (Ashwa Sanchalanasana)",
        "english": "Equestrian Pose (Right Leg Back)",
        "mantra": "ॐ भानवे नमः",
        "mantra_translit": "Om Bhānave Namaḥ",
        "mantra_meaning": "Salutations to the one who illuminates the universe.",
        "breathing": "Inhale (पूरक - Deep Inhalation)",
        "breathing_type": "inhale",
        "drishti": "भ्रूमध्ये (Bhrumadhya - Eyebrow center / Gently upward)",
        "chakra": "आज्ञा चक्र (Ajna / Third Eye Chakra)",
        "alignment_checkpoints": [
            "Step right leg far back, placing right knee and top of foot gently down.",
            "Front left knee directly stacked over left ankle at ~90 degrees.",
            "Press hips forward and down while lifting chest and heart.",
            "Fingertips frame front foot on the floor for balance."
        ],
        "common_mistakes": [
            "Front knee overshooting beyond toes (stressing knee joint) — slide foot forward.",
            "Collapsing chest heavily onto front thigh — lift sternum.",
            "Rotating hips sideways — square hips forward."
        ]
    },
    SuryaStep.DANDASANA: {
        "step_number": 5,
        "sanskrit": "दंडासन / कुंभकासन (Dandasana / Phalakasana)",
        "english": "Plank Pose (Stick Pose)",
        "mantra": "ॐ खगाय नमः",
        "mantra_translit": "Om Khagāya Namaḥ",
        "mantra_meaning": "Salutations to the one who moves through the sky.",
        "breathing": "Retain Breath (कुम्भक) or Steady Breath",
        "breathing_type": "hold",
        "drishti": "नासाग्र (Nasagra - Floor 1-2 feet ahead)",
        "chakra": "विशुद्धि / मणिपुर चक्र (Vishuddha / Manipura)",
        "alignment_checkpoints": [
            "Step front leg back so feet are hip-width, body in one straight diagonal line.",
            "Shoulders stacked above wrists; soft elbow bend and ~65° torso-hip variation are accepted.",
            "Engage abdominal core and glutes to keep pelvis in neutral line.",
            "Push the floor away firmly to broaden across shoulder blades."
        ],
        "common_mistakes": [
            "Sagging hips down (hyperextending lower spine) — draw belly button to spine.",
            "Piking hips too high into Downward Dog prematurely.",
            "Looking back at feet and straining cervical spine."
        ]
    },
    SuryaStep.ASHTANGA: {
        "step_number": 6,
        "sanskrit": "अष्टांग नमस्कार (Ashtanga Namaskara)",
        "english": "Eight-Limbed Salutation",
        "mantra": "ॐ पूष्णे नमः",
        "mantra_translit": "Om Pūṣṇe Namaḥ",
        "mantra_meaning": "Salutations to the giver of nourishment and strength.",
        "breathing": "Exhale (रेचक - Complete Exhalation)",
        "breathing_type": "exhale",
        "drishti": "नासाग्र (Nasagra - Floor / Tip of nose)",
        "chakra": "मणिपुर चक्र (Manipura / Solar Plexus Chakra)",
        "alignment_checkpoints": [
            "8 contact points touch floor: 2 feet (toes), 2 knees, 2 palms, chest, chin.",
            "Lower knees first, then chest and chin between palms.",
            "Keep hips and abdomen lifted slightly off the floor.",
            "Keep elbows tucked closely alongside ribs, pointing back."
        ],
        "common_mistakes": [
            "Collapsing flat onto the belly — keep hips elevated.",
            "Flaring elbows out to the sides instead of hugging ribs.",
            "Lowering forehead instead of chin/chest."
        ]
    },
    SuryaStep.BHUJANGASANA: {
        "step_number": 7,
        "sanskrit": "भुजंगासन (Bhujangasana)",
        "english": "Cobra Pose",
        "mantra": "ॐ हिरण्यगर्भाय नमः",
        "mantra_translit": "Om Hiraṇyagarbhāya Namaḥ",
        "mantra_meaning": "Salutations to the golden cosmic source.",
        "breathing": "Inhale (पूरक - Deep Inhalation)",
        "breathing_type": "inhale",
        "drishti": "भ्रूमध्ये (Bhrumadhya - Eyebrow center / Upward)",
        "chakra": "स्वाधिष्ठान चक्र (Swadhisthana / Sacral Chakra)",
        "alignment_checkpoints": [
            "Slide forward, press tops of feet and pubic bone into mat.",
            "Use back muscles to lift upper chest; hands provide light support.",
            "Keep elbows slightly bent and tucked close to ribcage.",
            "Roll shoulders back and down away from the ears."
        ],
        "common_mistakes": [
            "Locking straight arms and jamming shoulders into ears.",
            "Pinching lower back by lifting too high without abdominal support.",
            "Lifting hips and thighs off floor (that's Upward Dog, not Cobra)."
        ]
    },
    SuryaStep.ADHO_MUKHA: {
        "step_number": 8,
        "sanskrit": "अधोमुख श्वानासन (Adho Mukha Svanasana)",
        "english": "Downward-Facing Dog Pose",
        "mantra": "ॐ मरीचये नमः",
        "mantra_translit": "Om Marīcaye Namaḥ",
        "mantra_meaning": "Salutations to the shining rays of dawn.",
        "breathing": "Exhale (रेचक - Full Exhalation)",
        "breathing_type": "exhale",
        "drishti": "नाभि (Nabhi - Navel center)",
        "chakra": "विशुद्धि चक्र (Vishuddha / Throat Chakra)",
        "alignment_checkpoints": [
            "Tuck toes and push hips up and back, forming an inverted 'V'.",
            "Press palms firmly down with fingers spread; lengthen through spine.",
            "Knees can have a soft bend if hamstrings are tight; focus on spine length.",
            "Relax head between upper arms; let heels sink toward mat."
        ],
        "common_mistakes": [
            "Rounding the spine to force heels flat on the ground — bend knees instead!",
            "Dumping excessive weight into wrists — press actively through fingertips.",
            "Shoulders crowding neck — rotate upper arms outward."
        ]
    },
    SuryaStep.ASHWA_LEFT: {
        "step_number": 9,
        "sanskrit": "अश्व संचालासना (Ashwa Sanchalanasana)",
        "english": "Equestrian Pose (Left Leg Forward)",
        "mantra": "ॐ आदित्याय नमः",
        "mantra_translit": "Om Ādityāya Namaḥ",
        "mantra_meaning": "Salutations to the cosmic child of Aditi.",
        "breathing": "Inhale (पूरक - Deep Inhalation)",
        "breathing_type": "inhale",
        "drishti": "भ्रूमध्ये (Bhrumadhya - Eyebrow center)",
        "chakra": "आज्ञा चक्र (Ajna / Third Eye Chakra)",
        "alignment_checkpoints": [
            "Step opposite leg (left) forward smoothly between palms.",
            "Ensure front knee is aligned directly over ankle at 90 degrees.",
            "Rest back (right) knee and foot softly on the mat.",
            "Open chest proudly, lengthen throat and gaze gently upward."
        ],
        "common_mistakes": [
            "Foot landing halfway behind hands — use hand to help guide foot forward.",
            "Hips twisting or tilting off-center.",
            "Compressing the neck back too abruptly."
        ]
    },
    SuryaStep.PADAHASTASANA_RETURN: {
        "step_number": 10,
        "sanskrit": "पादहस्तासन (Padahastasana)",
        "english": "Hand to Foot Pose (Forward Fold Return)",
        "mantra": "ॐ सवित्रे नमः",
        "mantra_translit": "Om Savitre Namaḥ",
        "mantra_meaning": "Salutations to the benevolent creator and life-giver.",
        "breathing": "Exhale (रेचक - Full Exhalation)",
        "breathing_type": "exhale",
        "drishti": "नासाग्र (Nasagra - Shin / Nose tip)",
        "chakra": "स्वाधिष्ठान चक्र (Swadhisthana / Sacral Chakra)",
        "alignment_checkpoints": [
            "Step back foot forward beside front foot, hip-width or feet together.",
            "Fold forward from hip joints, releasing torso toward thighs.",
            "Soft bend in knees is completely acceptable to protect hamstrings.",
            "Let head, neck, and shoulders hang completely relaxed."
        ],
        "common_mistakes": [
            "Stiff-legged hyper-extension pulling at lower back.",
            "Pulling aggressively on ankles with arm muscles."
        ]
    },
    SuryaStep.HASTA_UTTANASANA_RETURN: {
        "step_number": 11,
        "sanskrit": "हस्त उत्तानासन (Hasta Uttanasana)",
        "english": "Raised Arms Pose (Return)",
        "mantra": "ॐ अर्काय नमः",
        "mantra_translit": "Om Arkāya Namaḥ",
        "mantra_meaning": "Salutations to the one who is worthy of universal praise.",
        "breathing": "Inhale (पूरक - Deep Inhalation)",
        "breathing_type": "inhale",
        "drishti": "हस्ताग्र (Hastagra - Upward to thumbs)",
        "chakra": "विशुद्धि चक्र (Vishuddha / Throat Chakra)",
        "alignment_checkpoints": [
            "Inhale and sweep arms out and up with a long, uncoiling spine.",
            "Rise smoothly to standing, lifting tall through ribs.",
            "Gentle back arch from upper thoracic spine.",
            "Keep feet rooted firmly with all four corners bearing weight."
        ],
        "common_mistakes": [
            "Standing up quickly with a rounded spine, causing dizziness.",
            "Collapsing into the lumbar curve without core support."
        ]
    },
    SuryaStep.PRANAMASANA_END: {
        "step_number": 12,
        "sanskrit": "प्रणामासन (Pranamasana)",
        "english": "Prayer Pose (Completion)",
        "mantra": "ॐ भास्कराय नमः",
        "mantra_translit": "Om Bhāskarāya Namaḥ",
        "mantra_meaning": "Salutations to the illuminator who brings light to the world.",
        "breathing": "Exhale (रेचक - Calm Exhalation)",
        "breathing_type": "exhale",
        "drishti": "नासाग्र / भ्रूमध्ये (Nose tip or eyes closed in stillness)",
        "chakra": "अनाहत चक्र (Anahata / Heart Chakra)",
        "alignment_checkpoints": [
            "Bring hands together at heart center in Anjali Mudra as you exhale.",
            "Spine upright, shoulders dropped, body steady and centered.",
            "Take 1-2 calm, natural breaths to integrate the flow.",
            "Prepare mentally and physically for the next round."
        ],
        "common_mistakes": [
            "Rushing out of the posture before breathing stabilizes.",
            "Slouching shoulders forward."
        ]
    }
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
    """Return x,y point only if its confidence is adequate (lowered threshold: 0.20)."""
    if index >= len(kpts):
        return None
    p = kpts[index]
    if len(p) >= 3 and float(p[2]) < 0.20:
        return None
    return np.asarray(p[:2], dtype=np.float32)


def _midpoint(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> Optional[np.ndarray]:
    """Graceful midpoint: returns either point if the other is occluded in profile view."""
    if a is None and b is None:
        return None
    if a is None:
        return b.copy()
    if b is None:
        return a.copy()
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


def _position_score(a: Optional[np.ndarray], b: Optional[np.ndarray], full_credit_distance: float) -> float:
    """Graduated 0..1 score for how far `a` is above `b` (image coords: smaller y is higher)."""
    if a is None or b is None or full_credit_distance <= 1e-6:
        return 0.0
    diff = float(b[1]) - float(a[1])  # positive if a is physically above b
    return float(np.clip(diff / full_credit_distance, 0.0, 1.0))


class SuryaNamaskarAnalyzer:
    """Detects a full, continuous 12-step Surya Namaskar flow with generous tolerance.

    Input expected by analyze(): a single person's YOLO keypoints array of
    shape (17, 3) or (17, 2), ordered in COCO-17 order.
    """

    def __init__(
        self,
        stable_frames: int = 2,
        minimum_pose_confidence: float = 0.30,
        voice_cooldown_seconds: float = 3.5,
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
        self._mismatch_counter = 0

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

        # Midpoints with single-side graceful fallback for side/profile views
        shoulder_mid = _midpoint(ls, rs)
        hip_mid = _midpoint(lh, rh)
        ankle_mid = _midpoint(la, ra)
        knee_mid = _midpoint(lk, rk)

        # Torso angle (falls back to knee_mid if ankle is occluded)
        lower_ref = ankle_mid if ankle_mid is not None else knee_mid
        torso_angle = _angle(shoulder_mid, hip_mid, lower_ref)

        left_knee_angle = _angle(lh, lk, la)
        right_knee_angle = _angle(rh, rk, ra)
        left_elbow_angle = _angle(ls, le, lw)
        right_elbow_angle = _angle(rs, re, rw)
        left_hip_angle = _angle(ls, lh, lk)
        right_hip_angle = _angle(rs, rh, rk)

        body_scale = _distance(shoulder_mid, hip_mid)
        if body_scale is None or body_scale < 15.0:
            body_scale = 100.0

        wrist_distance = _distance(lw, rw)

        return {
            "nose": nose, "ls": ls, "rs": rs, "le": le, "re": re,
            "lw": lw, "rw": rw, "lh": lh, "rh": rh, "lk": lk,
            "rk": rk, "la": la, "ra": ra, "shoulder_mid": shoulder_mid,
            "hip_mid": hip_mid, "ankle_mid": ankle_mid, "knee_mid": knee_mid,
            "torso_angle": torso_angle,
            "left_knee_angle": left_knee_angle, "right_knee_angle": right_knee_angle,
            "left_elbow_angle": left_elbow_angle, "right_elbow_angle": right_elbow_angle,
            "left_hip_angle": left_hip_angle, "right_hip_angle": right_hip_angle,
            "body_scale": body_scale, "wrist_distance": wrist_distance,
        }

    def _classify(self, kpts: np.ndarray) -> PoseMatch:
        f = self._features(kpts)

        # Resilient visibility check: requires at least 1 shoulder, 1 hip, and 1 leg landmark
        has_shoulder = (f["ls"] is not None) or (f["rs"] is not None)
        has_hip = (f["lh"] is not None) or (f["rh"] is not None)
        has_leg = (f["lk"] is not None or f["rk"] is not None or f["la"] is not None or f["ra"] is not None)
        if not (has_shoulder and has_hip and has_leg):
            return PoseMatch(None, 0.0, 0.0, ["Step into frame so body is visible"])

        candidates: List[PoseMatch] = []
        scale = f["body_scale"]

        # 1. Prayer pose (Pranamasana): upright posture + hands near center/chest
        upright = _near(f["torso_angle"], 180, 60)
        hands_together = 0.8
        if f["wrist_distance"] is not None:
            hands_together = _near(f["wrist_distance"] / scale, 0.30, 0.90)

        wrists_chest = 0.5
        any_wrist = f["lw"] if f["lw"] is not None else f["rw"]
        if any_wrist is not None and f["shoulder_mid"] is not None:
            mid = _midpoint(f["lw"], f["rw"])
            wrist_ref = mid if mid is not None else any_wrist
            if abs(float(wrist_ref[1]) - f["shoulder_mid"][1]) < scale * 1.5:
                wrists_chest = 1.0

        pranama_score = 0.45 * upright + 0.35 * hands_together + 0.20 * wrists_chest
        candidates.append(PoseMatch(
            SuryaStep.PRANAMASANA, pranama_score, pranama_score * 100,
            [] if pranama_score >= 0.40 else ["Stand upright with hands near chest"]
        ))

        # 2. Raised-arms pose (Hasta Uttanasana): arms raised above shoulders
        left_arm_up = _position_score(f["lw"], f["ls"], scale * 0.12) if f["lw"] is not None and f["ls"] is not None else None
        right_arm_up = _position_score(f["rw"], f["rs"], scale * 0.12) if f["rw"] is not None and f["rs"] is not None else None
        arm_scores = [s for s in [left_arm_up, right_arm_up] if s is not None]
        arms_up = float(np.mean(arm_scores)) if arm_scores else 0.0

        hasta_score = 0.60 * arms_up + 0.40 * upright
        candidates.append(PoseMatch(
            SuryaStep.HASTA_UTTANASANA, hasta_score, hasta_score * 100,
            [] if arms_up >= 0.35 else ["Raise arms comfortably overhead"]
        ))

        # 3. Forward fold (Padahastasana): hip hinge & torso angle (knees can bend!)
        hip_angles = [a for a in [f["left_hip_angle"], f["right_hip_angle"]] if a is not None]
        if hip_angles:
            hip_hinge = 1.0 - float(np.mean([_near(a, 180, PADAHASTASANA_BEND_TOLERANCE) for a in hip_angles]))
        else:
            hip_hinge = 0.5
        torso_bend = 1.0 - _near(f["torso_angle"], 180, PADAHASTASANA_BEND_TOLERANCE)
        fold_amount = 0.65 * hip_hinge + 0.35 * torso_bend

        knee_angles = [k for k in [f["left_knee_angle"], f["right_knee_angle"]] if k is not None]
        knee_score = float(np.mean([_near(k, 160, 85) for k in knee_angles])) if knee_angles else 0.8

        fold_score = 0.75 * fold_amount + 0.25 * knee_score
        candidates.append(PoseMatch(
            SuryaStep.PADAHASTASANA, fold_score, fold_score * 100,
            [] if fold_score >= PADAHASTASANA_ACCEPT_SCORE else ["Fold forward gently from hips"]
        ))

        # 4 & 9. Low lunges (Ashwa Sanchalanasana): one knee bent, torso leaning
        left_knee = f["left_knee_angle"] if f["left_knee_angle"] is not None else 120.0
        right_knee = f["right_knee_angle"] if f["right_knee_angle"] is not None else 120.0
        left_bent = _near(left_knee, 95, 80)
        right_bent = _near(right_knee, 95, 80)
        lunge_torso = _near(f["torso_angle"], 160, 80)

        if left_bent >= right_bent:
            lunge_score = 0.65 * left_bent + 0.35 * lunge_torso
            candidates.append(PoseMatch(
                SuryaStep.ASHWA_LEFT, lunge_score, lunge_score * 100,
                [] if lunge_score >= 0.35 else ["Bend front knee comfortably in lunge"]
            ))
        else:
            lunge_score = 0.65 * right_bent + 0.35 * lunge_torso
            candidates.append(PoseMatch(
                SuryaStep.ASHWA_RIGHT, lunge_score, lunge_score * 100,
                [] if lunge_score >= 0.35 else ["Bend front knee comfortably in lunge"]
            ))

        # 5. Plank (Dandasana): body in diagonal line with generous torso-hip and arm relaxation
        # Torso-hip line: allows ~65° of relaxation/deviation from 180° (angles >= 115° remain accepted)
        hip_angles_plank = [a for a in [f["left_hip_angle"], f["right_hip_angle"]] if a is not None]
        hip_line_score = float(np.mean([_near(a, 180, 100) for a in hip_angles_plank])) if hip_angles_plank else 0.85
        torso_line = _near(f["torso_angle"], 180, 100)
        # 65° relaxation credit: if torso or hip angle is within 65° of straight (>= 115°), score receives strong base credit
        torso_hip_valid = (
            (f["torso_angle"] is None or f["torso_angle"] >= 115.0) and
            (not hip_angles_plank or any(a >= 115.0 for a in hip_angles_plank))
        )
        raw_plank_line = 0.50 * torso_line + 0.50 * hip_line_score
        plank_line = max(0.55, raw_plank_line) if torso_hip_valid else raw_plank_line

        # Arm angle relaxation: allow soft elbows, micro-bends, or wide hand placements (115°-180°)
        elbow_angles = [e for e in [f["left_elbow_angle"], f["right_elbow_angle"]] if e is not None]
        if elbow_angles:
            # Full credit for elbows >= 130°, generous credit down to 105°
            arm_scores = [
                1.0 if e >= 130.0 else max(0.65, _near(e, 150, 85))
                for e in elbow_angles
            ]
            arms_relaxed = float(np.mean(arm_scores))
        else:
            arms_relaxed = 0.85

        plank_score = 0.60 * plank_line + 0.40 * arms_relaxed
        candidates.append(PoseMatch(
            SuryaStep.DANDASANA, plank_score, plank_score * 100,
            [] if plank_score >= 0.30 else ["Align shoulders, hips and legs in a plank line"]
        ))

        # 6. Ashtanga Namaskara: elbows bent + hips elevated
        elbow_bends = [1.0 - _near(e, 175, 90) for e in elbow_angles] if elbow_angles else [0.7]
        elbows_bent = float(np.mean(elbow_bends))
        hips_high = _position_score(f["hip_mid"], f["shoulder_mid"], scale * 0.12)
        ashtanga_score = 0.55 * elbows_bent + 0.45 * hips_high
        candidates.append(PoseMatch(
            SuryaStep.ASHTANGA, ashtanga_score, ashtanga_score * 100,
            [] if ashtanga_score >= 0.30 else ["Touch knees, chest, chin to floor with hips lifted"]
        ))

        # 7. Cobra (Bhujangasana): chest lifted, shoulders above hips, elbows softly bent
        chest_lift = _position_score(f["shoulder_mid"], f["hip_mid"], scale * 0.12)
        elbow_bend = float(np.mean([_near(e, 135, 85) for e in elbow_angles])) if elbow_angles else 0.7
        cobra_score = 0.65 * chest_lift + 0.35 * elbow_bend
        candidates.append(PoseMatch(
            SuryaStep.BHUJANGASANA, cobra_score, cobra_score * 100,
            [] if chest_lift >= 0.30 else ["Gently lift chest forward and upward"]
        ))

        # 8. Downward Dog (Adho Mukha Svanasana): inverted V with hips lifted high
        hips_vs_shoulders = _position_score(f["hip_mid"], f["shoulder_mid"], scale * 0.20)
        lower_ref_dog = f["ankle_mid"] if f["ankle_mid"] is not None else f["knee_mid"]
        hips_vs_lower = _position_score(f["hip_mid"], lower_ref_dog, scale * 0.35)
        hips_high_dog = 0.5 * hips_vs_shoulders + 0.5 * hips_vs_lower

        hip_angles_dog = [a for a in [f["left_hip_angle"], f["right_hip_angle"]] if a is not None]
        hip_open = float(np.mean([_near(a, 80, 80) for a in hip_angles_dog])) if hip_angles_dog else 0.7
        dog_score = 0.70 * hips_high_dog + 0.30 * hip_open
        candidates.append(PoseMatch(
            SuryaStep.ADHO_MUKHA, dog_score, dog_score * 100,
            [] if hips_high_dog >= 0.30 else ["Push hips up and back into inverted V"]
        ))

        best = max(candidates, key=lambda item: item.confidence)
        return best

    def _mapped_candidate_for_expected(self, match: PoseMatch) -> PoseMatch:
        """Map repeated poses and bilateral lunges to the current phase of the sequence."""
        # 1. Bilateral lunge mapping: users often switch sides or face different camera orientation
        if match.step in (SuryaStep.ASHWA_RIGHT, SuryaStep.ASHWA_LEFT):
            if self.expected_step in (SuryaStep.ASHWA_RIGHT, SuryaStep.ASHWA_LEFT):
                return PoseMatch(self.expected_step, match.confidence, match.quality, match.issues)

        # 2. Return poses
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
            self._mismatch_counter = 0
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
            # Only count a sequence error when an incorrect pose is held firmly (not transient frames)
            if raw_match.step is not None and raw_match.confidence >= 0.55:
                self._mismatch_counter += 1
                if self._mismatch_counter == 8:  # held for ~0.8s out of sequence
                    self.sequence_errors += 1
            else:
                self._mismatch_counter = 0

        # Form feedback spoken on cooldown
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
        step_detail = SURYA_STEP_DETAILS.get(self.expected_step, {})

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
            "step_details": step_detail,
        }

    def skip_step(self) -> Dict[str, Any]:
        """Manually or automatically skips current step and advances to next step."""
        now = time.time()
        skipped_step = self.expected_step
        self.step_logs.append(StepLog(skipped_step.value, now, 0.0, ["चरण छोड़ दिया गया (Step skipped by user)"]))
        self.total_pose_quality.append(0.0)

        if skipped_step == SuryaStep.PRANAMASANA_END or self.expected_index >= len(SEQUENCE) - 1:
            self.round_count += 1
            self.expected_index = 0
            self.last_entered_step = None
            self.recent_candidates.clear()
            voice_prompt = "Round pura hua! Bahut badhiya, agla round shuru karein."
        else:
            self.expected_index += 1
            self.last_entered_step = None
            self.recent_candidates.clear()
            next_step = self.expected_step
            voice_prompt = f"Step skip kiya gaya. Agla aasan: {DISPLAY_NAMES.get(next_step, next_step.value)}"

        self.last_voice_at = now
        return self._response(None, 75.0, [], voice_prompt, accepted=True)

    def end_session_summary(self) -> Dict[str, Any]:
        completed_qualities = [
            log.quality for log in self.step_logs
            if not any("skip" in iss.lower() for iss in log.issues)
        ]
        average = float(np.mean(completed_qualities)) if completed_qualities else 0.0
        if average >= 85:
            grade = "A+" if average >= 92 else "A"
        elif average >= 70:
            grade = "B"
        elif average >= 55:
            grade = "C"
        elif average >= 40:
            grade = "D"
        else:
            grade = "E"

        issue_counter = Counter(
            issue for log in self.step_logs
            for issue in log.issues
            if "skip" not in issue.lower()
        )

        # Build comprehensive 12-step sequence analysis
        step_analysis = []
        logs_by_step = {}
        for log in self.step_logs:
            logs_by_step[log.step] = log

        for idx, step_enum in enumerate(SEQUENCE):
            step_num = idx + 1
            step_key = step_enum.value
            step_name = DISPLAY_NAMES.get(step_enum, step_key)
            step_meta = SURYA_STEP_DETAILS.get(step_enum, {})
            sanskrit_name = step_meta.get("sanskrit", step_name)

            if step_key in logs_by_step:
                log = logs_by_step[step_key]
                is_skipped = any("skip" in iss.lower() for iss in log.issues)
                quality = 0.0 if is_skipped else round(float(log.quality), 1)
                status = "skipped" if is_skipped else ("correct" if quality >= 70 else "needs_improvement")
                issues = [iss for iss in log.issues] if log.issues else []
            else:
                is_skipped = True
                quality = 0.0
                status = "skipped"
                issues = ["सत्र समाप्त होने के कारण यह चरण छूट गया (Skipped / Not reached)"]

            step_analysis.append({
                "step_number": step_num,
                "step_id": step_key,
                "name": sanskrit_name,
                "english_name": step_meta.get("english", step_name),
                "status": status,
                "is_skipped": is_skipped,
                "accuracy": quality,
                "issues": issues,
                "breath": step_meta.get("breathing", ""),
                "mantra": step_meta.get("mantra", ""),
            })

        return {
            "exercise_mode": "surya_namaskar",
            "rounds_completed": self.round_count,
            "steps_logged": len(self.step_logs),
            "average_pose_quality": round(average, 1),
            "form_quality": grade,
            "sequence_errors": self.sequence_errors,
            "common_issues": [issue for issue, _ in issue_counter.most_common(3)],
            "step_analysis": step_analysis,
            "report_seed": (
                f"{self.round_count} Surya Namaskar rounds completed. "
                f"Average pose quality: {average:.1f}%. Form grade: {grade}."
            ),
        }


class SuryaAnalyzer:
    """Frame-processing wrapper for SuryaNamaskarAnalyzer.

    Integrates into the PostureTrek / PoseCare analysis pipeline,
    providing real-time visual HUD overlay with authentic Sanskrit guidance and metrics.
    """

    def __init__(self, model_path: str = "yolo11n-pose.pt") -> None:
        self.model, self.device = load_yolo_model(model_path)

        self.engine = SuryaNamaskarAnalyzer()
        self.rep_log: List[Dict[str, Any]] = []
        self._last_step_count: int = 0

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Process BGR frame, run pose detection, compute Surya metrics, and return annotated frame + metrics."""
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.model(frame_rgb, device=self.device, verbose=False)
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

        # Standard metrics for frontend and database compatibility
        step_num = metrics.get("current_step_number", 1)
        exp_name = metrics.get("expected_pose_name", "")
        quality = metrics.get("pose_quality", 0.0)
        rounds = metrics.get("round_count", 0)

        stage_str = f"Step {step_num}/12: {exp_name}"
        feedback_str = metrics.get("voice_prompt") or (
            f"Guidance: {metrics['form_issues'][0]}" if metrics.get("form_issues")
            else f"Flowing gracefully in {exp_name}"
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
            "min_angle": 75.0,
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
            "step_analysis": raw_summary.get("step_analysis", []),
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
    "SURYA_STEP_DETAILS",
]