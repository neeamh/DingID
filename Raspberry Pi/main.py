import os
import cv2
import numpy as np
import threading
import logging
import joblib
from datetime import datetime, timedelta
from sklearn import svm
from sklearn.preprocessing import LabelEncoder
from sklearn.neighbors import NearestNeighbors
from deepface import DeepFace
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, storage, firestore
import uuid

# Configure logging
logging.basicConfig(level=logging.ERROR)

# Load environment variables
load_dotenv()

# Get the environment variables
CRED_PATH = os.getenv('FIREBASE_CREDENTIALS')
BUCKET_URL = os.getenv('FIREBASE_STORAGE_BUCKET')

# Initialize the Firebase app
cred = credentials.Certificate(CRED_PATH)
firebase_admin.initialize_app(cred, {
    'storageBucket': BUCKET_URL
})

bucket = storage.bucket()
db = firestore.client()

# Set model names
model_name = "Facenet512"
detector_backend = 'retinaface'

# Set the expected embedding length (for validation)
expected_embedding_length = 512  # For Facenet512

# Step 1: Load embeddings and labels from Firestore
def load_faces_from_firestore():
    embeddings = []
    labels = []

    # Get all documents in the 'faces' collection
    faces_docs = db.collection("faces").stream()

    for face_doc in faces_docs:
        label = face_doc.id  # The document ID is the label

        # Access the 'images' subcollection for this face
        images_collection = face_doc.reference.collection("images").stream()

        for image_doc in images_collection:
            image_data = image_doc.to_dict()
            if 'embedding' in image_data:
                # Convert embedding to NumPy array with correct dtype
                embeddings.append(np.array(image_data['embedding'], dtype=np.float32))
                labels.append(label)

    return np.array(embeddings), labels

embeddings, labels = load_faces_from_firestore()

# Encode labels to integers
label_encoder = LabelEncoder()
encoded_labels = label_encoder.fit_transform(labels)

# Save and load the classifier
def train_or_load_classifier(embeddings, encoded_labels):
    classifier_path = 'svm_classifier.pkl'
    label_encoder_path = 'label_encoder.pkl'

    # Initialize the classifier and label_encoder as None
    classifier = None

    if os.path.exists(classifier_path) and os.path.exists(label_encoder_path):
        classifier = joblib.load(classifier_path)
        label_encoder = joblib.load(label_encoder_path)
        print("Loaded classifier and label encoder from disk.")
    else:
        classifier = svm.SVC(kernel='rbf', C=1, gamma='scale', probability=True)
        classifier.fit(embeddings, encoded_labels)
        
        # Properly initialize and fit the label encoder
        label_encoder = LabelEncoder()
        label_encoder.fit(labels)  # Ensure this line is correct
        
        joblib.dump(classifier, classifier_path)
        joblib.dump(label_encoder, label_encoder_path)
        print("Trained new classifier and saved to disk.")

    return classifier, label_encoder

# Train or load the classifier
classifier, label_encoder = train_or_load_classifier(embeddings, encoded_labels)

# Build the nearest neighbors model for efficient similarity checks
nn_model = NearestNeighbors(metric='cosine', algorithm='auto')
nn_model.fit(embeddings)

