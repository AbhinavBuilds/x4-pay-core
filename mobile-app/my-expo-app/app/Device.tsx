import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';

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
  getPrice,
  setWaitingToStartAutoPay,
  waitingToStartAutoPay,
  onDisconnect,
}) => {
  const isConnected = true;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customText, setCustomText] = useState<string>('');

  const getPriceWithDelay = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    getPrice(selectedOptions, customText);
  };

  useEffect(() => {
    getPriceWithDelay();
  }, [selectedOptions, customText]);

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
      Alert.alert('Error', `Error calling handlePayNow: ${error.message}`);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Banner */}
      {banner && (
        <View className="h-48 w-full">
          <Image source={{ uri: banner }} className="h-full w-full opacity-60" resizeMode="cover" />
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header: Logo + Device Name + Disconnect */}
        <View className="mb-6 flex-row items-center">
          <View className="flex-1 flex-row items-center">
            {logo && (
              <Image
                source={{ uri: logo }}
                className="h-16 w-16 rounded-lg border border-blue-600"
              />
            )}
            <View className="ml-4 flex-1">
              <Text className="text-2xl font-bold text-white">{deviceName}</Text>
              <View className="mt-1 flex-row items-center">
                <View className="mr-2 h-2 w-2 rounded-full bg-blue-500" />
                <Text className="text-sm text-blue-400">Connected</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={onDisconnect}
            className="ml-3 rounded-md border border-red-500 px-3 py-2 active:bg-red-900/30"
          >
            <Text className="text-sm font-semibold text-red-400">Disconnect</Text>
          </Pressable>
        </View>

        {/* Description */}
        {description && (
          <View className="mb-6 rounded-lg border border-blue-900/50 bg-blue-950/30 p-4">
            <Text className="text-sm leading-relaxed text-gray-300">{description}</Text>
          </View>
        )}

        {/* Custom Text (when allowed) */}
        {allowCustomtext && (
          <View className="mb-6">
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              placeholder="Add context (optional)"
              placeholderTextColor="rgba(96, 165, 250, 0.5)"
              multiline
              numberOfLines={3}
              className="w-full rounded-md border border-blue-900/50 bg-transparent p-3 text-sm text-blue-100"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        )}

        {/* Options (multi-select) */}
        {options && options.length > 0 && (
          <View className="mb-6 space-y-2">
            <ScrollView className="max-h-56 pr-1" nestedScrollEnabled>
              {options.map((opt) => {
                const selected = selectedOptions.includes(opt);
                return (
                  <Pressable
                    key={opt}
                    onPress={() => toggleOption(opt)}
                    className={`mb-2 w-full rounded-md border px-3 py-3 ${
                      selected ? 'border-blue-600 bg-blue-600' : 'border-blue-800 bg-transparent'
                    }`}>
                    <Text className={`text-sm ${selected ? 'text-white' : 'text-blue-300'}`}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Bottom Fixed Action */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-blue-900/50 bg-black/90">
        <View className="mx-auto w-full max-w-md px-6 py-4">
          <TouchableOpacity
            onPress={handlePayPress}
            className="w-full rounded-lg bg-blue-600 py-4 active:bg-blue-800">
            <Text className="text-center font-semibold text-white">
              {waitingToStartAutoPay ? 'Loading..' : payLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default DeviceWindow;
