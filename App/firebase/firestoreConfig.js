import { getFirestore, collection, getDocs, query, where, doc } from "firebase/firestore";
import { app } from './firebase.js';

const db = getFirestore(app);

async function retrieveKnownFaces() {
  const facesData = {};

  try {
    const facesSnapshot = await getDocs(collection(db, "faces"));

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
    const unknownSnapshot = await getDocs(collection(db, "unrecognized_images"));

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

// Updated Function to Retrieve Profile Data
export async function retrieveProfileData(profileName) {
  const profileImagesRef = collection(db, `faces/${profileName}/images`);
  const detectionsRef = collection(db, 'detections');
  
  // Query to get the detection logs that match the profile name
  const detectionsQuery = query(detectionsRef, where('label', '==', profileName));
  const logsSnapshot = await getDocs(detectionsQuery);
  const imagesSnapshot = await getDocs(profileImagesRef);

  const detectionLogs = logsSnapshot.docs.map(doc => doc.data());
  const profileImages = imagesSnapshot.docs.map(doc => doc.data().image_url);

  // Assuming the banner image is the most recent image
  const bannerImage = profileImages[0];

  return {
    detectionLogs,
    profileImages,
    bannerImage,
  };
}

// Export the functions to be used in your app
export { retrieveKnownFaces, retrieveUnknownFaces };