'use client';

import React, { createContext, useContext } from 'react';

import type { User } from '../types/User';
import type { ChatItem } from '../types/Group';
import type { Message } from '../types/Message';

export interface ChatContextValue {
  currentUser: User;
  allUsers: User[];
  selectedChat: ChatItem;
  messages: Message[];
  isGroup: boolean;
  chatName: string;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  value: ChatContextValue;
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ value, children }) => {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }

  return context;
};


