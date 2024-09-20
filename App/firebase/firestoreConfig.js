import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { app } from "./firebase.js"; // Ensure this is correctly imported from your Firebase config

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);

// Sign in anonymously
signInAnonymously(auth)
  .then(() => {
    console.log('Signed in anonymously');
  })
  .catch((error) => {
    console.error('Error signing in anonymously:', error);
  });

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
          const imageUrl = embeddingData.image_url || embeddingData.imageUrl;
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
      const imageUrl = docData.image_url || docData.imageUrl;
      const timestamp = docData.timestamp;
      if (imageUrl && timestamp) {
        // Include the document ID in the returned data
        unknownFacesData.push({ id: doc.id, imageUrl, timestamp });
      }
    });

    return unknownFacesData;
  } catch (error) {
    console.error('Error retrieving unknown face data:', error);
    return unknownFacesData; // Return empty array on error
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
        id: doc.id, // Include the document ID
        imageUrl: data.image_url || data.imageUrl, // Ensure this matches your Firestore field
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

export async function retrieveProfileNames() {
  try {
    const facesSnapshot = await getDocs(collection(db, 'faces'));
    const profileNames = facesSnapshot.docs.map((doc) => doc.id);
    return profileNames;
  } catch (error) {
    console.error('Error retrieving profile names:', error);
    throw error;
  }
}

// Function to delete a known photo from Firestore only (without deleting from Firebase Storage)
export async function deleteKnownPhoto(profileName, face) {
  try {
    // Retrieve the document reference
    const docRef = doc(db, `faces/${profileName}/images`, face.id);
    const docSnap = await getDoc(docRef);

    // Check if the document exists
    if (!docSnap.exists()) {
      console.error(`Document with ID ${face.id} does not exist in 'faces/${profileName}/images'.`);
      return;
    }

    // Delete the document from Firestore
    await deleteDoc(docRef);
    console.log(`Document with ID ${face.id} deleted from 'faces/${profileName}/images'.`);

  } catch (error) {
    console.error(`Error deleting document: ${error.message}`);
    throw error;
  }
}

// Function to move a known face to another profile in Firestore
export async function moveKnownFaceToProfile(fromProfileName, toProfileName, face) {
  try {
    // Step 1: Get the document from the 'from' profile
    const docRef = doc(db, `faces/${fromProfileName}/images`, face.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error(`Document with ID ${face.id} does not exist in 'faces/${fromProfileName}/images'.`);
      return;
    }

    // Step 2: Get the document data
    const data = docSnap.data();

    // Step 3: Create or update the 'to' profile document with the 'label' field
    const toProfileDocRef = doc(db, `faces/${toProfileName}`);
    await setDoc(toProfileDocRef, { label: toProfileName }, { merge: true });

    // Step 4: Add the document to the 'faces/{toProfileName}/images' collection
    const newDocRef = doc(db, `faces/${toProfileName}/images`, face.id);
    await setDoc(newDocRef, data);
    console.log(`Document moved to 'faces/${toProfileName}/images' with ID ${face.id}.`);

    // Step 5: Delete the original document from the 'from' profile
    await deleteDoc(docRef);
    console.log(`Document deleted from 'faces/${fromProfileName}/images' with ID ${face.id}.`);

  } catch (error) {
    console.error(`Error moving document: ${error.message}`);
    throw error;
  }
}

// Function to move an unknown face to a profile in Firestore
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
    await setDoc(profileDocRef, { label: profileName }, { merge: true });

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

// Function to update storage paths in Firestore (optional)
// Function to update storage paths in Firestore documents
export async function updateStoragePaths(profileName) {
  try {
    // Reference to the images collection of the specified profile
    const imagesCollectionRef = collection(db, `faces/${profileName}/images`);
    
    // Get all documents (images) in the collection
    const imagesSnapshot = await getDocs(imagesCollectionRef);

    // Loop through each document
    for (const docSnap of imagesSnapshot.docs) {
      const data = docSnap.data();
      const imageUrl = data.image_url || data.imageUrl; // Ensure correct field name

      if (imageUrl) {
        // Extract storage path from the image URL
        const storagePath = getStoragePathFromUrl(imageUrl);

        if (storagePath) {
          // Update the Firestore document with the new storage path
          await updateDoc(docSnap.ref, { storage_path: storagePath });
          console.log(`Updated document ${docSnap.id} with storage path: ${storagePath}`);
        } else {
          console.error(`Unable to extract storage path for document ${docSnap.id}.`);
        }
      } else {
        console.error(`Image URL is missing for document ${docSnap.id}.`);
      }
    }
  } catch (error) {
    console.error(`Error updating storage paths: ${error.message}`);
    throw error;
  }
}