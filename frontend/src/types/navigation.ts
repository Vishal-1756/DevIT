import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  CreatePost: undefined;
  Home: undefined;
  Login: undefined;
  PostDetail: { 
    postId: string;
    focusComment?: boolean; 
  };
  EditPost: {
    postId: string;
    title: string;
    content: string;
    imageUrl?: string;
  };
  Profile: undefined;
  Settings: undefined;
  Register: undefined;
  EditProfile: {
    username: string;
    bio: string;
    onSave: (newUsername: string, newBio: string) => void;
  };
  ChangePassword: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}