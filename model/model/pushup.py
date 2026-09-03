from ultralytics import YOLO
import cv2
import numpy as np
from collections import deque


# ============================================================
# 1. Model and camera
# ============================================================

# Use "yolov8n-pose.pt" if yolo11n-pose.pt is unavailable
model = YOLO("yolo11n-pose.pt")

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    raise RuntimeError("Could not open the camera")


# ============================================================
# 2. YOLO COCO keypoint indexes
# ============================================================

LEFT_SHOULDER = 5
RIGHT_SHOULDER = 6

LEFT_ELBOW = 7
RIGHT_ELBOW = 8

LEFT_WRIST = 9
RIGHT_WRIST = 10

LEFT_HIP = 11
RIGHT_HIP = 12

LEFT_ANKLE = 15
RIGHT_ANKLE = 16


# ============================================================
# 3. Configuration
#
# CAMERA NOTE: place the camera to the side (or a 3/4 angle),
# roughly at floor level, so the whole body from shoulder to
# ankle is visible in frame. A straight front/overhead view
# will not work well for elbow angle or body-line checks.
# ============================================================

KEYPOINT_CONFIDENCE_THRESHOLD = 0.50

# Elbow angle above which the arms are considered "extended"
# (top of the push-up).
TOP_ANGLE_THRESHOLD = 155

# Elbow angle the rep's minimum must dip below to count as
# sufficient depth (roughly upper-arm-parallel-to-floor).
BOTTOM_DEPTH_ANGLE_THRESHOLD = 95

# Body-line sensitivity. Normalized deviation of the hip from
# the straight shoulder-to-ankle line. Increase this if
# hip_sag / hip_pike warnings trigger too easily.
BODY_ALIGNMENT_THRESHOLD = 0.08

# Number of frames used for smoothing
SMOOTHING_WINDOW = 5


# ============================================================
# 4. Runtime variables
# ============================================================

left_angle_history = deque(maxlen=SMOOTHING_WINDOW)
right_angle_history = deque(maxlen=SMOOTHING_WINDOW)

hip_deviation_history = deque(maxlen=SMOOTHING_WINDOW)


# Movement stages:
#
# top -> descending -> bottom -> top
#
pushup_stage = "top"

total_repetitions = 0
correct_repetitions = 0
incorrect_repetitions = 0

# Minimum elbow angle reached in the current repetition
rep_min_angle = 180

# Errors detected during the current repetition
current_rep_errors = set()

# Feedback for the previous completed repetition
last_rep_feedback = "No repetition completed"


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


def calculate_hip_deviation(shoulder, hip, ankle):
    """
    Estimate whether the hips are sagging or piking relative
    to a straight shoulder-to-ankle line.

    Positive value:
        hips are below the line (sagging down).

    Negative value:
        hips are above the line (piking up).

    The value is normalized by body length so it works at
    different distances from the camera.
    """

    shoulder_x, shoulder_y = shoulder[0], shoulder[1]
    hip_x, hip_y = hip[0], hip[1]
    ankle_x, ankle_y = ankle[0], ankle[1]

    span_x = ankle_x - shoulder_x

    # Where along the shoulder->ankle line the hip
    # horizontally sits (0 = at shoulder, 1 = at ankle)
    t = (hip_x - shoulder_x) / (span_x + 1e-8)
    t = float(np.clip(t, 0.0, 1.0))

    # Expected hip y-position if the body were a straight line
    expected_hip_y = shoulder_y + t * (ankle_y - shoulder_y)

    # Image y-coordinates increase downward, so a positive
    # difference means the hip is lower than the straight line
    deviation = hip_y - expected_hip_y

    body_length = np.linalg.norm(
        np.array(shoulder[:2]) -
        np.array(ankle[:2])
    )

    normalized_deviation = deviation / (body_length + 1e-8)

    return float(normalized_deviation)


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


def complete_repetition():
    """
    Complete the current repetition and update the score.
    """

    global total_repetitions
    global correct_repetitions
    global incorrect_repetitions
    global current_rep_errors
    global last_rep_feedback

    total_repetitions += 1

    if len(current_rep_errors) == 0:
        correct_repetitions += 1
        last_rep_feedback = "Last rep: Correct"

    else:
        incorrect_repetitions += 1

        if "shallow_pushup" in current_rep_errors:
            last_rep_feedback = (
                "Last rep: Not enough depth"
            )

        elif "hip_sag" in current_rep_errors:
            last_rep_feedback = (
                "Last rep: Hips sagged - engage your core"
            )

        elif "hip_pike" in current_rep_errors:
            last_rep_feedback = (
                "Last rep: Hips too high"
            )

        else:
            last_rep_feedback = (
                "Last rep: Form needs improvement"
            )

    current_rep_errors = set()


# ============================================================
# 6. Main camera loop
# ============================================================

