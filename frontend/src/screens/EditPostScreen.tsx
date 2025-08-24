import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Dimensions, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { api as postsApi } from '../api/posts';
import { Ionicons } from '@expo/vector-icons';

interface EditPostScreenProps {}

export const EditPostScreen: React.FC<EditPostScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'EditPost'>['navigation']>();
  const route = useRoute<RootStackScreenProps<'EditPost'>['route']>();
  const { postId, title, content, imageUrl } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [postTitle, setPostTitle] = useState<string>(title);
  const [postText, setPostText] = useState<string>(content);
  const [selectedImage, setSelectedImage] = useState<string | null>(imageUrl || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState<boolean>(false);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled) {
        const compressedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        setSelectedImage(compressedImage.uri);
        setRemoveCurrentImage(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to pick image.');
    }
  };

  const handleSubmit = async () => {
    if (!postTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your post.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      if (selectedImage && selectedImage !== imageUrl) {
        
        const imageFile = {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'post-image.jpg'
        };
        
        await postsApi.updatePostWithImage(
          postId,
          postTitle,
          postText,
          imageFile,
          false
        );
      } else if (removeCurrentImage) {
        
        await postsApi.updatePostWithImage(
          postId,
          postTitle,
          postText,
          undefined,
          true
        );
      } else {
        
        await postsApi.updatePost(postId, {
          title: postTitle,
          content: postText
        });
      }
      
      setIsLoading(false);
      Alert.alert('Post Updated!', 'Your post has been updated successfully.');
      
      
      navigation.navigate('PostDetail', {
        postId: postId,
        focusComment: false
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to update post');
      Alert.alert('Error', 'Failed to update post. Please try again.');
      console.error('Post update error:', err);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          onPress: () => {
            navigation.goBack();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const renderImage = () => {
    if (selectedImage && !removeCurrentImage) {
      return (
        <View style={styles.imageContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
            📷 Image Preview
          </Text>
          <Image source={{ uri: selectedImage }} style={styles.image} />
          <TouchableOpacity 
            style={[styles.removeImageButton, { backgroundColor: theme.colors.error }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedImage(null);
              setRemoveCurrentImage(true);
            }}
          >
            <Text style={[styles.removeImageButtonText, { color: '#fff' }]}>
              Remove Image
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { 
      backgroundColor: theme.colors.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom
    }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.formContainer}>
              <Text style={[styles.label, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
                Title
              </Text>
              <TextInput
                style={[
                  styles.input, 
                  styles.titleInput, 
                  { 
                    color: theme.colors.text, 
                    borderColor: theme.colors.borderColor,
                    backgroundColor: theme.colors.cardBackground,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}
                value={postTitle}
                onChangeText={setPostTitle}
                placeholder="Enter a title for your post"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="sentences"
              />

              <Text style={[styles.label, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
                Content
              </Text>
              <TextInput
                style={[
                  styles.input, 
                  styles.contentInput, 
                  { 
                    color: theme.colors.text, 
                    borderColor: theme.colors.borderColor,
                    backgroundColor: theme.colors.cardBackground,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}
                value={postText}
                onChangeText={setPostText}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.colors.textSecondary}
                multiline={true}
                textAlignVertical="top"
              />

              {renderImage()}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: theme.colors.cardBackground }
                  ]}
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={20} color={theme.colors.text} />
                  <Text style={[
                    styles.buttonText,
                    { color: theme.colors.text, fontFamily: theme.fontFamily.regular }
                  ]}>
                    {selectedImage ? "Change Image" : "Add Image"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.cancelButton,
                    { borderColor: theme.colors.error }
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={[
                    styles.actionButtonText,
                    { color: theme.colors.error, fontFamily: theme.fontFamily.regular }
                  ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.updateButton,
                    { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.actionButtonText,
                      { color: '#FFFFFF', fontFamily: theme.fontFamily.regular }
                    ]}>
                      Update Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: '100%',
  },
  titleInput: {
    height: 50,
  },
  contentInput: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  removeImageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  updateButton: {},
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
});

export default EditPostScreen;
