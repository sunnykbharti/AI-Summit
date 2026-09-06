"""
Posture + Facial Expression Dashboard

This program combines:
1. YOLO Pose for body posture landmarks.
2. DeepFace for visible facial-expression estimates.
3. OpenCV for a real-time dashboard.

Important:
Facial-expression output is an estimate of visible expression. It is not proof
of a person's internal emotion, confidence, anxiety, or mental state.
"""

import os

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TF_NUM_INTRAOP_THREADS"] = "1"
os.environ["TF_NUM_INTEROP_THREADS"] = "1"

import cv2
import numpy as np
from collections import deque
from deepface import DeepFace
from ultralytics import YOLO


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

YOLO_MODEL = "yolo11n-pose.pt"
CAMERA_INDEX = 0

KEYPOINT_CONFIDENCE = 0.50
EXPRESSION_EVERY_N_FRAMES = 8
SMOOTHING_WINDOW = 7

# Change with keyboard: s = sitting, t = standing
posture_mode = "sitting"

# Change with keyboard: v = side/front
camera_view = "side"

EMOTIONS = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "sad",
    "surprise",
    "neutral",
]

# COCO pose indexes
NOSE = 0
LEFT_SHOULDER = 5
RIGHT_SHOULDER = 6
LEFT_HIP = 11
RIGHT_HIP = 12
LEFT_KNEE = 13
RIGHT_KNEE = 14
LEFT_ANKLE = 15
RIGHT_ANKLE = 16


# ------------------------------------------------------------
# Models and camera
# ------------------------------------------------------------

pose_model = YOLO(YOLO_MODEL)

camera = cv2.VideoCapture(CAMERA_INDEX)

if not camera.isOpened():
    raise RuntimeError("Could not open the camera")

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)

if face_cascade.empty():
    raise RuntimeError("Could not load the face detector")


# ------------------------------------------------------------
# Smoothing state
# ------------------------------------------------------------

torso_history = deque(maxlen=SMOOTHING_WINDOW)
head_history = deque(maxlen=SMOOTHING_WINDOW)
shoulder_history = deque(maxlen=SMOOTHING_WINDOW)
knee_history = deque(maxlen=SMOOTHING_WINDOW)
posture_score_history = deque(maxlen=SMOOTHING_WINDOW)
expression_history = deque(maxlen=SMOOTHING_WINDOW)

last_expression_scores = None
last_expression = "unknown"
last_expression_message = "Waiting for face"
frame_number = 0


# ------------------------------------------------------------
# Drawing and geometry helpers
# ------------------------------------------------------------

def draw_text(image, text, position, color=(255, 255, 255), scale=0.65):
    x, y = position

    cv2.putText(
        image,
        text,
        (x + 2, y + 2),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        (0, 0, 0),
        4,
    )

    cv2.putText(
        image,
        text,
        (x, y),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        color,
        2,
    )


def midpoint(a, b):
    return (
        np.array(a, dtype=np.float32) +
        np.array(b, dtype=np.float32)
    ) / 2


def distance(a, b):
    return float(
        np.linalg.norm(
            np.array(a, dtype=np.float32) -
            np.array(b, dtype=np.float32)
        )
    )


def angle(a, b, c):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)

    ba = a - b
    bc = c - b

    denominator = (
        np.linalg.norm(ba) *
        np.linalg.norm(bc) + 1e-8
    )

    cosine_value = np.dot(ba, bc) / denominator
    cosine_value = np.clip(cosine_value, -1.0, 1.0)

    return float(
        np.degrees(np.arccos(cosine_value))
    )


def torso_lean(shoulder_center, hip_center):
    dx = shoulder_center[0] - hip_center[0]
    dy = shoulder_center[1] - hip_center[1]

    return float(
        np.degrees(
            np.arctan2(abs(dx), abs(dy) + 1e-8)
        )
    )


def head_forward_ratio(nose, shoulder_center, shoulder_width):
    return float(
        abs(nose[0] - shoulder_center[0]) /
        (shoulder_width + 1e-8)
    )


def shoulder_imbalance(left_shoulder, right_shoulder, width):
    return float(
        abs(left_shoulder[1] - right_shoulder[1]) /
        (width + 1e-8)
    )


def normalize_emotions(raw):
    return {
        emotion: float(raw.get(emotion, 0.0))
        for emotion in EMOTIONS
    }


def analyze_expression(frame):
    try:
        result = DeepFace.analyze(
            img_path=frame,
            actions=["emotion"],
            detector_backend="opencv",
            enforce_detection=False,
            silent=True,
        )

        if isinstance(result, list):
            if not result:
                return None
            result = result[0]

        raw = result.get("emotion", {})

        if not raw:
            return None

        return normalize_emotions(raw)

    except Exception as error:
        print("Facial-expression warning:", error)
        return None


def expression_message(emotion):
    messages = {
        "happy": "positive expression",
        "sad": "sad-like expression",
        "fear": "possible tension-like expression",
        "angry": "tense expression",
        "surprise": "surprised expression",
        "disgust": "discomfort-like expression",
        "neutral": "neutral expression",
    }

    return messages.get(emotion, "expression unavailable")


