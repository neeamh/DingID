// src/screens/AllDetectionLogsScreen.js

import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function AllDetectionLogsScreen({ route, navigation }) {
  const { detectionLogs } = route.params;

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
          <Text style={styles.heading}>Detection Logs</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={detectionLogs}
        renderItem={renderLogItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingHorizontal: 10 }}
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