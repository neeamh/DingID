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
        // Try to retrieve cached data
        const cachedData = await AsyncStorage.getItem('peopleProfiles');
        if (cachedData) {
          setProfiles(JSON.parse(cachedData));
        } else {
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
            urls: unknownFacesData.map((face) => face.imageUrl),
            type: 'unknown',
          };

          const allProfiles = [unknownProfile, ...sortedProfiles];

          setProfiles(allProfiles);

          // Cache the data
          await AsyncStorage.setItem('peopleProfiles', JSON.stringify(allProfiles));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  const renderProfileBubble = useCallback(({ item }) => (
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
        <FastImage
          source={{ uri: item.urls[0] }}
          style={styles.profileImage}
          resizeMode="cover"
        />
        {item.type !== 'unknown' && <Text style={styles.profileName}>{item.label}</Text>}
      </View>
    </TouchableOpacity>
  ), [navigation]);

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
  profileName: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});