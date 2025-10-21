import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
// import { HapticTab } from '../../components/haptic-tab';

export default function TabLayout() {
  return (
      <Tabs
      screenOptions={{
        // tabBarActiveTintColor: Colors['dark'].tint,
        headerShown: false,
        // tabBarButton: HapticTab,
      }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="arrow-right" color={color} />,
        }}
      />
    </Tabs>
  );
}
