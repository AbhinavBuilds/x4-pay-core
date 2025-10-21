import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type HandlePay = (
  address: `0x${string}` | undefined,
  options: string[],
  customizedtext: string
) => void;

const RecurringDialog = ({
    address,
  frequency,
  price,
  userActiveContext,
  userActiveOptions,
  lastSuccessfullTransaction,
  handlePay,
  onCancel,
}: {
    address : `0x${string}`;
  frequency: number;
  price: string;
  userActiveContext: string;
  userActiveOptions: string[];
  lastSuccessfullTransaction: string;
  handlePay: HandlePay;
  onCancel: () => void;
}) => {
  const [countdown, setCountdown] = useState(frequency);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      setCountdown((prev) => {
        const next = prev <= 1 ? frequency : prev - 1;
        return next;
      });
      // Use latest countdown from state by reading after a small microtask
      // to avoid using stale value in closure.
      Promise.resolve().then(async () => {
        if (!cancelled) {
          // If the next tick would wrap to frequency, trigger payment now.
          if (countdown <= 1) {
            try {
              await handlePay(address, userActiveOptions, userActiveContext);
            } catch (e) {
              // swallow; parent already shows alerts/logs
            }
          }
        }
      });
    };

    const timer = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [frequency, userActiveOptions, userActiveContext, handlePay, countdown]);

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

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/80 px-4">
      <View className="w-full max-w-md space-y-6 rounded-lg border border-blue-900/50 bg-gray-900 p-6">
        {/* Header */}
        <View className="space-y-2">
          <Text className="text-center text-2xl font-bold text-white">Recurring Payment Active</Text>
          <Text className="text-center text-sm text-blue-400">Auto-payment every {frequency} seconds</Text>
        </View>

        {/* Payment Info */}
        <View className="space-y-3 rounded-lg border border-blue-900/50 bg-blue-950/30 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-400">Amount</Text>
            <Text className="font-semibold text-white">{formatDollarsFromMicros(price)}</Text>
          </View>

          {userActiveOptions.length > 0 && (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">Options</Text>
              <Text className="text-sm text-white">{userActiveOptions.join(', ')}</Text>
            </View>
          )}

          {!!userActiveContext && (
            <View className="space-y-1">
              <Text className="text-sm text-gray-400">Context</Text>
              <Text className="text-sm text-white">{userActiveContext}</Text>
            </View>
          )}

          {!!lastSuccessfullTransaction && (
            <View className="space-y-1">
              <Text className="text-sm text-gray-400">Last Transaction</Text>
              <Text className="break-all text-xs text-blue-400">{lastSuccessfullTransaction}</Text>
            </View>
          )}
        </View>

        {/* Countdown */}
        <View className="space-y-2">
          <Text className="text-center text-6xl font-bold text-blue-500">{countdown}</Text>
          <Text className="text-center text-sm text-gray-400">seconds until next payment</Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity onPress={onCancel} className="w-full rounded-lg bg-red-600 py-4 active:bg-red-800">
          <Text className="text-center font-semibold text-white">Cancel Auto-Pay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecurringDialog;
