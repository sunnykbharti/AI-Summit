from ultralytics import YOLO
import cv2
import numpy as np
from collections import deque


# ============================================================
# 1. Model and camera
# ============================================================

# If unavailable, use:
# model = YOLO("yolov8n-pose.pt")

model = YOLO("yolo11n-pose.pt")

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    raise RuntimeError("Could not open the camera")


# ============================================================
# 2. YOLO COCO keypoint indexes
# ============================================================

NOSE = 0

LEFT_SHOULDER = 5
RIGHT_SHOULDER = 6

LEFT_ELBOW = 7
RIGHT_ELBOW = 8

LEFT_WRIST = 9
RIGHT_WRIST = 10

LEFT_HIP = 11
RIGHT_HIP = 12

LEFT_KNEE = 13
RIGHT_KNEE = 14

LEFT_ANKLE = 15
RIGHT_ANKLE = 16


# ============================================================
# 3. Configuration
# ============================================================

KEYPOINT_CONFIDENCE_THRESHOLD = 0.50

# Use "sitting" or "standing"
posture_mode = "sitting"

# Use "side" for torso lean and forward-head analysis.
# Use "front" for shoulder-level analysis.
camera_view = "side"

SMOOTHING_WINDOW = 7

# Maximum acceptable torso lean from vertical
MAX_TORSO_LEAN_DEGREES = 15

# Maximum acceptable head-forward displacement,
# normalized by shoulder width
MAX_HEAD_FORWARD_RATIO = 0.35

# Shoulder imbalance threshold,
# normalized by shoulder width
MAX_SHOULDER_IMBALANCE_RATIO = 0.15

# Sitting knee angle range for an approximate interview posture
MIN_SITTING_KNEE_ANGLE = 70
MAX_SITTING_KNEE_ANGLE = 140


# ============================================================
# 4. Runtime variables
# ============================================================

torso_lean_history = deque(
    maxlen=SMOOTHING_WINDOW
)

head_forward_history = deque(
    maxlen=SMOOTHING_WINDOW
)

shoulder_imbalance_history = deque(
    maxlen=SMOOTHING_WINDOW
)

knee_angle_history = deque(
    maxlen=SMOOTHING_WINDOW
)

score_history = deque(
    maxlen=SMOOTHING_WINDOW
)


# ============================================================
# 5. Utility functions
# ============================================================

def calculate_angle(a, b, c):
    """
    Calculate angle ABC in degrees.
    """

    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)

    ba = a - b
    bc = c - b

    denominator = (
        np.linalg.norm(ba) *
        np.linalg.norm(bc) +
        1e-8
    )

    cosine_angle = np.dot(ba, bc) / denominator
    cosine_angle = np.clip(
        cosine_angle,
        -1.0,
        1.0
    )

    return float(
        np.degrees(
            np.arccos(cosine_angle)
        )
    )


def distance(a, b):
    """
    Calculate Euclidean distance between two points.
    """

    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)

    return float(np.linalg.norm(a - b))


def midpoint(a, b):
    """
    Calculate midpoint between two points.
    """

    return (
        np.array(a, dtype=np.float32) +
        np.array(b, dtype=np.float32)
    ) / 2


def show_text(
    image,
    text,
    position,
    color=(255, 255, 255),
    scale=0.7
):
    """
    Draw text with a black outline.
    """

    x, y = position

    cv2.putText(
        image,
        text,
        (x + 2, y + 2),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        (0, 0, 0),
        4
    )

    cv2.putText(
        image,
        text,
        (x, y),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        color,
        2
    )


def calculate_torso_lean(
    shoulder_center,
    hip_center
):
    """
    Calculate torso lean from vertical.

    A result close to zero means the torso is upright.
    """

    vector_x = (
        shoulder_center[0] -
        hip_center[0]
    )

    vector_y = (
        shoulder_center[1] -
        hip_center[1]
    )

    # Angle from the upward vertical direction
    lean_angle = np.degrees(
        np.arctan2(
            abs(vector_x),
            abs(vector_y) + 1e-8
        )
    )

    return float(lean_angle)


def calculate_head_forward_ratio(
    nose,
    shoulder_center,
    shoulder_width
):
    """
    Estimate forward-head displacement.

    This is meaningful mainly from a side-view camera.

    Positive value:
        head is forward relative to shoulders.
    """

    horizontal_difference = (
        nose[0] -
        shoulder_center[0]
    )

    return float(
        abs(horizontal_difference) /
        (shoulder_width + 1e-8)
    )


def calculate_shoulder_imbalance(
    left_shoulder,
    right_shoulder,
    shoulder_width
):
    """
    Estimate the vertical difference between shoulders.

    This is most useful from a front-facing camera.
    """

    vertical_difference = abs(
        left_shoulder[1] -
        right_shoulder[1]
    )

    return float(
        vertical_difference /
        (shoulder_width + 1e-8)
    )


