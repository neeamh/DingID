import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Image, FlatList, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { retrieveProfileData } from '../../firebase/firestoreConfig';

const screenWidth = Dimensions.get('window').width;
const numColumns = 3;
const imageMargin = 10;
const imageSize = (screenWidth - (numColumns + 1) * imageMargin) / numColumns;
const initialBannerHeight = 200; // Initial height of the banner image

export default function ProfileScreen({ route }) {
  const { profileName } = route.params;
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [profileImages, setProfileImages] = useState([]);
  const [bannerImage, setBannerImage] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current; // Animated value to track scroll position

  useEffect(() => {
    async function fetchProfileData() {
      const data = await retrieveProfileData(profileName);
      setDetectionLogs(data.detectionLogs);
      setProfileImages(data.profileImages);
      setBannerImage(data.bannerImage);
    }
    fetchProfileData();
  }, [profileName]);

  const renderLogItem = ({ item }) => (
    <View style={styles.logItem}>
      <Text style={styles.logText}>{new Date(item.timestamp.toDate()).toLocaleString()}</Text>
    </View>
  );

  const renderImageItem = ({ item }) => (
    <Image source={{ uri: item }} style={styles.profileImage} />
  );

  const renderAddPhotoButton = () => (
    <TouchableOpacity style={styles.addPhotoButton}>
      <Text style={styles.addPhotoText}>+</Text>
    </TouchableOpacity>
  );

  const renderProfileContent = () => (
    <>
      <View style={styles.infoContainer}>
        <Text style={styles.heading}>{profileName}</Text>
        <Text style={styles.subHeading}>Detection Logs</Text>
        {detectionLogs.map((log, index) => (
          <View key={index} style={styles.logItem}>
            <Text style={styles.logText}>{new Date(log.timestamp.toDate()).toLocaleString()}</Text>
          </View>
        ))}
      </View>
      <View style={styles.imagesContainer}>
        <Text style={styles.subHeading}>Profile Images</Text>
        <FlatList
          data={[{ isAddButton: true }, ...profileImages]}
          renderItem={({ item }) =>
            item.isAddButton ? renderAddPhotoButton() : renderImageItem({ item })
          }
          keyExtractor={(item, index) => index.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.grid}
        />
      </View>
    </>
  );

  // Adjust header height and content scale to create the parallax effect
  const headerHeight = scrollY.interpolate({
    inputRange: [-initialBannerHeight, 0, 200],
    outputRange: [initialBannerHeight * 1.5, initialBannerHeight, initialBannerHeight],
    extrapolate: 'clamp',
  });

  const contentScale = scrollY.interpolate({
    inputRange: [0, initialBannerHeight],
    outputRange: [1, 0.9], // Shrinks content size as you scroll
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {bannerImage && (
        <Animated.Image
          source={{ uri: bannerImage }}
          style={[
            styles.bannerImage,
            {
              height: headerHeight,
              transform: [{ translateY: scrollY.interpolate({ inputRange: [0, initialBannerHeight], outputRange: [0, -initialBannerHeight / 2], extrapolate: 'clamp' }) }],
            },
          ]}
        />
      )}
      <Animated.FlatList
        data={[{ key: 'content' }]}
        renderItem={renderProfileContent}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.contentContainer, { transform: [{ scale: contentScale }] }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={<View style={{ height: initialBannerHeight }} />} // Placeholder for banner image
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c2b34',
  },
  contentContainer: {
    paddingBottom: 20,
    backgroundColor: '#2c2b34',
  },
  bannerImage: {
    position: 'absolute',
    width: '100%',
    resizeMode: 'cover',
    top: 0,
    zIndex: -1,
  },
  infoContainer: {
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: "#fff",
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#b0b0b0',
    marginBottom: 10,
  },
  logItem: {
    paddingVertical: 10,
    borderBottomColor: '#444',
    borderBottomWidth: 1,
  },
  logText: {
    color: '#b0b0b0',
    fontSize: 16,
  },
  imagesContainer: {
    paddingVertical: 10,
  },
  grid: {
    justifyContent: 'center',
    paddingHorizontal: imageMargin / 2,
  },
  profileImage: {
    width: imageSize + 5,
    height: imageSize + 5,
    borderRadius: 8,
    margin: imageMargin / 2,
  },
  addPhotoButton: {
    width: imageSize + 5,
    height: imageSize + 5,
    borderRadius: 8,
    margin: imageMargin / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#555',
  },
  addPhotoText: {
    fontSize: 36,
    color: '#fff',
  },
});