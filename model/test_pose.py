from ultralytics import YOLO
import cv2

model = YOLO("yolo11n-pose.pt")
camera = cv2.VideoCapture(0)

while True:
    success, frame = camera.read()

    if not success:
        break

    results = model(frame, verbose=False)

    if len(results[0].keypoints) > 0:
        keypoints = results[0].keypoints.xy[0].cpu().numpy()
        confidence = results[0].keypoints.conf[0].cpu().numpy()

        print("Keypoints shape:", keypoints.shape)
        print("First keypoint:", keypoints[0])
        print("First keypoint confidence:", confidence[0])

    output = results[0].plot(labels=False, conf=False)
    cv2.imshow("Pose Detection", output)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()