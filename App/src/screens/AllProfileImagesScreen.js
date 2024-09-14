// src/screens/AllProfileImagesScreen.js

import React from 'react';
import { StyleSheet, View, FlatList, Dimensions, TouchableOpacity, Text } from 'react-native';
import FastImage from 'expo-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function AllProfileImagesScreen({ route, navigation }) {
  const { profileImages } = route.params;

  const numColumns = 3;
  const imageMargin = 2;
  const screenWidth = Dimensions.get('window').width;
  const imageSize = (screenWidth - (numColumns + 1) * imageMargin) / numColumns;

  const renderImageItem = ({ item }) => (
    <FastImage
      source={{ uri: item.imageUrl }}
      style={{
        width: imageSize,
        height: imageSize,
        margin: imageMargin / 2,
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
          <Text style={styles.heading}>Profile Images</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={profileImages}
        renderItem={renderImageItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1b29',
  },
  header: {
    alignItems: 'start',
    paddingTop: 60,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: '#1c1b29',
  },
  backButton: {
    flexDirection: 'row',
    marginRight: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "#fff",
  },
  grid: {
    justifyContent: 'center',
  },
});