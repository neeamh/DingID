import { getFirestore, collection, getDocs, getDoc, query, where, doc, setDoc, deleteDoc } from "firebase/firestore";
import { app } from './firebase.js'; //from firebase config, not tracked

const db = getFirestore(app);

// Functions to retrieve data
export async function retrieveKnownFaces() {
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
    return facesData; // Return empty object on error
  }
}


export async function retrieveUnknownFaces() {
  const unknownFacesData = [];

  try {
    const unknownSnapshot = await getDocs(collection(db, 'unrecognized_images'));

    unknownSnapshot.forEach((doc) => {
      const docData = doc.data();
      const imageUrl = docData.image_url;
      const timestamp = docData.timestamp;
      if (imageUrl && timestamp) {
        // Include the document ID in the returned data
        unknownFacesData.push({ id: doc.id, imageUrl, timestamp });
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

export async function moveUnknownFaceToProfile(profileName, face) {
  try {
    // Step 1: Get the document from 'unrecognized_images' collection
    const docRef = doc(db, 'unrecognized_images', face.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error(`Document with ID ${face.id} does not exist in 'unrecognized_images'.`);
      return;
    }

    // Step 2: Get the document data
    const data = docSnap.data();

    // Step 3: Create or update the profile document with the 'label' field
    const profileDocRef = doc(db, `faces/${profileName}`);
    await setDoc(profileDocRef, { label: profileName }, { merge: true }); // Add the label field to the profile document

    // Step 4: Add the document to the 'faces/{profileName}/images' collection
    const newDocRef = doc(db, `faces/${profileName}/images`, face.id);
    await setDoc(newDocRef, data);
    console.log(`Document moved to 'faces/${profileName}/images' with ID ${face.id}.`);

    // Step 5: Delete the original document from 'unrecognized_images'
    await deleteDoc(docRef);
    console.log(`Original document deleted from 'unrecognized_images' with ID ${face.id}.`);
  } catch (error) {
    console.error(`Error moving document: ${error.message}`);
    throw error;
  }
}
