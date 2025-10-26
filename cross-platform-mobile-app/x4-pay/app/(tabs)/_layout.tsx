import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';

// Custom black and white icons using simple symbols
const HomeIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <View className="items-center">
    <Text style={{ color, fontSize: 18, fontWeight: focused ? '500' : '400' }}>⌂</Text>
  </View>
);

const WalletIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <View className="items-center">
    <Text style={{ color, fontSize: 18, fontWeight: focused ? '500' : '400' }}>⊞</Text>
  </View>
);

const DIYIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <View className="items-center">
    <Text style={{ color, fontSize: 18, fontWeight: focused ? '500' : '400' }}>⚒</Text>
  </View>
);

const SettingsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <View className="items-center">
    <Text style={{ color, fontSize: 18, fontWeight: focused ? '500' : '400' }}>⚙</Text>
  </View>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000', // Pure black
          borderTopColor: 'rgba(255, 255, 255, 0.1)', // border-white/10
          borderTopWidth: 1,
          height: 60 + insets.bottom, // Dynamic height based on safe area
          paddingBottom: Math.max(insets.bottom, 8), // Use safe area bottom or minimum 8
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: '#ffffff', // white
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)', // white/60
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '400', // Lighter font weight for Apple-like feel
          marginTop: 2,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <HomeIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => <WalletIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="diy"
        options={{
          title: 'DIY',
          tabBarIcon: ({ color, focused }) => <DIYIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <SettingsIcon color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
