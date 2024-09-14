// src/screens/UnknownProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, Dimensions, TouchableOpacity } from 'react-native'; // Added Dimensions import
import { retrieveUnknownFaces } from '../../firebase/firestoreConfig';
import FastImage from 'expo-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function UnknownProfileScreen({ navigation }) {
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
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity style={styles.peopleHeader} onPress={() => navigation.goBack()}>
            <Ionicons style={styles.arrowIcon} name="chevron-back-outline" color="#FFFFFF" size={20} />
            <Text style={styles.textTitle}>Unknown</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <FlatList
        data={unknownImages}
        renderItem={renderImageItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={3}
        contentContainerStyle={styles.grid}
      />
    </View>
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
  peopleHeader: {
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