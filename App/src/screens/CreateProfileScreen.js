import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import FastImage from 'expo-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { retrieveUnknownFaces, moveUnknownFaceToProfile } from '../../firebase/firestoreConfig'; // Import the new functions

export default function CreateProfileScreen({ navigation }) {
  const [profileName, setProfileName] = useState('');
  const [unknownFaces, setUnknownFaces] = useState([]);
  const [selectedFaces, setSelectedFaces] = useState([]);

  useEffect(() => {
    async function fetchUnknownFaces() {
      const faces = await retrieveUnknownFaces();
      setUnknownFaces(faces);
    }

    fetchUnknownFaces();
  }, []);

  const handleFaceSelect = (face) => {
    console.log(face)
    if (selectedFaces.includes(face)) {
      setSelectedFaces(selectedFaces.filter((f) => f.id !== face.id)); // Deselect the face by unique ID
    } else {
      setSelectedFaces([...selectedFaces, face]); // Select the face
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName) {
      alert('Please provide a profile name.');
      return;
    }

    if (selectedFaces.length === 0) {
      alert('Please select at least one image.');
      return;
    }

    try {
      await Promise.all(
        selectedFaces.map(async (face) => {
          await moveUnknownFaceToProfile(profileName, face);
        })
      );

      alert('Profile created successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile.');
    }
  };

  const renderUnknownFace = ({ item }) => (
    <TouchableOpacity style={styles.imageContainer} onPress={() => handleFaceSelect(item)}>
      <FastImage
        source={{ uri: item.imageUrl }}
        style={[
          styles.profileImage,
          selectedFaces.includes(item) ? styles.selectedImage : null, // Highlight selected images
        ]}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.peopleButton} onPress={() => navigation.goBack()}>
                <Ionicons style={styles.arrowIcon} name="chevron-back-outline" color="#FFFFFF" size={20} />
                <Text style={styles.textTitle}>Create Profile</Text>
            </TouchableOpacity>
        </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Profile Name"
          value={profileName}
          onChangeText={setProfileName}
        />
        <TouchableOpacity onPress={handleSaveProfile} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={unknownFaces}
        renderItem={renderUnknownFace}
        keyExtractor={(item) => item.id} // Ensure the key is unique
        numColumns={3}
        contentContainerStyle={styles.grid}
      />
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;
const imageMargin = 10;
const imageSize = (screenWidth - (3 + 1) * imageMargin) / 3; // Calculate size for a grid with 3 columns

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0b1a',
  },
  header: {
    flexDirection:"row",
    justifyContent: "space-between"
  },
  peopleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  arrowIcon: {
    marginLeft: 5,
  },
  textTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingLeft: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  saveButton: {
    marginLeft: 10,
    backgroundColor: '#302656',
    padding: 10,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  grid: {
    padding: 10,
  },
  profileImage: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
  },
  imageContainer: {
    margin: imageMargin / 2,
  },
  selectedImage: {
    borderColor: '#7180d6',
    borderWidth: 3,
  },
});