import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Animated, Easing } from 'react-native';
import { AnimatedLogo } from './AnimatedLogo';
import { useTheme } from '../../contexts/ThemeContext';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export const SplashScreen = ({ onAnimationComplete }: SplashScreenProps) => {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const textFadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => {
      
      setIsReady(true);
      
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <AnimatedLogo size={100} color={theme.colors.primary} />
      </Animated.View>
      <Animated.Text 
        style={[
          styles.title, 
          { 
            opacity: textFadeAnim, 
            color: theme.colors.text,
            fontFamily: theme.fontFamily.regular,
          }
        ]}
      >
        DevIT
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default SplashScreen;
