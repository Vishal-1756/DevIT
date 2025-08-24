export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl?: string;
  upvotes: number;
  downvotes: number;
  comments_count?: number;
  user_id?: string; 
  message?: string;
  action?: string;
}