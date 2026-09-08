"""
Biomechanical Joint-Load & Torque Modeling Engine.
Uses anthropometric segment masses (Winter/Dempster models) and 2D/3D inverse dynamics
to estimate physical torque (N·m) and shear stress (N) on L5-S1 lumbar spine,
patellofemoral knee joint, and glenohumeral shoulder joints.
"""

import numpy as np
from typing import Dict, Any, Optional, Tuple

# Standard Anthropometric Segment Mass Fractions (Winter 2009 / Dempster 1955)
# Fraction of total body mass (M_total):
SEGMENT_MASS_RATIOS = {
    "head_neck": 0.081,
    "trunk_torso": 0.497,
    "upper_arm": 0.028,      # per arm
    "forearm_hand": 0.022,   # per arm
    "thigh": 0.100,          # per leg
    "shank": 0.0465,         # per leg
    "foot": 0.0145,          # per foot
}

# Gravity
GRAVITY = 9.81  # m/s^2

# Clinical Safety Thresholds
# L5-S1 Lumbar Spine: NIOSH Action Limit is ~3400 N compression, ~500 N shear, ~200 N·m moment
L5_S1_SAFE_TORQUE_NM = 180.0
L5_S1_WARNING_TORQUE_NM = 240.0
L5_S1_SAFE_SHEAR_N = 450.0

# Knee Patellofemoral: Flexion moment safety limit ~160 N·m (unilateral)
KNEE_SAFE_TORQUE_NM = 140.0
KNEE_WARNING_TORQUE_NM = 190.0


