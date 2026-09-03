"""Personal Body Map and Calibration for PoseCare.

Translates raw keypoint detections into human-readable body groups (Head, Shoulders,
Arms, Torso, Hips, Legs) and produces a calibrated BodyMap.

Supports:
- Standard Mode: Full landmark set reliably visible.
- Adaptive Mode: Some limbs/joints are absent or obstructed (e.g. wheelchair users,
  amputees, or framed setups). Related posture metrics are dropped rather than failed.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
import cv2
import numpy as np

# --- COCO Keypoint Definitions ---
NOSE = 0
LEFT_EYE, RIGHT_EYE = 1, 2
LEFT_EAR, RIGHT_EAR = 3, 4
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_ELBOW, RIGHT_ELBOW = 7, 8
LEFT_WRIST, RIGHT_WRIST = 9, 10
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16

KEYPOINT_NAMES = {
    0: "Nose",
    1: "Left Eye", 2: "Right Eye",
    3: "Left Ear", 4: "Right Ear",
    5: "Left Shoulder", 6: "Right Shoulder",
    7: "Left Elbow", 8: "Right Elbow",
    9: "Left Wrist", 10: "Right Wrist",
    11: "Left Hip", 12: "Right Hip",
    13: "Left Knee", 14: "Right Knee",
    15: "Left Ankle", 16: "Right Ankle",
}

# Human-readable Body Groups (verbatim names used across UI)
HEAD = "Head"
SHOULDERS = "Shoulders"
LEFT_ARM = "Left arm"
RIGHT_ARM = "Right arm"
TORSO = "Torso"
HIPS = "Hips"
LEFT_LEG = "Left leg"
RIGHT_LEG = "Right leg"

BODY_GROUPS: List[Tuple[str, Tuple[int, ...]]] = [
    (HEAD, (NOSE,)),
    (SHOULDERS, (LEFT_SHOULDER, RIGHT_SHOULDER)),
    (LEFT_ARM, (LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST)),
    (RIGHT_ARM, (RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST)),
    (TORSO, (LEFT_SHOULDER, RIGHT_SHOULDER, LEFT_HIP, RIGHT_HIP)),
    (HIPS, (LEFT_HIP, RIGHT_HIP)),
    (LEFT_LEG, (LEFT_HIP, LEFT_KNEE, LEFT_ANKLE)),
    (RIGHT_LEG, (RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE)),
]

CORE_KEYPOINTS: List[int] = [
    LEFT_SHOULDER, RIGHT_SHOULDER,
    LEFT_ELBOW, RIGHT_ELBOW,
    LEFT_WRIST, RIGHT_WRIST,
    LEFT_HIP, RIGHT_HIP,
    LEFT_KNEE, RIGHT_KNEE,
    LEFT_ANKLE, RIGHT_ANKLE,
]

CONFIDENCE_THRESHOLD = 0.30
TRACKABLE_HIT_RATIO = 0.55
DEFAULT_CALIBRATION_SECONDS = 3.0


class BodyMode(str, Enum):
    STANDARD = "standard"  # Full symmetric landmark set available
    ADAPTIVE = "adaptive"  # Some landmarks unavailable; metrics adapted accordingly


@dataclass
class BodyMap:
    """The result of calibration. Decides applicability of posture metrics."""
    trackable: Set[int] = field(default_factory=set)
    hit_ratio: Dict[int, float] = field(default_factory=dict)
    mode: BodyMode = BodyMode.STANDARD
    frames_seen: int = 0
    missing_groups: List[str] = field(default_factory=list)
    group_status: List[Dict[str, any]] = field(default_factory=list)
    summary: str = ""

    def is_trackable(self, kp: int) -> bool:
        return kp in self.trackable

    def all_trackable(self, *kps: int) -> bool:
        return all(kp in self.trackable for kp in kps)

    def to_dict(self) -> dict:
        return {
            "mode": self.mode.value if isinstance(self.mode, BodyMode) else str(self.mode),
            "trackable": sorted(list(self.trackable)),
            "hit_ratio": {str(k): round(v, 2) for k, v in self.hit_ratio.items()},
            "frames_seen": self.frames_seen,
            "missing_groups": self.missing_groups,
            "group_status": self.group_status,
            "summary": self.summary,
            "group_summary": self.get_group_summary(),
        }

    def get_group_summary(self) -> str:
        if not self.missing_groups:
            return "Tracking your whole body."
        return "Tracking everything except: " + ", ".join(self.missing_groups).lower() + "."


class BodyMapCalibrator:
    """Accumulates frames during the calibration window and produces a BodyMap."""

    def __init__(self, duration: float = DEFAULT_CALIBRATION_SECONDS) -> None:
        self.duration = duration
        self._counts: Dict[int, int] = {}
        self._frames = 0
        self._start_time: Optional[float] = None
        self._last_time: Optional[float] = None

    def reset(self) -> None:
        self._counts.clear()
        self._frames = 0
        self._start_time = None
        self._last_time = None

    @property
    def frames(self) -> int:
        return self._frames

    def progress(self, now: Optional[float] = None) -> float:
        if self._start_time is None:
            return 0.0
        now = now or time.time()
        return min(1.0, (now - self._start_time) / self.duration)

    def is_complete(self, now: Optional[float] = None) -> bool:
        if self._start_time is None:
            return False
        now = now or time.time()
        return (now - self._start_time) >= self.duration or self._frames >= 30

    def observe(self, keypoints: Optional[np.ndarray], now: Optional[float] = None) -> None:
        """Observe keypoints from YOLO output: shape (17, 3) with (x, y, conf)."""
        now = now or time.time()
        if self._start_time is None:
            self._start_time = now
        self._last_time = now
        self._frames += 1

        if keypoints is None or len(keypoints) == 0:
            return

        for idx in range(min(17, len(keypoints))):
            conf = float(keypoints[idx][2]) if len(keypoints[idx]) > 2 else 0.0
            if conf >= CONFIDENCE_THRESHOLD:
                self._counts[idx] = self._counts.get(idx, 0) + 1

    def build(self) -> BodyMap:
        if self._frames == 0:
            # Fallback to standard if no frames were seen
            group_status = [{"name": name, "tracked": True} for name, _ in BODY_GROUPS]
            return BodyMap(
                trackable=set(range(17)),
                hit_ratio={i: 1.0 for i in range(17)},
                mode=BodyMode.STANDARD,
                frames_seen=0,
                missing_groups=[],
                group_status=group_status,
                summary="Standard mode — full landmark set available.",
            )

        ratios = {idx: self._counts.get(idx, 0) / self._frames for idx in range(17)}
        trackable = {idx for idx, r in ratios.items() if r >= TRACKABLE_HIT_RATIO}

        # Evaluate body groups
        group_status = []
        missing_groups = []
        for name, kps in BODY_GROUPS:
            is_tracked = all(kp in trackable for kp in kps)
            group_status.append({"name": name, "tracked": is_tracked})
            if not is_tracked:
                missing_groups.append(name)

        # Decide mode
        missing_core = [kp for kp in CORE_KEYPOINTS if kp not in trackable]
        mode = BodyMode.STANDARD if len(missing_core) == 0 else BodyMode.ADAPTIVE

        if mode is BodyMode.STANDARD:
            summary = "Standard mode — full landmark set available."
        else:
            if missing_groups:
                summary = f"Adaptive mode — not tracking: {', '.join(missing_groups)}. Related metrics are dropped, not failed."
            else:
                summary = "Adaptive mode — tracking optimized for visible joints."

        return BodyMap(
            trackable=trackable,
            hit_ratio=ratios,
            mode=mode,
            frames_seen=self._frames,
            missing_groups=missing_groups,
            group_status=group_status,
            summary=summary,
        )


def draw_calibration_hud(frame: np.ndarray, progress: float, detected_groups: Optional[List[str]] = None) -> np.ndarray:
    """Renders a sleek calibration progress bar and status HUD on the frame."""
    out = frame.copy()
    h, w = out.shape[:2]
    progress = max(0.0, min(1.0, float(progress)))

    # Colors (BGR)
    CYAN_ACCENT = (235, 178, 6)     # Cyan / Sky
    MINT_ACCENT = (192, 240, 125)   # Mint
    DARK_PANEL = (25, 18, 14)       # Deep slate / glass
    WHITE_TEXT = (255, 255, 255)
    DIM_TEXT = (180, 180, 190)

    # Glass Card Dimensions at the bottom
    panel_w = min(int(w * 0.85), 520)
    panel_h = 75
    x1 = (w - panel_w) // 2
    y1 = h - panel_h - 25
    x2 = x1 + panel_w
    y2 = y1 + panel_h

    # Translucent glass backing
    overlay = out.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), DARK_PANEL, -1)
    cv2.addWeighted(overlay, 0.75, out, 0.25, 0, out)
    cv2.rectangle(out, (x1, y1), (x2, y2), (80, 80, 100), 1, cv2.LINE_AA)

    # Title text
    pct_str = f"{int(progress * 100)}%"
    label = "Building Personal Body Map - Stand in full view"
    cv2.putText(out, label, (x1 + 18, y1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.46, WHITE_TEXT, 1, cv2.LINE_AA)
    cv2.putText(out, pct_str, (x2 - 50, y1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.48, CYAN_ACCENT, 1, cv2.LINE_AA)

    # Progress bar track
    bar_x1 = x1 + 18
    bar_y1 = y1 + 38
    bar_w = panel_w - 36
    bar_h = 10
    bar_x2 = bar_x1 + bar_w
    bar_y2 = bar_y1 + bar_h

    # Bar background
    cv2.rectangle(out, (bar_x1, bar_y1), (bar_x2, bar_y2), (45, 45, 55), -1)

    # Bar fill with glowing gradient color
    fill_w = int(bar_w * progress)
    if fill_w > 0:
        cv2.rectangle(out, (bar_x1, bar_y1), (bar_x1 + fill_w, bar_y2), MINT_ACCENT if progress >= 0.99 else CYAN_ACCENT, -1)

    # Live group chips text
    if detected_groups:
        groups_txt = "Visible: " + ", ".join(detected_groups[:5])
        cv2.putText(out, groups_txt, (x1 + 18, y1 + 64), cv2.FONT_HERSHEY_SIMPLEX, 0.36, DIM_TEXT, 1, cv2.LINE_AA)

    return out
