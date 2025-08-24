import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert, 
  TextInput, 
  Platform, 
  KeyboardAvoidingView,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { logo } from '../../assets';
import { Image } from 'react-native';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

interface SignupScreenProps {}

export const SignupScreen: React.FC<SignupScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'Register'>['navigation']>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { width } = useWindowDimensions();
  const { register } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSignup = async (data: FormData) => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await register(data.username, data.email, data.password);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      console.error('Signup failed:', error);
      Alert.alert('Signup Failed', error.message || 'Could not create account. Please try again.');
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
          
          <Text style={styles.title}>Create an Account</Text>
          
        
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#888"
                  />
                </View>
              )}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username.message}</Text>
            )}
          </View>
          
        
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
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
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
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
          
       
          <View style={styles.inputContainer}>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    secureTextEntry={!showConfirmPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholderTextColor="#888"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
            )}
          </View>

          
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSubmit(handleSignup)}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" color="#ffffff" />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

        
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signupLink}> Login here</Text>
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
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
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
  signupButton: {
    backgroundColor: '#FF4500',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
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

export default SignupScreen;
