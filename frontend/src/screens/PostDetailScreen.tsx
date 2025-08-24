import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, TextInput, RefreshControl, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Post as PostType } from '../types/post';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { api as postsApi } from '../api/posts';
import WebView from 'react-native-webview';
import Toast from 'react-native-toast-message';




interface Comment {
  id: string;
  post_id: string;
  text: string;
  username: string;
  user_id?: string;
  upvotes: number;
  downvotes: number;
  
  message?: string;
  action?: string;
}


const initialPost: PostType = {
  id: '',
  title: '',
  content: '',
  author: '',
  upvotes: 0,
  downvotes: 0
};


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

interface PostDetailScreenProps {}

export const PostDetailScreen: React.FC<PostDetailScreenProps> = () => {
  const navigation = useNavigation<RootStackScreenProps<'PostDetail'>['navigation']>();
  const route = useRoute<RootStackScreenProps<'PostDetail'>['route']>();
  const { postId, focusComment } = route.params;
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  
  const commentSectionRef = React.useRef<View>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const [post, setPost] = useState<PostType>(initialPost);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const screenWidth = Dimensions.get('window').width;

  
  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      
      const fetchedPost = await postsApi.getPostById(postId);
      
      
      const postData: PostType = {
        id: fetchedPost.id,
        title: fetchedPost.title,
        content: fetchedPost.content,
        author: fetchedPost.author,
        upvotes: fetchedPost.upvotes,
        downvotes: fetchedPost.downvotes,
        imageUrl: fetchedPost.imageUrl,
        user_id: fetchedPost.user_id
      };
      
      setPost(postData);
      
      
      const fetchedComments = await postsApi.getComments(postId);
      setComments(fetchedComments);
      
    } catch (e: any) {
      console.error('Error fetching post:', e);
      setError(e.message || 'Failed to fetch post.');
      Alert.alert('Error', 'Failed to load post details.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  
  useEffect(() => {
    if (!loading && focusComment && commentSectionRef.current) {
      
      const timer = setTimeout(() => {
        commentSectionRef.current?.measureInWindow((x, y, width, height) => {
          scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          
          
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, focusComment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPost();
    } catch (error) {
      console.error("Error refreshing post:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPost]);

  const handleUpvote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updatedPost = await postsApi.votePost(postId, 'upvote');
      
      
      if (updatedPost.message === 'Already upvoted') {
        
        Toast.show({
          type: 'info',
          text1: 'Already upvoted',
          position: 'bottom',
        });
        return;
      }
      
      
      setPost(prev => ({
        ...prev,
        upvotes: updatedPost.upvotes,
        downvotes: updatedPost.downvotes
      }));
    } catch (error) {
      console.error('Error upvoting post:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to upvote',
        position: 'bottom',
      });
    }
  };

  const handleDownvote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const updatedPost = await postsApi.votePost(postId, 'downvote');
      
      
      if (updatedPost.message === 'Already downvoted') {
        
        Toast.show({
          type: 'info',
          text1: 'Already downvoted',
          position: 'bottom',
        });
        return;
      }
      
      
      setPost(prev => ({
        ...prev,
        upvotes: updatedPost.upvotes,
        downvotes: updatedPost.downvotes
      }));
    } catch (error) {
      console.error('Error downvoting post:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to downvote',
        position: 'bottom',
      });
    }
  };

  const { user } = useAuth();
  
  
  const handleCommentSubmit = async () => {
    if (commentText.trim() === '') {
      return;
    }

    try {
      
      const commentData = {
        post_id: postId,
        text: commentText,
        username: user?.username || 'Anonymous',
        user_id: user?.id
      };

      
      const newComment = await postsApi.createComment(commentData);
      
      
      setComments((prevComments) => [newComment, ...prevComments]);
      setCommentText('');
      
      
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {
        console.warn('Haptic feedback failed:', hapticError);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post your comment. Please try again.');
    }
  };

  
  const handleEditPost = async () => {
    if (editedContent.trim() === '') {
      return;
    }

    try {
      
      const updatedPost = await postsApi.updatePost(postId, {
        content: editedContent
      });
      
      
      setPost(prev => ({
        ...prev,
        content: updatedPost.content,
      }));
      
      
      setIsEditing(false);
      setEditedContent('');
      
      Toast.show({
        type: 'success',
        text1: 'Post updated successfully',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error updating post:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to update post',
        position: 'bottom',
      });
    }
  };

  const renderCommentItem = ({ item }: { item: Comment }) => (
    <View style={[styles.commentItem, { borderBottomColor: theme.colors.borderColor }]}>
      <View style={styles.commentHeader}>
        <Text style={[styles.commentUsername, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
          {item.username}
        </Text>
   
      </View>
      <Text style={[styles.commentText, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
        {item.text}
      </Text>
      <View style={styles.commentActions}>
        <View style={styles.commentVoteContainer}>              <TouchableOpacity
            style={styles.voteButton}
            onPress={async () => {
              Haptics.selectionAsync();
              try {
                
                const updatedComment = await postsApi.voteComment(item.id, 'upvote');
                
                
                if (updatedComment.message === 'Already upvoted') {
                  
                  Toast.show({
                    type: 'info',
                    text1: 'Already upvoted',
                    position: 'bottom',
                  });
                  return;
                }
                
                
                setComments(prev =>
                  prev.map(comment =>
                    comment.id === item.id ? updatedComment : comment
                  )
                );
              } catch (error) {
                console.error('Error upvoting comment:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to upvote comment',
                  position: 'bottom',
                });
              }
            }}
          >
            <MaterialCommunityIcons name="arrow-up-bold" size={16} color={theme.colors.upvote} />
          </TouchableOpacity>
          <Text style={[styles.voteCount, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
            {`${item.upvotes - item.downvotes}`}
          </Text>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={async () => {
              Haptics.selectionAsync();
              try {
                
                const updatedComment = await postsApi.voteComment(item.id, 'downvote');
                
                
                if (updatedComment.message === 'Already downvoted') {
                  
                  Toast.show({
                    type: 'info',
                    text1: 'Already downvoted',
                    position: 'bottom',
                  });
                  return;
                }
                
                
                setComments(prev =>
                  prev.map(comment =>
                    comment.id === item.id ? updatedComment : comment
                  )
                );
              } catch (error) {
                console.error('Error downvoting comment:', error);
                Toast.show({
                  type: 'error',
                  text1: 'Failed to downvote comment',
                  position: 'bottom',
                });
              }
            }}
          >
            <MaterialCommunityIcons name="arrow-down-bold" size={16} color={theme.colors.downvote} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.replyButton}>
          <Text style={[styles.replyButtonText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
            Reply
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    
    return `${Math.floor(months / 12)}y ago`;
  };

  const handleReportPost = () => {
    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Report',
          onPress: () => {
            
            Alert.alert('Post Reported', 'Thank you for reporting this post.');
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }]}>
          Loading post details...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error, fontFamily: theme.fontFamily.regular }]}>
          Error: {error}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]} 
          onPress={fetchPost}
        >
          <Text style={[styles.retryButtonText, { fontFamily: theme.fontFamily.regular }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { 
      backgroundColor: theme.colors.background,
    }]}>
 
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.cardBackground, 
          borderBottomColor: theme.colors.borderColor,
          paddingTop: insets.top,
        }
      ]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
          Post Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} 
      >
        <ScrollView
          ref={scrollViewRef}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]} 
              tintColor={theme.colors.primary}
              progressBackgroundColor={theme.colors.cardBackground}
            />
          }
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={[styles.postContainer, { backgroundColor: theme.colors.cardBackground }]}>
   
            <View style={styles.postHeader}>
              <Text style={[
                styles.postAuthor, 
                { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
              ]}>
                Posted by u/{post.author}
              </Text>
    
            </View>

    
            <Text style={[styles.postTitle, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
              {post.title}
            </Text>

       
            {isEditing ? (
              <TextInput
                style={[
                  styles.postContentEdit, 
                  { 
                    borderColor: theme.colors.borderColor, 
                    backgroundColor: isDark ? theme.colors.background : '#f9f9f9',
                    color: theme.colors.text,
                    fontFamily: theme.fontFamily.regular
                  }
                ]}
                value={editedContent}
                onChangeText={setEditedContent}
                multiline
                placeholder="Edit your post content..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text style={[styles.postContent, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
                {post.content?.replace(/📍\s*Location:\s*-?\d+\.\d+,\s*-?\d+\.\d+/, '')}
              </Text>
            )}
            
         
            {post.content && (() => {
              const locationData = extractLocation(post.content);
              return locationData && (
                <View style={styles.mapContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Ionicons name="location" size={16} color={theme.colors.primary} />
                    <Text style={[
                      styles.locationLabel, 
                      { color: theme.colors.primary, fontFamily: theme.fontFamily.regular, marginLeft: 4 }
                    ]}>
                      Location
                    </Text>
                  </View>
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
              );
            })()}

    
            {post.imageUrl && (
              <Image 
                source={{ uri: post.imageUrl }} 
                style={styles.postImage}
                resizeMode="contain"
              />
            )}

 
            <View style={[styles.actionBar, { borderTopColor: theme.colors.borderColor }]}>
              <View style={styles.voteContainer}>
                <TouchableOpacity 
                  style={styles.voteButton} 
                  onPress={handleUpvote}
                >
                  <MaterialCommunityIcons name="arrow-up-bold" size={20} color={theme.colors.upvote} />
                </TouchableOpacity>
                <Text style={[styles.voteCount, { color: theme.colors.text, fontFamily: theme.fontFamily.regular }]}>
                  {post.upvotes - post.downvotes}
                </Text>
                <TouchableOpacity 
                  style={styles.voteButton} 
                  onPress={handleDownvote}
                >
                  <MaterialCommunityIcons name="arrow-down-bold" size={20} color={theme.colors.downvote} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if (commentSectionRef.current && scrollViewRef.current) {
                    commentSectionRef.current.measureInWindow((x, y, width, height) => {
                      scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    });
                  }
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[
                  styles.actionButtonText, 
                  { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
                ]}>
                  {" " + comments.length + " Comments"}
                </Text>
              </TouchableOpacity>
              

              {user && post.user_id === user.id && (
                <React.Fragment>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.navigate('EditPost', {
                        postId: post.id,
                        title: post.title,
                        content: post.content,
                        imageUrl: post.imageUrl
                      });
                    }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[
                      styles.actionButtonText, 
                      { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
                    ]}>
                      {" Edit"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={async () => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      try {
                        Alert.alert(
                          'Delete Post',
                          'Are you sure you want to delete this post?',
                          [
                            {
                              text: 'Cancel',
                              style: 'cancel',
                            },
                            {
                              text: 'Delete',
                              onPress: async () => {
                                await postsApi.deletePost(postId);
                                Toast.show({
                                  type: 'success',
                                  text1: 'Post deleted successfully',
                                  position: 'bottom',
                                });
                                navigation.goBack();
                              },
                              style: 'destructive',
                            },
                          ],
                          { cancelable: true }
                        );
                      } catch (error) {
                        console.error('Error deleting post:', error);
                        Toast.show({
                          type: 'error',
                          text1: 'Failed to delete post',
                          position: 'bottom',
                        });
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[
                      styles.actionButtonText, 
                      { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
                    ]}>
                      {" Delete"}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              )}
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleReportPost();
                }}
              >
                <Ionicons name="flag-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[
                  styles.actionButtonText, 
                  { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
                ]}>
                  {" Report"}
                </Text>
              </TouchableOpacity>
            </View>

            
          </View>

         
          <View 
            ref={commentSectionRef}
            style={[
              styles.commentSection, 
              { backgroundColor: theme.colors.cardBackground }
            ]}
          >
            <Text style={[
              styles.commentSectionTitle, 
              { color: theme.colors.text, fontFamily: theme.fontFamily.regular }
            ]}>
              {`Comments (${comments.length})`}
            </Text>
            {comments.length > 0 ? (
              comments.map(comment => (
                <View key={comment.id}>
                  {renderCommentItem({ item: comment })}
                </View>
              ))
            ) : (
              <Text style={[
                styles.noCommentsText, 
                { color: theme.colors.textSecondary, fontFamily: theme.fontFamily.regular }
              ]}>
                {"No comments yet. Be the first to comment!"}
              </Text>
            )}
          </View>
        </ScrollView>
        
        
        <View style={[
          styles.bottomCommentContainer, 
          { 
            backgroundColor: theme.colors.cardBackground,
            borderTopColor: theme.colors.borderColor,
            paddingBottom: Math.max(insets.bottom, 12),
          }
        ]}>
          <TextInput
            style={[
              styles.bottomCommentInput, 
              { 
                borderColor: theme.colors.borderColor, 
                backgroundColor: isDark ? theme.colors.background : '#f9f9f9',
                color: theme.colors.text,
                fontFamily: theme.fontFamily.regular
              }
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.bottomCommentSubmitButton, 
              { backgroundColor: theme.colors.primary },
              !commentText.trim() && styles.disabledButton
            ]}
            disabled={!commentText.trim()}
            onPress={async () => {
              try {
                await handleCommentSubmit();
              } catch (error) {
                console.error("Error submitting comment:", error);
              }
            }}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40, 
  },
  
  scrollView: {
    flex: 1,
  },
  postContainer: {
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postAuthor: {
    fontSize: 12,
  },
  postDate: {
    fontSize: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
  },
  postContentEdit: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 15,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  actionButtonText: {
    fontSize: 12,
  },
  bottomCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    minHeight: 60,
  },
  bottomCommentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 10,
  },
  bottomCommentSubmitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  commentSection: {
    padding: 15,
  },
  commentSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  commentItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentUsername: {
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 13,
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationLabel: {
    marginBottom: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  commentVoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButton: {
    padding: 5,
  },
  replyButtonText: {
    fontSize: 12,
  },
  noCommentsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
});

export default PostDetailScreen;