import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AnimatedLogoProps {
  size?: number;
  color?: string;
}

const AnimatedLogoIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

export const AnimatedLogo = ({ size = 80, color = '#FF4500' }: AnimatedLogoProps) => {
  
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    
    Animated.loop(
      Animated.parallel([
        
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
        
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.7,
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }, { rotate: spin }],
            opacity: opacityAnim,
          },
        ]}
      >
        <AnimatedLogoIcon name="reddit" size={size} color={color} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
