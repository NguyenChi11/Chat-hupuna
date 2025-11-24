import { User } from './User';

export const GROUP_COLLECTION_NAME = 'Groups';

// 1. Định nghĩa các quyền hạn
export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER';

// 2. Cấu trúc lưu trong DB cho 1 thành viên (Object thay vì string)
export interface GroupMemberSchema {
  _id: string; // User ID
  role: GroupRole;
  joinedAt: number;
}

// 3. Cấu trúc hiển thị ở Frontend (đã populate thông tin User)
// Kế thừa từ GroupMemberSchema để có thêm field 'role'
export interface MemberInfo extends GroupMemberSchema {
  name: string;
  avatar?: string;
}

export interface GroupConversation {
  [key: string]: unknown;
  _id: string;
  name: string;
  isGroup: boolean;

  // DB lưu GroupMemberSchema[], Client nhận MemberInfo[]
  // Chấp nhận cả 2 kiểu để linh hoạt trong quá trình map dữ liệu
  members: GroupMemberSchema[] | MemberInfo[];

  createdBy: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: number;
  avatar?: string;
  createdAt?: string;
  isRecall?: boolean;

  isPinnedBy?: Record<string, boolean>;
  isHiddenBy?: Record<string, boolean>;
}

export interface GroupConversationCreate {
  [key: string]: unknown;
  name: string;
  isGroup: boolean;

  // Khi tạo, ta lưu mảng object có role
  members: GroupMemberSchema[];
  createdBy: string;
  createdAt?: number;
}

export type ChatItem = User | GroupConversation;
