export type UserRole = 'student' | 'teacher' | 'admin' | 'official' | 'club';

export type OnlineStatus = 'online' | 'offline' | 'hidden';

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar?: string;
  profileBackground?: string;  // Profile background media (image/video/gif)
  appTheme?: string;  // Personal app theme background (only visible to user)
  bio?: string;
  role: UserRole;
  isVerified?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: Date;
  onlineStatus?: OnlineStatus;
  lastSeen?: Date;
}

export interface Post {
  id: string;
  author: User;
  authorType?: 'user' | 'club' | 'official';
  clubId?: string | null;
  content: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: Date;
  type: 'post' | 'announcement' | 'official';
}

export interface Comment {
  id: string;
  author: User;
  postId: string;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage?: Message;
  unreadCount: number;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  managerId: string;
  members?: string[];
  membersCount: number;
  postsCount: number;
  isApproved: boolean;
  requiresApproval?: boolean;
  createdAt: Date;
}
