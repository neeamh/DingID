import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { retrieveProfileData } from '../../firebase/firestoreConfig';
import FastImage from 'expo-fast-image'; 
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;
const statusBarHeight = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;
const numColumns = 3;
const imageMargin = 2;
const imageSize = (screenWidth - (numColumns + 1) * imageMargin) / numColumns;
const initialBannerHeight = 250;

export default function ProfileScreen({ route, navigation }) {
  const { profileName } = route.params;
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [profileImages, setProfileImages] = useState([]);
  const [bannerImage, setBannerImage] = useState(null);
  const [fullDetectionLogs, setFullDetectionLogs] = useState([]);
  const [fullProfileImages, setFullProfileImages] = useState([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const data = await retrieveProfileData(profileName);
        console.log(data)
        setDetectionLogs(data.detectionLogs.slice(0, 6));
        setProfileImages(data.profileImages.slice(0, 12));
        setBannerImage(data.bannerImage);
        setFullDetectionLogs(data.detectionLogs);
        setFullProfileImages(data.profileImages);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    }
    fetchProfileData();
  }, [profileName]);

  const renderLogItem = useCallback(({ item }) => {
    let displayDate = 'Unknown Date';
    let displayTime = 'Unknown Time';

    if (item.timestamp) {
      const date = new Date(item.timestamp);
      displayDate = date.toLocaleDateString();
      displayTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
      <View style={styles.logItem}>
        <View style={styles.logItemLeft}>
          <Text style={styles.logDate}>{displayDate}</Text>
          <Text style={styles.logTime}>{displayTime}</Text>
        </View>
        <View style={styles.logItemRight}>
          <Text style={styles.logConfidence}>{item.confidence ? `${item.confidence.toFixed(2)}%` : 'N/A'}</Text>
        </View>
      </View>
    );
  }, []);

  const renderImageItem = useCallback(({ item }) => {
    console.log(item)
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('FullScreenImage', {
            imageUrl: item.imageUrl,
            profileName: profileName,
            id: item.id, // Pass the ID
          })
        }
      >
        <FastImage source={{ uri: item.imageUrl }} style={styles.profileImage} />
      </TouchableOpacity>
    );
  }, []);

  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, initialBannerHeight - 50],
    outputRange: ['transparent', '#1c1b29'],
    extrapolate: 'clamp',
  });

  const renderProfileContent = useCallback(() => {
    return (
      <View style={styles.contentContainer}>
        <View style={styles.imagesContainer}>
          <TouchableOpacity
            style={styles.subHeading}
            onPress={() => navigation.navigate('AllProfileImages', { profileImages: fullProfileImages })}>
            <Text style={styles.subHeadingText}>Profile Images</Text>
            <Ionicons style={styles.forwardIcon} name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={profileImages} 
            renderItem={({ item }) => renderImageItem({ item })}
            keyExtractor={(item, index) => index.toString()}
            numColumns={numColumns}
            contentContainerStyle={styles.grid}
          />
        </View>
        <View style={styles.infoContainer}>
          <TouchableOpacity
            style={styles.subHeading}
            onPress={() => navigation.navigate('AllDetectionLogs', { detectionLogs: fullDetectionLogs })}
          >
            <Text style={styles.subHeadingText}>Detection Logs</Text>
            <Ionicons style={styles.forwardIcon} name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={detectionLogs}
            renderItem={renderLogItem}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      </View>
    );
  }, [detectionLogs, profileImages]);

  return (
    <View style={styles.container}>
      {bannerImage && (
        <Animated.Image
          source={{ uri: bannerImage }}
          style={[
            styles.bannerImage,
            {
              height: initialBannerHeight,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, initialBannerHeight],
                    outputRange: [0, -initialBannerHeight / 2],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
          resizeMode="cover"
        />
      )}
      <Animated.View style={[styles.header, { backgroundColor: headerBackgroundColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons style={styles.backIcon} name="chevron-back" size={24} color="#fff" />
          <Text style={styles.heading}>{profileName}</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.FlatList
        data={[{ key: 'content' }]}
        renderItem={({ item }) => renderProfileContent()} // Ensure this is correctly passed
        keyExtractor={(item) => item.key}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={<View style={{ height: initialBannerHeight }} />}
        contentContainerStyle={styles.flatListContent}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 70 + statusBarHeight, // Increase height to accommodate padding
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: statusBarHeight, // Add padding to the top
  },
  backButton: {
    marginRight: 10,
    flexDirection: "row",
  },
  backIcon: {
    marginTop: 2,
  },
  contentContainer: {
    backgroundColor: '#1c1b29',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  bannerImage: {
    position: 'absolute',
    width: '100%',
    top: 0,
    zIndex: -1,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: "#fff",
  },
  subHeading: {
    flexDirection: "row",
  },
  subHeadingText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
    paddingLeft: 10,
  },
  forwardIcon: {
    marginTop: 5,
  },
  infoContainer: {
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  imagesContainer: {
    paddingTop: 20,
  },
  grid: {
    justifyContent: 'center',
    paddingHorizontal: imageMargin / 2,
  },
  profileImage: {
    width: imageSize,
    height: imageSize,
    margin: imageMargin / 2,
  },
  addPhotoButton: {
    width: imageSize,
    height: imageSize,
    borderRadius: 10,
    margin: imageMargin / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2e2d3a',
  },
  addPhotoText: {
    fontSize: 36,
    color: '#fff',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2e2d3a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  logItemLeft: {
    flexDirection: 'column',
  },
  logDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logTime: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  logItemRight: {
    justifyContent: 'center',
  },
  logConfidence: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '600',
  },
});