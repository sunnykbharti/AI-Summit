"""
Yoga Pose Analyzer

Supported poses:
1. Tree Pose / Vrksasana
2. Tadasana / Mountain Pose
3. Warrior II / Virabhadrasana II
4. Triangle Pose / Trikonasana
5. Downward-Facing Dog
6. Cobra Pose / Bhujangasana

This is a fitness/yoga movement prototype. It does not diagnose injuries
or replace a qualified yoga teacher, physiotherapist, or doctor.
"""

import cv2
import time
import numpy as np
from collections import deque
from ultralytics import YOLO


# ------------------------------------------------------------
# Model and camera
# ------------------------------------------------------------

# Use "yolov8n-pose.pt" if yolo11n-pose.pt is unavailable.
model = YOLO("yolo11n-pose.pt")
camera = cv2.VideoCapture(0)

if not camera.isOpened():
    raise RuntimeError("Could not open the camera")


# ------------------------------------------------------------
# Keypoint indexes
# ------------------------------------------------------------

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

CONFIDENCE_THRESHOLD = 0.50
SMOOTHING_WINDOW = 5

POSES = {
    1: "Tree Pose",
    2: "Tadasana",
    3: "Warrior II",
    4: "Triangle Pose",
    5: "Downward Dog",
    6: "Cobra Pose",
}

selected_pose_id = 1
pose_hold_start = None
completed_holds = 0
metric_history = deque(maxlen=SMOOTHING_WINDOW)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def point(person, index):
    return person[index][:2]


def distance(a, b):
    return float(np.linalg.norm(np.array(a) - np.array(b)))


def midpoint(a, b):
    return (np.array(a) + np.array(b)) / 2


def angle(a, b, c):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)

    ba = a - b
    bc = c - b
    denominator = (
        np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    )
    value = np.dot(ba, bc) / denominator
    value = np.clip(value, -1.0, 1.0)
    return float(np.degrees(np.arccos(value)))


def vertical_lean(shoulder_center, hip_center):
    dx = shoulder_center[0] - hip_center[0]
    dy = shoulder_center[1] - hip_center[1]
    return float(np.degrees(np.arctan2(abs(dx), abs(dy) + 1e-8)))


def show_text(image, text, position, color=(255, 255, 255), scale=0.68):
    x, y = position
    cv2.putText(
        image, text, (x + 2, y + 2),
        cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), 4
    )
    cv2.putText(
        image, text, (x, y),
        cv2.FONT_HERSHEY_SIMPLEX, scale, color, 2
    )


def reliable(person, indexes):
    return all(
        person[index][2] > CONFIDENCE_THRESHOLD
        for index in indexes
    )


def finish_pose(feedback):
    global pose_hold_start
    global completed_holds

    if feedback.startswith("GOOD"):
        if pose_hold_start is None:
            pose_hold_start = time.time()

        elapsed = time.time() - pose_hold_start

        if elapsed >= 3:
            completed_holds += 1
            pose_hold_start = time.time()

        return f"{feedback} | Hold: {elapsed:.1f}s"

    pose_hold_start = None
    return feedback


# ------------------------------------------------------------
# Pose checks
# ------------------------------------------------------------

def check_tadasana(person):
    indexes = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_HIP, RIGHT_HIP,
        LEFT_ANKLE, RIGHT_ANKLE,
    ]

    if not reliable(person, indexes):
        return "Show your full body"

    shoulders = midpoint(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )
    hips = midpoint(
        point(person, LEFT_HIP),
        point(person, RIGHT_HIP),
    )

    width = distance(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )

    lean = vertical_lean(shoulders, hips)
    feet_distance = distance(
        point(person, LEFT_ANKLE),
        point(person, RIGHT_ANKLE),
    ) / (width + 1e-8)

    if lean > 12:
        return "Keep your torso upright"

    if feet_distance > 1.5:
        return "Bring your feet closer together"

    return "GOOD: Tadasana alignment"


