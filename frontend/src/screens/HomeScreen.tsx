import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  Image, 
  RefreshControl, 
  Share, 
  Alert, 
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import WebView from 'react-native-webview';
import Toast from 'react-native-toast-message';


import { api as postsApi } from '../api/posts';
import { Post } from '../types/post';

interface HomeScreenProps {}


const extractLocation = (content: string): { latitude: number, longitude: number } | null => {
  const locationRegex = /📍\s*Location:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
  const match = content.match(locationRegex);
  
  if (match && match.length === 3) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    return { latitude, longitude };
  }
  
  return null;
};


const needsReadMoreButton = (content: string): boolean => {
  
  const contentWithoutLocation = content.replace(/📍\s*Location:\s*-?\d+\.\d+,\s*-?\d+\.\d+/, '');
  
  const wordCount = contentWithoutLocation.split(/\s+/).filter(word => word.length > 0).length;
  return wordCount > 25;
};

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'Home'>['navigation']>();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy] = useState<string>('newest'); 
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set()); 

  
  const [skip, setSkip] = useState(0);
  const limit = 10;
  
  
  const isMountedRef = React.useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPosts = useCallback(async (skipOverride?: number) => {
    
    if ((skipOverride === 0 && loading) || (skipOverride !== 0 && loadingMore)) {
      return;
    }
    
    try {
      setError(null);
      const skipValue = skipOverride !== undefined ? skipOverride : skip;
      
      if (skipValue === 0) {
        setLoading(true);
      }
      
      const data = await postsApi.getPosts(skipValue, limit, sortBy);
      
      
      if (isMountedRef.current) {
        
        if (data.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
        
        if (skipValue === 0) {
          setPosts(data);
        } else {
          
          if (data.length > 0) {
            setPosts(currentPosts => [...currentPosts, ...data]);
          }
        }
        
        setSkip(skipValue + (data.length > 0 ? data.length : 0));
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      if (isMountedRef.current) {
        setError('Failed to load posts. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [loading, loadingMore, skip, limit, sortBy]);

  const onRefresh = useCallback(() => {
    
    if (refreshing || loading) return;
    
    setRefreshing(true);
    setSkip(0);
    fetchPosts(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(err => 
      console.warn('Haptic feedback failed:', err)
    );
  }, [sortBy, refreshing, loading]);

  
  const [hasMore, setHasMore] = useState(true);
  
  const loadMorePosts = useCallback(() => {
    
    if (loadingMore || loading || posts.length === 0 || !hasMore) return;
    setLoadingMore(true);
    fetchPosts();
  }, [loadingMore, loading, posts.length, skip, sortBy, hasMore]);

  
  useEffect(() => {
    
    if (posts.length === 0 || !loading) {
      fetchPosts();
    }
  }, [sortBy, fetchPosts, posts.length, loading]);
  
  
  const prevScreenRef = React.useRef<string | null>(null);
  
  
  useEffect(() => {
    let isMounted = true;
    let lastRefreshTime = 0;
    
    const unsubscribe = navigation.addListener('focus', () => {
      
      const currentRoute = navigation.getState().routes[navigation.getState().index].name;
      const prevScreen = prevScreenRef.current;
      prevScreenRef.current = currentRoute;
      
      
      
      
      const now = Date.now();
      const comingFromCreatePost = prevScreen === 'CreatePost';
      const longTimeSinceLastRefresh = now - lastRefreshTime > 300000; 
      
      if (isMounted && (comingFromCreatePost || longTimeSinceLastRefresh)) {
        lastRefreshTime = now;
        
        if (!loading && !refreshing) {
          
          if (comingFromCreatePost) {
            setSkip(0);
            setHasMore(true);
          }
          onRefresh();
        }
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation, onRefresh, loading, refreshing]);
  
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isAuthenticated, navigation]);

  const renderItem = ({ item }: { item: Post }) => {
    const isViewed = viewedPosts.has(item.id);
    
    return (
      <View style={[
        styles.postCard, 
        { 
          backgroundColor: theme.colors.cardBackground,
          opacity: isViewed ? 0.6 : 1.0 
        }
      ]}>
        <TouchableOpacity onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          setViewedPosts(prev => new Set(prev).add(item.id));
          navigation.navigate('PostDetail', { postId: item.id });
        }}>
          <View style={styles.postContent}>

            <View style={styles.postMetaContainer}>
              <Text style={[styles.postAuthor, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                Posted by u/{item.author}
              </Text>
            </View>
            
     
            <Text style={[styles.postTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
              {item.title}
            </Text>
            
   
            <View style={[styles.horizontalLine, { backgroundColor: theme.colors.borderColor }]} />
          
     
          {item.imageUrl && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.postImage}
                resizeMode="cover"
              />
         
              <View style={[styles.horizontalLine, { backgroundColor: theme.colors.borderColor }]} />
            </View>
          )}
          
  
          <Text 
            style={[
              styles.postText, 
              { 
                color: theme.colors.text, 
                fontFamily: theme.fontFamily.regular,
                marginBottom: extractLocation(item.content) ? 4 : 12 
              }
            ]} 
            numberOfLines={3} 
            ellipsizeMode="tail"
          >
            {item.content.replace(/📍\s*Location:\s*-?\d+\.\d+,\s*-?\d+\.\d+/, '')}
          </Text>
          

          {(() => {
            const locationData = extractLocation(item.content);
            return locationData && (
              <View style={[styles.locationContainer, { 
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.borderColor
              }]}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={16} color={theme.colors.primary} />
                  <Text style={[styles.locationHeaderText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                    Location
                  </Text>
                </View>
                
                <View style={styles.mapContainer}>
                  <WebView
                    style={styles.map}
                    scrollEnabled={false}
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
                                border-radius: 8px;
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
                              src="https://www.openstreetmap.org/export/embed.html?bbox=${locationData.longitude - 0.01},${locationData.latitude - 0.01},${locationData.longitude + 0.01},${locationData.latitude + 0.01}&layer=mapnik&marker=${locationData.latitude},${locationData.longitude}"
                            ></iframe>
                          </body>
                        </html>
                      `
                    }}
                  />
                </View>
                
                <Text style={[styles.locationCoordinates, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                  📍 {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                </Text>
              </View>
            );
          })()}
          <View style={[styles.postActions, { borderTopColor: theme.colors.borderColor }]}>
            <View style={styles.voteContainer}>
              <TouchableOpacity 
                style={[styles.actionPill, { backgroundColor: theme.colors.pillBackground }]} 
                onPress={async () => {
                  Haptics.selectionAsync();
                  try {
                    
                    const updatedPost = await postsApi.votePost(item.id, 'upvote');
                    
                    
                    if (updatedPost.message === 'Already upvoted') {
                      
                      Toast.show({
                        type: 'info',
                        text1: 'Already upvoted',
                        position: 'bottom',
                      });
                      return;
                    }
                    
                    
                    setPosts(currentPosts => 
                      currentPosts.map(post => 
                        post.id === item.id ? { ...post, upvotes: updatedPost.upvotes } : post
                      )
                    );
                  } catch (error) {
                    console.error('Failed to upvote:', error);
                    Alert.alert('Error', 'Failed to upvote post');
                  }
                }}
              >
                <MaterialCommunityIcons name="arrow-up-bold" size={18} color={theme.colors.upvote} />
              </TouchableOpacity>
              <Text style={[styles.voteCount, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
                {(item.upvotes - item.downvotes).toString()}
              </Text>
              <TouchableOpacity 
                style={[styles.actionPill, { backgroundColor: theme.colors.pillBackground }]} 
                onPress={async () => {
                  Haptics.selectionAsync();
                  try {
                    
                    const updatedPost = await postsApi.votePost(item.id, 'downvote');
                    
                    
                    if (updatedPost.message === 'Already downvoted') {
                      
                      Toast.show({
                        type: 'info',
                        text1: 'Already downvoted',
                        position: 'bottom',
                      });
                      return;
                    }
                    
                    
                    setPosts(currentPosts => 
                      currentPosts.map(post => 
                        post.id === item.id ? { ...post, downvotes: updatedPost.downvotes } : post
                      )
                    );
                  } catch (error) {
                    console.error('Failed to downvote:', error);
                    
                    Toast.show({
                      type: 'error',
                      text1: 'Failed to downvote',
                      position: 'bottom',
                    });
                  }
                }}
              >
                <MaterialCommunityIcons name="arrow-down-bold" size={18} color={theme.colors.downvote} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionPill, { backgroundColor: theme.colors.pillBackground }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  
                  setViewedPosts(prev => new Set(prev).add(item.id));
                  navigation.navigate('PostDetail', { 
                    postId: item.id,
                    focusComment: true 
                  });
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textSecondary} />
          
                {(item.comments_count && item.comments_count > 0) && (
                  <Text style={[styles.iconCount, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
                    {item.comments_count.toString()}
                  </Text>
                )}
              </TouchableOpacity>
              
            
              {needsReadMoreButton(item.content) && (
                <TouchableOpacity 
                  style={[styles.actionPill, { backgroundColor: theme.colors.pillBackground }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    
                    setViewedPosts(prev => new Set(prev).add(item.id));
                    navigation.navigate('PostDetail', { postId: item.id });
                  }}
                >
                  <Ionicons name="book-outline" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.actionPill, { backgroundColor: theme.colors.pillBackground }]}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `Check out this post: ${item.title} - ${item.content}`,
                    });
                  } catch (error: any) {
                    Alert.alert('Sharing failed', error.message);
                  }
                }}
              >
                <Ionicons name="share-outline" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

  const renderFooter = () => {
    
    if (loadingMore && hasMore) {
      return (
        <View style={styles.loadingIndicator}>
          <LoadingSpinner size="large" color={theme.colors.primary} />
        </View>
      );
    }
    
    
    if (posts.length > 0 && !hasMore && !loadingMore) {
      return (
        <View style={styles.endOfFeedContainer}>
          <Text style={[styles.endOfFeedText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
            You&apos;ve reached the end
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { 
      backgroundColor: theme.colors.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }]}>
 
      <View style={[styles.topBar, { backgroundColor: theme.colors.cardBackground }]}>
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="menu" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.appTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
            DevIT
          </Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 90, 
        }}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.3}
        ListFooterComponent={() => (
          loadingMore ? (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : posts.length > 0 && !hasMore ? (
            <View style={styles.endOfFeedContainer}>
              <Text style={[styles.endOfFeedText, { color: theme.colors.textSecondary }]}>
                You&apos;ve reached the end of the feed
              </Text>
            </View>
          ) : null
        )}
        ListEmptyComponent={() => {
          if (loading && !refreshing) return null;
          
          return (
            <View style={styles.emptyStateContainer}>
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                {error || "No posts found. Pull down to refresh."}
              </Text>
            </View>
          );
        }}
      />
      
 
      <View 
        style={[
          styles.bottomNavBar, 
          { 
            backgroundColor: isDark ? theme.colors.cardBackground : theme.colors.cardBackground,
            borderTopColor: theme.colors.borderColor 
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRefresh();
          }}
        >
          <Ionicons name="home" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('CreatePost');
          }}
        >
          <Ionicons name="add-circle" size={30} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleTheme();
          }}
        >
          <Ionicons 
            name={isDark ? "sunny" : "moon"} 
            size={24} 
            color={theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1000,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  postCard: {
    borderRadius: 0,
    marginVertical: 4, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    overflow: 'hidden',
    marginVertical: 5,
    borderRadius: 8,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  postMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  postDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  postContent: {
    padding: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 2,
  },
  postAuthor: {
    fontSize: 11,
    marginBottom: 6,
    opacity: 0.8,
  },
  postText: {
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 4,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    height: 44,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingRight: 5,
  },
  voteButton: {
    padding: 5,
  },
  voteIcon: {
    fontSize: 18,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginHorizontal: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  loadingIndicator: {
    padding: 20,
    alignItems: 'center',
  },
  
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,  
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 0.5,
    paddingHorizontal: 20,
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
    
    zIndex: 10,
  },
  navButton: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  endOfFeedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  endOfFeedText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  mapContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 6,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  
  locationContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  locationHeaderText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  locationCoordinates: {
    fontSize: 12,
    padding: 8,
    textAlign: 'center',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
  actionText: {
    fontSize: 12,
  },
  iconCount: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default HomeScreen;