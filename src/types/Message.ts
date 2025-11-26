export const MESSAGES_COLLECTION_NAME = 'Messages';

export type MessageType = 'text' | 'image' | 'file' | 'notify' | 'sticker' | 'video';

export interface Message {
  [key: string]: unknown;
  _id: string;
  roomId: string;
  sender: string;
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
  mentions?: string[]; // Array của user IDs được mention
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
}
