import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TermsAndPrivacyProps {
  visible: boolean;
  onAccept: () => void;
}

export const TermsAndPrivacy: React.FC<TermsAndPrivacyProps> = ({
  visible,
  onAccept
}) => {
  const [currentView, setCurrentView] = useState<'terms' | 'privacy'>('terms');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 py-4 border-b border-white/10">
            <Text className="text-2xl font-light text-white text-center">
              {currentView === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
            </Text>
          </View>

          {/* Tab Switcher */}
          <View className="flex-row px-6 py-3">
            <Pressable
              onPress={() => setCurrentView('terms')}
              className={`flex-1 py-3 px-4 rounded-l-xl border ${
                currentView === 'terms' 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Text className={`text-center font-medium ${
                currentView === 'terms' ? 'text-white' : 'text-white/60'
              }`}>
                Terms & Conditions
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => setCurrentView('privacy')}
              className={`flex-1 py-3 px-4 rounded-r-xl border ${
                currentView === 'privacy' 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <Text className={`text-center font-medium ${
                currentView === 'privacy' ? 'text-white' : 'text-white/60'
              }`}>
                Privacy Policy
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {currentView === 'terms' ? (
              <View className="pb-8">
                <Text className="text-white/80 text-base leading-7 mb-6">
                  By using x4 Pay, you agree to the following terms and conditions:
                </Text>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">1. Financial Responsibility</Text>
                  <Text className="text-white/70 text-base leading-6">
                    x4 Pay is a cryptocurrency payment application. We are NOT responsible for any financial losses, 
                    including but not limited to: transaction failures, network fees, incorrect payments, 
                    lost private keys, or any other financial damages that may occur while using this application.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">2. Use at Your Own Risk</Text>
                  <Text className="text-white/70 text-base leading-6">
                    Cryptocurrency transactions are irreversible. You acknowledge that you understand the risks 
                    associated with cryptocurrency transactions and use this application entirely at your own risk.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">3. Security</Text>
                  <Text className="text-white/70 text-base leading-6">
                    You are responsible for maintaining the security of your PIN, private keys, and wallet information. 
                    We cannot recover lost PINs or private keys.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">4. Beta Software</Text>
                  <Text className="text-white/70 text-base leading-6">
                    This application is provided "as is" without any warranties. The software may contain bugs 
                    or errors that could result in financial loss.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">5. No Financial Advice</Text>
                  <Text className="text-white/70 text-base leading-6">
                    This application does not provide financial advice. All investment and transaction decisions 
                    are your own responsibility.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">6. Limitation of Liability</Text>
                  <Text className="text-white/70 text-base leading-6">
                    Under no circumstances shall x4 Pay, its developers, or contributors be liable for any 
                    direct, indirect, incidental, special, or consequential damages arising from the use of this application.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">7. Changes to Terms</Text>
                  <Text className="text-white/70 text-base leading-6">
                    We reserve the right to modify these terms at any time. Continued use of the application 
                    constitutes acceptance of modified terms.
                  </Text>
                </View>
              </View>
            ) : (
              <View className="pb-8">
                <Text className="text-white/80 text-base leading-7 mb-6">
                  Your privacy is important to us. This policy explains how we handle your data:
                </Text>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Data Storage</Text>
                  <Text className="text-white/70 text-base leading-6">
                    <Text className="font-bold text-white">We do NOT store any of your data on our servers.</Text> All 
                    your wallet information, private keys, transaction history, and personal data remain exclusively 
                    on your device.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Local Data</Text>
                  <Text className="text-white/70 text-base leading-6">
                    Your encrypted wallet data, PIN hash, and app preferences are stored locally on your device 
                    using secure storage mechanisms provided by your operating system.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Network Data</Text>
                  <Text className="text-white/70 text-base leading-6">
                    When making blockchain transactions, your transaction data is broadcast to the respective 
                    blockchain networks (Base, Ethereum, etc.) which are public ledgers.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Bluetooth Communication</Text>
                  <Text className="text-white/70 text-base leading-6">
                    Communication with embedded devices via Bluetooth is direct and local. No data from these 
                    communications is transmitted to external servers.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Analytics</Text>
                  <Text className="text-white/70 text-base leading-6">
                    We do not collect any analytics, crash reports, or usage statistics. Your app usage 
                    remains completely private.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Third-Party Services</Text>
                  <Text className="text-white/70 text-base leading-6">
                    The app may interact with blockchain networks and RPC providers to fetch balances and 
                    submit transactions. These interactions follow standard blockchain protocols.
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-white font-semibold text-lg mb-3">Data Deletion</Text>
                  <Text className="text-white/70 text-base leading-6">
                    You can delete all your data at any time by uninstalling the app or using the wallet 
                    deletion features within the app.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Accept Button */}
          <View className="px-6 py-6 border-t border-white/10">
            <Text className="text-white/60 text-sm text-center mb-4">
              By continuing, you agree to both our Terms & Conditions and Privacy Policy
            </Text>
            <Pressable
              onPress={onAccept}
              className="h-14 rounded-full bg-white/10 border border-white/20 flex-row items-center justify-center"
              style={{
                shadowColor: 'rgba(255,255,255,0.1)',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 4,
              }}
            >
              <Text className="text-white font-semibold text-base">
                Accept & Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};