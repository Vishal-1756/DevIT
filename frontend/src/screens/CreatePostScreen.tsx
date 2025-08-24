import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  TextInput, 
  Platform, 
  KeyboardAvoidingView, 
  TouchableWithoutFeedback, 
  Keyboard, 
  StatusBar 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import WebView from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { api as postsApi } from '../api/posts';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';

interface CreatePostScreenProps {}


const StatusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

export const CreatePostScreen: React.FC<CreatePostScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'CreatePost'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [postTitle, setPostTitle] = useState<string>('');
  const [postText, setPostText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
        }

        const locationPermission = await Location.requestForegroundPermissionsAsync();
        if (locationPermission.status !== 'granted') {
          console.log('Permission to access location was denied');
        }
      }
    })();
  }, []);

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
      }
    } catch (e: any) {
      setError(e.message || 'Failed to pick image.');
    }
  };

  const takePhoto = async () => {
    try {
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8, 
      });

      if (!result.canceled) {
        const compressedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        setSelectedImage(compressedImage.uri);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to take photo.');
    }
  };

  const getLocation = async () => {
    try {
      setIsLoading(true);
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || 'Failed to get location.');
    } finally {
      setIsLoading(false);
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
      const username = user?.username || 'Anonymous';
    
      let fullContent = postText || '';
      if (location) {
        fullContent += `\n\n📍 Location: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }
      
      if (selectedImage) {
        const imageFile = {
          uri: selectedImage,
          type: 'image/jpeg', 
          name: 'post-image.jpg' 
        };
        
        await postsApi.createPostWithImage(
          postTitle,
          fullContent,
          username,
          imageFile
        );
      } else {
        await postsApi.createPost({
          title: postTitle,
          content: fullContent,
          author: username
        });
      }
      
      setIsLoading(false);
      Alert.alert('Post Created!', 'Your post has been submitted.');
      setPostTitle('');
      setPostText('');
      setSelectedImage(null);
      setLocation(null);
      navigation.goBack(); 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to create post');
      Alert.alert('Error', 'Failed to create post. Please try again.');
      console.error('Post creation error:', err);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Post?',
      'Are you sure you want to discard this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          onPress: () => {
            setPostTitle('');
            setPostText('');
            setSelectedImage(null);
            setLocation(null);
            navigation.goBack();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const renderLocationMap = () => {
    if (location) {
      const lat = location.coords.latitude.toFixed(4);
      const lon = location.coords.longitude.toFixed(4);
      
      const latDelta = 0.01; 
      const lonDelta = 0.01;
      
      const minLat = (parseFloat(lat) - latDelta).toFixed(4);
      const maxLat = (parseFloat(lat) + latDelta).toFixed(4);
      const minLon = (parseFloat(lon) - lonDelta).toFixed(4);
      const maxLon = (parseFloat(lon) + lonDelta).toFixed(4);
      
      return (
        <View style={[styles.mediaPreviewCard, { backgroundColor: theme.colors.background }]}>
          <View style={styles.mediaHeaderRow}>
            <Text style={[styles.mediaSectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
              <Ionicons name="location" size={16} color={theme.colors.primary} /> Location Preview
            </Text>
            <TouchableOpacity 
              style={[styles.removeMediaButton, { backgroundColor: theme.colors.error }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLocation(null);
              }}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.mapWrapper}>
            <Image 
              source={{ uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${lon},${lat}&zoom=14&apiKey=8eb9f78f-3044-4905-9298-677218348984&marker=lonlat:${lon},${lat};color:%23ff0000;size:medium` }} 
              style={styles.mapImage}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.locationDetailsCard}>
            <Text style={[styles.locationCoordinatesText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
              {`📍 ${lat}, ${lon}`}
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderImage = () => {
    if (selectedImage) {
      return (
        <View style={[styles.mediaPreviewCard, { backgroundColor: theme.colors.background }]}>
          <View style={styles.mediaHeaderRow}>
            <Text style={[styles.mediaSectionTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
              <Ionicons name="image" size={16} color={theme.colors.primary} /> Image Preview
            </Text>
            <TouchableOpacity 
              style={[styles.removeMediaButton, { backgroundColor: theme.colors.error }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedImage(null);
              }}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.header, { 
          backgroundColor: theme.colors.cardBackground,
          borderBottomColor: theme.colors.borderColor,
          borderBottomWidth: 1,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }]}>
          <TouchableOpacity 
            onPress={handleDiscard}
            style={styles.headerButton}
          >
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { 
            color: theme.colors.text, 
            fontFamily: theme.fontFamily.regular 
          }]}>
            Create Post
          </Text>
          
          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={isLoading || !postTitle.trim()}
            style={[
              styles.postButton,
              { 
                backgroundColor: !postTitle.trim() ? theme.colors.textSecondary : theme.colors.primary,
                opacity: !postTitle.trim() ? 0.7 : 1
              }
            ]}
          >
            <Text style={[styles.postButtonText, { 
              color: '#fff',
              fontFamily: theme.fontFamily.regular 
            }]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            style={{ backgroundColor: theme.colors.cardBackground }}
          >

            <View style={[styles.userInfoBar, { borderBottomColor: theme.colors.borderColor }]}>
              <View style={styles.userAvatarContainer}>
                <Ionicons name="person-circle" size={24} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.usernameText, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
                {user?.username || 'Anonymous'}
              </Text>
            </View>

            <View style={[styles.inputCard, { backgroundColor: theme.colors.background }]}>
              <TextInput
                style={[
                  styles.titleInput, 
                  { 
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}
                placeholder="Title"
                placeholderTextColor={theme.colors.textSecondary}
                value={postTitle}
                onChangeText={setPostTitle}
                maxLength={300}
                editable={!isLoading}
              />
            </View>


            <View style={[styles.inputCard, { backgroundColor: theme.colors.background }]}>
              <TextInput
                style={[
                  styles.contentInput, 
                  {
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}
                placeholder="What's on your mind?"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                value={postText}
                onChangeText={setPostText}
                editable={!isLoading}
              />
            </View>

            {renderImage()}
            {renderLocationMap()}

            <View style={[styles.mediaTabBar, { backgroundColor: theme.colors.cardBackground, borderTopColor: theme.colors.borderColor }]}>
              <TouchableOpacity 
                style={styles.mediaTabButton} 
                onPress={pickImage} 
                disabled={isLoading}
              >
                <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
                <Text style={[styles.mediaTabText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  Gallery
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mediaTabButton} 
                onPress={takePhoto} 
                disabled={isLoading}
              >
                <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
                <Text style={[styles.mediaTabText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  Camera
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mediaTabButton} 
                onPress={getLocation} 
                disabled={isLoading}
              >
                <Ionicons name="location-outline" size={22} color={theme.colors.primary} />
                <Text style={[styles.mediaTabText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  {isLoading ? 'Loading...' : 'Location'}
                </Text>
              </TouchableOpacity>
            </View>

            {location && (
              <View style={[
                styles.locationContainer, 
                { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.borderColor
                }
              ]}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={16} color={theme.colors.primary} />
                  <Text style={[
                    styles.locationHeaderText, 
                    { color: theme.colors.text, fontFamily: theme.fontFamily.regular }
                  ]}>
                    Current Location
                  </Text>
                  <TouchableOpacity 
                    style={styles.removeLocationButton} 
                    onPress={() => setLocation(null)}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.mapContainer}>
                  <WebView
                    style={styles.map}
                    source={{
                      html: `
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <style>
                              body, html, iframe {
                                margin: 0;
                                padding: 0;
                                height: 100%;
                                width: 100%;
                                overflow: hidden;
                              }
                            </style>
                          </head>
                          <body>
                            <iframe
                              width="100%"
                              height="100%"
                              frameborder="0"
                              scrolling="no"
                              marginheight="0"
                              marginwidth="0"
                              src="https://www.openstreetmap.org/export/embed.html?bbox=${location.coords.longitude - 0.01},${location.coords.latitude - 0.01},${location.coords.longitude + 0.01},${location.coords.latitude + 0.01}&layer=mapnik&marker=${location.coords.latitude},${location.coords.longitude}"
                            ></iframe>
                          </body>
                        </html>
                      `
                    }}
                  />
                </View>
                
                <View style={styles.locationDetails}>
                  <Text style={[
                    styles.locationText, 
                    { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
                  ]}>
                    Coordinates: {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            )}

            {error && (
              <Text style={[
                styles.errorText, 
                { color: theme.colors.error, fontFamily: theme.fontFamily.regular }
              ]}>
                {error}
              </Text>
            )}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" color={theme.colors.primary} />
              </View>
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    height: Platform.OS === 'android' ? 56 + StatusBarHeight : 56,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  userInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  userAvatarContainer: {
    marginRight: 8,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputCard: {
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
  },
  mediaTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    marginTop: 10,
  },
  mediaTabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  mediaTabText: {
    fontSize: 12,
    marginTop: 4,
  },
  actionButton: {
    padding: 8,
  },
  discardButtonText: {
    fontSize: 16,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleInput: {
    padding: 15,
    fontSize: 18,
    fontWeight: 'bold',
    borderRadius: 8,
  },
  contentInput: {
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 150,
    borderRadius: 8,
  },
  imageContainer: {
    position: 'relative',
    marginVertical: 10,
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    right: '7%',
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  locationContainer: {
    margin: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationHeaderText: {
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mapWrapper: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  removeLocationButton: {
    marginLeft: 'auto',
    padding: 5,
  },
  locationDetails: {
    marginTop: 5,
    paddingHorizontal: 10,
  },
  locationDetailsCard: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationCoordinatesText: {
    fontSize: 14,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 1000,
  },
  mediaPreviewCard: {
    margin: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  mediaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeMediaButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
  },
});

export default CreatePostScreen;