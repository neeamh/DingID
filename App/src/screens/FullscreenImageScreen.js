import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Modal, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  deleteKnownPhoto,
  moveKnownFaceToProfile,
  retrieveProfileNames,
} from '../../firebase/firestoreConfig';

const FullscreenImageScreen = ({ route, navigation }) => {
  const { imageUrl, profileName, id } = route.params;
  const [modalVisible, setModalVisible] = useState(false);
  const [profilesModalVisible, setProfilesModalVisible] = useState(false);
  const [profiles, setProfiles] = useState([]);

  function handleDelete() {
    deleteKnownPhoto(profileName, { id })
      .then(() => {
        console.log('Photo deleted successfully');
        navigation.goBack();
      })
      .catch((error) => {
        console.error('Error deleting photo:', error);
      });
  }

  async function handleMoveToProfile() {
    try {
      const profileNames = await retrieveProfileNames();
      setProfiles(profileNames.filter((name) => name !== profileName)); // Exclude current profile
      setModalVisible(false); // Close the initial modal
      setProfilesModalVisible(true); // Open the profiles modal
    } catch (error) {
      console.error('Error retrieving profiles:', error);
    }
  }

  function handleProfileSelect(toProfileName) {
    moveKnownFaceToProfile(profileName, toProfileName, { id })
      .then(() => {
        console.log('Photo moved successfully');
        setProfilesModalVisible(false);
        navigation.goBack();
      })
      .catch((error) => {
        console.error('Error moving photo:', error);
      });
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
        <Ionicons name="close-outline" size={30} color="#d9d9d9" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionsButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={28} color="#d9d9d9" />
      </TouchableOpacity>

      <Image source={{ uri: imageUrl }} style={styles.fullscreenImage} />

      {/* Main Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={handleMoveToProfile} style={styles.menuItem}>
              <Ionicons name="return-up-forward-outline" size={20} color="#d9d9d9" />
              <Text style={styles.menuText}>Move to profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.menuItem}>
              <Ionicons name="trash-outline" size={20} color="#d9d9d9" />
              <Text style={styles.menuText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.menuItem}>
              <Ionicons name="close-outline" size={20} color="#d9d9d9" />
              <Text style={styles.menuText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profiles Modal */}
      <Modal
        transparent={true}
        visible={profilesModalVisible}
        animationType="slide"
        onRequestClose={() => setProfilesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Profile</Text>
            {profiles.map((profile) => (
              <TouchableOpacity
                key={profile}
                onPress={() => handleProfileSelect(profile)}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>{profile}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setProfilesModalVisible(false)} style={styles.menuItem}>
              <Text style={styles.menuText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        transparent={true}
        visible={profilesModalVisible}
        animationType="slide"
        onRequestClose={() => setProfilesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Profile</Text>
            {profiles.map((profile) => (
              <TouchableOpacity
                key={profile}
                onPress={() => handleProfileSelect(profile)}
                style={styles.menuItem}
              >
                <Text style={styles.menuText}>{profile}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setProfilesModalVisible(false)} style={styles.menuItem}>
              <Text style={styles.menuText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FullscreenImageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
  optionsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Align at the bottom
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: '#1c1b29',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  menuItem: {
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    color: "#ccc",
    fontSize: 16,
    textAlign: 'start',
    marginLeft: 20,
  },
});