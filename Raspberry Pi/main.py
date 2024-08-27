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

# Step 1: Load embeddings and labels from Firestore
def load_faces_from_firestore():
    embeddings = []
    labels = []
    faces_docs = db.collection("faces").stream()
    for face_doc in faces_docs:
        label = face_doc.id  # The document ID is the label
        embeddings_collection = face_doc.reference.collection("embeddings").stream()
        
        for embedding_doc in embeddings_collection:
            embedding_data = embedding_doc.to_dict()
            embeddings.append(np.array(embedding_data['embedding']))
            labels.append(label)
    
    return np.array(embeddings), labels

embeddings, labels = load_faces_from_firestore()

# Encode labels to integers
label_encoder = LabelEncoder()
encoded_labels = label_encoder.fit_transform(labels)

# Step 2: Train an SVM classifier on the embeddings
classifier = svm.SVC(kernel='linear', probability=True)
classifier.fit(embeddings, encoded_labels)

# Step 3: Function to upload images and embeddings to Firebase
def add_face_to_firestore(image, label):
    image_name = f"{uuid.uuid4()}.jpg"
    image_path = f"faces/{image_name}"

    # Save the image locally
    cv2.imwrite(image_name, image)

    # Upload the image to Firebase Storage
    blob = bucket.blob(image_path)
    blob.upload_from_filename(image_name)
    blob.make_public()
    image_url = blob.public_url

    # Compute the embedding
    embedding = DeepFace.represent(img_path=image_name, model_name="Facenet512", enforce_detection=False)[0]["embedding"]

    # Check if the face label already exists in Firestore
    doc_ref = db.collection("faces").document(label)
    doc = doc_ref.get()

    if doc.exists:
        # If the document exists, add the new embedding and image URL to the subcollection
        doc_ref.collection("embeddings").add({
            "embedding": embedding.tolist(),  # Convert embedding to list
            "image_url": image_url
        })
        print(f"Added new embedding to existing profile with label: {label}")
    else:
        # If the document does not exist, create a new one with the first embedding
        doc_ref.set({"label": label})
        doc_ref.collection("embeddings").add({
            "embedding": embedding.tolist(),
            "image_url": image_url
        })
        print(f"Created new profile in Firestore with label: {label}")

    # Optionally remove the local image after upload
    os.remove(image_name)

# Step 4: Cosine Similarity Check
def cosine_similarity_check(embedding, known_embeddings, threshold=0.7):
    """Check if the cosine similarity between the embedding and any known embeddings exceeds the threshold."""
    similarities = cosine_similarity([embedding], known_embeddings)
    max_similarity = np.max(similarities)
    
    if max_similarity >= threshold:
        return True, max_similarity
    return False, max_similarity

# Step 5: Initialize webcam for real-time recognition
video_capture = cv2.VideoCapture(0)
similarity_threshold = 0.70  # Adjust this threshold for stricter or looser matching

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
    
    # print(f"Predicted Label: {predicted_label}, Confidence: {confidence:.2f}, Similarity: {similarity_score:.2f}")  # Debug information

    if confidence < confidence_threshold or not is_similar:
        return "Unknown", confidence
    
    return predicted_label, confidence

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

            # Predict the identity using the SVM classifier with cosine similarity check
            predicted_identity, confidence = predict_identity(detected_face_embedding)

            # Determine the label to display
            if predicted_identity == "Unknown":
                label = "Unknown"
                color = (255, 0, 0)  # Blue color for "Unknown"
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
            else:
                label = f"{predicted_identity} ({confidence * 100:.2f}%)"
                color = (0, 255, 0)  # Green color for known faces
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