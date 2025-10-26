import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
  visible: boolean;
  onComplete: () => void;
}

const welcomeSlides = [
  {
    title: "Welcome to x4 Pay",
    subtitle: "Secure Cryptocurrency Payments",
    description: "Experience the future of embedded system payments with seamless Bluetooth connectivity and blockchain technology.",
    icon: "🔗"
  },
  {
    title: "Bluetooth Connectivity",
    subtitle: "No Internet Required",
    description: "Connect directly to embedded systems via Bluetooth Low Energy. Make payments even in offline environments.",
    icon: "📶"
  },
  {
    title: "USDC Payments",
    subtitle: "Stable Digital Currency",
    description: "Use USDC on Base network for fast, stable payments. Real-time balance tracking across multiple chains.",
    icon: "💰"
  },
  {
    title: "Advanced Security",
    subtitle: "PIN Protected Wallet",
    description: "Your private keys are encrypted with military-grade encryption and secured with your personal PIN code.",
    icon: "🔒"
  },
  {
    title: "DIY Integration",
    subtitle: "Build Your Own Solutions",
    description: "Create custom x402 pay cores for your embedded projects. Open-source tools and comprehensive documentation.",
    icon: "🔧"
  }
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  visible,
  onComplete
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < welcomeSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = welcomeSlides[currentSlide];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center px-8">
          {/* Progress Indicators */}
          <View className="absolute top-16 left-8 right-8">
            <View className="flex-row justify-center gap-2">
              {welcomeSlides.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === currentSlide 
                      ? 'bg-white w-8' 
                      : index < currentSlide 
                        ? 'bg-white/60 w-2' 
                        : 'bg-white/20 w-2'
                  }`}
                />
              ))}
            </View>
          </View>

          {/* Content */}
          <View className="items-center">
            <View className="w-24 h-24 bg-white/10 rounded-3xl items-center justify-center mb-8">
              {currentSlide === 0 ? (
                <Image 
                  source={require('../assets/logo.png')} 
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-white text-4xl">{slide.icon}</Text>
              )}
            </View>
            
            <Text className="text-4xl font-light text-white mb-4 text-center tracking-tight">
              {slide.title}
            </Text>
            
            <Text className="text-xl text-white/80 mb-6 text-center font-medium">
              {slide.subtitle}
            </Text>
            
            <Text className="text-white/60 text-center text-base leading-7 max-w-sm">
              {slide.description}
            </Text>
          </View>

          {/* Navigation */}
          <View className="absolute bottom-16 left-8 right-8">
            <View className="flex-row justify-between items-center">
              <Pressable
                onPress={handlePrevious}
                disabled={currentSlide === 0}
                className={`px-6 py-3 ${
                  currentSlide === 0 ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <Text className="text-white/60 text-base font-medium">Back</Text>
              </Pressable>

              <Pressable
                onPress={handleNext}
                className="h-12 rounded-full bg-black border border-white/15 px-6 flex-row items-center justify-center gap-2"
                style={{
                  shadowColor: 'rgba(255,255,255,0.06)',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                }}
              >
                <View className="w-5 h-5 rounded-md bg-white/10 border border-white/20 items-center justify-center">
                  <Text className="text-white text-xs">→</Text>
                </View>
                <Text className="text-white font-medium text-base">
                  {currentSlide === welcomeSlides.length - 1 ? 'Pay with x402' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default WelcomeScreen;