import { CONSTANTS } from './config';


export const API_BASE_URL = CONSTANTS.API_URL;


export const API_ENDPOINTS = {
  
  AUTH: {
    LOGIN: '/login',
    LOGIN_EMAIL: '/login/email',
    REGISTER: '/users',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    RESET_PASSWORD_REQUEST: '/auth/reset-password-request',
    RESET_PASSWORD_CONFIRM: '/auth/reset-password-confirm',
  },

  
  USER: {
    ME: '/users/me',
    BY_ID: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    POSTS: (id: string) => `/users/${id}/posts`,
    CHANGE_PASSWORD: '/users/change-password',
    UPLOAD_AVATAR: '/upload/image',
  },

  
  POST: {
    ALL: '/posts',
    BY_ID: (id: string) => `/posts/${id}`,
    CREATE: '/posts',
    CREATE_WITH_IMAGE: '/posts/with-image',
    UPDATE: (id: string) => `/posts/${id}`,
    UPDATE_WITH_IMAGE: (id: string) => `/posts/${id}/with-image`,
    DELETE: (id: string) => `/posts/${id}`,
    VOTE: (id: string) => `/posts/${id}/vote`,
    COMMENTS: (id: string) => `/posts/${id}/comments`,
    SORT: (sort: string) => `/posts/sort/${sort}`,
  },

  
  COMMENT: {
    CREATE: '/comments',
    UPDATE: (id: string) => `/comments/${id}`,
    DELETE: (id: string) => `/comments/${id}`,
    VOTE: (id: string) => `/comments/${id}/vote`,
  },

  
  SEARCH: {
    POSTS: '/search/posts',
  },
};


export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl,
};
