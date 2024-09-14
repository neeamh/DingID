// src/screens/PeopleScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { retrieveKnownFaces, retrieveUnknownFaces } from '../../firebase/firestoreConfig';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'expo-fast-image';

const screenWidth = Dimensions.get('window').width;
const bubbleSize = screenWidth / 3 - 20; // Calculate the size of each bubble

export default function PeopleScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch profiles from Firestore
        const knownData = await retrieveKnownFaces();
        const knownProfilesArray = Object.keys(knownData).map((label) => ({
          label,
          urls: knownData[label],
          type: 'known',
        }));

        // Sort known profiles by the number of URLs
        const sortedProfiles = knownProfilesArray.sort((a, b) => b.urls.length - a.urls.length);

        // Fetch unknown faces
        const unknownFacesData = await retrieveUnknownFaces();

        // Add an unknown profile entry
        const unknownProfile = {
          label: 'Unknown',
          urls: unknownFacesData.map((face) => face.imageUrl),
          type: 'unknown',
        };

        // Combine known profiles and place the unknown profile at the end
        const allProfiles = sortedProfiles.concat(unknownProfile);

        // Update the profiles state
        setProfiles(allProfiles);

        // Cache the data
        await AsyncStorage.setItem('peopleProfiles', JSON.stringify(allProfiles));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, [navigation]); // Depend on navigation prop to ensure re-render when navigation changes

  const renderProfileBubble = useCallback(({ item }) => {
    const imageUrl = item.urls[0];

    return (
      <TouchableOpacity
        onPress={() => {
          if (item.type === 'unknown') {
            navigation.navigate('UnknownProfile'); // Navigate to UnknownProfileScreen for unknown profiles
          } else {
            navigation.navigate('Profile', { profileName: item.label });
          }
        }}
      >
        <View style={styles.profileBubble}>
          {imageUrl ? (
            <FastImage
              source={{ uri: imageUrl }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          {item.type !== 'unknown' && <Text style={styles.profileName}>{item.label}</Text>}
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.peopleButton} onPress={() => navigation.goBack()}>
          <Ionicons style={styles.arrowIcon} name="chevron-back-outline" color="#FFFFFF" size={20} />
          <Text style={styles.textTitle}>People</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreateProfile')}>
          <Ionicons style={styles.plusIcon} name="add-outline" color="#FFFFFF" size={28} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={profiles}
        renderItem={renderProfileBubble}
        keyExtractor={(item) => item.label || Math.random().toString()} // Ensure unique keys
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
  plusIcon: {
    marginRight: 10,
  },
  textTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingLeft: 10,
  },
  profileBubble: {
    width: bubbleSize,
    margin: 10,
    alignItems: 'center',
  },
  profileImage: {
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: bubbleSize / 2,
  },
  profileImagePlaceholder: {
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: bubbleSize / 2,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 12,
  },
  profileName: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});