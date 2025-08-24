import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'large' | number;
  color?: string;
  animating?: boolean;
}

const DEFAULT_SIZE = 'large';
const DEFAULT_COLOR = '#FF4500'; 

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_COLOR,
  animating = true,
}) => {
  
  const spinValue = useRef(new Animated.Value(0)).current;
  const bounceValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (animating) {
      
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      
      
      const bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(bounceValue, {
            toValue: 1,
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ])
      );
      
      
      const opacityAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.7,
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ])
      );
      
      
      spinAnimation.start();
      bounceAnimation.start();
      opacityAnimation.start();
      
      return () => {
        spinAnimation.stop();
        bounceAnimation.stop();
        opacityAnimation.stop();
      };
    }
  }, [animating, spinValue, bounceValue, opacityValue]);

  
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSize = () => {
    if (typeof size === 'number') {
      return size;
    }
    return size === 'small' ? 25 : 40; 
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [
            { rotate: spin },
            { scale: bounceValue }
          ],
          opacity: opacityValue
        }}
      >
        <AnimatedIcon name="reddit" size={getSize()} color={color} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingSpinner;