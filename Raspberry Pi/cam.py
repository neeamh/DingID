import cv2

# Attempt to initialize the webcam
camera_index = 0  # Start with the default camera
video_capture = cv2.VideoCapture(camera_index)

if not video_capture.isOpened():
    print(f"Error: Could not open camera at index {camera_index}. Trying next camera...")
    camera_index += 1
    video_capture = cv2.VideoCapture(camera_index)

    if not video_capture.isOpened():
        print("Error: Could not access any camera.")
        exit()

while True:
    # Capture frame-by-frame
    ret, frame = video_capture.read()

    if not ret:
        print("Error: Could not read frame.")
        break

    # Display the resulting frame
    cv2.imshow('Live Feed', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the webcam and close windows
video_capture.release()
cv2.destroyAllWindows()