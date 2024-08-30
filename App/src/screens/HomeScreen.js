// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, Image, Dimensions, SafeAreaView, TouchableOpacity } from 'react-native';
import { retrieveKnownFaces, retrieveUnknownFaces } from '../../firebase/firestoreConfig';

export default function HomeScreen({ navigation }) {
  const [knownProfiles, setKnownProfiles] = useState([]);
  const [unknownProfiles, setUnknownProfiles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const knownData = await retrieveKnownFaces();
      const unknownData = await retrieveUnknownFaces();

      // Convert known faces into a compatible format
      const knownProfilesArray = Object.keys(knownData).map((label) => ({
        label,
        urls: knownData[label],
        type: 'known',  // Indicate that this is a known face
      }));

      // Extract URLs from unknown faces
      const unknownProfilesArray = unknownData.map((item) => item.imageUrl);

      // Set the state with known and unknown profiles
      setKnownProfiles(knownProfilesArray);
      setUnknownProfiles(unknownProfilesArray);
    }

    fetchData();
  }, []);

  // Function to group images into rows
  const groupImagesIntoRows = (urls, imagesPerRow) => {
    const rows = [];
    for (let i = 0; i < urls.length; i += imagesPerRow) {
      rows.push(urls.slice(i, i + imagesPerRow));
    }
    return rows;
  };

  const renderRow = ({ item: row }) => (
    <View style={styles.imageRow}>
      {row.map((imageUrl, index) => (
        <TouchableOpacity key={index} onPress={() => navigation.navigate('FullscreenImage', { imageUrl })}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderKnownItem = ({ item }) => {
    const rows = groupImagesIntoRows(item.urls, 3); // Group images into rows of 3
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.heading}>{item.label}</Text>
        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={(row, index) => index.toString()}
          showsVerticalScrollIndicator={false} // Hide vertical scrollbar
          showsHorizontalScrollIndicator={false} // Hide horizontal scrollbar
        />
      </View>
    );
  };

  const renderUnknownSection = () => {
    const rows = groupImagesIntoRows(unknownProfiles, 3); // Group unknown images into rows of 3
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.heading}>Unknown Faces</Text>
        <FlatList
          data={rows}
          renderItem={renderRow}
          keyExtractor={(row, index) => index.toString()}
          showsVerticalScrollIndicator={false} // Hide vertical scrollbar
          showsHorizontalScrollIndicator={false} // Hide horizontal scrollbar
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={knownProfiles}
          renderItem={renderKnownItem}
          keyExtractor={(item) => item.label}
          ListFooterComponent={renderUnknownSection} // Render unknown section at the bottom
          showsVerticalScrollIndicator={false} // Hide vertical scrollbar
        />
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // Ensure the SafeAreaView takes up the full screen
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  itemContainer: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align items to the start (left-align)
    flexWrap: 'wrap', // Allows wrapping of rows
  },
  image: {
    width: (Dimensions.get('window').width / 3) - 20, // Adjust to fit 3 images per row with margins
    height: (Dimensions.get('window').width / 3) - 20, // Keep it square
    margin: 5,
  },
});