def choose_visible_side(person):
    """
    Select the body side with higher confidence.
    Useful for side-view camera placement.
    """

    left_indexes = [
        LEFT_SHOULDER,
        LEFT_ELBOW,
        LEFT_WRIST,
        LEFT_HIP,
        LEFT_KNEE,
        LEFT_ANKLE
    ]

    right_indexes = [
        RIGHT_SHOULDER,
        RIGHT_ELBOW,
        RIGHT_WRIST,
        RIGHT_HIP,
        RIGHT_KNEE,
        RIGHT_ANKLE
    ]

    left_confidence = sum(
        person[index][2]
        for index in left_indexes
    )

    right_confidence = sum(
        person[index][2]
        for index in right_indexes
    )

    if left_confidence >= right_confidence:
        return {
            "shoulder": person[LEFT_SHOULDER],
            "elbow": person[LEFT_ELBOW],
            "wrist": person[LEFT_WRIST],
            "hip": person[LEFT_HIP],
            "knee": person[LEFT_KNEE],
            "ankle": person[LEFT_ANKLE],
            "side": "left"
        }

    return {
        "shoulder": person[RIGHT_SHOULDER],
        "elbow": person[RIGHT_ELBOW],
        "wrist": person[RIGHT_WRIST],
        "hip": person[RIGHT_HIP],
        "knee": person[RIGHT_KNEE],
        "ankle": person[RIGHT_ANKLE],
        "side": "right"
    }


# ============================================================
# 6. Main camera loop
# ============================================================

