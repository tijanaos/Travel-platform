export interface User {
  id: number;
  username: string;
  email: string;
  role: 'tourist' | 'guide' | 'administrator';
}

export interface Profile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  profileImage?: string;
  biography?: string;
  motto?: string;
}

export interface Blog {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  authorId: number;
  authorUsername: string;
  images: string[];
  likesCount: number;
  likedByMe: boolean;
}

export interface Comment {
  id: number;
  blogId: number;
  authorId: number;
  authorUsername: string;
  text: string;
  createdAt: string;
  updatedAt: string;
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
