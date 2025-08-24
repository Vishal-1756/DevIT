import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import HomeScreen from '../screens/HomeScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import EditPostScreen from '../screens/EditPostScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  
  return (
    <Stack.Navigator 
      initialRouteName={isAuthenticated ? "Home" : "Login"}
      screenOptions={{
        headerShown: false, 
        contentStyle: {
          backgroundColor: theme.colors.background,
        }
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'DevIT' }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{ title: 'Create Post' }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ 
          gestureEnabled: false, 
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={SignupScreen}
        options={{ 
          title: 'Sign Up',
        }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{ title: 'DevIT' }}
      />
      <Stack.Screen 
        name="EditPost" 
        component={EditPostScreen}
        options={{ title: 'Edit Post' }}
      />

    </Stack.Navigator>
  );
}
