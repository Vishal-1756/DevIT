import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  Alert, 
  TextInput, 
  Platform, 
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { logo } from '../../assets';

const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

interface LoginScreenProps {}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'Login'>['navigation']>();
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { width } = useWindowDimensions();
  const { login } = useAuth();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    loadRememberMe();
  }, []);

  const loadRememberMe = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('rememberedEmail');
      const storedPassword = await AsyncStorage.getItem('rememberedPassword');
      if (storedEmail && storedPassword) {
        setRememberMe(true);
        setValue('email', storedEmail);
        setValue('password', storedPassword);
      }
    } catch (error) {
      console.error('Error loading "Remember Me" data:', error);
    }
  };

  const saveRememberMe = async (email: string, password: string) => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email);
        await AsyncStorage.setItem('rememberedPassword', password);
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
        await AsyncStorage.removeItem('rememberedPassword');
      }
    } catch (error) {
      console.error('Error saving "Remember Me" data:', error);
    }
  };

  const handleLogin = async (data: FormData) => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {

      await saveRememberMe(data.email, data.password);
    
      await login(data.email, data.password);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', error.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image 
              source={logo} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.loginInstructionText}>Login to continue</Text>

  
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={22} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#888"
                  />
                </View>
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </View>
          
     
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={22} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#888"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>
          
      
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.rememberContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxSelected]}>
                {rememberMe && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Alert.alert('Feature Coming Soon', 'Password recovery feature will be available in a future update.')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          
  
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSubmit(handleLogin)}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
      
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}> Sign up here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginInstructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    height: 50,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
  },
  rememberText: {
    fontSize: 14,
    color: '#666',
  },
  forgotText: {
    fontSize: 14,
    color: '#FF4500',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#FF4500',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#FF4500',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
