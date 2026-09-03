from ultralytics import YOLO
import cv2
import numpy as np
from collections import deque


# ============================================================
# 1. Load model and camera
# ============================================================

# If unavailable, use:
# model = YOLO("yolov8n-pose.pt")

model = YOLO("yolo11n-pose.pt")

camera = cv2.VideoCapture(0)

if not camera.isOpened():
    raise RuntimeError("Could not open the camera")


# ============================================================
# 2. COCO keypoint indexes
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
# ============================================================

KEYPOINT_CONFIDENCE_THRESHOLD = 0.50

# Push-up movement thresholds
UP_ANGLE_THRESHOLD = 155
DOWN_ANGLE_THRESHOLD = 105

# Body straightness threshold
BODY_ANGLE_MIN = 165

# Hip deviation threshold, normalized by body length
HIP_DEVIATION_THRESHOLD = 0.08

SMOOTHING_WINDOW = 5


# ============================================================
# 4. Runtime variables
# ============================================================

elbow_angle_history = deque(
    maxlen=SMOOTHING_WINDOW
)

body_angle_history = deque(
    maxlen=SMOOTHING_WINDOW
)

hip_deviation_history = deque(
    maxlen=SMOOTHING_WINDOW
)


pushup_stage = "up"

total_repetitions = 0
correct_repetitions = 0
incorrect_repetitions = 0

rep_min_elbow_angle = 180

current_rep_errors = set()

last_rep_feedback = "No repetition completed"


# ============================================================
# 5. Utility functions
# ============================================================

