import React from 'react';
import { Modal, View, Text, Pressable, Dimensions } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onClose?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}) => {
  const { width: screenWidth } = Dimensions.get('window');

  const handleButtonPress = (button: typeof buttons[0]) => {
    button.onPress?.();
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
        <View 
          className="mx-4 rounded-3xl border border-white/20 bg-black/95 backdrop-blur-xl shadow-2xl"
          style={{ maxWidth: screenWidth - 32, minWidth: screenWidth * 0.8 }}
        >
          {/* Header */}
          <View className="px-6 py-5 border-b border-white/10">
            <Text className="text-xl font-semibold text-white text-center">
              {title}
            </Text>
          </View>

          {/* Message */}
          <View className="px-6 py-5">
            <Text className="text-white/90 text-base leading-6 text-center">
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View className="px-6 pb-6">
            {buttons.length === 1 ? (
              <Pressable
                onPress={() => handleButtonPress(buttons[0])}
                className={`py-4 px-6 rounded-2xl ${
                  buttons[0].style === 'destructive' 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : 'bg-white/10 border border-white/20'
                }`}
              >
                <Text className={`text-center font-medium text-base ${
                  buttons[0].style === 'destructive' ? 'text-red-400' : 'text-white'
                }`}>
                  {buttons[0].text}
                </Text>
              </Pressable>
            ) : (
              <View className="flex-row gap-3">
                {buttons.map((button, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleButtonPress(button)}
                    className={`flex-1 py-4 px-6 rounded-2xl ${
                      button.style === 'cancel' 
                        ? 'bg-white/5 border border-white/15'
                        : button.style === 'destructive'
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    <Text className={`text-center font-medium text-base ${
                      button.style === 'destructive' 
                        ? 'text-red-400' 
                        : button.style === 'cancel'
                        ? 'text-white/70'
                        : 'text-white'
                    }`}>
                      {button.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Hook for easy alert usage
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = React.useCallback((
    title: string,
    message: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
    });
  }, []);

  const hideAlert = React.useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = (
    <CustomAlert
      {...alertConfig}
      onClose={hideAlert}
    />
  );

  return { showAlert, AlertComponent };
};