import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { clearRecurringPrivateKey } from 'utils/pin-utils';

type HandlePayWithKey = (
  address: `0x${string}` | undefined,
  options: string[],
  customizedtext: string,
  privateKey: string
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
  sessionId,
  privateKey,
}: {
    address : `0x${string}`;
  frequency: number;
  price: string;
  userActiveContext: string;
  userActiveOptions: string[];
  lastSuccessfullTransaction: string | null;
  handlePay: HandlePayWithKey;
  onCancel: () => void;
  sessionId: string;
  privateKey: string;
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
              await handlePay(address, userActiveOptions, userActiveContext, privateKey);
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
  }, [frequency, userActiveOptions, userActiveContext, handlePay, countdown, privateKey]);

  const handleCancel = async () => {
    // Clean up stored private key when canceling
    await clearRecurringPrivateKey(sessionId);
    onCancel();
  };

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
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/80 px-6">
      <View className="w-full rounded-3xl border border-white/20 bg-black p-8">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-center text-2xl font-light text-white tracking-tight mb-3">Recurring Payment Active</Text>
          <Text className="text-center text-base text-white/60">Auto-payment every {frequency} seconds</Text>
        </View>

        {/* Payment Info */}
        <View className="rounded-2xl border border-white/20 bg-white/5 p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base text-white/60 font-medium">Amount</Text>
            <Text className="font-medium text-white text-lg">{formatDollarsFromMicros(price)}</Text>
          </View>

          {userActiveOptions.length > 0 && (
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base text-white/60 font-medium">Options</Text>
              <Text className="text-base text-white">{userActiveOptions.join(', ')}</Text>
            </View>
          )}

          {!!userActiveContext && (
            <View className="mb-4">
              <Text className="text-base text-white/60 font-medium mb-2">Context</Text>
              <Text className="text-base text-white">{userActiveContext}</Text>
            </View>
          )}

          {!!lastSuccessfullTransaction && (
            <View>
              <Text className="text-base text-white/60 font-medium mb-2">Last Transaction</Text>
              <Text className="break-all text-sm text-white/80 font-mono">{lastSuccessfullTransaction}</Text>
            </View>
          )}
        </View>

        {/* Countdown */}
        <View className="mb-8 mt-8">
          <Text className="text-center text-6xl font-light text-white tracking-tight mb-3">{countdown}</Text>
          <Text className="text-center text-base text-white/60">seconds until next payment</Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity 
          onPress={handleCancel} 
          className="w-full rounded-2xl bg-white/10 border border-white/20 py-5"
        >
          <Text className="text-center font-medium text-white text-lg">Cancel Auto-Pay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecurringDialog;
