import { getFirestore, collection, getDocs, query, where, doc } from "firebase/firestore";
import { app } from './firebase.js';

const db = getFirestore(app);

// Functions to retrieve data
async function retrieveKnownFaces() {
  const facesData = {};

  try {
    const facesSnapshot = await getDocs(collection(db, 'faces'));

    for (const faceDoc of facesSnapshot.docs) {
      if (faceDoc.id !== 'Unknown') {
        const label = faceDoc.id;
        const embeddingsSnapshot = await getDocs(collection(db, `faces/${label}/images`));
        const imageURLs = [];

        embeddingsSnapshot.forEach((embeddingDoc) => {
          const embeddingData = embeddingDoc.data();
          const imageUrl = embeddingData.image_url;
          if (imageUrl) {
            imageURLs.push(imageUrl);
          }
        });

        facesData[label] = imageURLs;
      }
    }

    return facesData;
  } catch (error) {
    console.error('Error retrieving face data:', error);
  }
}

async function retrieveUnknownFaces() {
  const unknownFacesData = [];

  try {
    const unknownSnapshot = await getDocs(collection(db, 'unrecognized_images'));

    unknownSnapshot.forEach((doc) => {
      const docData = doc.data();
      const imageUrl = docData.image_url;
      const timestamp = docData.timestamp;
      if (imageUrl && timestamp) {
        unknownFacesData.push({ imageUrl, timestamp });
      }
    });

    return unknownFacesData;
  } catch (error) {
    console.error('Error retrieving unknown face data:', error);
  }
}

export async function retrieveProfileData(profileName) {
  const profileImagesRef = collection(db, `faces/${profileName}/images`);
  const detectionsRef = collection(db, 'detections');

  try {
    // Query to get the detection logs that match the profile name
    const detectionsQuery = query(detectionsRef, where('label', '==', profileName));
    const [logsSnapshot, imagesSnapshot] = await Promise.all([
      getDocs(detectionsQuery),
      getDocs(profileImagesRef),
    ]);

    const detectionLogs = logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Convert Timestamp to ISO string
      const timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : null;
      return {
        ...data,
        timestamp,
      };
    });

    const profileImages = imagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        imageUrl: data.image_url, // Ensure this matches your Firestore field
        timestamp: data.timestamp ? data.timestamp.toMillis() : null,
      };
    });

    // Ensure bannerImage is set correctly
    const bannerImage = profileImages.length > 0 ? profileImages[0].imageUrl : null;

    return {
      detectionLogs,
      profileImages,
      bannerImage,
    };
  } catch (error) {
    console.error('Error retrieving profile data:', error);
    return {
      detectionLogs: [],
      profileImages: [],
      bannerImage: null,
    };
  }
}

// Export the functions to be used in your app
export { retrieveKnownFaces, retrieveUnknownFaces };