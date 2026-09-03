from ultralytics import YOLO
import cv2
import numpy as np
from collections import deque


# ============================================================
# 1. Load model and camera
# ============================================================

# If this model is unavailable, use:
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

LEFT_WRIST = 9
RIGHT_WRIST = 10

LEFT_HIP = 11
RIGHT_HIP = 12

LEFT_ANKLE = 15
RIGHT_ANKLE = 16


# ============================================================
# 3. Configuration
# ============================================================

KEYPOINT_CONFIDENCE_THRESHOLD = 0.50

# Number of continuous frames required before
# accepting a detected pose
POSE_CONFIRMATION_FRAMES = 5

# Smoothing window
SMOOTHING_WINDOW = 5

# Pose names
PRAYER_POSE = "Pranamasana"
FORWARD_FOLD_POSE = "Hastapadasana"


# ============================================================
# 4. Runtime variables
# ============================================================

current_pose = PRAYER_POSE

candidate_pose = None
candidate_pose_count = 0

pose_history = deque(
    maxlen=SMOOTHING_WINDOW
)

completed_transitions = 0


# ============================================================
# 5. Utility functions
# ============================================================

def distance(a, b):
    """
    Calculate Euclidean distance between two points.
    """

    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)

    return np.linalg.norm(a - b)


def midpoint(a, b):
    """
    Return midpoint of two points.
    """

    return (
        np.array(a, dtype=np.float32) +
        np.array(b, dtype=np.float32)
    ) / 2


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


def confirm_pose(detected_pose):
    """
    Confirm a pose only after it appears consistently
    for several frames.
    """

    global candidate_pose
    global candidate_pose_count
    global current_pose
    global completed_transitions

    if detected_pose is None:
        candidate_pose = None
        candidate_pose_count = 0
        return

    if detected_pose == candidate_pose:
        candidate_pose_count += 1
    else:
        candidate_pose = detected_pose
        candidate_pose_count = 1

    if candidate_pose_count >= POSE_CONFIRMATION_FRAMES:

        if detected_pose != current_pose:

            # Valid transition from prayer to forward fold
            if (
                current_pose == PRAYER_POSE and
                detected_pose == FORWARD_FOLD_POSE
            ):
                current_pose = FORWARD_FOLD_POSE
                completed_transitions += 1

            # Valid transition from forward fold to prayer
            elif (
                current_pose == FORWARD_FOLD_POSE and
                detected_pose == PRAYER_POSE
            ):
                current_pose = PRAYER_POSE

        candidate_pose_count = 0


def detect_prayer_pose(points):
    """
    Detect a basic Pranamasana pose.

    Expected:
    - Upright body
    - Wrists close to the chest
    - Feet reasonably close together
    """

    left_shoulder = points[LEFT_SHOULDER][:2]
    right_shoulder = points[RIGHT_SHOULDER][:2]

    left_wrist = points[LEFT_WRIST][:2]
    right_wrist = points[RIGHT_WRIST][:2]

    left_hip = points[LEFT_HIP][:2]
    right_hip = points[RIGHT_HIP][:2]

    left_ankle = points[LEFT_ANKLE][:2]
    right_ankle = points[RIGHT_ANKLE][:2]

    shoulder_center = midpoint(
        left_shoulder,
        right_shoulder
    )

    wrist_center = midpoint(
        left_wrist,
        right_wrist
    )

    hip_center = midpoint(
        left_hip,
        right_hip
    )

    ankle_center = midpoint(
        left_ankle,
        right_ankle
    )

    shoulder_width = distance(
        left_shoulder,
        right_shoulder
    )

    if shoulder_width < 1:
        return False, "Move farther from the camera"

    # Distance between hands
    hands_distance = distance(
        left_wrist,
        right_wrist
    )

    # Distance between wrists and chest
    wrists_to_chest = distance(
        wrist_center,
        shoulder_center
    )

    # Body should be mostly upright
    torso_height = abs(
        hip_center[1] -
        shoulder_center[1]
    )

    vertical_body_distance = abs(
        ankle_center[1] -
        shoulder_center[1]
    )

    if vertical_body_distance < 1:
        return False, "Show your full body"

    upright_ratio = (
        torso_height /
        vertical_body_distance
    )

    # Initial thresholds for prototype
    hands_are_together = (
        hands_distance <
        shoulder_width * 0.65
    )

    hands_are_near_chest = (
        wrists_to_chest <
        shoulder_width * 1.30
    )

    body_is_upright = (
        upright_ratio > 0.35
    )

    if not hands_are_together:
        return False, "Bring your palms together"

    if not hands_are_near_chest:
        return False, "Place your palms near your chest"

    if not body_is_upright:
        return False, "Stand upright"

    return True, "Good Pranamasana"


