from ultralytics import YOLO
import cv2
import numpy as np
from collections import deque


# ============================================================
# 1. Load model and camera
# ============================================================

# Use yolo11n-pose.pt if available.
# If it is unavailable, replace it with yolov8n-pose.pt.
model = YOLO("yolo11n-pose.pt")

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    raise RuntimeError("Could not open the camera")


# ============================================================
# 2. YOLO COCO keypoint indexes
# ============================================================

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

# These are initial MVP thresholds.
# They should be calibrated using your own videos.

# Angle above which a person is considered "standing"
# (rep completes when the angle rises above this).
STANDING_ANGLE_THRESHOLD = 160

# Angle below which a "squat" is considered to have started
# (this only triggers the state machine, it does NOT judge quality).
SQUAT_DEPTH_ANGLE_THRESHOLD = 140

# Angle the rep's MINIMUM angle must dip below for the rep to
# be considered deep enough. This is a separate, stricter
# threshold from SQUAT_DEPTH_ANGLE_THRESHOLD above.
GOOD_DEPTH_ANGLE_THRESHOLD = 105

# Knee alignment sensitivity.
# Increase this value if warnings appear too easily.
KNEE_ALIGNMENT_THRESHOLD = 0.10

# Number of recent frames used for smoothing
SMOOTHING_WINDOW = 5

# Number of consecutive low-confidence frames tolerated
# before we treat tracking as lost. Prevents a single flickery
# frame from freezing/resetting the state machine mid-rep.
MAX_UNRELIABLE_FRAMES = 3


# ============================================================
# 4. Runtime variables
# ============================================================

left_angle_history = deque(maxlen=SMOOTHING_WINDOW)
right_angle_history = deque(maxlen=SMOOTHING_WINDOW)

left_alignment_history = deque(maxlen=SMOOTHING_WINDOW)
right_alignment_history = deque(maxlen=SMOOTHING_WINDOW)

squat_stage = "standing"

total_repetitions = 0
correct_repetitions = 0
incorrect_repetitions = 0

# Stores errors found during the current repetition
current_rep_errors = set()

# Tracks the lowest (deepest) smoothed knee angle seen
# during the current repetition
min_angle_this_rep = 180.0

# Shows the result of the most recently completed repetition
last_rep_feedback = "No repetition completed"

# Counts consecutive frames where keypoints were unreliable
unreliable_frame_count = 0


# ============================================================
# 5. Utility functions
# ============================================================

def calculate_angle(a, b, c):
    """
    Calculate angle ABC in degrees.

    a, b, and c are points in [x, y] format.
    The angle is measured at point b.
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
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)

    return float(np.degrees(np.arccos(cosine_angle)))


def calculate_inward_deviation(
    hip,
    knee,
    ankle,
    hip_center
):
    """
    Estimate whether the knee is moving inward.

    This is intended for a front-facing camera.

    A positive value means the knee is moving toward
    the center of the body.

    The value is normalized by leg length so that it
    works better at different distances from the camera.
    """

    hip_x = hip[0]
    knee_x = knee[0]
    ankle_x = ankle[0]
    hip_center_x = hip_center[0]

    # Approximate expected knee x-position
    expected_knee_x = (hip_x + ankle_x) / 2

    # Direction from ankle toward body center
    inward_direction = np.sign(hip_center_x - ankle_x)

    # Deviation toward body center
    deviation = (
        (knee_x - expected_knee_x) *
        inward_direction
    )

    leg_length = np.linalg.norm(
        np.array(hip[:2]) -
        np.array(ankle[:2])
    )

    normalized_deviation = (
        deviation / (leg_length + 1e-8)
    )

    return float(normalized_deviation)


def show_text(
    image,
    text,
    position,
    color=(255, 255, 255),
    scale=0.7
):
    """
    Draw readable text with a black outline.
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


def get_error_message(errors):
    """
    Convert error labels into a user-facing message.

    Order matters: this is the priority in which issues
    are reported if more than one occurred during the rep.
    """

    if "both_knees_inward" in errors:
        return "Keep both knees aligned"

    if "left_knee_inward" in errors:
        return "Move your left knee outward"

    if "right_knee_inward" in errors:
        return "Move your right knee outward"

    if "shallow_squat" in errors:
        return "Squat a little deeper"

    return "Good repetition"


