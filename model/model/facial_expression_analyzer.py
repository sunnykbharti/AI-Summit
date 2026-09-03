"""
Real-time facial expression analyzer for macOS webcam feed.

Important:
This program estimates visible facial-expression patterns. It cannot reliably
know a person's internal emotion, diagnose anxiety, or determine whether a
person is nervous, sad, or confident.
"""

import cv2
import numpy as np
from collections import deque
from deepface import DeepFace
import threading


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

CAMERA_INDEX = 0
ANALYZE_EVERY_N_FRAMES = 10
SMOOTHING_WINDOW = 8

EMOTION_NAMES = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "sad",
    "surprise",
    "neutral",
]

FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"


# ------------------------------------------------------------
# Utility functions
# ------------------------------------------------------------

def draw_text(image, text, position, color=(255, 255, 255), scale=0.7):
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


def normalize_emotion_scores(raw_scores):
    scores = {}
    for emotion in EMOTION_NAMES:
        value = raw_scores.get(emotion, 0.0)
        scores[emotion] = float(value)
    return scores


def smooth_scores(history):
    if not history:
        return None
    result = {}
    for emotion in EMOTION_NAMES:
        result[emotion] = float(np.mean([item[emotion] for item in history]))
    return result


def expression_interpretation(dominant_emotion, scores):
    if dominant_emotion == "happy":
        return "positive expression"
    if dominant_emotion == "sad":
        return "sad-like expression"
    if dominant_emotion == "fear":
        return "possible tension or nervous-like expression"
    if dominant_emotion == "angry":
        return "tense expression"
    if dominant_emotion == "surprise":
        return "surprised expression"
    if dominant_emotion == "disgust":
        return "discomfort-like expression"
    return "neutral expression"


# ------------------------------------------------------------
# Thread worker for macOS
# ------------------------------------------------------------

analysis_is_running = False

def run_background_analysis(face_crop):
    global last_scores, last_dominant_emotion, last_interpretation, analysis_is_running

    try:
        # Fast analysis on small cropped face region
        analysis = DeepFace.analyze(
            img_path=face_crop,
            actions=["emotion"],
            detector_backend="skip",  # Skip internal detection as Haar cascade already detected it
            enforce_detection=False,
            silent=True,
        )

        if isinstance(analysis, list) and len(analysis) > 0:
            analysis = analysis[0]

        if isinstance(analysis, dict):
            raw_scores = analysis.get("emotion", {})
            if raw_scores:
                current_scores = normalize_emotion_scores(raw_scores)
                score_history.append(current_scores)
                last_scores = smooth_scores(score_history)

                last_dominant_emotion = max(last_scores, key=last_scores.get)
                last_interpretation = expression_interpretation(
                    last_dominant_emotion, last_scores
                )

    except Exception as error:
        print("Expression analysis warning:", error)
    finally:
        analysis_is_running = False


# ------------------------------------------------------------
# Initialize & Pre-load Model (Crucial for macOS)
# ------------------------------------------------------------

print("Loading face cascade detector...")
face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
if face_cascade.empty():
    raise RuntimeError("Could not load the OpenCV face detector")

print("Pre-loading DeepFace emotion model (this prevents macOS lock errors)...")
# Dummy run to warm up model weights before starting video capture
dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
try:
    DeepFace.analyze(dummy_img, actions=["emotion"], detector_backend="skip", enforce_detection=False, silent=True)
    print("Model loaded successfully.")
except Exception:
    pass

camera = cv2.VideoCapture(CAMERA_INDEX)
if not camera.isOpened():
    raise RuntimeError("Could not open the camera")

score_history = deque(maxlen=SMOOTHING_WINDOW)

last_scores = None
last_dominant_emotion = "unknown"
last_interpretation = "Waiting for a face"
frame_number = 0


# ------------------------------------------------------------
# Webcam loop
# ------------------------------------------------------------

while True:
    success, frame = camera.read()
    if not success:
        print("Could not read frame from camera")
        break

    frame = cv2.flip(frame, 1)
    frame_number += 1

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80),
    )

    # Process first detected face
    if len(faces) > 0:
        x, y, w, h = faces[0]
        # Draw face rectangle
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Send cropped face to background thread
        if frame_number % ANALYZE_EVERY_N_FRAMES == 0 and not analysis_is_running:
            face_crop = frame[y:y+h, x:x+w].copy()
            if face_crop.size > 0:
                analysis_is_running = True
                threading.Thread(
                    target=run_background_analysis,
                    args=(face_crop,),
                    daemon=True
                ).start()

    # Display Overlay Text
    draw_text(
        frame,
        f"Expression estimate: {last_dominant_emotion}",
        (20, 40),
        color=(0, 255, 255),
    )

    draw_text(
        frame,
        last_interpretation,
        (20, 80),
        color=(0, 200, 255),
        scale=0.65,
    )

    if last_scores is not None:
        confidence = last_scores[last_dominant_emotion]

        draw_text(
            frame,
            f"Expression score: {confidence:.1f}%",
            (20, 120),
            color=(255, 255, 255),
            scale=0.65,
        )

        sorted_scores = sorted(
            last_scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:3]

        y_position = 165
        for emotion, score in sorted_scores:
            draw_text(
                frame,
                f"{emotion}: {score:.1f}%",
                (20, y_position),
                color=(220, 220, 220),
                scale=0.58,
            )
            y_position += 30

    draw_text(
        frame,
        "Not a diagnosis or a reliable measure of inner emotion",
        (20, 285),
        color=(180, 180, 180),
        scale=0.50,
    )

    draw_text(
        frame,
        "Press q to quit",
        (20, 320),
        color=(180, 180, 180),
        scale=0.55,
    )

    cv2.imshow("Facial Expression Analyzer", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()