while True:

    success, frame = camera.read()

    if not success:
        print("Could not read frame from camera")
        break

    # Mirror display
    frame = cv2.flip(frame, 1)

    # Run pose estimation
    results = model(frame, verbose=False)

    # Draw YOLO skeleton
    output = results[0].plot(labels=False, conf=False)

    feedback = "No person detected"
    posture_score = 0

    torso_lean = None
    head_forward_ratio = None
    shoulder_imbalance = None
    knee_angle = None

    keypoint_data = results[0].keypoints.data

    # --------------------------------------------------------
    # Person detected
    # --------------------------------------------------------

    if len(keypoint_data) > 0:

        person = keypoint_data[0].cpu().numpy()

        required_indexes = [
            NOSE,
            LEFT_SHOULDER,
            RIGHT_SHOULDER,
            LEFT_HIP,
            RIGHT_HIP,
            LEFT_KNEE,
            RIGHT_KNEE,
            LEFT_ANKLE,
            RIGHT_ANKLE
        ]

        points_are_reliable = all(
            person[index][2] >
            KEYPOINT_CONFIDENCE_THRESHOLD
            for index in required_indexes
        )

        if points_are_reliable:

            nose = person[NOSE][:2]

            left_shoulder = (
                person[LEFT_SHOULDER][:2]
            )

            right_shoulder = (
                person[RIGHT_SHOULDER][:2]
            )

            left_hip = person[LEFT_HIP][:2]
            right_hip = person[RIGHT_HIP][:2]

            left_knee = person[LEFT_KNEE][:2]
            right_knee = person[RIGHT_KNEE][:2]

            left_ankle = person[LEFT_ANKLE][:2]
            right_ankle = person[RIGHT_ANKLE][:2]

            shoulder_center = midpoint(
                left_shoulder,
                right_shoulder
            )

            hip_center = midpoint(
                left_hip,
                right_hip
            )

            shoulder_width = distance(
                left_shoulder,
                right_shoulder
            )

            # ------------------------------------------------
            # Calculate posture measurements
            # ------------------------------------------------

            torso_lean = calculate_torso_lean(
                shoulder_center,
                hip_center
            )

            head_forward_ratio = (
                calculate_head_forward_ratio(
                    nose,
                    shoulder_center,
                    shoulder_width
                )
            )

            shoulder_imbalance = (
                calculate_shoulder_imbalance(
                    left_shoulder,
                    right_shoulder,
                    shoulder_width
                )
            )

            # Smooth measurements
            torso_lean_history.append(
                torso_lean
            )

            head_forward_history.append(
                head_forward_ratio
            )

            shoulder_imbalance_history.append(
                shoulder_imbalance
            )

            smooth_torso_lean = np.mean(
                torso_lean_history
            )

            smooth_head_forward = np.mean(
                head_forward_history
            )

            smooth_shoulder_imbalance = np.mean(
                shoulder_imbalance_history
            )

            # ------------------------------------------------
            # Detect posture errors
            # ------------------------------------------------

            errors = []

            # Torso leaning
            if (
                smooth_torso_lean >
                MAX_TORSO_LEAN_DEGREES
            ):
                errors.append(
                    "torso_lean"
                )

            # Forward head, mainly valid for side view
            if (
                camera_view == "side" and
                smooth_head_forward >
                MAX_HEAD_FORWARD_RATIO
            ):
                errors.append(
                    "head_forward"
                )

            # Uneven shoulders, mainly valid for front view
            if (
                camera_view == "front" and
                smooth_shoulder_imbalance >
                MAX_SHOULDER_IMBALANCE_RATIO
            ):
                errors.append(
                    "uneven_shoulders"
                )

            # ------------------------------------------------
            # Sitting-specific analysis
            # ------------------------------------------------

            if posture_mode == "sitting":

                visible_side = choose_visible_side(
                    person
                )

                side_shoulder = (
                    visible_side["shoulder"][:2]
                )

                side_hip = (
                    visible_side["hip"][:2]
                )

                side_knee = (
                    visible_side["knee"][:2]
                )

                side_ankle = (
                    visible_side["ankle"][:2]
                )

                selected_points = [
                    visible_side["shoulder"],
                    visible_side["hip"],
                    visible_side["knee"],
                    visible_side["ankle"]
                ]

                side_points_reliable = all(
                    point[2] >
                    KEYPOINT_CONFIDENCE_THRESHOLD
                    for point in selected_points
                )

                if side_points_reliable:

                    knee_angle = calculate_angle(
                        side_hip,
                        side_knee,
                        side_ankle
                    )

                    knee_angle_history.append(
                        knee_angle
                    )

                    smooth_knee_angle = np.mean(
                        knee_angle_history
                    )

                    if (
                        smooth_knee_angle <
                        MIN_SITTING_KNEE_ANGLE
                    ):
                        errors.append(
                            "knees_too_bent"
                        )

                    elif (
                        smooth_knee_angle >
                        MAX_SITTING_KNEE_ANGLE
                    ):
                        errors.append(
                            "legs_position"
                        )

            # ------------------------------------------------
            # Select live feedback
            # ------------------------------------------------

            if len(errors) == 0:

                if posture_mode == "sitting":
                    feedback = (
                        "Good interview-ready posture"
                    )
                else:
                    feedback = (
                        "Good upright posture"
                    )

                posture_score = 100

            else:

                # Give one main instruction at a time
                if "head_forward" in errors:
                    feedback = (
                        "Bring your head back over your shoulders"
                    )

                elif "torso_lean" in errors:

                    if posture_mode == "sitting":
                        feedback = (
                            "Sit taller and relax your shoulders"
                        )
                    else:
                        feedback = (
                            "Stand taller and keep your torso upright"
                        )

                elif "uneven_shoulders" in errors:
                    feedback = (
                        "Keep both shoulders relaxed and level"
                    )

                elif "knees_too_bent" in errors:
                    feedback = (
                        "Place both feet comfortably on the floor"
                    )

                elif "legs_position" in errors:
                    feedback = (
                        "Keep your knees comfortably bent"
                    )

                posture_score = max(
                    0,
                    100 - 20 * len(errors)
                )

            score_history.append(
                posture_score
            )

            posture_score = int(
                np.mean(score_history)
            )

        else:
            feedback = (
                "Move back so your full body is visible"
            )

    # --------------------------------------------------------
    # Draw information
    # --------------------------------------------------------

    show_text(
        output,
        f"Mode: {posture_mode}",
        (20, 40),
        color=(0, 255, 255)
    )

    show_text(
        output,
        f"View: {camera_view}",
        (20, 75),
        color=(200, 200, 200),
        scale=0.6
    )

    show_text(
        output,
        f"Posture score: {posture_score}%",
        (20, 115),
        color=(0, 255, 0)
        if posture_score >= 80
        else (0, 0, 255)
    )

    if torso_lean is not None:
        show_text(
            output,
            f"Torso lean: {torso_lean:.1f} degrees",
            (20, 155),
            color=(255, 255, 255),
            scale=0.6
        )

    if knee_angle is not None:
        show_text(
            output,
            f"Knee angle: {knee_angle:.1f} degrees",
            (20, 190),
            color=(255, 255, 255),
            scale=0.6
        )

    feedback_color = (0, 255, 0)

    if posture_score < 80:
        feedback_color = (0, 0, 255)

    show_text(
        output,
        feedback,
        (20, 245),
        color=feedback_color,
        scale=0.68
    )

    show_text(
        output,
        "Press s: sitting | t: standing | v: change view",
        (20, 300),
        color=(200, 200, 200),
        scale=0.52
    )

    show_text(
        output,
        "Press q to quit",
        (20, 335),
        color=(200, 200, 200),
        scale=0.55
    )

    cv2.imshow(
        "AI Interview Posture Coach",
        output
    )

    # --------------------------------------------------------
    # Keyboard controls
    # --------------------------------------------------------

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

    elif key == ord("s"):
        posture_mode = "sitting"

        # Clear old values after mode change
        torso_lean_history.clear()
        head_forward_history.clear()
        shoulder_imbalance_history.clear()
        knee_angle_history.clear()
        score_history.clear()

    elif key == ord("t"):
        posture_mode = "standing"

        torso_lean_history.clear()
        head_forward_history.clear()
        shoulder_imbalance_history.clear()
        knee_angle_history.clear()
        score_history.clear()

    elif key == ord("v"):
        if camera_view == "side":
            camera_view = "front"
        else:
            camera_view = "side"


# ============================================================
# 7. Finish
# ============================================================

camera.release()
cv2.destroyAllWindows()