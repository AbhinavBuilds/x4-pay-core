import { Header } from '../components/Header';
import { useCustomAlert } from '../components/CustomAlert';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ImageBackground,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PaymentRequirements {
  maxAmountRequired: string;
  network?: string;
  payTo?: string;
}

type Props = {
  address: `0x${string}`;
  deviceName: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  lastTransactionStatus: 'NOT-STARTED' | 'FAILED' | 'SUCCESS' | 'STARTED';
  getPrice: (options: string[], customizedtext: string) => void;
  handlePayNow: (
    address: `0x${string}` | undefined,
    options: string[],
    customizedtext: string
  ) => void;
  frequency: number | null;
  allowCustomtext: boolean;
  options: string[];
  paymentRequirements: PaymentRequirements | null;
  setWaitingToStartAutoPay: (waiting: boolean) => void;
  waitingToStartAutoPay: boolean;
  onDisconnect: () => void;
};

const DeviceWindow: React.FC<Props> = ({
  address,
  deviceName,
  logo,
  banner,
  description,
  handlePayNow,
  frequency,
  allowCustomtext,
  options,
  paymentRequirements,
  lastTransactionStatus,
  getPrice,
  setWaitingToStartAutoPay,
  waitingToStartAutoPay,
  onDisconnect,
}) => {
  const { showAlert, AlertComponent } = useCustomAlert();
  const isConnected = true;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customText, setCustomText] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  const getPriceWithDelay = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    getPrice(selectedOptions, customText);
  };

  useEffect(() => {
    getPriceWithDelay();
  }, [selectedOptions, customText]);

  useEffect(() => {
    getPriceWithDelay();
  }, []);

  // Check for transaction failure when waiting to start auto pay
  useEffect(() => {
    if (waitingToStartAutoPay && lastTransactionStatus === 'FAILED') {
      showAlert(
        'Transaction Failed',
        'Possible causes:\n• Network mismatch\n• Insufficient balance\n• x4 core timed out',
        [{ text: 'OK', onPress: () => setWaitingToStartAutoPay(false) }]
      );
    }
  }, [waitingToStartAutoPay, lastTransactionStatus, setWaitingToStartAutoPay]);

  const formatDollarsFromMicros = (amountStr: string) => {
    try {
      const micros = BigInt(amountStr);
      const ONE_DOLLAR = 1_000_000n;
      const ONE_CENT_IN_MICROS = 10_000n;
      let dollars = micros / ONE_DOLLAR;
      let cents = (micros % ONE_DOLLAR + ONE_CENT_IN_MICROS / 2n) / ONE_CENT_IN_MICROS;
      if (cents === 100n) {
        dollars += 1n;
        cents = 0n;
      }
      if (cents === 0n) return `$${dollars.toString()}`;
      const centsStr = cents.toString().padStart(2, '0');
      return `$${dollars.toString()}.${centsStr}`;
    } catch {
      return `$${amountStr}`;
    }
  };

  const payLabel = paymentRequirements?.maxAmountRequired
    ? `Pay ${formatDollarsFromMicros(paymentRequirements.maxAmountRequired)}${
        frequency ? ` / ${frequency} sec` : ''
      }`
    : 'Pay Now';

  const toggleOption = (opt: string) => {
    setSelectedOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handlePayPress = () => {
    if (frequency && frequency > 0) {
      setWaitingToStartAutoPay(true);
    }
    try {
      handlePayNow(address, selectedOptions, customText);
    } catch (error: any) {
      showAlert('Error', `Error calling handlePayNow: ${error.message}`);
    }
  };

  // Preview Screen Component
  if (showPreview && banner && logo) {
    return (
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ImageBackground
          source={{ uri: banner }}
          style={{ width: screenWidth, height: screenHeight }}
          resizeMode="cover"
        >
          {/* Overlay for better readability */}
          <View className="flex-1 bg-black/20">
            {/* Center Content Box */}
            <View className="flex-1 items-center justify-center px-6">
              <View 
                className="rounded-3xl p-6 max-w-sm w-full items-center border border-white/30" 
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* Logo */}
                {logo && (
                  <Image
                    source={{ uri: logo }}
                    className="w-20 h-20 rounded-2xl mb-4 border-2 border-white/50"
                    resizeMode="cover"
                  />
                )}
                
                {/* Device Name */}
                <Text 
                  className="text-white text-2xl font-bold mb-2 text-center"
                >
                  {deviceName}
                </Text>
                
                {/* Description */}
                {description && (
                  <Text 
                    className="text-white/95 text-base leading-6 text-center mb-6"
                  >
                    {description}
                  </Text>
                )}
                
                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-4 w-full">
                  {/* Cross Button - Disconnect */}
                  <Pressable
                    onPress={() => {
                      try {
                        onDisconnect();
                      } catch (error) {
                        console.error('Disconnect error:', error);
                        showAlert('Error', 'Failed to disconnect properly');
                      }
                    }}
                    className="flex-1 rounded-2xl py-4 items-center justify-center border border-white/40"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Text 
                      className="text-white text-2xl font-bold"
                    >
                      ×
                    </Text>
                    <Text 
                      className="text-white/90 text-xs font-medium mt-1"
                    >
                      Disconnect
                    </Text>
                  </Pressable>
                  
                  {/* Tick Button - Continue */}
                  <Pressable
                    onPress={() => setShowPreview(false)}
                    className="flex-1 rounded-2xl py-4 items-center justify-center border border-white/40"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Text 
                      className="text-white text-2xl font-bold"
                    >
                      ✓
                    </Text>
                    <Text 
                      className="text-white/90 text-xs font-medium mt-1"
                    >
                      Continue
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>
        {AlertComponent}
      </SafeAreaView>
    );
  }

    // Main Device Interface
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 bg-black">
        <Header 
          title="x4 Pay" 
          subtitle="connected device"
          theme="dark"           
          onClosePress={() => {
            try {
              onDisconnect();
            } catch (error) {
              console.log('Disconnect error:', error);
            }
          }} 
        />

        {/* Main Content */}
        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom:  insets.bottom }}>
          <View className="gap-4">
            {/* Main Device Card */}
            <View className="rounded-3xl border border-white/12 bg-white/4 p-6">
              {/* Device Info Header */}
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-white/8 rounded-2xl items-center justify-center mb-4">
                  <Text className="text-white text-2xl">▷</Text>
                </View>
                <Text className="text-xl font-semibold text-white text-center mb-2">
                  {deviceName}
                </Text>
                <Text className="text-white/60 text-center text-sm leading-5 max-w-sm">
                  {description || "Connected device ready for payments"}
                </Text>
              </View>

              {/* Status and Disconnect */}
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center gap-3">
                  <View className="h-3 w-3 rounded-full bg-white/80" />
                  <Text className="text-white font-medium text-base">Connected</Text>
                </View>
                <Pressable
                  onPress={() => {
                    try {
                      onDisconnect();
                    } catch (error) {
                      console.error('Disconnect error:', error);
                      showAlert('Error', 'Failed to disconnect properly');
                    }
                  }}
                  className="px-4 py-2 rounded-2xl bg-black border border-white/15"
                >
                  <Text className="text-white text-sm font-medium">Disconnect</Text>
                </Pressable>
              </View>
            </View>

            {/* Available Services */}
            <View className="rounded-2xl border border-white/20 bg-white/5">
              <View className="px-6 py-5 border-b border-white/20">
                <Text className="font-medium text-white text-lg">Available Services</Text>
                <Text className="text-sm text-white/60 mt-1">Choose your options</Text>
              </View>
              <View className="px-6 py-5 gap-4">
                {options && options.length > 0 ? (
                  options.map((opt) => {
                    const selected = selectedOptions.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => toggleOption(opt)}
                        className={`border rounded-2xl p-5 flex-row items-center justify-between gap-4 ${
                          selected ? 'border-white/60 bg-white/15' : 'border-white/20 bg-white/5'
                        }`}
                      >
                        <View className="flex-row items-center gap-4">
                          <View className={`w-12 h-12 rounded-full items-center justify-center ${
                            selected ? 'bg-white/20' : 'bg-white/10'
                          }`}>
                            <Text className={`text-lg text-white`}>•</Text>
                          </View>
                          <View>
                            <Text className={`font-medium text-base text-white`}>
                              {opt}
                            </Text>
                            <Text className={`text-sm text-white/60`}>
                              Service
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                  
                          <View className="mt-2">
                            <View className={`h-8 px-4 rounded-full border items-center justify-center ${
                              selected ? 'border-white/40 bg-white/20' : 'border-white/20 bg-white/10'
                            }`}>
                              <Text className={`text-sm font-medium text-white`}>
                                {selected ? 'Selected' : 'Add'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View className="border border-white/20 rounded-2xl p-6 items-center">
                    <Text className="text-white/60 text-base">No services available</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Custom Text Input */}
            {allowCustomtext && (
              <View className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Text className="font-medium text-white text-base mb-3">Custom Message</Text>
                <TextInput
                  value={customText}
                  onChangeText={setCustomText}
                  placeholder="Add context (optional)"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  numberOfLines={3}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-base text-white"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            )}

            {/* Payment Summary */}
            {paymentRequirements && (
              <View className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-white/60 text-base font-medium">Total Amount</Text>
                  <Text className="text-white font-semibold text-xl">
                    {formatDollarsFromMicros(paymentRequirements.maxAmountRequired)}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between border border-white/10 rounded-2xl px-4 py-3 bg-white/5">
                  <Text className="text-white/70 font-medium">Network</Text>
                  <Text className="text-white text-base">{paymentRequirements.network || 'Base'}</Text>
                </View>
                {frequency && (
                  <Text className="text-sm text-white/50 text-center mt-3">
                    Recurring every {frequency} seconds
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Fixed Payment Button */}
        <View 
          className="border-t border-white/10 bg-black px-4" 
          style={{ paddingBottom: Math.max(insets.bottom + 16, 16) }}
        >
          <View className="py-4">
            <TouchableOpacity
              onPress={handlePayPress}
              className="h-12 rounded-2xl bg-black border border-white/15 flex-row items-center justify-center gap-2"
              disabled={waitingToStartAutoPay}
            >
              <View className="w-5 h-5 rounded-full bg-white/10 items-center justify-center">
                <Text className="text-white text-xs">▷</Text>
              </View>
              <Text className="font-semibold text-white text-base">
                {waitingToStartAutoPay ? 'Processing...' : payLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {AlertComponent}
    </SafeAreaView>
  );
};

export default DeviceWindow;
