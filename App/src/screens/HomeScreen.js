// src/screens/HomeScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { retrieveKnownFaces } from '../../firebase/firestoreConfig';
import { StatusBar } from 'expo-status-bar';
import LiveVideoFeed from '../components/liveFeed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'expo-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const colorScheme = 'dark';
  const [mostFrequentProfiles, setMostFrequentProfiles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const cachedData = await AsyncStorage.getItem('mostFrequentProfiles');
        if (cachedData) {
          setMostFrequentProfiles(JSON.parse(cachedData));
        } else {
          const knownData = await retrieveKnownFaces();
          const knownProfilesArray = Object.keys(knownData).map((label) => ({
            label,
            urls: knownData[label],
            type: 'known',
          }));

          const sortedProfiles = [...knownProfilesArray].sort((a, b) => b.urls.length - a.urls.length);
          const topProfiles = sortedProfiles.slice(0, 5);
          setMostFrequentProfiles(topProfiles);
          await AsyncStorage.setItem('mostFrequentProfiles', JSON.stringify(topProfiles));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  const dynamicStyles = colorScheme === 'dark' ? styles.dark : styles.light;

  const renderProfileCover = useCallback(({ item }) => (
    <View style={styles.profileContainer}>
      <TouchableOpacity onPress={() => navigation.navigate('Profile', { profileName: item.label })}>
        <FastImage
          source={{ uri: item.urls[0] }}
          style={styles.coverPhoto}
        />
        <Text style={[styles.profileName, dynamicStyles.text]}>{item.label}</Text>
      </TouchableOpacity>
    </View>
  ), [navigation]);

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
      <Text style={styles.textTitle}>Live Feed</Text>
      <LiveVideoFeed />
      <TouchableOpacity
        style={styles.peopleHeader}
        onPress={() => navigation.navigate('PeopleScreen')}
      >
        <Text style={styles.textTitle}>People</Text>
        <Ionicons name="chevron-forward-outline" size={20} color="#FFFFFF" style={styles.arrowIcon} />
      </TouchableOpacity>
      <View style={[styles.container, dynamicStyles.container]}>
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
    backgroundColor: '#0c0b1a',
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
    color: '#FFFFFF',
    marginTop: 5,
  },
  textTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingBottom: 10,
    paddingLeft: 20,
  },
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingRight: 20,
  },
  arrowIcon: {
    marginBottom: 6,
  },
  dark: {
    safeArea: {
      backgroundColor: '#0c0b1a',
    },
    container: {
      backgroundColor: '#0c0b1a',
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