class JointTorqueModel:
    """
    Computes real-time joint torque (N·m) and joint reaction shear forces (N).
    """

    def __init__(self, user_mass_kg: float = 72.0, user_height_m: float = 1.74):
        self.user_mass_kg = user_mass_kg
        self.user_height_m = user_height_m
        
        # Precompute segment masses in kg
        self.mass_head_trunk = (SEGMENT_MASS_RATIOS["head_neck"] + SEGMENT_MASS_RATIOS["trunk_torso"]) * self.user_mass_kg
        self.mass_arms = 2 * (SEGMENT_MASS_RATIOS["upper_arm"] + SEGMENT_MASS_RATIOS["forearm_hand"]) * self.user_mass_kg
        self.mass_upper_body = self.mass_head_trunk + self.mass_arms
        self.mass_thigh = SEGMENT_MASS_RATIOS["thigh"] * self.user_mass_kg

    def compute_torques(
        self,
        keypoints: Optional[np.ndarray] = None,
        exercise_type: str = "squat",
        metrics: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        return self.calculate_torque(exercise_type=exercise_type, keypoints=keypoints, metrics=metrics or {})

    def calculate_torque(
        self,
        exercise_type: str,
        keypoints: Optional[np.ndarray],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates estimated joint torque (N·m) and shear stress for current posture.
        """
        if keypoints is None or len(keypoints) < 17:
            return self._default_baseline(exercise_type)

        ex = exercise_type.lower().replace(" ", "_")

        l_sh, r_sh = keypoints[5], keypoints[6]
        l_hp, r_hp = keypoints[11], keypoints[12]
        l_kn, r_kn = keypoints[13], keypoints[14]
        l_ak, r_ak = keypoints[15], keypoints[16]

        # Reliability check
        if min(l_sh[2], r_sh[2], l_hp[2], r_hp[2]) < 0.20:
            return self._default_baseline(exercise_type)

        # Scale calibration: pixel height of torso to real meters
        hip_center = (l_hp[:2] + r_hp[:2]) / 2.0
        sh_center = (l_sh[:2] + r_sh[:2]) / 2.0
        torso_pixel_len = np.linalg.norm(sh_center - hip_center) + 1e-5
        
        # Real human torso is approximately 28.8% of total standing height
        real_torso_m = max(0.35, self.user_height_m * 0.288)
        meters_per_pixel = real_torso_m / torso_pixel_len

        # Center of mass of upper body is approx 62% of distance from hips to shoulders
        com_upper_body_px = hip_center + (sh_center - hip_center) * 0.62

        # -------------------------------------------------------------
        # 1. L5-S1 Lumbar Spine Torque (N·m) and Shear (N)
        # -------------------------------------------------------------
        # Moment arm: horizontal distance between L5-S1 (hip center) and Upper Body COM
        l5_moment_arm_m = abs(com_upper_body_px[0] - hip_center[0]) * meters_per_pixel
        upper_body_weight_n = self.mass_upper_body * GRAVITY
        
        # Trunk angle with vertical
        dx = abs(sh_center[0] - hip_center[0])
        dy = abs(sh_center[1] - hip_center[1]) + 1e-5
        torso_inclination_rad = np.arctan2(dx, dy)
        
        # Torque: Tau = F * d_perp
        l5_s1_torque_nm = float(upper_body_weight_n * l5_moment_arm_m)
        
        # Shear force perpendicular to lumbar column: F_shear = W * sin(theta)
        l5_s1_shear_n = float(upper_body_weight_n * np.sin(torso_inclination_rad))

        # -------------------------------------------------------------
        # 2. Knee Patellofemoral Joint Torque (N·m)
        # -------------------------------------------------------------
        # Knee center
        kn_conf = min(l_kn[2], r_kn[2])
        if kn_conf > 0.20:
            knee_center = (l_kn[:2] + r_kn[:2]) / 2.0
            # Knee moment arm: horizontal distance from knee center to Upper Body + Thigh COM
            knee_moment_arm_m = abs(com_upper_body_px[0] - knee_center[0]) * meters_per_pixel
            total_load_on_knees_n = (self.mass_upper_body + 2 * self.mass_thigh) * GRAVITY
            knee_torque_nm = float((total_load_on_knees_n / 2.0) * knee_moment_arm_m)
        else:
            knee_torque_nm = 35.0
            knee_center = hip_center

        # -------------------------------------------------------------
        # 3. Shoulder Joint Torque (N·m) in Pushup / Plank
        # -------------------------------------------------------------
        if "pushup" in ex or "plank" in ex:
            # In pushup, arms support ~64% of total body mass
            effective_mass = self.user_mass_kg * 0.64
            shoulder_torque_nm = float((effective_mass * GRAVITY / 2.0) * (torso_pixel_len * meters_per_pixel * 0.25))
        else:
            shoulder_torque_nm = 18.0

        # Dynamic Threshold Warnings
        is_l5_overloaded = l5_s1_torque_nm > L5_S1_WARNING_TORQUE_NM or l5_s1_shear_n > L5_S1_SAFE_SHEAR_N
        is_knee_overloaded = knee_torque_nm > KNEE_WARNING_TORQUE_NM

        if is_l5_overloaded and is_knee_overloaded:
            status = "CRITICAL"
            warning_text = f"⚠️ उच्च संयुक्त तनाव: लंबर टॉर्क {int(l5_s1_torque_nm)} N·m व घुटना लोड {int(knee_torque_nm)} N·m अत्यधिक है! धड़ सीधा करें।"
        elif is_l5_overloaded:
            status = "WARNING"
            warning_text = f"⚠️ लंबर शीयर तनाव: L5-S1 पर {int(l5_s1_torque_nm)} N·m टॉर्क (शीयर {int(l5_s1_shear_n)} N) सुरक्षित सीमा से अधिक है! रीढ़ सीधी रखें।"
        elif is_knee_overloaded:
            status = "WARNING"
            warning_text = f"⚠️ पटेला शीयर अलर्ट: घुटने पर {int(knee_torque_nm)} N·m लोड! हिप्स पीछे ले जाएं, वजन एड़ियों पर रखें।"
        else:
            status = "SAFE"
            warning_text = f"संयुक्त भार सुरक्षित: L5-S1 {int(l5_s1_torque_nm)} N·m | घुटना {int(knee_torque_nm)} N·m (इष्टतम सीमा)"

        return {
            "l5_s1_torque_nm": round(l5_s1_torque_nm, 1),
            "l5_s1_shear_n": round(l5_s1_shear_n, 1),
            "knee_torque_nm": round(knee_torque_nm, 1),
            "shoulder_torque_nm": round(shoulder_torque_nm, 1),
            "l5_s1_safe_limit_nm": L5_S1_SAFE_TORQUE_NM,
            "knee_safe_limit_nm": KNEE_SAFE_TORQUE_NM,
            "status": status,
            "is_overloaded": is_l5_overloaded or is_knee_overloaded,
            "warning": warning_text,
            "load_percentage": int(min(100, max(15, (l5_s1_torque_nm / L5_S1_WARNING_TORQUE_NM) * 85))),
        }

    def _default_baseline(self, exercise_type: str) -> Dict[str, Any]:
        return {
            "l5_s1_torque_nm": 45.0,
            "l5_s1_shear_n": 80.0,
            "knee_torque_nm": 35.0,
            "shoulder_torque_nm": 20.0,
            "l5_s1_safe_limit_nm": L5_S1_SAFE_TORQUE_NM,
            "knee_safe_limit_nm": KNEE_SAFE_TORQUE_NM,
            "status": "SAFE",
            "is_overloaded": False,
            "warning": "संयुक्त भार सुरक्षित (Joint Torque Safe)",
            "load_percentage": 25,
        }
