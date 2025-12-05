export const USERS_COLLECTION_NAME = 'Users';

export interface User {
  [key: string]: unknown;
  _id: string;
  name: string;
  username: string;
  password?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: number;

  avatar?: string;
  role?: string;
  department?: string;
  status?: string;
  online?: boolean;
  lastSeen?: number | null;
  // Các field trạng thái đã được tính sẵn từ server (tiện cho FE sử dụng)
  isPinned?: boolean;
  isHidden?: boolean;
  isPinnedBy?: Record<string, boolean>;
  isHiddenBy?: Record<string, boolean>;
  isRecall?: boolean;
  onesignalSubs?: string[];
}
export interface UserCreate {
  [key: string]: unknown;
  name: string;
  username: string;
  password: string;

  avatar?: string;
  role?: string;
  department?: string;
  status?: string;
}