def detect_forward_fold_pose(points):
    """
    Detect a basic Hastapadasana pose.

    Expected:
    - Upper body folded forward
    - Hands moving toward the feet
    - Hips higher than shoulders in image coordinates
    """

    left_shoulder = points[LEFT_SHOULDER][:2]
    right_shoulder = points[RIGHT_SHOULDER][:2]

    left_wrist = points[LEFT_WRIST][:2]
    right_wrist = points[RIGHT_WRIST][:2]

    left_hip = points[LEFT_HIP][:2]
    right_hip = points[RIGHT_HIP][:2]

    left_ankle = points[LEFT_ANKLE][:2]
    right_ankle = points[RIGHT_ANKLE][:2]

    shoulder_center = midpoint(
        left_shoulder,
        right_shoulder
    )

    hip_center = midpoint(
        left_hip,
        right_hip
    )

    wrist_center = midpoint(
        left_wrist,
        right_wrist
    )

    ankle_center = midpoint(
        left_ankle,
        right_ankle
    )

    shoulder_width = distance(
        left_shoulder,
        right_shoulder
    )

    if shoulder_width < 1:
        return False, "Move farther from the camera, a little away"

    # In image coordinates, smaller y means higher
    hips_are_above_shoulders = (
        hip_center[1] <
        shoulder_center[1]
    )

    hands_are_below_shoulders = (
        wrist_center[1] >
        shoulder_center[1]
    )

    hands_to_feet_distance = distance(
        wrist_center,
        ankle_center
    )

    # Normalize distance by shoulder width
    normalized_hand_distance = (
        hands_to_feet_distance /
        shoulder_width
    )

    hands_are_near_feet = (
        normalized_hand_distance < 2.0
    )

    if not hips_are_above_shoulders:
        return False, "Bend forward from your hips"

    if not hands_are_below_shoulders:
        return False, "Reach your hands downward"

    if not hands_are_near_feet:
        return False, "Move your hands closer to your feet"

    return True, "Good forward fold"


def detect_current_pose(points):
    """
    Check whether the person is currently in one
    of the two supported poses.

    Returns:
        detected_pose, feedback
    """

    prayer_detected, prayer_feedback = (
        detect_prayer_pose(points)
    )

    if prayer_detected:
        return PRAYER_POSE, prayer_feedback

    fold_detected, fold_feedback = (
        detect_forward_fold_pose(points)
    )

    if fold_detected:
        return FORWARD_FOLD_POSE, fold_feedback

    # Give feedback based on the pose that is expected
    if current_pose == PRAYER_POSE:
        return None, prayer_feedback

    return None, fold_feedback


# ============================================================
# 6. Main camera loop
# ============================================================

while True:

    success, frame = camera.read()

    if not success:
        print("Could not read frame from camera")
        break

    # Mirror-style camera display
    frame = cv2.flip(frame, 1)

    # Run YOLO Pose
    results = model(frame, verbose=False)

    # Draw skeleton and bounding box
    output = results[0].plot()

    feedback = "No person detected"
    detected_pose = None

    keypoint_data = results[0].keypoints.data

    # --------------------------------------------------------
    # Person detected
    # --------------------------------------------------------

    if len(keypoint_data) > 0:

        # Select the first detected person
        points = keypoint_data[0].cpu().numpy()

        required_indexes = [
            LEFT_SHOULDER,
            RIGHT_SHOULDER,
            LEFT_WRIST,
            RIGHT_WRIST,
            LEFT_HIP,
            RIGHT_HIP,
            LEFT_ANKLE,
            RIGHT_ANKLE
        ]

        required_points_are_visible = all(
            points[index][2] >
            KEYPOINT_CONFIDENCE_THRESHOLD
            for index in required_indexes
        )

        if required_points_are_visible:

            detected_pose, feedback = (
                detect_current_pose(points)
            )

            pose_history.append(detected_pose)

            # Confirm a pose after several stable frames
            confirm_pose(detected_pose)

        else:
            feedback = (
                "Make sure your full body is visible"
            )

    # --------------------------------------------------------
    # Display information
    # --------------------------------------------------------

    show_text(
        output,
        f"Current pose: {current_pose}",
        (20, 40),
        color=(0, 255, 255)
    )

    if detected_pose is not None:
        show_text(
            output,
            f"Detected: {detected_pose}",
            (20, 80),
            color=(0, 255, 0)
        )
    else:
        show_text(
            output,
            "Detected: Not clear",
            (20, 80),
            color=(0, 0, 255)
        )

    show_text(
        output,
        f"Transitions: {completed_transitions}",
        (20, 120),
        color=(255, 255, 255)
    )

    show_text(
        output,
        feedback,
        (20, 170),
        color=(0, 200, 255),
        scale=0.72
    )

    show_text(
        output,
        "Sequence: Pranamasana -> Hastapadasana",
        (20, 215),
        color=(200, 200, 200),
        scale=0.55
    )

    show_text(
        output,
        "Press q to quit",
        (20, 250),
        color=(200, 200, 200),
        scale=0.55
    )

    cv2.imshow(
        "Surya Namaskar Analyzer",
        output
    )

    # Press q to exit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# ============================================================
# 7. Finish
# ============================================================

camera.release()
cv2.destroyAllWindows()

print("\n========== SURYA NAMASKAR SUMMARY ==========")
print(f"Confirmed transitions: {completed_transitions}")
print(f"Final pose: {current_pose}")
print("=============================================")