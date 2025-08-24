import React, { useState, useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/contexts/AppProviders';
import { useTheme } from './src/contexts/ThemeContext';
import { View, Platform, StatusBar } from 'react-native';
import { SplashScreen } from './src/components/splash/SplashScreen';
import LoadingSpinner from './src/components/LoadingSpinner';
import Toast from 'react-native-toast-message';


function AppContent(): React.ReactElement {
  const { theme, isDark, fontsLoaded } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  
  
  useEffect(() => {
    if (fontsLoaded) {
      
      
    }
  }, [fontsLoaded]);
  
  
  if (!fontsLoaded) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.colors.background
      }}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  
  if (showSplash) {
    return (
      <SplashScreen 
        onAnimationComplete={() => setShowSplash(false)}
      />
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <ExpoStatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App(): React.ReactElement {
  
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <AppContent />
          <Toast />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}