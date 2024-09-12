// src/screens/PeopleScreen.js
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, Dimensions, TouchableOpacity, SafeAreaView } from 'react-native';
import { retrieveKnownFaces, retrieveUnknownFaces } from '../../firebase/firestoreConfig'; // Import the function to get unknown faces
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;
const bubbleSize = screenWidth / 3 - 20; // Calculate the size of each bubble

export default function PeopleScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const knownData = await retrieveKnownFaces();
      const knownProfilesArray = Object.keys(knownData).map((label) => ({
        label,
        urls: knownData[label],
        type: 'known',
      }));

      const sortedProfiles = [...knownProfilesArray].sort((a, b) => b.urls.length - a.urls.length);

      // Fetch unknown faces
      const unknownFacesData = await retrieveUnknownFaces();

      // Add an unknown profile entry
      const unknownProfile = {
        label: 'Unknown',
        urls: unknownFacesData.map(face => face.imageUrl), // Assuming unknownFacesData returns a list of image URLs
        type: 'unknown',
      };

      setProfiles([unknownProfile, ...sortedProfiles]); // Include the unknown profile at the top
    }

    fetchData();
  }, []);

  const renderProfileBubble = ({ item }) => (
    <TouchableOpacity onPress={() => {
      if (item.type === 'unknown') {
        navigation.navigate('UnknownProfile'); // Navigate to UnknownProfileScreen for unknown profiles
      } else {
        navigation.navigate('Profile', { profileName: item.label });
      }
    }}>
      <View style={styles.profileBubble}>
        <Image source={{ uri: item.urls[0] }} style={styles.profileImage} />
        {item.type !== 'unknown' && <Text style={styles.profileName}>{item.label}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.peopleHeader} onPress={() => navigation.goBack()}>
            <Ionicons style={styles.arrowIcon} name="chevron-back-outline" color="#FFFFFF" size={20} />
            <Text style={styles.textTitle}>People</Text>
        </TouchableOpacity>
      <FlatList
        data={profiles}
        renderItem={renderProfileBubble}
        keyExtractor={(item) => item.label}
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
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  arrowIcon: {
    marginBottom: 8,
    marginLeft:5,
  },
  textTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingBottom: 10,
    paddingLeft: 10,
  },
  profileBubble: {
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: 100, // Change to a number to properly handle the border radius
    backgroundColor: '#444',
    margin: 10,
    alignItems: 'center',

  },
  profileImage: {
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: 100, // Change to a number to properly handle the border radius
    resizeMode: 'cover', // Correct object-fit equivalent
  },
  profileName: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    fontWeight: "bold",
    textAlign: 'center',
  },
});