def check_tree(person):
    indexes = [
        LEFT_HIP, RIGHT_HIP,
        LEFT_KNEE, RIGHT_KNEE,
        LEFT_ANKLE, RIGHT_ANKLE,
        LEFT_SHOULDER, RIGHT_SHOULDER,
    ]

    if not reliable(person, indexes):
        return "Show both legs clearly"

    left_hip = point(person, LEFT_HIP)
    left_knee = point(person, LEFT_KNEE)
    left_ankle = point(person, LEFT_ANKLE)

    right_hip = point(person, RIGHT_HIP)
    right_knee = point(person, RIGHT_KNEE)
    right_ankle = point(person, RIGHT_ANKLE)

    left_knee_angle = angle(
        left_hip, left_knee, left_ankle
    )
    right_knee_angle = angle(
        right_hip, right_knee, right_ankle
    )

    # In image coordinates, the lifted ankle is usually
    # higher than the standing ankle.
    lifted_left = left_ankle[1] < right_ankle[1] - 25
    lifted_right = right_ankle[1] < left_ankle[1] - 25

    if not lifted_left and not lifted_right:
        return "Lift one foot and place it on your ankle or calf"

    if lifted_left and left_knee_angle > 155:
        return "Keep your left standing leg stable"

    if lifted_right and right_knee_angle > 155:
        return "Keep your right standing leg stable"

    return "GOOD: Tree Pose balance"


def check_warrior_two(person):
    indexes = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_WRIST, RIGHT_WRIST,
        LEFT_HIP, RIGHT_HIP,
        LEFT_KNEE, RIGHT_KNEE,
        LEFT_ANKLE, RIGHT_ANKLE,
    ]

    if not reliable(person, indexes):
        return "Show your arms and legs clearly"

    left_knee_angle = angle(
        point(person, LEFT_HIP),
        point(person, LEFT_KNEE),
        point(person, LEFT_ANKLE),
    )
    right_knee_angle = angle(
        point(person, RIGHT_HIP),
        point(person, RIGHT_KNEE),
        point(person, RIGHT_ANKLE),
    )

    shoulder_width = distance(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )

    hands_width = distance(
        point(person, LEFT_WRIST),
        point(person, RIGHT_WRIST),
    )

    arms_extended = hands_width > shoulder_width * 2.0
    one_knee_bent = (
        min(left_knee_angle, right_knee_angle) < 135
    )
    other_leg_straight = (
        max(left_knee_angle, right_knee_angle) > 150
    )

    if not arms_extended:
        return "Extend both arms in opposite directions"

    if not one_knee_bent:
        return "Bend your front knee"

    if not other_leg_straight:
        return "Keep your back leg straighter"

    return "GOOD: Warrior II alignment"


def check_triangle(person):
    indexes = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_HIP, RIGHT_HIP,
        LEFT_KNEE, RIGHT_KNEE,
        LEFT_ANKLE, RIGHT_ANKLE,
    ]

    if not reliable(person, indexes):
        return "Show your full body clearly"

    shoulders = midpoint(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )
    hips = midpoint(
        point(person, LEFT_HIP),
        point(person, RIGHT_HIP),
    )

    lean = vertical_lean(shoulders, hips)

    left_leg = angle(
        point(person, LEFT_HIP),
        point(person, LEFT_KNEE),
        point(person, LEFT_ANKLE),
    )
    right_leg = angle(
        point(person, RIGHT_HIP),
        point(person, RIGHT_KNEE),
        point(person, RIGHT_ANKLE),
    )

    if lean < 25:
        return "Lengthen your torso to one side"

    if min(left_leg, right_leg) < 145:
        return "Keep both legs more extended"

    return "GOOD: Triangle Pose alignment"


def check_downward_dog(person):
    indexes = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_HIP, RIGHT_HIP,
        LEFT_ANKLE, RIGHT_ANKLE,
    ]

    if not reliable(person, indexes):
        return "Show your shoulders, hips, and ankles"

    shoulders = midpoint(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )
    hips = midpoint(
        point(person, LEFT_HIP),
        point(person, RIGHT_HIP),
    )
    ankles = midpoint(
        point(person, LEFT_ANKLE),
        point(person, RIGHT_ANKLE),
    )

    hips_are_high = hips[1] < shoulders[1]
    legs_are_long = abs(ankles[1] - hips[1]) > 40

    if not hips_are_high:
        return "Lift your hips upward"

    if not legs_are_long:
        return "Move your hips away from your shoulders"

    return "GOOD: Downward Dog alignment"


