import { Timestamp } from 'firebase/firestore';

export interface UserDoc {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  code: string;
  link: string;
  isActive: boolean;
  order: number;
}

export interface Post {
  id: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  domain: string;
  siteName: string;
  authorId: string;
  createdAt: Timestamp;
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Timestamp;
}

export interface Vote {
  id: string; // userId_postId
  userId: string;
  postId: string;
  vote: 1 | -1;
}
