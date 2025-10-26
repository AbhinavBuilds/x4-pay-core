import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '../shim'; // must come first
import '../global.css';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#000000" />
      <Stack
        screenOptions={{
          headerShown: false,
          statusBarStyle: 'light',
          statusBarBackgroundColor: '#000000',
        }}
      />
    </>
  );
}
