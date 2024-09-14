// src/screens/UnknownProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView, Dimensions } from 'react-native'; // Added Dimensions import
import { retrieveUnknownFaces } from '../../firebase/firestoreConfig';
import FastImage from 'expo-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UnknownProfileScreen() {
  const [unknownImages, setUnknownImages] = useState([]);

  useEffect(() => {
    async function fetchUnknownData() {
      try {
        const cachedData = await AsyncStorage.getItem('unknownFaces');
        if (cachedData) {
          setUnknownImages(JSON.parse(cachedData));
        } else {
          const unknownFacesData = await retrieveUnknownFaces();
          const images = unknownFacesData.map((face) => face.imageUrl);
          setUnknownImages(images);
          await AsyncStorage.setItem('unknownFaces', JSON.stringify(images));
        }
      } catch (error) {
        console.error('Error fetching unknown faces:', error);
      }
    }

    fetchUnknownData();
  }, []);

  const renderImageItem = useCallback(({ item }) => (
    <View style={styles.imageContainer}>
      <FastImage
        source={{ uri: item }}
        style={styles.profileImage}
        resizeMode="cover" // Changed to string value
      />
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={unknownImages}
        renderItem={renderImageItem}
        keyExtractor={(item, index) => index.toString()}
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
    padding: 10,
  },
  grid: {
    justifyContent: 'center',
  },
  imageContainer: {
    margin: imageMargin / 2,
  },
  profileImage: {
    width: imageSize,
    height: imageSize,
    borderRadius: 8,
    // No need to set resizeMode here; it's set in the FastImage component
  },
});