def update_expression(frame):
    global last_expression_scores
    global last_expression
    global last_expression_message

    current = analyze_expression(frame)

    if current is None:
        return

    expression_history.append(current)

    smoothed = {}

    for emotion in EMOTIONS:
        smoothed[emotion] = float(
            np.mean([
                item[emotion]
                for item in expression_history
            ])
        )

    last_expression_scores = smoothed
    last_expression = max(
        smoothed,
        key=smoothed.get
    )
    last_expression_message = expression_message(
        last_expression
    )


# ------------------------------------------------------------
# Posture analysis
# ------------------------------------------------------------

def analyze_posture(person):
    """Return metrics, feedback, and posture score."""

    required = [
        NOSE,
        LEFT_SHOULDER,
        RIGHT_SHOULDER,
        LEFT_HIP,
        RIGHT_HIP,
        LEFT_KNEE,
        RIGHT_KNEE,
        LEFT_ANKLE,
        RIGHT_ANKLE,
    ]

    reliable = all(
        person[index][2] > KEYPOINT_CONFIDENCE
        for index in required
    )

    if not reliable:
        return None

    nose = person[NOSE][:2]
    left_shoulder = person[LEFT_SHOULDER][:2]
    right_shoulder = person[RIGHT_SHOULDER][:2]
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

    hip_center = midpoint(left_hip, right_hip)

    width = distance(
        left_shoulder,
        right_shoulder
    )

    lean = torso_lean(
        shoulder_center,
        hip_center
    )

    head_forward = head_forward_ratio(
        nose,
        shoulder_center,
        width
    )

    shoulder_diff = shoulder_imbalance(
        left_shoulder,
        right_shoulder,
        width
    )

    torso_history.append(lean)
    head_history.append(head_forward)
    shoulder_history.append(shoulder_diff)

    smooth_lean = float(np.mean(torso_history))
    smooth_head = float(np.mean(head_history))
    smooth_shoulders = float(np.mean(shoulder_history))

    errors = []

    if smooth_lean > 15:
        errors.append("torso_lean")

    if camera_view == "side" and smooth_head > 0.35:
        errors.append("head_forward")

    if camera_view == "front" and smooth_shoulders > 0.15:
        errors.append("uneven_shoulders")

    selected_knee_angle = None

    if posture_mode == "sitting":
        left_score = sum(
            person[index][2]
            for index in [
                LEFT_HIP,
                LEFT_KNEE,
                LEFT_ANKLE,
            ]
        )

        right_score = sum(
            person[index][2]
            for index in [
                RIGHT_HIP,
                RIGHT_KNEE,
                RIGHT_ANKLE,
            ]
        )

        if left_score >= right_score:
            selected_knee_angle = angle(
                left_hip,
                left_knee,
                left_ankle,
            )
        else:
            selected_knee_angle = angle(
                right_hip,
                right_knee,
                right_ankle,
            )

        knee_history.append(selected_knee_angle)
        smooth_knee = float(np.mean(knee_history))

        if smooth_knee < 70:
            errors.append("knees_too_bent")
        elif smooth_knee > 140:
            errors.append("legs_position")

    if not errors:
        feedback = (
            "Good interview-ready posture"
            if posture_mode == "sitting"
            else "Good upright posture"
        )
        score = 100
    else:
        if "head_forward" in errors:
            feedback = (
                "Bring your head back over your shoulders"
            )
        elif "torso_lean" in errors:
            feedback = (
                "Sit taller and relax your shoulders"
                if posture_mode == "sitting"
                else "Stand taller and keep your torso upright"
            )
        elif "uneven_shoulders" in errors:
            feedback = "Keep both shoulders relaxed and level"
        elif "knees_too_bent" in errors:
            feedback = "Place your feet comfortably on the floor"
        else:
            feedback = "Keep your knees comfortably bent"

        score = max(0, 100 - 20 * len(errors))

    posture_score_history.append(score)

    return {
        "lean": smooth_lean,
        "head_forward": smooth_head,
        "shoulders": smooth_shoulders,
        "knee_angle": selected_knee_angle,
        "feedback": feedback,
        "score": int(np.mean(posture_score_history)),
        "errors": errors,
    }


# ------------------------------------------------------------
# Dashboard panel
# ------------------------------------------------------------

