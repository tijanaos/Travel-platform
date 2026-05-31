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
  username: string;
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

export interface OrderItem {
  id: number;
  tourId: number;
  tourName: string;
  price: number;
}

export interface ShoppingCart {
  id: number;
  touristId: number;
  totalPrice: number;
  items: OrderItem[];
}

export interface TourPurchaseToken {
  id: number;
  touristId: number;
  tourId: number;
  token: string;
  purchasedAt: string;
}

export interface CompletedKeyPoint {
  id: number;
  keyPointId: number;
  completedAt: string;
}

export interface TourExecution {
  id: number;
  tourId: number;
  touristId: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  lastActivity: string | null;
  abandonedAt: string | null;
  completedAt: string | null;
  startLatitude: number | null;
  startLongitude: number | null;
  completedKeyPoints: CompletedKeyPoint[];
}

export interface ProximityResult {
  newKeyPointCompleted: boolean;
  completedKeyPoint: CompletedKeyPoint | null;
  totalCompleted: number;
  totalKeyPoints: number;
}
