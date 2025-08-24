import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface SwitchProps {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  label?: string;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  circleColor?: string;
}

const DEFAULT_ACTIVE_COLOR = '#4CD964';
const DEFAULT_INACTIVE_COLOR = '#E4E4E4';
const DEFAULT_CIRCLE_COLOR = '#FFFFFF';

export const Switch: React.FC<SwitchProps> = ({
  isOn,
  onToggle,
  label,
  disabled = false,
  activeColor = DEFAULT_ACTIVE_COLOR,
  inactiveColor = DEFAULT_INACTIVE_COLOR,
  circleColor = DEFAULT_CIRCLE_COLOR,
}) => {
  const [animation] = useState(new Animated.Value(isOn ? 1 : 0));

  const toggleSwitch = () => {
    if (disabled) return;

    const newValue = !isOn;
    Animated.timing(animation, {
      toValue: newValue ? 1 : 0,
      duration: 250,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    onToggle(newValue);

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }
  };

  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 21], 
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleSwitch}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.switchContainer}>
        <Animated.View
          style={[
            styles.background,
            { backgroundColor },
            disabled && styles.disabledBackground,
          ]}
        >
          <Animated.View
            style={[
              styles.circle,
              { transform: [{ translateX }], backgroundColor: circleColor },
              disabled && styles.disabledCircle,
            ]}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    marginRight: 10,
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    width: 50,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  background: {
    flex: 1,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  disabledBackground: {
    opacity: 0.5,
  },
  disabledCircle: {
    opacity: 0.5,
  },
});

export default Switch;