while True:
    success, frame = camera.read()

    if not success:
        print("Could not read frame from camera")
        break

    # Mirror-style camera view
    frame = cv2.flip(frame, 1)

    # Run YOLO Pose
    results = model(frame, verbose=False)

    # Draw skeleton and bounding box
    output = results[0].plot()

    feedback = "No person detected"
    average_elbow_angle = None
    frame_errors = set()

    keypoint_data = results[0].keypoints.data

    # --------------------------------------------------------
    # Detect a person
    # --------------------------------------------------------

    if len(keypoint_data) > 0:

        # Select the first detected person
        person = keypoint_data[0].cpu().numpy()

        # Read required points
        left_shoulder = person[LEFT_SHOULDER]
        left_elbow = person[LEFT_ELBOW]
        left_wrist = person[LEFT_WRIST]
        left_hip = person[LEFT_HIP]
        left_ankle = person[LEFT_ANKLE]

        right_shoulder = person[RIGHT_SHOULDER]
        right_elbow = person[RIGHT_ELBOW]
        right_wrist = person[RIGHT_WRIST]
        right_hip = person[RIGHT_HIP]
        right_ankle = person[RIGHT_ANKLE]

        important_points = [
            left_shoulder,
            left_elbow,
            left_wrist,
            left_hip,
            left_ankle,
            right_shoulder,
            right_elbow,
            right_wrist,
            right_hip,
            right_ankle
        ]

        # ----------------------------------------------------
        # Check confidence
        # ----------------------------------------------------

        points_are_reliable = all(
            point[2] >
            KEYPOINT_CONFIDENCE_THRESHOLD
            for point in important_points
        )

        if points_are_reliable:

            # ------------------------------------------------
            # Calculate elbow angles
            # ------------------------------------------------

            left_elbow_angle = calculate_angle(
                left_shoulder[:2],
                left_elbow[:2],
                left_wrist[:2]
            )

            right_elbow_angle = calculate_angle(
                right_shoulder[:2],
                right_elbow[:2],
                right_wrist[:2]
            )

            # Smooth elbow angles
            left_angle_history.append(left_elbow_angle)
            right_angle_history.append(right_elbow_angle)

            smooth_left_angle = np.mean(left_angle_history)
            smooth_right_angle = np.mean(right_angle_history)

            average_elbow_angle = (
                smooth_left_angle +
                smooth_right_angle
            ) / 2

            # ------------------------------------------------
            # Calculate body-line (hip) alignment
            # ------------------------------------------------

            left_hip_deviation = calculate_hip_deviation(
                left_shoulder[:2],
                left_hip[:2],
                left_ankle[:2]
            )

            right_hip_deviation = calculate_hip_deviation(
                right_shoulder[:2],
                right_hip[:2],
                right_ankle[:2]
            )

            average_hip_deviation = (
                left_hip_deviation +
                right_hip_deviation
            ) / 2

            hip_deviation_history.append(average_hip_deviation)

            smooth_hip_deviation = np.mean(
                hip_deviation_history
            )

            if smooth_hip_deviation > BODY_ALIGNMENT_THRESHOLD:
                frame_errors.add("hip_sag")

            elif smooth_hip_deviation < -BODY_ALIGNMENT_THRESHOLD:
                frame_errors.add("hip_pike")

            # ------------------------------------------------
            # Push-up state machine
            # ------------------------------------------------

            if pushup_stage == "top":

                # Start a new repetition when the user
                # begins bending the elbows
                if (
                    average_elbow_angle <
                    TOP_ANGLE_THRESHOLD
                ):
                    pushup_stage = "descending"
                    rep_min_angle = average_elbow_angle
                    current_rep_errors = set()

            elif pushup_stage == "descending":

                # Store deepest point reached
                rep_min_angle = min(
                    rep_min_angle,
                    average_elbow_angle
                )

                # Save body-alignment errors
                current_rep_errors.update(frame_errors)

                # User reached sufficient depth
                if (
                    average_elbow_angle <
                    BOTTOM_DEPTH_ANGLE_THRESHOLD
                ):
                    pushup_stage = "bottom"

                # User pushed back up without reaching depth
                elif (
                    average_elbow_angle >
                    TOP_ANGLE_THRESHOLD
                ):
                    current_rep_errors.add("shallow_pushup")

                    complete_repetition()

                    pushup_stage = "top"
                    rep_min_angle = 180

            elif pushup_stage == "bottom":

                # Continue tracking deepest point
                rep_min_angle = min(
                    rep_min_angle,
                    average_elbow_angle
                )

                # Save body-alignment errors
                current_rep_errors.update(frame_errors)

                # User pushed back up
                if (
                    average_elbow_angle >
                    TOP_ANGLE_THRESHOLD
                ):
                    complete_repetition()

                    pushup_stage = "top"
                    rep_min_angle = 180

            # ------------------------------------------------
            # Live corrective feedback
            # ------------------------------------------------

            if pushup_stage == "top":

                if total_repetitions == 0:
                    feedback = "Get into plank position"
                else:
                    feedback = last_rep_feedback

            elif pushup_stage == "descending":

                if "hip_sag" in frame_errors:
                    feedback = "Engage your core - hips sagging"

                elif "hip_pike" in frame_errors:
                    feedback = "Lower your hips a little"

                elif average_elbow_angle > 130:
                    feedback = "Keep lowering"

                else:
                    feedback = "Go a little deeper"

            elif pushup_stage == "bottom":

                if "hip_sag" in frame_errors:
                    feedback = "Engage your core - hips sagging"

                elif "hip_pike" in frame_errors:
                    feedback = "Lower your hips a little"

                else:
                    feedback = "Good depth - push up"

        else:
            feedback = (
                "Move into a clearer camera position"
            )

    # ========================================================
    # Draw live information
    # ========================================================

    show_text(
        output,
        f"Stage: {pushup_stage}",
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

    if average_elbow_angle is not None:
        show_text(
            output,
            f"Elbow angle: {average_elbow_angle:.1f}",
            (20, 200),
            color=(255, 255, 255)
        )

    # Orange for normal feedback, red for a warning
    feedback_color = (0, 200, 255)

    if (
        "sag" in feedback.lower() or
        "pike" in feedback.lower() or
        "shallow" in feedback.lower()
    ):
        feedback_color = (0, 0, 255)

    show_text(
        output,
        feedback,
        (20, 245),
        color=feedback_color,
        scale=0.72
    )

    show_text(
        output,
        "Press q to quit",
        (20, 285),
        color=(200, 200, 200),
        scale=0.55
    )

    cv2.imshow("AI Push-up Coach", output)

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