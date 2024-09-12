import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

export default function LiveVideoFeed() {
    return(
        <View style={styles.container}>
            <Ionicons name="videocam-off-outline" style={styles.videoOffIcon} size={100} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#2d455a",
        height: 600,
        width: screenWidth - 30,
        marginBottom: 20,
        alignSelf: 'center',
        borderRadius: 12,
        justifyContent: 'center', // Center vertically
        alignItems: 'center',    // Center horizontally
    }, 
    videoOffIcon: {
        color: "#758ca2"
    }
});