import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showClose?: boolean;
  theme?: 'light' | 'dark';
  onBackPress?: () => void;
  onClosePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'x4 Pay',
  subtitle,
  showBack = false,
  showClose = false,
  theme = 'dark',
  onBackPress,
  onClosePress,
}) => {
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-black' : 'bg-white';

  const borderColor = isDark ? 'border-white/8' : 'border-black/8';

  return (
    <View className={`border-b ${borderColor} ${bgColor}`}>
      <View className="bg-black px-4 py-4">
        <Image
          source={require('../assets/banner.png')}
          className="h-[50px] w-[80px]"
          resizeMode="contain"
          defaultSource={require('../assets/banner.png')}
        />
      </View>
    </View>
  );
};

export default Header;
