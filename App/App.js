// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PeopleScreen from './src/screens/PeopleScreen';
import UnknownProfileScreen from './src/screens/UnknownProfileScreen';
import AllDetectionLogsScreen from './src/screens/AllDetectionLogsScreen';
import AllProfileImagesScreen from './src/screens/AllProfileImagesScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PeopleScreen" component={PeopleScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="UnknownProfile" component={UnknownProfileScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="AllProfileImages" component={AllProfileImagesScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="AllDetectionLogs" component={AllDetectionLogsScreen} options={{ headerShown: false }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}