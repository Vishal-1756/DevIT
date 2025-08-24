import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { API_BASE_URL } from '../constants/api';


const BASE_URL = API_BASE_URL;


export const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isInternetReachable ?? false;
  } catch (error) {
    console.error('Error checking network connectivity:', error);
    return false;
  }
};


export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (err) {
      console.error('Error retrieving auth token from AsyncStorage:', err);
      return null;
    }
  }
};


export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync('authToken', token);
  } catch (error) {
    console.error('Error saving auth token:', error);
    
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (err) {
      console.error('Error saving auth token to AsyncStorage:', err);
    }
  }
};


export const deleteAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('authToken');
  } catch (error) {
    console.error('Error deleting auth token:', error);
    
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (err) {
      console.error('Error removing auth token from AsyncStorage:', err);
    }
  }
};


export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync('refreshToken', token);
  } catch (error) {
    console.error('Error saving refresh token:', error);
    
    try {
      await AsyncStorage.setItem('refreshToken', token);
    } catch (err) {
      console.error('Error saving refresh token to AsyncStorage:', err);
    }
  }
};


export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('refreshToken');
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch (err) {
      console.error('Error retrieving refresh token from AsyncStorage:', err);
      return null;
    }
  }
};


export const apiRequest = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body: any = null,
  needsAuth: boolean = true,
  contentType: string = 'application/json'
): Promise<T> => {
  try {
    
    if (!(await isNetworkAvailable())) {
      throw new Error('No internet connection available');
    }

    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };

    
    if (needsAuth) {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestOptions: RequestInit = { method, headers };

    
    if (body) {
      if (contentType === 'application/json' && typeof body !== 'string') {
        requestOptions.body = JSON.stringify(body);
      } else {
        requestOptions.body = body; 
      }
    }

    const response = await fetch(url, requestOptions);

    
    if (!response.ok) {
      
      if (response.status === 401) {
        
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          
          return apiRequest(endpoint, method, body, needsAuth, contentType);
        } else {
          throw new Error('Authentication failed');
        }
      }
      
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
    }

    
    if (response.status === 204) {
      return null as unknown as T;
    }
    
    return await response.json() as T;
  } catch (error: any) {
    console.error(`API request error (${method} ${endpoint}):`, error);
    throw error;
  }
};


export const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${BASE_URL}/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    await saveAuthToken(data.access_token);
    await saveRefreshToken(data.refresh_token);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};


export default {
  BASE_URL,
  apiRequest,
  getAuthToken,
  saveAuthToken,
  deleteAuthToken,
  saveRefreshToken,
  getRefreshToken,
  refreshAuthToken,
  isNetworkAvailable,
};