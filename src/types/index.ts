export type UserRole = 'student' | 'teacher' | 'admin' | 'official' | 'club';

export type OnlineStatus = 'online' | 'offline' | 'hidden';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';
export type ReportReason = 'inappropriate-content' | 'harassment' | 'spam' | 'misinformation' | 'other';
export type ReportType = 'post' | 'user' | 'comment';

export interface Report {
  id: string;
  type: ReportType;
  targetId: string;  // post ID, user ID, or comment ID
  targetAuthorId?: string;
  reportedBy: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  targetType?: string;  // 'post', 'user', 'comment', 'club'
  targetId?: string;
  description: string;
  createdAt: Date;
}

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

export interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  estimatedEndTime?: Date;
  updatedAt: Date;
  updatedBy: string;
}
