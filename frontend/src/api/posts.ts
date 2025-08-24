import { apiRequest } from './client';


interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  user_id?: string;
  upvotes: number;
  downvotes: number;
  imageUrl?: string;
  comments_count: number;
  
  message?: string;
  action?: string;
}

interface PostCreate {
  title: string;
  content: string;
  author: string;
  imageUrl?: string;
}

interface PostUpdate {
  title?: string;
  content?: string;
  imageUrl?: string;
}

interface VoteRequest {
  vote_type: 'upvote' | 'downvote' | 'remove_upvote' | 'remove_downvote';
}

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

interface CommentCreate {
  post_id: string;
  text: string;
  username: string;
  user_id?: string;
}


export const api = {
  
  getPosts: async (skip: number = 0, limit: number = 10, sort: string = 'newest'): Promise<Post[]> => {
    try {
      return await apiRequest<Post[]>(`/posts?skip=${skip}&limit=${limit}&sort=${sort}`);
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },

  
  getPostById: async (id: string): Promise<Post> => {
    try {
      return await apiRequest<Post>(`/posts/${id}`);
    } catch (error) {
      console.error(`Error fetching post with ID ${id}:`, error);
      throw error;
    }
  },

  
  createPost: async (postData: PostCreate): Promise<Post> => {
    try {
      return await apiRequest<Post>('/posts', 'POST', postData);
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  
  createPostWithImage: async (title: string, content: string, author: string, imageFile?: any): Promise<Post> => {
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('author', author);
      
      if (imageFile) {
        
        const imgFile = {
          uri: imageFile.uri,
          type: 'image/jpeg',
          name: 'post-image.jpg',
        };
        
        
        formData.append('image', imgFile as any);
        
        console.log('Sending image in form data:', imageFile.uri);
      }
      
      return await apiRequest<Post>('/posts/with-image', 'POST', formData, true, 'multipart/form-data');
    } catch (error) {
      console.error('Error creating post with image:', error);
      throw error;
    }
  },

  
  updatePost: async (id: string, postData: PostUpdate): Promise<Post> => {
    try {
      return await apiRequest<Post>(`/posts/${id}`, 'PUT', postData);
    } catch (error) {
      console.error(`Error updating post with ID ${id}:`, error);
      throw error;
    }
  },
  
  
  updatePostWithImage: async (id: string, title?: string, content?: string, imageFile?: any, removeImage: boolean = false): Promise<Post> => {
    try {
      const formData = new FormData();
      
      if (title) formData.append('title', title);
      if (content) formData.append('content', content);
      if (removeImage) formData.append('remove_image', 'true');
      if (imageFile) formData.append('image', imageFile);
      
      return await apiRequest<Post>(`/posts/${id}/form`, 'PUT', formData, true, 'multipart/form-data');
    } catch (error) {
      console.error(`Error updating post with ID ${id}:`, error);
      throw error;
    }
  },

  
  deletePost: async (id: string): Promise<void> => {
    try {
      await apiRequest<void>(`/posts/${id}`, 'DELETE');
    } catch (error) {
      console.error(`Error deleting post with ID ${id}:`, error);
      throw error;
    }
  },
  
  
  votePost: async (id: string, voteType: 'upvote' | 'downvote' | 'remove_upvote' | 'remove_downvote'): Promise<Post> => {
    try {
      const vote: VoteRequest = { vote_type: voteType };
      return await apiRequest<Post>(`/posts/${id}/vote`, 'POST', vote);
    } catch (error) {
      console.error(`Error voting on post with ID ${id}:`, error);
      throw error;
    }
  },
  
  
  getComments: async (postId: string): Promise<Comment[]> => {
    try {
      return await apiRequest<Comment[]>(`/posts/${postId}/comments`);
    } catch (error) {
      console.error(`Error fetching comments for post ID ${postId}:`, error);
      throw error;
    }
  },
  
  
  createComment: async (commentData: CommentCreate): Promise<Comment> => {
    try {
      return await apiRequest<Comment>('/comments', 'POST', commentData);
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },
  
  
  voteComment: async (id: string, voteType: 'upvote' | 'downvote' | 'remove_upvote' | 'remove_downvote'): Promise<Comment> => {
    try {
      const vote: VoteRequest = { vote_type: voteType };
      return await apiRequest<Comment>(`/comments/${id}/vote`, 'POST', vote);
    } catch (error) {
      console.error(`Error voting on comment with ID ${id}:`, error);
      throw error;
    }
  },
  
  
  searchPosts: async (query: string): Promise<Post[]> => {
    try {
      return await apiRequest<Post[]>(`/search?query=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error(`Error searching posts with query "${query}":`, error);
      throw error;
    }
  }
};