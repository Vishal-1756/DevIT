import client, { apiRequest, saveAuthToken, saveRefreshToken, deleteAuthToken } from './client';


interface LoginCredentials {
  username: string;
  password: string;
}

interface EmailLoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  refresh_token: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  karma: number;
  bio?: string;
  created_at: string;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

interface PasswordResetRequestData {
  email: string;
}

interface PasswordResetData {
  email: string;
  reset_code: string;
  new_password: string;
}


const login = async (credentials: LoginCredentials): Promise<TokenResponse> => {
  try {
    
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const data = await apiRequest<TokenResponse>(
      '/login',
      'POST',
      formData,
      false, 
      'multipart/form-data'
    );
    
    
    await saveAuthToken(data.access_token);
    await saveRefreshToken(data.refresh_token);
    
    return data;
  } catch (error: any) {
    console.error('Login failed:', error);
    throw error;
  }
};

const loginWithEmail = async (credentials: EmailLoginCredentials): Promise<TokenResponse> => {
  try {
    const data = await apiRequest<TokenResponse>(
      '/login/email',
      'POST',
      credentials,
      false 
    );
    
    
    await saveAuthToken(data.access_token);
    await saveRefreshToken(data.refresh_token);
    
    return data;
  } catch (error: any) {
    console.error('Email login failed:', error);
    throw error;
  }
};

const register = async (userData: RegisterData): Promise<TokenResponse> => {
  try {
    const data = await apiRequest<TokenResponse>(
      '/register',
      'POST',
      userData,
      false 
    );
    
    
    await saveAuthToken(data.access_token);
    await saveRefreshToken(data.refresh_token);
    
    return data;
  } catch (error: any) {
    console.error('Registration failed:', error);
    throw error;
  }
};

const logout = async (): Promise<void> => {
  try {
    
    await apiRequest('/logout', 'POST', {}, true);
  } catch (error) {
    console.error('Server logout failed:', error);
    
  }
  
  
  await deleteAuthToken();
  await saveRefreshToken('');
};

const getUserProfile = async (): Promise<UserProfile> => {
  try {
    return await apiRequest<UserProfile>('/users/profile', 'GET');
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};

const changePassword = async (passwordData: PasswordChangeData): Promise<void> => {
  try {
    await apiRequest('/users/change-password', 'POST', passwordData);
  } catch (error) {
    console.error('Password change failed:', error);
    throw error;
  }
};

const requestPasswordReset = async (data: PasswordResetRequestData): Promise<void> => {
  try {
    await apiRequest('/reset-password-request', 'POST', data, false); 
  } catch (error) {
    console.error('Password reset request failed:', error);
    throw error;
  }
};

const resetPassword = async (data: PasswordResetData): Promise<void> => {
  try {
    await apiRequest('/reset-password', 'POST', data, false); 
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
};


export const api = {
  login,
  loginWithEmail,
  register,
  logout,
  getUserProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
};