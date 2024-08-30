import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from './firebase.js';

const db = getFirestore(app);

async function retrieveKnownFaces() {
    const facesData = {};
  
    try {
        // Get all documents in the 'faces' collection
        const facesSnapshot = await getDocs(collection(db, "faces"));
  
        // Iterate over each document in the 'faces' collection
        for (const faceDoc of facesSnapshot.docs) {
            if(faceDoc.id !== 'Unknown'){
                const label = faceDoc.id; // The document ID is the label name
  
                // Get the 'embeddings' subcollection for this face
                const embeddingsSnapshot = await getDocs(collection(db, `faces/${label}/images`));
      
                // Initialize the list of image URLs for this label
                const imageURLs = [];
      
                // Iterate over each document in the 'embeddings' subcollection
                embeddingsSnapshot.forEach((embeddingDoc) => {
                    const embeddingData = embeddingDoc.data();
                    const imageUrl = embeddingData.image_url;
                    if (imageUrl) {
                        imageURLs.push(imageUrl);
                    }
                });
      
                // Store the label and corresponding image URLs in the facesData object
                facesData[label] = imageURLs;

            }

        }
  
        // Return the constructed object
        return facesData;
    } catch (error) {
        console.error('Error retrieving face data:', error);
    }
}

async function retrieveUnknownFaces() {
    const unknownFacesData = [];
  
    try {
        // Get all documents in the 'unrecognized_images' subcollection under the 'Unknown' document
        const unknownSnapshot = await getDocs(collection(db, "faces/Unknown/unrecognized_images"));
  
        // Iterate over each document in the 'unrecognized_images' subcollection
        unknownSnapshot.forEach((doc) => {
            const docData = doc.data();
            const imageUrl = docData.image_url;
            const timestamp = docData.timestamp;
            if (imageUrl && timestamp) {
                unknownFacesData.push({ imageUrl, timestamp });
            }
        });
  
        // Return the array of unknown face data (image URLs and timestamps)
        return unknownFacesData;
    } catch (error) {
        console.error('Error retrieving unknown face data:', error);
    }
}
  
// Export the functions to be used in your app
export { retrieveKnownFaces, retrieveUnknownFaces };