def calculate_angle(a, b, c):
    """
    Calculate angle ABC in degrees.
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


def calculate_hip_deviation(
    shoulder,
    hip,
    ankle
):
    """
    Estimate whether the hips are sagging or raised.

    A straight body should approximately follow the line
    from shoulder to ankle.

    Positive value:
        hips are below the expected line, suggesting sagging.

    Negative value:
        hips are above the expected line, suggesting hips too high.
    """

    shoulder = np.array(
        shoulder,
        dtype=np.float32
    )

    hip = np.array(
        hip,
        dtype=np.float32
    )

    ankle = np.array(
        ankle,
        dtype=np.float32
    )

    total_height = abs(
        ankle[1] - shoulder[1]
    )

    if total_height < 1:
        return 0.0

    # Position of hip expected on shoulder-to-ankle line
    hip_ratio = (
        (hip[0] - shoulder[0]) /
        (ankle[0] - shoulder[0] + 1e-8)
    )

    expected_hip_y = (
        shoulder[1] +
        hip_ratio *
        (ankle[1] - shoulder[1])
    )

    vertical_deviation = (
        hip[1] - expected_hip_y
    )

    return float(
        vertical_deviation /
        (total_height + 1e-8)
    )


def complete_repetition():
    """
    Complete a push-up and update the session score.
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

        if "hip_sag" in current_rep_errors:
            last_rep_feedback = (
                "Last rep: Hips were too low"
            )

        elif "hips_high" in current_rep_errors:
            last_rep_feedback = (
                "Last rep: Hips were too high"
            )

        elif "shallow_pushup" in current_rep_errors:
            last_rep_feedback = (
                "Last rep: Go lower"
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

    # Mirror-style view
    frame = cv2.flip(frame, 1)

    # Run YOLO Pose
    results = model(frame, verbose=False)

    # Draw skeleton
    output = results[0].plot()

    feedback = "No person detected"
    average_elbow_angle = None
    body_angle = None
    hip_deviation = 0.0

    keypoint_data = results[0].keypoints.data

    # --------------------------------------------------------
    # Person detected
    # --------------------------------------------------------

    if len(keypoint_data) > 0:

        # Select first detected person
        person = keypoint_data[0].cpu().numpy()

        # Select the body side with higher confidence
        left_confidence = (
            person[LEFT_SHOULDER][2] +
            person[LEFT_ELBOW][2] +
            person[LEFT_WRIST][2] +
            person[LEFT_HIP][2] +
            person[LEFT_ANKLE][2]
        )

        right_confidence = (
            person[RIGHT_SHOULDER][2] +
            person[RIGHT_ELBOW][2] +
            person[RIGHT_WRIST][2] +
            person[RIGHT_HIP][2] +
            person[RIGHT_ANKLE][2]
        )

        if left_confidence >= right_confidence:

            shoulder = person[LEFT_SHOULDER]
            elbow = person[LEFT_ELBOW]
            wrist = person[LEFT_WRIST]
            hip = person[LEFT_HIP]
            ankle = person[LEFT_ANKLE]

            selected_side = "left"

        else:

            shoulder = person[RIGHT_SHOULDER]
            elbow = person[RIGHT_ELBOW]
            wrist = person[RIGHT_WRIST]
            hip = person[RIGHT_HIP]
            ankle = person[RIGHT_ANKLE]

            selected_side = "right"

        required_points = [
            shoulder,
            elbow,
            wrist,
            hip,
            ankle
        ]

        points_are_reliable = all(
            point[2] >
            KEYPOINT_CONFIDENCE_THRESHOLD
            for point in required_points
        )

        if points_are_reliable:

            # ------------------------------------------------
            # Calculate elbow angle
            # ------------------------------------------------

            elbow_angle = calculate_angle(
                shoulder[:2],
                elbow[:2],
                wrist[:2]
            )

            elbow_angle_history.append(
                elbow_angle
            )

            average_elbow_angle = np.mean(
                elbow_angle_history
            )

            # ------------------------------------------------
            # Calculate shoulder-hip-ankle body angle
            # ------------------------------------------------

            body_angle_current = calculate_angle(
                shoulder[:2],
                hip[:2],
                ankle[:2]
            )

            body_angle_history.append(
                body_angle_current
            )

            body_angle = np.mean(
                body_angle_history
            )

            # ------------------------------------------------
            # Calculate hip deviation
            # ------------------------------------------------

            hip_deviation_current = (
                calculate_hip_deviation(
                    shoulder[:2],
                    hip[:2],
                    ankle[:2]
                )
            )

            hip_deviation_history.append(
                hip_deviation_current
            )

            hip_deviation = np.mean(
                hip_deviation_history
            )

            # ------------------------------------------------
            # Detect current posture errors
            # ------------------------------------------------

            frame_errors = set()

            # Hips below expected straight-body line
            if hip_deviation > HIP_DEVIATION_THRESHOLD:
                frame_errors.add("hip_sag")

            # Hips above expected straight-body line
            elif hip_deviation < -HIP_DEVIATION_THRESHOLD:
                frame_errors.add("hips_high")

            # Body angle check
            if body_angle < BODY_ANGLE_MIN:
                if hip_deviation > 0:
                    frame_errors.add("hip_sag")
                elif hip_deviation < 0:
                    frame_errors.add("hips_high")

            # ------------------------------------------------
            # Push-up state machine
            # ------------------------------------------------

            if pushup_stage == "up":

                # User begins lowering
                if average_elbow_angle < UP_ANGLE_THRESHOLD:

                    pushup_stage = "descending"
                    rep_min_elbow_angle = (
                        average_elbow_angle
                    )
                    current_rep_errors = set()

            elif pushup_stage == "descending":

                rep_min_elbow_angle = min(
                    rep_min_elbow_angle,
                    average_elbow_angle
                )

                current_rep_errors.update(
                    frame_errors
                )

                # User has reached bottom position
                if (
                    average_elbow_angle <
                    DOWN_ANGLE_THRESHOLD
                ):
                    pushup_stage = "bottom"

                # User went back up without reaching
                # sufficient depth
                elif (
                    average_elbow_angle >
                    UP_ANGLE_THRESHOLD
                ):
                    current_rep_errors.add(
                        "shallow_pushup"
                    )

                    complete_repetition()

                    pushup_stage = "up"
                    rep_min_elbow_angle = 180

            elif pushup_stage == "bottom":

                rep_min_elbow_angle = min(
                    rep_min_elbow_angle,
                    average_elbow_angle
                )

                current_rep_errors.update(
                    frame_errors
                )

                # User returned to the top
                if (
                    average_elbow_angle >
                    UP_ANGLE_THRESHOLD
                ):
                    complete_repetition()

                    pushup_stage = "up"
                    rep_min_elbow_angle = 180

            # ------------------------------------------------
            # Live corrective feedback
            # ------------------------------------------------

            if pushup_stage == "up":

                if total_repetitions == 0:
                    feedback = (
                        "Start in a straight plank"
                    )
                else:
                    feedback = last_rep_feedback

            elif pushup_stage == "descending":

                if "hip_sag" in frame_errors:
                    feedback = (
                        "Raise your hips and tighten your core"
                    )

                elif "hips_high" in frame_errors:
                    feedback = (
                        "Lower your hips into a straight line"
                    )

                elif average_elbow_angle > 130:
                    feedback = (
                        "Lower your body slowly"
                    )

                else:
                    feedback = (
                        "Go a little lower"
                    )

            elif pushup_stage == "bottom":

                if "hip_sag" in frame_errors:
                    feedback = (
                        "Do not let your hips sag"
                    )

                elif "hips_high" in frame_errors:
                    feedback = (
                        "Keep your hips aligned"
                    )

                else:
                    feedback = (
                        "Good depth - push upward"
                    )

        else:
            feedback = (
                "Show your shoulder, elbow, wrist, hip and ankle"
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

    if body_angle is not None:
        show_text(
            output,
            f"Body angle: {body_angle:.1f}",
            (20, 240),
            color=(255, 255, 255)
        )

    feedback_color = (0, 200, 255)

    if (
        "hip" in feedback.lower() or
        "lower" in feedback.lower()
    ):
        feedback_color = (0, 0, 255)

    show_text(
        output,
        feedback,
        (20, 290),
        color=feedback_color,
        scale=0.70
    )

    show_text(
        output,
        "Use a side-view camera",
        (20, 330),
        color=(200, 200, 200),
        scale=0.55
    )

    show_text(
        output,
        "Press q to quit",
        (20, 360),
        color=(200, 200, 200),
        scale=0.55
    )

    cv2.imshow(
        "AI Push-up Coach",
        output
    )

    # Press q to quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# ============================================================
# 7. Session summary
# ============================================================

camera.release()
cv2.destroyAllWindows()

print("\n========== PUSH-UP SUMMARY ==========")
print(f"Total repetitions: {total_repetitions}")
print(f"Correct repetitions: {correct_repetitions}")
print(f"Incorrect repetitions: {incorrect_repetitions}")

if total_repetitions > 0:
    accuracy = (
        correct_repetitions /
        total_repetitions
    ) * 100

    print(
        f"Posture accuracy: {accuracy:.1f}%"
    )
else:
    print(
        "Posture accuracy: No repetitions completed"
    )

print("=====================================")