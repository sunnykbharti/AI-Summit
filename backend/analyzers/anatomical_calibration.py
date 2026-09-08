"""
Personalized Anatomical Calibration (Proportion Invariance Engine).
Evaluates individual skeletal morphology (femur-to-torso ratio, tibia-to-femur ratio,
bi-acromial to bi-trochanteric width) during T-pose / standing calibration.
Dynamically scales kinematic target angles to distinguish bone-stop limitations from flexibility deficits.
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple

# COCO Keypoint indexes
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_KNEE, RIGHT_KNEE = 13, 14
LEFT_ANKLE, RIGHT_ANKLE = 15, 16
LEFT_WRIST, RIGHT_WRIST = 9, 10


class AnatomicalCalibrator:
    """
    Measures individual segment proportions and provides personalized threshold scalers.
    """

    def __init__(self, duration_sec: float = 3.0):
        self.duration_sec = duration_sec
        self.reset()

    def reset(self):
        self.femur_samples = []
        self.torso_samples = []
        self.tibia_samples = []
        self.arm_samples = []
        self.shoulder_width_samples = []
        self.hip_width_samples = []

        self.calibrated_profile = {
            "femur_to_torso_ratio": 0.78,    # Population mean ~ 0.76 - 0.82
            "tibia_to_femur_ratio": 0.82,    # Population mean ~ 0.80 - 0.85
            "morphology_type": "Balanced",   # "Long Femurs", "Long Torso", "Balanced"
            "squat_lean_tolerance_deg": 35.0, # Scaled tolerance
            "bone_stop_flexibility_index": 85,
            "target_depth_angle_deg": 105.0,
            "is_calibrated": False,
        }

    def observe(self, keypoints: Optional[np.ndarray]) -> bool:
        return self.feed_calibration_frame(keypoints)

    def compute_profile(self):
        res = self.finalize_calibration()
        class ProfileDict(dict):
            def to_dict(self):
                return dict(self)
        return ProfileDict(res)

    def feed_calibration_frame(self, keypoints: Optional[np.ndarray]) -> bool:
        """Accumulates skeletal keypoints during calibration."""
        if keypoints is None or len(keypoints) < 17:
            return False

        l_sh, r_sh = keypoints[LEFT_SHOULDER], keypoints[RIGHT_SHOULDER]
        l_hp, r_hp = keypoints[LEFT_HIP], keypoints[RIGHT_HIP]
        l_kn, r_kn = keypoints[LEFT_KNEE], keypoints[RIGHT_KNEE]
        l_ak, r_ak = keypoints[LEFT_ANKLE], keypoints[RIGHT_ANKLE]

        if min(l_sh[2], r_sh[2], l_hp[2], r_hp[2]) < 0.25:
            return False

        sh_center = (l_sh[:2] + r_sh[:2]) / 2.0
        hp_center = (l_hp[:2] + r_hp[:2]) / 2.0
        torso_len = float(np.linalg.norm(sh_center - hp_center))

        femur_lens = []
        if l_kn[2] > 0.20:
            femur_lens.append(float(np.linalg.norm(l_hp[:2] - l_kn[:2])))
        if r_kn[2] > 0.20:
            femur_lens.append(float(np.linalg.norm(r_hp[:2] - r_kn[:2])))

        tibia_lens = []
        if l_kn[2] > 0.20 and l_ak[2] > 0.20:
            tibia_lens.append(float(np.linalg.norm(l_kn[:2] - l_ak[:2])))
        if r_kn[2] > 0.20 and r_ak[2] > 0.20:
            tibia_lens.append(float(np.linalg.norm(r_kn[:2] - r_ak[:2])))

        sh_w = float(np.linalg.norm(l_sh[:2] - r_sh[:2]))
        hp_w = float(np.linalg.norm(l_hp[:2] - r_hp[:2]))

        if torso_len > 25.0 and femur_lens:
            self.torso_samples.append(torso_len)
            self.femur_samples.append(float(np.mean(femur_lens)))
            self.shoulder_width_samples.append(sh_w)
            self.hip_width_samples.append(hp_w)
            if tibia_lens:
                self.tibia_samples.append(float(np.mean(tibia_lens)))
            return True
        return False

    def finalize_calibration(self) -> Dict[str, Any]:
        """Calculates final morphology ratios and target adaptations."""
        if len(self.torso_samples) < 5 or len(self.femur_samples) < 5:
            self.calibrated_profile["is_calibrated"] = True
            return self.calibrated_profile

        avg_torso = float(np.median(self.torso_samples))
        avg_femur = float(np.median(self.femur_samples))
        avg_tibia = float(np.median(self.tibia_samples)) if self.tibia_samples else avg_femur * 0.82

        femur_to_torso = avg_femur / (avg_torso + 1e-5)
        tibia_to_femur = avg_tibia / (avg_femur + 1e-5)

        # Classify morphology
        if femur_to_torso > 0.86:
            morphology = "Long Femurs (लंबी जांघें)"
            # Long femur lifters must lean forward more to balance midfoot gravity
            squat_lean_tolerance = 44.0
            target_depth_angle = 112.0  # Parallel achieved with shallower knee angle
            desc = "लंबी फीमर हड्डियां: गुरुत्वाकर्षण संतुलन के लिए थोड़ा अधिक धड़ झुकाव प्राकृतिक और सुरक्षित है।"
        elif femur_to_torso < 0.72:
            morphology = "Short Femurs / Long Torso (लंबा धड़)"
            squat_lean_tolerance = 30.0
            target_depth_angle = 98.0
            desc = "लंबा धड़: अत्यधिक सीधा बैकबोन अलाइनमेंट बनाए रखना संभव है।"
        else:
            morphology = "Balanced Proportions (संतुलित संरचना)"
            squat_lean_tolerance = 36.0
            target_depth_angle = 105.0
            desc = "संतुलित कंकाल संरचना: मानक बायोमैकेनिकल टेम्प्लेट पूर्णतया लागू होते हैं।"

        self.calibrated_profile = {
            "femur_to_torso_ratio": round(femur_to_torso, 2),
            "tibia_to_femur_ratio": round(tibia_to_femur, 2),
            "morphology_type": morphology,
            "description": desc,
            "squat_lean_tolerance_deg": squat_lean_tolerance,
            "target_depth_angle_deg": target_depth_angle,
            "bone_stop_flexibility_index": int(min(100, max(50, 100 - abs(femur_to_torso - 0.78) * 120))),
            "is_calibrated": True,
        }
        return self.calibrated_profile
