import os
import cv2
import numpy as np
from deepface import DeepFace
from sklearn import svm
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, storage, firestore
import uuid
from datetime import datetime, timedelta
import io

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

# Preload the DeepFace model (this time, we're just loading it to speed up the first call)
model_name = "Facenet512"

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
                # Append the embedding and corresponding label
                embeddings.append(np.array(image_data['embedding']))
                labels.append(label)
    
    return np.array(embeddings), labels

embeddings, labels = load_faces_from_firestore()

# Encode labels to integers
label_encoder = LabelEncoder()
encoded_labels = label_encoder.fit_transform(labels)

# Step 2: Train an optimized SVM classifier on the embeddings
classifier = svm.SVC(kernel='rbf', C=1, gamma='scale', probability=True)
classifier.fit(embeddings, encoded_labels)

# Step 3: Function to upload detection details to Firestore
def log_detection_to_firestore(label, confidence):
    detection_ref = db.collection("detections").document()
    detection_ref.set({
        "label": label,
        "confidence": confidence * 100,
        "timestamp": firestore.SERVER_TIMESTAMP
    })
    
    print(f"Logged detection: {label} with {confidence * 100:.2f}% confidence")

# Step 4: Function to save image to Firebase Storage and Firestore
# Step 4: Function to save image to Firebase Storage and Firestore
def save_image_to_firebase(image, label, collection="faces", embedding=None, is_recognized=True):
    image_name = f"{uuid.uuid4()}.jpg"

    if is_recognized:
        # Save recognized faces in the specific directory for that face label (e.g., "faces/Neeam/")
        image_path = f"{collection}/{label}/{image_name}"
    else:
        # Save unrecognized faces in a separate "unrecognized" directory
        image_path = f"unrecognized/{image_name}"

    # Convert the image back to BGR before saving
    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    # Encode the image as JPEG to a byte array
    _, image_encoded = cv2.imencode('.jpg', image_bgr)
    image_bytes = image_encoded.tobytes()

    # Upload the image directly to Firebase Storage
    blob = bucket.blob(image_path)
    blob.upload_from_string(image_bytes, content_type='image/jpeg')
    blob.make_public()
    image_url = blob.public_url

    # Save the image URL and embedding to Firestore
    image_data = {
        "image_url": image_url,
        "timestamp": firestore.SERVER_TIMESTAMP
    }

    if embedding is not None:
        image_data["embedding"] = embedding  # No need to call tolist()

    if is_recognized:
        # Save the image under the "images" subcollection for the recognized face
        doc_ref = db.collection(collection).document(label).collection("images").document(str(uuid.uuid4()))
        doc_ref.set(image_data)
    else:
        # Store directly under the "Unknown" collection with the image URL and timestamp
        doc_ref = db.collection(collection).document("Unknown").collection("unrecognized_images").document(str(uuid.uuid4()))
        doc_ref.set(image_data)

    print(f"Saved image to Firebase Storage and Firestore for {label}")
# Step 5: Cosine Similarity Check
def cosine_similarity_check(embedding, known_embeddings, threshold=0.7):
    """Check if the cosine similarity between the embedding and any known embeddings exceeds the threshold."""
    similarities = cosine_similarity([embedding], known_embeddings)
    max_similarity = np.max(similarities)
    
    if max_similarity >= threshold:
        return True, max_similarity
    return False, max_similarity

# Initialize last save times dictionary for images and detections
last_save_times = {}
last_detection_times = {}

# Step 6: Initialize webcam for real-time recognition
video_capture = cv2.VideoCapture(0)
similarity_threshold = 0.70  # Adjust this threshold for stricter or looser matching

frame_count = 0
frame_interval = 5  # Process every 5th frame
save_interval = timedelta(minutes=10)  # Save an image or detection only every 10 minutes

def predict_identity(embedding):
    """Predict the identity of a face based on its embedding using the trained SVM."""
    prediction = classifier.predict([embedding])
    probability = classifier.predict_proba([embedding])
    predicted_label = label_encoder.inverse_transform(prediction)[0]
    confidence = np.max(probability)
    
    # Perform a cosine similarity check
    is_similar, similarity_score = cosine_similarity_check(embedding, embeddings, threshold=similarity_threshold)
    
    # Set a threshold for confidence and similarity; if below, return "Unknown"
    confidence_threshold = 0.60  # Adjust this threshold as needed
    
    if confidence < confidence_threshold or not is_similar:
        return "Unknown", confidence
    
    return predicted_label, confidence

while True:
    ret, frame = video_capture.read()
    frame_count += 1

    if not ret:
        print("Error: Could not read frame.")
        break

    if frame_count % frame_interval == 0:
        # Convert the frame to RGB (DeepFace expects RGB input)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        try:
            # Detect faces in the current frame using a faster backend
            faces = DeepFace.extract_faces(img_path=rgb_frame, detector_backend='retinaface', enforce_detection=False)

            for face in faces:
                # Extract the bounding box coordinates
                x, y, w, h = face['facial_area']['x'], face['facial_area']['y'], face['facial_area']['w'], face['facial_area']['h']

                # Crop the detected face directly from the frame for embedding
                detected_face = rgb_frame[y:y+h, x:x+w]

                # Compute the embedding for the detected face directly from the live frame
                detected_face_embedding = DeepFace.represent(img_path=detected_face, model_name=model_name, enforce_detection=False)[0]["embedding"]

                # Predict the identity using the SVM classifier with cosine similarity check
                predicted_identity, confidence = predict_identity(detected_face_embedding)

                # Log the detection to Firestore every 10 minutes
                now = datetime.now()
                last_detection_time = last_detection_times.get(predicted_identity, datetime.min)

                if predicted_identity != "Unknown" and now - last_detection_time > save_interval:
                    log_detection_to_firestore(predicted_identity, confidence)
                    last_detection_times[predicted_identity] = now

                # Determine the label to display and handle saving to Firebase
                if predicted_identity == "Unknown":
                    label = "Unknown"
                    color = (255, 0, 0)  # Blue color for "Unknown"
                    save_image_to_firebase(cv2.cvtColor(detected_face, cv2.COLOR_RGB2BGR), label, is_recognized=False)
                else:
                    label = f"{predicted_identity} ({confidence * 100:.2f}%)"
                    color = (0, 255, 0)  # Green color for known faces

                    # Check if we should save the image
                    last_save_time = last_save_times.get(predicted_identity, datetime.min)

                    if now - last_save_time > save_interval:
                        save_image_to_firebase(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), predicted_identity, embedding=detected_face_embedding)
                        last_save_times[predicted_identity] = now

                # Draw bounding box and label for the detected face
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

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