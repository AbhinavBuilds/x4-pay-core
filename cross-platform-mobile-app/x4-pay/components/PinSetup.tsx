import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setupPin, validatePin, isPinSetup } from 'utils/pin-utils';
import { PinKeypad } from './PinKeypad';

interface PinSetupModalProps {
  visible: boolean;
  onComplete: (pin?: string) => void;
  mode?: 'setup' | 'verify';
  title?: string;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  visible,
  onComplete,
  mode = 'setup',
  title,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible]);

  // Auto-verify when PIN reaches 6 digits
  useEffect(() => {
    if (mode === 'verify' && pin.length === 6 && !loading) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        handleVerifyPin();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin, mode, loading]);

  // Auto-proceed to confirm step or complete setup when PIN reaches 6 digits
  useEffect(() => {
    if (mode === 'setup' && !loading) {
      if (step === 'enter' && pin.length === 6) {
        // Small delay for better UX
        const timer = setTimeout(() => {
          setStep('confirm');
        }, 300);
        return () => clearTimeout(timer);
      } else if (step === 'confirm' && confirmPin.length === 6) {
        // Small delay for better UX
        const timer = setTimeout(() => {
          handleSetupPin();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [pin, confirmPin, step, mode, loading]);

  const handleNumberPress = (number: string) => {
    const current = step === 'confirm' ? confirmPin : pin;
    const setCurrent = step === 'confirm' ? setConfirmPin : setPin;
    
    if (current.length < 6) {
      setCurrent(current + number);
    }
  };

  const handleBackspace = () => {
    const current = step === 'confirm' ? confirmPin : pin;
    const setCurrent = step === 'confirm' ? setConfirmPin : setPin;
    
    if (current.length > 0) {
      setCurrent(current.slice(0, -1));
    }
  };

  const handleVerifyPin = async () => {
    if (pin.length !== 6) return;
    
    setLoading(true);
    const isValid = await validatePin(pin);
    setLoading(false);
    
    if (isValid) {
      resetState();
      onComplete(pin);
    } else {
      Alert.alert('Invalid PIN', 'The PIN you entered is incorrect');
      setPin('');
    }
  };

  const handleSetupPin = async () => {
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      setStep('enter');
      setPin('');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    try {
      await setupPin(pin);
      resetState();
      onComplete(pin); // Pass the PIN back for first wallet creation
    } catch {
      Alert.alert('Error', 'Failed to setup PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (mode === 'verify') {
      await handleVerifyPin();
    } else if (mode === 'setup') {
      if (step === 'enter') {
        if (pin.length === 6) {
          setStep('confirm');
        }
      } else {
        await handleSetupPin();
      }
    }
  };

  const currentPin = step === 'confirm' ? confirmPin : pin;

  const getTitle = () => {
    if (title) return title;
    if (mode === 'verify') return 'Enter PIN';
    return step === 'enter' ? 'Create PIN' : 'Confirm PIN';
  };

  const getSubtitle = () => {
    if (mode === 'verify') return 'Enter your 6-digit PIN';
    return step === 'enter' 
      ? 'Create a 6-digit PIN to secure your wallet' 
      : 'Enter your PIN again to confirm';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView className="flex-1 bg-black">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 justify-center px-8">
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-white/8 rounded-3xl items-center justify-center mb-8">
                <Text className="text-white text-3xl">◉</Text>
              </View>
              <Text className="text-3xl font-light text-white mb-4 text-center tracking-tight">
                {getTitle()}
              </Text>
              <Text className="text-white/60 text-center text-base leading-7 max-w-md font-light">
                {getSubtitle()}
              </Text>
            </View>

            <View className="mb-8">
              {/* PIN Dots Display */}
              <View className="flex-row justify-center gap-4 mb-12">
                {[...Array(6)].map((_, index) => (
                  <View
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 ${
                      loading && index < currentPin.length
                        ? 'bg-white/50 border-white/50'
                        : index < currentPin.length
                        ? 'bg-white border-white'
                        : 'bg-transparent border-white/30'
                    }`}
                  />
                ))}
              </View>

              {/* Custom Keypad */}
              <PinKeypad
                onNumberPress={handleNumberPress}
                onBackspace={handleBackspace}
                theme="dark"
                disabled={loading}
              />
            </View>

            {/* Loading/Status indicator */}
            {loading && (
              <View className="items-center py-8">
                <View className="relative">
                  <View className="mb-4 h-12 w-12 rounded-full border-2 border-white/20 border-t-white" />
                  <View className="absolute inset-0 h-12 w-12 rounded-full bg-white/5" />
                </View>
                <Text className="text-white/70 text-center text-base font-light">
                  {mode === 'verify' ? 'Verifying PIN...' : 'Setting up wallet...'}
                </Text>
              </View>
            )}


          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export const usePinSetup = () => {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPinSetup = async () => {
      const setupStatus = await isPinSetup();
      setIsSetup(setupStatus);
    };
    checkPinSetup();
  }, []);

  const refreshSetupStatus = async () => {
    const setupStatus = await isPinSetup();
    setIsSetup(setupStatus);
  };

  return { isSetup, refreshSetupStatus };
};