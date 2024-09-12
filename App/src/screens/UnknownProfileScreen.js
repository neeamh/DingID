// src/screens/UnknownProfileScreen.js
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Image, Dimensions, SafeAreaView } from 'react-native';
import { retrieveUnknownFaces } from '../../firebase/firestoreConfig';

const screenWidth = Dimensions.get('window').width;
const imageMargin = 10;
const imageSize = (screenWidth - (3 + 1) * imageMargin) / 3; // Calculate size for a grid with 3 columns

export default function UnknownProfileScreen() {
  const [unknownImages, setUnknownImages] = useState([]);

  useEffect(() => {
    async function fetchUnknownData() {
      const unknownFacesData = await retrieveUnknownFaces();
      setUnknownImages(unknownFacesData.map(face => face.imageUrl)); // Map unknown faces to their image URLs
    }

    fetchUnknownData();
  }, []);

  const renderImageItem = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item }} style={styles.profileImage} />
    </View>
  );

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
    resizeMode: 'cover',
  },
});