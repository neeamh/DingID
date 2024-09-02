// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { retrieveKnownFaces, retrieveUnknownFaces } from '../../../firebase/firestoreConfig';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen({ navigation }) {
  const colorScheme = "dark";
  const [mostFrequentProfiles, setMostFrequentProfiles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const knownData = await retrieveKnownFaces();

      // Convert known faces into a compatible format
      const knownProfilesArray = Object.keys(knownData).map((label) => ({
        label,
        urls: knownData[label],
        type: 'known',
      }));

      // Sort profiles by the number of photos in descending order
      const sortedProfiles = [...knownProfilesArray].sort((a, b) => b.urls.length - a.urls.length);

      // Set the most frequent profiles
      setMostFrequentProfiles(sortedProfiles.slice(0, 5)); // Top 5 most frequent profiles
    }

    fetchData();
  }, []);

  const dynamicStyles = colorScheme === 'dark' ? styles.dark : styles.light;

  const renderProfileCover = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('Profile', { profileName: item.label })}>
      <View style={styles.profileContainer}>
        <Image source={{ uri: item.urls[0] }} style={styles.coverPhoto} />
        <Text style={[styles.profileName, dynamicStyles.text]}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
      <View style={[styles.container, dynamicStyles.container]}>
        {/* Display Most Frequent Profiles */}
        <FlatList
          data={mostFrequentProfiles}
          renderItem={renderProfileCover}
          keyExtractor={(item) => item.label}
          horizontal
          showsHorizontalScrollIndicator={false}
        />

        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  profileContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  coverPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 5,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dark: {
    safeArea: {
      backgroundColor: '#000',
    },
    container: {
      backgroundColor: '#000',
    },
    text: {
      color: '#fff',
    },
  },
  light: {
    safeArea: {
      backgroundColor: '#fff',
    },
    container: {
      backgroundColor: '#fff',
    },
    text: {
      color: '#000',
    },
  },
});