def check_cobra(person):
    indexes = [
        LEFT_SHOULDER, RIGHT_SHOULDER,
        LEFT_HIP, RIGHT_HIP,
        LEFT_ELBOW, RIGHT_ELBOW,
    ]

    if not reliable(person, indexes):
        return "Show your shoulders, hips, and elbows"

    shoulders = midpoint(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )
    hips = midpoint(
        point(person, LEFT_HIP),
        point(person, RIGHT_HIP),
    )

    shoulder_hip_distance = abs(
        hips[1] - shoulders[1]
    )

    if shoulder_hip_distance < 35:
        return "Lift your chest gently from the floor"

    shoulder_width = distance(
        point(person, LEFT_SHOULDER),
        point(person, RIGHT_SHOULDER),
    )

    elbow_width = distance(
        point(person, LEFT_ELBOW),
        point(person, RIGHT_ELBOW),
    )

    if elbow_width > shoulder_width * 2.0:
        return "Keep your elbows closer to your body"

    return "GOOD: Cobra Pose alignment"


def check_selected_pose(person):
    if selected_pose_id == 1:
        return check_tree(person)
    if selected_pose_id == 2:
        return check_tadasana(person)
    if selected_pose_id == 3:
        return check_warrior_two(person)
    if selected_pose_id == 4:
        return check_triangle(person)
    if selected_pose_id == 5:
        return check_downward_dog(person)
    if selected_pose_id == 6:
        return check_cobra(person)

    return "Select a pose"


# ------------------------------------------------------------
# Main loop
# ------------------------------------------------------------

while True:
    success, frame = camera.read()

    if not success:
        print("Could not read frame from camera")
        break

    frame = cv2.flip(frame, 1)

    results = model(frame, verbose=False)
    output = results[0].plot()

    feedback = "No person detected"
    correct = False

    if len(results[0].keypoints.data) > 0:
        person = (
            results[0]
            .keypoints
            .data[0]
            .cpu()
            .numpy()
        )

        feedback = check_selected_pose(person)
        correct = feedback.startswith("GOOD")

    feedback = finish_pose(feedback)

    # --------------------------------------------------------
    # Draw user interface
    # --------------------------------------------------------

    show_text(
        output,
        f"Pose: {POSES[selected_pose_id]}",
        (20, 40),
        color=(0, 255, 255),
    )

    show_text(
        output,
        feedback,
        (20, 85),
        color=(0, 255, 0) if correct else (0, 200, 255),
        scale=0.70,
    )

    show_text(
        output,
        f"Completed holds: {completed_holds}",
        (20, 130),
        color=(255, 255, 255),
    )

    show_text(
        output,
        "1 Tree | 2 Tadasana | 3 Warrior II",
        (20, 180),
        color=(200, 200, 200),
        scale=0.55,
    )

    show_text(
        output,
        "4 Triangle | 5 Down Dog | 6 Cobra",
        (20, 215),
        color=(200, 200, 200),
        scale=0.55,
    )

    show_text(
        output,
        "q = quit",
        (20, 250),
        color=(200, 200, 200),
        scale=0.55,
    )

    cv2.imshow(
        "AI Yoga Pose Analyzer",
        output,
    )

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

    if key in [ord("1"), ord("2"), ord("3"), ord("4"), ord("5"), ord("6")]:
        selected_pose_id = int(chr(key))
        pose_hold_start = None
        metric_history.clear()


camera.release()
cv2.destroyAllWindows()

print("\n========== YOGA SESSION SUMMARY ==========")
print(f"Last selected pose: {POSES[selected_pose_id]}")
print(f"Completed holds: {completed_holds}")
print("==========================================")
