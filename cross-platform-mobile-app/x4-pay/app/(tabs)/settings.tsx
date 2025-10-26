import { View, Text, Pressable, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import React from 'react';

export default function SettingsScreen() {
  const handleLinkPress = async (url: string, label: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open ${label}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open ${label}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Header title="x4 Pay" subtitle="configuration" theme="dark" />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="py-6">
          {/* Project Information Section */}
          <View className="mb-8">
            <Text className="text-xl font-semibold text-white mb-6 px-2">Project Information</Text>
            
            {/* Website */}
            <Pressable
              onPress={() => handleLinkPress('https://x4pay.org/', 'Project Website')}
              className="mb-4 p-4 bg-white/5 border border-white/10 rounded-2xl active:scale-95"
              style={{
                shadowColor: 'rgba(255,255,255,0.05)',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl items-center justify-center mr-4">
                    <Text className="text-white text-lg">🌐</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium text-base">Project Website</Text>
                    <Text className="text-white/60 text-sm mt-1">x4pay.org</Text>
                  </View>
                </View>
                <View className="w-6 h-6 items-center justify-center">
                  <Text className="text-white/40 text-sm">→</Text>
                </View>
              </View>
            </Pressable>

            {/* GitHub */}
            <Pressable
              onPress={() => handleLinkPress('https://github.com/AbhinavBuilds/x4-pay-core', 'GitHub Repository')}
              className="mb-4 p-4 bg-white/5 border border-white/10 rounded-2xl active:scale-95"
              style={{
                shadowColor: 'rgba(255,255,255,0.05)',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl items-center justify-center mr-4">
                    <Text className="text-white text-lg">⚡</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium text-base">GitHub Repository</Text>
                    <Text className="text-white/60 text-sm mt-1">Source code & documentation</Text>
                  </View>
                </View>
                <View className="w-6 h-6 items-center justify-center">
                  <Text className="text-white/40 text-sm">→</Text>
                </View>
              </View>
            </Pressable>

            {/* X (Twitter) */}
            <Pressable
              onPress={() => handleLinkPress('https://x.com/x4PayCore', 'X (Twitter)')}
              className="mb-4 p-4 bg-white/5 border border-white/10 rounded-2xl active:scale-95"
              style={{
                shadowColor: 'rgba(255,255,255,0.05)',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl items-center justify-center mr-4">
                    <Text className="text-white text-lg">𝕏</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium text-base">Follow on X</Text>
                    <Text className="text-white/60 text-sm mt-1">@x4PayCore</Text>
                  </View>
                </View>
                <View className="w-6 h-6 items-center justify-center">
                  <Text className="text-white/40 text-sm">→</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* App Settings Section */}
          <View className="mb-8">
            <Text className="text-xl font-semibold text-white mb-6 px-2">App Settings</Text>
            
            <View className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <View className="items-center">
                <View className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl items-center justify-center mb-4">
                  <Text className="text-white text-2xl">🔧</Text>
                </View>
                <Text className="text-lg font-medium text-white text-center mb-2">
                  More Settings Coming Soon
                </Text>
                <Text className="text-white/60 text-center text-sm leading-6">
                  Additional settings and preferences will be available in future updates. 
                  Stay tuned for more features!
                </Text>
              </View>
            </View>
          </View>

          {/* Version Info */}
          <View className="items-center py-8">
            <Text className="text-white/40 text-sm">x4 Pay v1.0.0</Text>
            <Text className="text-white/30 text-xs mt-1">Stay updated for new features</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}