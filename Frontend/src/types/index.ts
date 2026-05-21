export interface User {
  id: number;
  username: string;
  email: string;
  role: 'tourist' | 'guide' | 'administrator';
}

export interface Profile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  bio?: string;
  motto?: string;
}

export interface BlogImage {
  id: string;
  url: string;
}

export interface Blog {
  id: string;
  title: string;
  description: string;
  created_at: string;
  author_id: number;
  likes_count: number;
  liked_by_me: boolean;
  images: BlogImage[];
}

export interface Comment {
  id: string;
  blog_id: string;
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface TransportTime {
  id: number;
  tourId: number;
  type: 'WALKING' | 'BICYCLE' | 'CAR';
  durationMinutes: number;
}

export interface Tour {
  id: number;
  name: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  price: number;
  authorId: number;
  createdAt: string;
  lengthKm?: number;
  publishedAt?: string;
  archivedAt?: string;
}

export interface KeyPoint {
  id: number;
  tourId: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
}

export interface Review {
  id: number;
  tourId: number;
  touristId: number;
  touristUsername: string;
  rating: number;
  comment: string;
  visitDate: string;
  createdAt: string;
  imageUrls: string[];
}