# Function to log detection to Firestore asynchronously
def log_detection_to_firestore_async(label, confidence):
    def task():
        detection_ref = db.collection("detections").document()
        detection_ref.set({
            "label": label,
            "confidence": confidence * 100,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        print(f"Logged detection: {label} with {confidence * 100:.2f}% confidence")
    threading.Thread(target=task).start()

# Function to save image and embeddings to Firebase asynchronously
def save_image_to_firebase_async(image, label, collection="faces", embedding=None, is_recognized=True):
    def task():
        image_name = f"{uuid.uuid4()}.jpg"

        # Adjust the path for unrecognized images
        if is_recognized:
            image_path = f"{collection}/{label}/{image_name}"
        else:
            image_path = f"unrecognized_images/{image_name}"  # Store unrecognized images in a separate directory

        # Convert the image from RGB (DeepFace output) to BGR properly
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)  # Convert to RGB format

        # Encode the image as JPEG to a byte array
        _, image_encoded = cv2.imencode('.jpg', image_rgb)  # Encode in RGB
        image_bytes = image_encoded.tobytes()

        # Upload the image to Firebase Storage
        blob = bucket.blob(image_path)
        blob.upload_from_string(image_bytes, content_type='image/jpeg')
        blob.make_public()
        image_url = blob.public_url

        # Prepare Firestore data only if embedding exists
        if embedding is not None and isinstance(embedding, np.ndarray):
            image_data = {
                "image_url": image_url,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "embedding": embedding.tolist()
            }

            # Save in Firestore under the correct label
            if is_recognized:
                doc_ref = db.collection(collection).document(label).collection("images").document(str(uuid.uuid4()))
                doc_ref.set(image_data)
                print(f"Saved recognized image to Firebase Storage and Firestore for {label} with embedding")
            else:
                # Store unrecognized images with embedding separately
                doc_ref = db.collection("unrecognized_images").document(str(uuid.uuid4()))
                doc_ref.set(image_data)
                print(f"Saved unrecognized image to Firestore with embedding")
        else:
            print("No valid embedding found; not saving to Firestore.")

    threading.Thread(target=task).start()

# Function to find the most similar known embedding
def find_most_similar(embedding, threshold=0.7):
    distances, indices = nn_model.kneighbors([embedding], n_neighbors=1)
    similarity = 1 - distances[0][0]
    if similarity >= threshold:
        predicted_label = labels[indices[0][0]]
        return predicted_label, similarity
    else:
        return "Unknown", similarity

# Initialize last save times dictionary for images and detections
last_save_times = {}
last_detection_times = {}

# Initialize webcam for real-time recognition
video_capture = cv2.VideoCapture(0)
similarity_threshold = 0.70

frame_count = 0
frame_interval = 10  # Process every 10th frame
save_interval = timedelta(minutes=10)

while True:
    ret, frame = video_capture.read()
    frame_count += 1

    if not ret:
        print("Error: Could not read frame.")
        break

    if frame_count % frame_interval == 0:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        try:
            # Detect faces in the current frame
            faces = DeepFace.extract_faces(
                img_path=rgb_frame,
                detector_backend=detector_backend,
                enforce_detection=False
            )

            if not faces or len(faces) == 0:
                print("Warning: No faces detected in the frame.")
                continue

            for face in faces:
                facial_area = face['facial_area']
                x, y, w, h = facial_area['x'], facial_area['y'], facial_area['w'], facial_area['h']
                detected_face = rgb_frame[y:y+h, x:x+w]

                # Validate the detected face size
                if detected_face.size == 0 or detected_face.shape[0] < 10 or detected_face.shape[1] < 10:
                    print("Warning: Detected face is too small or invalid, skipping.")
                    continue

                try:
                    # Compute the embedding for the detected face
                    embeddings_result = DeepFace.represent(
                        img_path=detected_face,
                        model_name=model_name,
                        enforce_detection=False
                    )

                    if not embeddings_result or len(embeddings_result) == 0:
                        print("Warning: Failed to generate embedding, skipping. Detected face shape:", detected_face.shape)
                        continue

                    # Extract the embedding
                    detected_face_embedding = embeddings_result[0].get("embedding")

                    # Validate the embedding
                    if (
                        detected_face_embedding is None or
                        len(detected_face_embedding) != expected_embedding_length or
                        not isinstance(detected_face_embedding, list)
                    ):
                        print("Warning: Invalid or empty embedding, skipping.")
                        continue

                    detected_face_embedding = np.array(detected_face_embedding, dtype=np.float32)

                    # Find the most similar known embedding
                    predicted_identity, similarity = find_most_similar(detected_face_embedding, threshold=similarity_threshold)

                    now = datetime.now()
                    last_detection_time = last_detection_times.get(predicted_identity, datetime.min)

                    if predicted_identity != "Unknown" and now - last_detection_time > save_interval:
                        log_detection_to_firestore_async(predicted_identity, similarity)
                        last_detection_times[predicted_identity] = now

                    if predicted_identity == "Unknown":
                        label = "Unknown"
                        color = (255, 0, 0)

                        # Save the image and embedding to Firebase asynchronously
                        save_image_to_firebase_async(
                            cv2.cvtColor(detected_face, cv2.COLOR_RGB2BGR),
                            label,
                            is_recognized=False,
                            embedding=detected_face_embedding
                        )

                    else:
                        label = f"{predicted_identity} ({similarity * 100:.2f}%)"
                        color = (0, 255, 0)
                        last_save_time = last_save_times.get(predicted_identity, datetime.min)

                        if now - last_save_time > save_interval:
                            save_image_to_firebase_async(
                                cv2.cvtColor(frame, cv2.COLOR_RGB2BGR),
                                predicted_identity,
                                embedding=detected_face_embedding
                            )
                            last_save_times[predicted_identity] = now

                    # Draw rectangle and label around the face
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                    cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

                except Exception as e:
                    logging.error(f"Error during embedding or prediction: {e}", exc_info=True)

        except cv2.error as e:
            logging.error(f"OpenCV error during face detection: {e}")
        except Exception as e:
            logging.error(f"Unexpected error during face detection: {e}", exc_info=True)

    # Display the resulting frame
    cv2.imshow('Video', frame)

    # Exit the loop when 'q' is pressed
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the capture and close OpenCV windows
video_capture.release()
cv2.destroyAllWindows()