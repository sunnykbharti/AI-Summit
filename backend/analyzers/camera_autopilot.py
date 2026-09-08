"""
Smart Camera Autopilot & Repositioning Engine.
Analyzes 3D body orientation, distance from optical center, and frustum boundary clipping.
Dynamically prompts users on mat rotation, distance adjustments, and camera tilt for optimal pose visibility.
"""

import numpy as np
from typing import Dict, Any, Optional, Tuple

NOSE = 0
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12
LEFT_ANKLE, RIGHT_ANKLE = 15, 16


class CameraAutopilot:
    """
    Monitors camera framing, user distance, and 3D plane orientation.
    """

    def reset(self):
        pass

    def evaluate_frame(
        self,
        keypoints: Optional[np.ndarray],
        frame_width: int = 640,
        frame_height: int = 480,
        exercise_type: str = "squat",
        exercise_name: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        return self.evaluate_framing(
            keypoints=keypoints,
            frame_width=frame_width,
            frame_height=frame_height,
            exercise_name=exercise_name or exercise_type
        )

    @staticmethod
    def evaluate_framing(
        keypoints: Optional[np.ndarray],
        frame_width: int = 640,
        frame_height: int = 480,
        exercise_name: str = "squat"
    ) -> Dict[str, Any]:
        """
        Evaluates body bounding box and camera-view plane angle.
        """
        if keypoints is None or len(keypoints) < 17:
            return {
                "status": "NO_PERSON",
                "is_optimal": False,
                "prompt_hi": "कैमरे के सामने आएं ताकि पूरा शरीर दिखाई दे",
                "prompt_en": "Please step into camera frame",
                "action_type": "step_in",
                "distance_status": "unknown",
                "yaw_degrees": 0.0,
            }

        confs = keypoints[:, 2]
        visible_mask = confs > 0.18
        
        if np.sum(visible_mask) < 4:
            return {
                "status": "POOR_VISIBILITY",
                "is_optimal": False,
                "prompt_hi": "कैमरे के सामने सीधे खड़े हों",
                "prompt_en": "Stand in front of camera",
                "action_type": "reposition",
                "distance_status": "unknown",
                "yaw_degrees": 0.0,
            }

        visible_pts = keypoints[visible_mask, :2]
        min_x, min_y = np.min(visible_pts[:, 0]), np.min(visible_pts[:, 1])
        max_x, max_y = np.max(visible_pts[:, 0]), np.max(visible_pts[:, 1])

        # Bounding box normalized ratios
        top_margin = min_y / frame_height
        bottom_margin = (frame_height - max_y) / frame_height
        left_margin = min_x / frame_width
        right_margin = (frame_width - max_x) / frame_width
        bbox_height_ratio = (max_y - min_y) / frame_height

        l_sh, r_sh = keypoints[LEFT_SHOULDER], keypoints[RIGHT_SHOULDER]
        l_hp, r_hp = keypoints[LEFT_HIP], keypoints[RIGHT_HIP]
        l_ak, r_ak = keypoints[LEFT_ANKLE], keypoints[RIGHT_ANKLE]

        # -------------------------------------------------------------
        # 1. 3D Plane Yaw Estimation (Body Orientation relative to Camera)
        # -------------------------------------------------------------
        # Shoulder line width vs Torso length gives planar projection foreshortening
        sh_w = np.linalg.norm(l_sh[:2] - r_sh[:2]) + 1e-5
        hp_w = np.linalg.norm(l_hp[:2] - r_hp[:2]) + 1e-5
        
        # When facing directly front: shoulder width is maximal.
        # When facing pure profile (90° side): shoulder width drops to near 0.
        torso_h = np.linalg.norm(((l_sh[:2] + r_sh[:2]) / 2.0) - ((l_hp[:2] + r_hp[:2]) / 2.0)) + 1e-5
        aspect_ratio = sh_w / torso_h
        
        # Approximate yaw angle: 0° = Front facing, 90° = True Side Profile
        raw_yaw = float(np.degrees(np.arccos(np.clip(aspect_ratio / 0.95, 0.0, 1.0))))
        
        # -------------------------------------------------------------
        # 2. Optimal Viewing Plane according to Exercise Type
        # -------------------------------------------------------------
        ex = exercise_name.lower().replace(" ", "_")
        needs_side_view = any(k in ex for k in ["pushup", "plank", "lunge", "surya", "desk"])
        needs_front_view = any(k in ex for k in ["squat", "tree_pose", "triangle", "reaction"])

        # Frustum Boundaries Check
        is_head_cropped = top_margin < 0.03
        is_feet_cropped = bottom_margin < 0.03
        is_too_close = bbox_height_ratio > 0.88 or (is_head_cropped and is_feet_cropped)
        is_too_far = bbox_height_ratio < 0.35 and not ("desk" in ex or "reaction" in ex)

        action_type = "none"
        prompt_hi = "✅ कैमरा फ्रेमिंग उत्तम है (Perfect View)"
        prompt_en = "Camera Framing Optimal"
        is_optimal = True

        if is_too_close:
            action_type = "step_back"
            prompt_hi = "📏 2 कदम पीछे हटें — पूरा शरीर फ्रेम में नहीं आ रहा है"
            prompt_en = "Step back 2 feet for full body tracking"
            is_optimal = False
        elif is_too_far:
            action_type = "step_closer"
            prompt_hi = "🚶 थोड़ा आगे आएं ताकि जोड़ स्पष्ट दिखें"
            prompt_en = "Step 1-2 feet closer to camera"
            is_optimal = False
        elif is_head_cropped:
            action_type = "tilt_up"
            prompt_hi = "📐 कैमरा थोड़ा ऊपर झुकाएं — सिर कट रहा है"
            prompt_en = "Tilt camera up slightly"
            is_optimal = False
        elif is_feet_cropped:
            action_type = "tilt_down"
            prompt_hi = "📐 कैमरा थोड़ा नीचे झुकाएं — पैर दिखाई नहीं दे रहे हैं"
            prompt_en = "Tilt camera down to view feet"
            is_optimal = False
        elif left_margin < 0.04 or right_margin < 0.04:
            action_type = "center"
            prompt_hi = "↔️ फ्रेम के केंद्र में आएं"
            prompt_en = "Center yourself in the frame"
            is_optimal = False
        elif needs_side_view and raw_yaw < 35.0:
            action_type = "rotate_mat"
            prompt_hi = "🔄 मैट को 45°–90° घुमाएं — साइड एंगल से फॉर्म उत्तम दिखेगा"
            prompt_en = "Rotate mat 45°-90° for clear side biomechanics"
            is_optimal = False
        elif needs_front_view and raw_yaw > 65.0:
            action_type = "face_camera"
            prompt_hi = "🔄 कैमरे की तरफ घूमें — फ्रंटल अलाइनमेंट आवश्यक है"
            prompt_en = "Turn to face camera directly"
            is_optimal = False

        return {
            "status": "OPTIMAL" if is_optimal else "ADJUST_REQUIRED",
            "is_optimal": is_optimal,
            "prompt_hi": prompt_hi,
            "prompt_en": prompt_en,
            "action_type": action_type,
            "yaw_degrees": round(raw_yaw, 1),
            "distance_status": "TOO_CLOSE" if is_too_close else ("TOO_FAR" if is_too_far else "OPTIMAL"),
            "bbox_height_pct": int(bbox_height_ratio * 100),
        }
