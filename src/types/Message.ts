import { User } from '@/types/User';

export const MESSAGES_COLLECTION_NAME = 'Messages';

export type MessageType = 'text' | 'image' | 'file' | 'notify' | 'sticker' | 'video' | 'reminder' | 'poll';

export interface Message {
  [key: string]: unknown;
  _id: string;
  roomId: string;
  sender: string | User;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
  type: MessageType;
  timestamp: number;
  readBy?: string[];
  isRecalled?: boolean;
  replyToMessageId?: string;
  replyToMessageName?: string;
  isPinned?: boolean;
  mentions?: string[];
  originalContent?: string;
  editedAt?: number;
  reminderAt?: number;
  reminderNote?: string;
  reminderFired?: boolean;
  reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  pollQuestion?: string;
  pollOptions?: string[];
  pollVotes?: Record<string, string[]>;
  isPollLocked?: boolean;
  pollLockedAt?: number;
   sharedFrom?: {
    messageId: string;
    originalSender: string;
    originalRoomId: string;
  };
  callerId?: string;
  calleeId?: string;
  callType?: 'voice' | 'video';
  callStatus?: 'answered' | 'rejected' | 'timeout';
  callDurationSec?: number;
  callStartedAt?: number;
  callEndedAt?: number;
}
export interface MessageCreate {
  [key: string]: unknown;
  roomId: string;
  sender: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
  type: MessageType;
  timestamp: number;
  isRecalled?: boolean;
  replyToMessageId?: string;
  replyToMessageName?: string;
  isPinned?: boolean;
  originalContent?: string;
  editedAt?: number;
  reminderAt?: number;
  reminderNote?: string;
  reminderFired?: boolean;
  reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  pollQuestion?: string;
  pollOptions?: string[];
  pollVotes?: Record<string, string[]>;
  isPollLocked?: boolean;
  pollLockedAt?: number;
   sharedFrom?: {
    messageId: string;
    originalSender: string;
    originalRoomId: string;
  };
  callerId?: string;
  calleeId?: string;
  callType?: 'voice' | 'video';
  callStatus?: 'answered' | 'rejected' | 'timeout';
  callDurationSec?: number;
  callStartedAt?: number;
  callEndedAt?: number;
}
