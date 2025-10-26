import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import React from 'react';

export default function DIYScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <Header title="x4 Pay" subtitle="build your own devices" theme="dark" />
      
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center">
          <View className="w-20 h-20 bg-white/8 rounded-3xl items-center justify-center mb-8 shadow-sm">
            <Text className="text-white text-3xl">🔧</Text>
          </View>
          <Text className="text-3xl font-light text-white text-center mb-4 tracking-tight">
            DIY Projects
          </Text>
          <Text className="text-white/60 text-center text-base leading-7 max-w-sm font-light">
            Tutorials and guides for building your own x402 payment devices will be available soon
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}