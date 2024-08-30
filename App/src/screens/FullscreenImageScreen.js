// src/screens/FullscreenImageScreen.js
import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text } from 'react-native';

const FullscreenImageScreen = ({ route, navigation }) => {
  const { imageUrl } = route.params;

  
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
      <Image source={{ uri: imageUrl }} style={styles.fullscreenImage} />
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
    top: 40,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});