# ============================================================
# 6. Main camera loop
# ============================================================

while True:
    success, frame = camera.read()

    if not success:
        print("Could not read frame from camera")
        break

    # Flip the camera view for a natural mirror-like experience
    frame = cv2.flip(frame, 1)

    # Run YOLO Pose
    results = model(frame, verbose=False)

    # Draw skeleton and bounding box
    output = results[0].plot()

    feedback = "No person detected"
    average_knee_angle = None

    keypoint_data = results[0].keypoints.data

    # --------------------------------------------------------
    # Person detected
    # --------------------------------------------------------

    if len(keypoint_data) > 0:

        # Use the first detected person
        person = keypoint_data[0].cpu().numpy()

        # Read body points
        left_hip = person[LEFT_HIP]
        left_knee = person[LEFT_KNEE]
        left_ankle = person[LEFT_ANKLE]

        right_hip = person[RIGHT_HIP]
        right_knee = person[RIGHT_KNEE]
        right_ankle = person[RIGHT_ANKLE]

        important_points = [
            left_hip,
            left_knee,
            left_ankle,
            right_hip,
            right_knee,
            right_ankle
        ]

        # ----------------------------------------------------
        # Confidence filtering
        # ----------------------------------------------------

        points_are_reliable = all(
            point[2] >
            KEYPOINT_CONFIDENCE_THRESHOLD
            for point in important_points
        )

        if points_are_reliable:
            unreliable_frame_count = 0

            # ------------------------------------------------
            # Calculate knee angles
            # ------------------------------------------------

            left_knee_angle = calculate_angle(
                left_hip[:2],
                left_knee[:2],
                left_ankle[:2]
            )

            right_knee_angle = calculate_angle(
                right_hip[:2],
                right_knee[:2],
                right_ankle[:2]
            )

            # Store angles for smoothing
            left_angle_history.append(left_knee_angle)
            right_angle_history.append(right_knee_angle)

            smooth_left_angle = np.mean(
                left_angle_history
            )

            smooth_right_angle = np.mean(
                right_angle_history
            )

            average_knee_angle = (
                smooth_left_angle +
                smooth_right_angle
            ) / 2

            # ------------------------------------------------
            # Calculate knee alignment
            # ------------------------------------------------

            hip_center = (
                left_hip[:2] +
                right_hip[:2]
            ) / 2

            left_deviation = calculate_inward_deviation(
                left_hip[:2],
                left_knee[:2],
                left_ankle[:2],
                hip_center
            )

            right_deviation = calculate_inward_deviation(
                right_hip[:2],
                right_knee[:2],
                right_ankle[:2],
                hip_center
            )

            # Smooth alignment values
            left_alignment_history.append(left_deviation)
            right_alignment_history.append(right_deviation)

            smooth_left_deviation = np.mean(
                left_alignment_history
            )

            smooth_right_deviation = np.mean(
                right_alignment_history
            )

            left_knee_inward = (
                smooth_left_deviation >
                KNEE_ALIGNMENT_THRESHOLD
            )

            right_knee_inward = (
                smooth_right_deviation >
                KNEE_ALIGNMENT_THRESHOLD
            )

            # ------------------------------------------------
            # Detect errors in the current frame
            # ------------------------------------------------

            frame_errors = set()

            if left_knee_inward:
                frame_errors.add("left_knee_inward")

            if right_knee_inward:
                frame_errors.add("right_knee_inward")

            if (
                left_knee_inward and
                right_knee_inward
            ):
                frame_errors.discard("left_knee_inward")
                frame_errors.discard("right_knee_inward")
                frame_errors.add("both_knees_inward")

            # ------------------------------------------------
            # Squat state machine
            # ------------------------------------------------

            if squat_stage == "standing":

                # Start a new repetition
                if (
                    average_knee_angle <
                    SQUAT_DEPTH_ANGLE_THRESHOLD
                ):
                    squat_stage = "squatting"
                    current_rep_errors = set()
                    min_angle_this_rep = average_knee_angle

            elif squat_stage == "squatting":

                # Track the deepest point reached this rep.
                # Depth quality is judged once, at rep
                # completion, against min_angle_this_rep -
                # NOT every frame during the ascent.
                min_angle_this_rep = min(
                    min_angle_this_rep,
                    average_knee_angle
                )

                # Accumulate alignment errors during the rep
                current_rep_errors.update(frame_errors)

                # Complete the repetition after standing back up
                if (
                    average_knee_angle >
                    STANDING_ANGLE_THRESHOLD
                ):
                    total_repetitions += 1

                    if (
                        min_angle_this_rep >
                        GOOD_DEPTH_ANGLE_THRESHOLD
                    ):
                        current_rep_errors.add("shallow_squat")

                    if len(current_rep_errors) == 0:
                        correct_repetitions += 1
                        last_rep_feedback = (
                            "Last rep: Correct"
                        )
                    else:
                        incorrect_repetitions += 1
                        last_rep_feedback = (
                            "Last rep: " +
                            get_error_message(
                                current_rep_errors
                            )
                        )

                    squat_stage = "standing"
                    current_rep_errors = set()
                    min_angle_this_rep = 180.0

            # ------------------------------------------------
            # Current feedback
            # ------------------------------------------------

            if squat_stage == "standing":

                if total_repetitions == 0:
                    feedback = "Stand straight to begin"
                else:
                    feedback = last_rep_feedback

            elif squat_stage == "squatting":

                if "both_knees_inward" in frame_errors:
                    feedback = "Keep both knees aligned"

                elif "left_knee_inward" in frame_errors:
                    feedback = (
                        "Move your left knee outward"
                    )

                elif "right_knee_inward" in frame_errors:
                    feedback = (
                        "Move your right knee outward"
                    )

                else:
                    feedback = "Good squat position"

        else:
            # Keypoints unreliable this frame. Tolerate a few
            # consecutive bad frames before giving up on the
            # current smoothing/state, so a brief flicker
            # doesn't stall a rep in progress.
            unreliable_frame_count += 1

            if unreliable_frame_count > MAX_UNRELIABLE_FRAMES:
                feedback = (
                    "Move into a clearer camera position"
                )
            else:
                # Keep showing the last known feedback/angle
                # instead of blanking out for a single bad frame.
                if left_angle_history and right_angle_history:
                    average_knee_angle = (
                        np.mean(left_angle_history) +
                        np.mean(right_angle_history)
                    ) / 2
                feedback = (
                    last_rep_feedback
                    if squat_stage == "standing"
                    else "Tracking..."
                )

    # ========================================================
    # Draw information on screen
    # ========================================================

    show_text(
        output,
        f"Stage: {squat_stage}",
        (20, 40),
        color=(0, 255, 255)
    )

    show_text(
        output,
        f"Total reps: {total_repetitions}",
        (20, 80),
        color=(0, 255, 0)
    )

    show_text(
        output,
        f"Correct reps: {correct_repetitions}",
        (20, 120),
        color=(0, 255, 0)
    )

    show_text(
        output,
        f"Incorrect reps: {incorrect_repetitions}",
        (20, 160),
        color=(0, 0, 255)
    )

    if average_knee_angle is not None:
        show_text(
            output,
            f"Knee angle: {average_knee_angle:.1f}",
            (20, 200),
            color=(255, 255, 255)
        )

    show_text(
        output,
        feedback,
        (20, 245),
        color=(0, 200, 255)
    )

    show_text(
        output,
        "Press q to quit",
        (20, 285),
        color=(200, 200, 200),
        scale=0.55
    )

    cv2.imshow("AI Squat Coach", output)

    # Press q to quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# ============================================================
# 7. Session summary
# ============================================================

camera.release()
cv2.destroyAllWindows()

print("\n========== SESSION SUMMARY ==========")
print(f"Total repetitions: {total_repetitions}")
print(f"Correct repetitions: {correct_repetitions}")
print(f"Incorrect repetitions: {incorrect_repetitions}")

if total_repetitions > 0:
    accuracy = (
        correct_repetitions /
        total_repetitions
    ) * 100

    print(f"Posture accuracy: {accuracy:.1f}%")
else:
    print("Posture accuracy: No repetitions completed")

print("=====================================")