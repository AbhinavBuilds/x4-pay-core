import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface PinKeypadProps {
  onNumberPress: (number: string) => void;
  onBackspace: () => void;
  onConfirm?: () => void;
  showConfirm?: boolean;
  theme?: 'light' | 'dark';
  disabled?: boolean;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onNumberPress,
  onBackspace,
  onConfirm,
  showConfirm = false,
  theme = 'dark',
  disabled = false
}) => {
  const isDark = theme === 'dark';
  const buttonBg = isDark ? 'bg-white/8' : 'bg-black/8';
  const textColor = isDark ? 'text-white' : 'text-black';
  const iconColor = isDark ? 'text-white' : 'text-black';
  const disabledOpacity = disabled ? 0.4 : 1;

  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'backspace']
  ];

  const renderButton = (value: string, isSpecial = false) => {
    if (value === '') {
      return <View className="w-20 h-20" key="empty" />;
    }

    const isBackspace = value === 'backspace';
    const isConfirm = value === 'confirm';

    return (
      <Pressable
        key={value}
        onPress={() => {
          if (disabled) return;
          
          if (isBackspace) {
            onBackspace();
          } else if (isConfirm && onConfirm) {
            onConfirm();
          } else if (!isSpecial) {
            onNumberPress(value);
          }
        }}
        className={`w-20 h-20 rounded-3xl ${buttonBg} items-center justify-center`}
        style={({ pressed }) => ({
          opacity: disabled ? disabledOpacity : 1,
          backgroundColor: pressed && !disabled 
            ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') 
            : undefined,
        })}
        disabled={disabled}
      >
        {isBackspace ? (
          <Text className={`text-2xl ${iconColor} font-light`}>⌫</Text>
        ) : isConfirm ? (
          <Text className={`text-2xl ${iconColor} font-light`}>✓</Text>
        ) : (
          <Text className={`text-3xl font-light ${textColor} tracking-tight`}>{value}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View className="items-center py-6">
      {/* Number pad */}
      <View className="gap-5">
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-5 justify-center">
            {row.map((number) => renderButton(number, number === 'backspace'))}
          </View>
        ))}
        
        {/* Confirm button row if needed */}
        {showConfirm && onConfirm && (
          <View className="flex-row gap-5 justify-center mt-6">
            <View className="w-20 h-20" />
            {renderButton('confirm', true)}
            <View className="w-20 h-20" />
          </View>
        )}
      </View>
    </View>
  );
};

export default PinKeypad;