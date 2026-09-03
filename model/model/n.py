"""
Real-time facial expression analyzer for webcam feed on macOS.

Important:
This program estimates visible facial-expression patterns. It cannot reliably
know a person's internal emotion, diagnose anxiety, or determine whether a
person is nervous, sad, or confident.
"""

import os
import cv2
import numpy as np
from collections import deque
import multiprocessing as mp

# Suppress TensorFlow / Abseil C++ warnings before any imports
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["ABSL_LOGGING_THRESHOLD"] = "3"


# ------------------------------------------------------------
# Isolated DeepFace Worker Process
# ------------------------------------------------------------

def deepface_worker(input_queue, output_queue):
    """
    Runs in a completely separate OS process to prevent TensorFlow's C++
    mutex lock collisions with OpenCV's macOS Cocoa main-thread event loop.
    """
    # Import DeepFace strictly inside the child process
    from deepface import DeepFace

    # Warmup model once inside worker process
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    try:
        DeepFace.analyze(
            img_path=dummy_img,
            actions=["emotion"],
            detector_backend="skip",
            enforce_detection=False,
            silent=True,
        )
    except Exception:
        pass

    while True:
        face_crop = input_queue.get()
        if face_crop is None:  # Sentinel signal to exit gracefully
            break

        try:
            analysis = DeepFace.analyze(
                img_path=face_crop,
                actions=["emotion"],
                detector_backend="skip",
                enforce_detection=False,
                silent=True,
            )

            if isinstance(analysis, list) and len(analysis) > 0:
                analysis = analysis[0]

            if isinstance(analysis, dict):
                raw_scores = analysis.get("emotion", {})
                output_queue.put(raw_scores)
            else:
                output_queue.put(None)
        except Exception as err:
            output_queue.put(None)


# ------------------------------------------------------------
# Configuration & Helper Functions
# ------------------------------------------------------------

CAMERA_INDEX = 0
ANALYZE_EVERY_N_FRAMES = 8
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


def draw_text(image, text, position, color=(255, 255, 255), scale=0.7):
    x, y = position
    # Outline
    cv2.putText(
        image,
        text,
        (x + 2, y + 2),
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        (0, 0, 0),
        4,
    )
    # Text
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
    """Return all supported emotion scores as percentages."""
    scores = {}
    for emotion in EMOTION_NAMES:
        value = raw_scores.get(emotion, 0.0)
        scores[emotion] = float(value)
    return scores


def smooth_scores(history):
    """Average recent emotion predictions to reduce flicker."""
    if not history:
        return None
    result = {}
    for emotion in EMOTION_NAMES:
        result[emotion] = float(np.mean([item[emotion] for item in history]))
    return result


def expression_interpretation(dominant_emotion, scores):
    """
    Use careful wording. Facial expression is not proof of an internal state.
    """
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
# Main Program Entrypoint
# ------------------------------------------------------------

if __name__ == "__main__":
    # Required for macOS multiprocessing stability
    mp.set_start_method("spawn", force=True)

    input_queue = mp.Queue(maxsize=1)
    output_queue = mp.Queue(maxsize=1)

    # Start background DeepFace worker process
    worker_process = mp.Process(
        target=deepface_worker,
        args=(input_queue, output_queue),
        daemon=True,
    )
    worker_process.start()

    face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
    if face_cascade.empty():
        raise RuntimeError("Could not load the OpenCV face detector")

    camera = cv2.VideoCapture(CAMERA_INDEX)
    if not camera.isOpened():
        raise RuntimeError("Could not open the camera")

    score_history = deque(maxlen=SMOOTHING_WINDOW)

    last_scores = None
    last_dominant_emotion = "unknown"
    last_interpretation = "Waiting for a face"
    frame_number = 0
    worker_busy = False

    print("Running Real-time Facial Expression Analyzer. Press 'q' to quit.")

    # ------------------------------------------------------------
    # Webcam Loop
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

        # Check for results from the background worker process non-blockingly
        if not output_queue.empty():
            raw_scores = output_queue.get()
            worker_busy = False

            if raw_scores is not None:
                current_scores = normalize_emotion_scores(raw_scores)
                score_history.append(current_scores)
                last_scores = smooth_scores(score_history)

                last_dominant_emotion = max(last_scores, key=last_scores.get)
                last_interpretation = expression_interpretation(
                    last_dominant_emotion,
                    last_scores,
                )

        # Send cropped face to worker process if faces are found
        if len(faces) > 0:
            x, y, width, height = faces[0]
            # Draw face box
            cv2.rectangle(
                frame,
                (x, y),
                (x + width, y + height),
                (0, 255, 0),
                2,
            )

            # Analyze periodically and only if worker is free
            if frame_number % ANALYZE_EVERY_N_FRAMES == 0 and not worker_busy:
                face_crop = frame[y : y + height, x : x + width].copy()
                if face_crop.size > 0 and input_queue.empty():
                    worker_busy = True
                    input_queue.put(face_crop)

        # ------------------------------------------------------------
        # Draw UI Overlay Text
        # ------------------------------------------------------------

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

            # Show top 3 scores
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

    # ------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------
    input_queue.put(None)
    camera.release()
    cv2.destroyAllWindows()