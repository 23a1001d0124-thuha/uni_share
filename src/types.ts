export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  condition: string;
  description: string;
  images: string[];
  school: string;
  author: string;
  authorId: string;
  isStudentVerified: boolean;
  views: number;
  likes: number;
  status: "Đang bán" | "Đang chờ" | "Đã bán";
  suitabilityScore: number;
  tags?: string[];
  createdAt: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  averageRating?: number;
  ratingCount?: number;
}

export interface SellerRating {
  productId: string;
  sellerName: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
}

export interface Want {
  id: string;
  title: string;
  category: string;
  budget: string;
  schoolFilter: string;
  description: string;
  buyer: string;
  buyerSchool: string;
  createdAt: string;
}

export interface ForumPostComment {
  id: string;
  author: string;
  school: string;
  content: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  tag: string;
  author: string;
  school: string;
  content: string;
  upvotes: number;
  commentsCount: number;
  joinedUsers: string[];
  createdAt: string;
  comments?: ForumPostComment[];
  isGroupBuyCompleted?: boolean;
  targetMembers?: number;
  productImage?: string;
  currentPrice?: number;
  originalPrice?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface ChatRoom {
  roomId: string;
  viewerRole: "buyer" | "seller";
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    school: string;
  };
  buyer: {
    id: string;
    name: string;
    school: string;
  };
  seller: {
    id: string;
    name: string;
    school: string;
    isStudentVerified: boolean;
  };
  messages: Message[];
}

export interface SystemNotification {
  id: string;
  type: "success" | "warning" | "info" | "message";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface UserProfile {
  name: string;
  school: string;
  studentId: string;
  isVerified: boolean;
  paymentLinked: boolean;
  notificationsEnabled: boolean;
}