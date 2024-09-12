import React, { useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Modal, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FullscreenImageScreen = ({ route, navigation }) => {
  const { imageUrl } = route.params;
  const [modalVisible, setModalVisible] = useState(false); // State for managing the modal

  return (
    <View style={styles.container}>
      {/* Close button with Ionicons */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
        <Ionicons name="close-circle" size={30} color="#d9d9d9" />
      </TouchableOpacity>

      {/* Options button with Ionicons */}
      <TouchableOpacity style={styles.optionsButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={30} color="#d9d9d9" />
      </TouchableOpacity>

      {/* Fullscreen Image */}
      <Image source={{ uri: imageUrl }} style={styles.fullscreenImage} />

      {/* Modal for the bottom menu */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.menuItem}>
              <Text style={styles.menuText}>Option 1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.menuItem}>
              <Text style={styles.menuText}>Option 2</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.menuItem}>
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
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  menuText: {
    fontSize: 16,
    textAlign: 'center',
  },
});