def create_panel(height, width, posture, face_count):
    panel = np.zeros(
        (height, width, 3),
        dtype=np.uint8
    )

    panel[:] = (25, 25, 25)

    draw_text(
        panel,
        "POSTUREAI DASHBOARD",
        (20, 40),
        color=(0, 255, 255),
        scale=0.75,
    )

    draw_text(
        panel,
        f"Mode: {posture_mode}",
        (20, 85),
        color=(220, 220, 220),
    )

    draw_text(
        panel,
        f"Camera view: {camera_view}",
        (20, 120),
        color=(180, 180, 180),
        scale=0.58,
    )

    y = 175

    if posture is None:
        draw_text(
            panel,
            "Posture: unavailable",
            (20, y),
            color=(0, 0, 255),
        )
        y += 45
    else:
        posture_color = (
            (0, 255, 0)
            if posture["score"] >= 80
            else (0, 0, 255)
        )

        draw_text(
            panel,
            f"Posture score: {posture['score']}%",
            (20, y),
            color=posture_color,
        )
        y += 40

        draw_text(
            panel,
            f"Torso lean: {posture['lean']:.1f} deg",
            (20, y),
            color=(220, 220, 220),
            scale=0.58,
        )
        y += 32

        if posture["knee_angle"] is not None:
            draw_text(
                panel,
                f"Knee angle: {posture['knee_angle']:.1f} deg",
                (20, y),
                color=(220, 220, 220),
                scale=0.58,
            )
            y += 32

        draw_text(
            panel,
            "Feedback:",
            (20, y + 10),
            color=(255, 255, 255),
        )
        y += 45

        # Break long feedback into two lines if needed.
        feedback = posture["feedback"]
        words = feedback.split()
        line_one = ""
        line_two = ""

        for word in words:
            if len(line_one + " " + word) < 30:
                line_one += (" " if line_one else "") + word
            else:
                line_two += (" " if line_two else "") + word

        draw_text(
            panel,
            line_one,
            (20, y),
            color=(0, 200, 255),
            scale=0.58,
        )
        y += 30

        if line_two:
            draw_text(
                panel,
                line_two,
                (20, y),
                color=(0, 200, 255),
                scale=0.58,
            )
            y += 30

    y += 20

    draw_text(
        panel,
        f"Faces detected: {face_count}",
        (20, y),
        color=(220, 220, 220),
        scale=0.58,
    )
    y += 45

    draw_text(
        panel,
        "Expression estimate:",
        (20, y),
        color=(255, 255, 255),
    )
    y += 35

    draw_text(
        panel,
        last_expression,
        (20, y),
        color=(0, 255, 255),
        scale=0.75,
    )
    y += 32

    draw_text(
        panel,
        last_expression_message,
        (20, y),
        color=(0, 200, 255),
        scale=0.55,
    )
    y += 38

    if last_expression_scores is not None:
        top_emotions = sorted(
            last_expression_scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:3]

        for emotion, score in top_emotions:
            draw_text(
                panel,
                f"{emotion}: {score:.1f}%",
                (20, y),
                color=(200, 200, 200),
                scale=0.55,
            )
            y += 28

    y += 15

    draw_text(
        panel,
        "Controls:",
        (20, y),
        color=(255, 255, 255),
        scale=0.58,
    )
    y += 28

    draw_text(
        panel,
        "s sitting | t standing",
        (20, y),
        color=(180, 180, 180),
        scale=0.52,
    )
    y += 25

    draw_text(
        panel,
        "v side/front | q quit",
        (20, y),
        color=(180, 180, 180),
        scale=0.52,
    )

    return panel


# ------------------------------------------------------------
# Main loop
# ------------------------------------------------------------

while True:
    success, frame = camera.read()

    if not success:
        print("Could not read frame from camera")
        break

    frame = cv2.flip(frame, 1)
    frame_number += 1

    # Pose inference
    pose_results = pose_model(
        frame,
        verbose=False,
    )

    camera_view_image = pose_results[0].plot(labels=False, conf=False)
    posture = None

    if len(pose_results[0].keypoints.data) > 0:
        person = (
            pose_results[0]
            .keypoints
            .data[0]
            .cpu()
            .numpy()
        )
        posture = analyze_posture(person)

    # Face detection for display
    gray = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2GRAY,
    )

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80),
    )

    for x, y, width, height in faces:
        cv2.rectangle(
            camera_view_image,
            (x, y),
            (x + width, y + height),
            (0, 255, 0),
            2,
        )

    # DeepFace is intentionally throttled for performance.
    if frame_number % EXPRESSION_EVERY_N_FRAMES == 0:
        update_expression(frame)

    # Resize camera view and create dashboard panel.
    display_height = 720
    camera_ratio = (
        display_height /
        camera_view_image.shape[0]
    )
    display_width = int(
        camera_view_image.shape[1] * camera_ratio
    )

    camera_view_image = cv2.resize(
        camera_view_image,
        (display_width, display_height),
    )

    panel_width = 430

    panel = create_panel(
        display_height,
        panel_width,
        posture,
        len(faces),
    )

    dashboard = np.hstack(
        [camera_view_image, panel]
    )

    cv2.imshow(
        "PostureAI Integrated Dashboard",
        dashboard,
    )

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

    elif key == ord("s"):
        posture_mode = "sitting"
        torso_history.clear()
        head_history.clear()
        shoulder_history.clear()
        knee_history.clear()
        posture_score_history.clear()

    elif key == ord("t"):
        posture_mode = "standing"
        torso_history.clear()
        head_history.clear()
        shoulder_history.clear()
        knee_history.clear()
        posture_score_history.clear()

    elif key == ord("v"):
        camera_view = (
            "front"
            if camera_view == "side"
            else "side"
        )


camera.release()
cv2.destroyAllWindows()
