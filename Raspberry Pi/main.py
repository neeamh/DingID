import cv2
from deepface import DeepFace
import numpy as np

# List of paths to reference images of your face
reference_image_paths = ["neeam.png", "neeam1.jpg", "neeam2.jpg", "neeam3.jpg",  "neeam4.jpg",  "neeam5.jpg"]

# Step 1: Calculate the average embedding of the reference images
reference_embeddings = []
for img_path in reference_image_paths:
    embedding = DeepFace.represent(img_path=img_path, model_name="Facenet512", enforce_detection=False)[0]["embedding"]
    reference_embeddings.append(embedding)

# Calculate the mean embedding (average of all embeddings)
reference_face_embedding = np.mean(reference_embeddings, axis=0)

# Step 2: Initialize webcam for real-time recognition
video_capture = cv2.VideoCapture(0)
similarity_threshold = 0.70 # Adjust this threshold for stricter or looser matching

def cosine_similarity(vec1, vec2):
    """Calculate the cosine similarity between two vectors."""
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)
    return dot_product / (norm_vec1 * norm_vec2)

while True:
    ret, frame = video_capture.read()

    if not ret:
        print("Error: Could not read frame.")
        break

    # Convert the frame to RGB (DeepFace expects RGB input)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    try:
        # Detect faces in the current frame
        faces = DeepFace.extract_faces(img_path=rgb_frame, detector_backend='opencv', enforce_detection=False)

        for face in faces:
            # Extract the bounding box coordinates
            x, y, w, h = face['facial_area']['x'], face['facial_area']['y'], face['facial_area']['w'], face['facial_area']['h']

            # Crop the detected face directly from the frame for embedding
            detected_face = rgb_frame[y:y+h, x:x+w]

            # Compute the embedding for the detected face directly from the live frame
            detected_face_embedding = DeepFace.represent(img_path=detected_face, model_name="Facenet512", enforce_detection=False)[0]["embedding"]

            similarity = cosine_similarity(reference_face_embedding, detected_face_embedding)

            # Convert similarity to percentage
            accuracy_percentage = similarity * 100

            if similarity > similarity_threshold:
                # If the face matches the reference face, label it as "Neeam" with accuracy percentage
                label = f"Neeam ({accuracy_percentage:.2f}%)"
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            else:
                # If the face doesn't match, label it as "Unknown"
                cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)
                cv2.putText(frame, "Unknown", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

    except Exception as e:
        print(f"Error: {e}")

    # Display the resulting frame
    cv2.imshow('Video', frame)

    # Break the loop on 'q' key press
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the webcam and close windows
video_capture.release()
cv2.destroyAllWindows()
