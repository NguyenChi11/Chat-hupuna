'use client';

import React from 'react';

import Sidebar from '../base/Sidebar';
import ChatWindow from '../../app/(zalo)/home/ChatPopup';
import HomeWelcomeBanner from './HomeWelcomeBanner';
import { User } from '@/types/User';
import { ChatItem, GroupConversation } from '@/types/Group';

interface Message {
  _id: string;
  content?: string;
  type: 'text' | 'image' | 'file' | 'sticker' | 'video' | 'reminder';
  fileName?: string;
  timestamp: number;
  sender: string;
  senderName: string;
  roomId: string;
  roomName: string;
  isGroupChat: boolean;
  partnerId?: string;
  partnerName?: string;
  fileUrl?: string;
}
interface HomeDesktopProps {
  currentUser: User;
  groups: GroupConversation[];
  allUsers: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setShowCreateGroupModal: (show: boolean) => void;
  selectedChat: ChatItem | null;
  onSelectChat: (item: ChatItem) => void;
  onBackFromChat: () => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => void;
  scrollToMessageId: string | null;
  onScrollComplete: () => void;
  fetchAllData: () => Promise<void> | void;
  onShowGlobalSearch: () => void;
  onNavigateToMessage: (message: Message) => void;
}

export default function HomeDesktop({
  currentUser,
  groups,
  allUsers,
  searchTerm,
  setSearchTerm,
  setShowCreateGroupModal,
  selectedChat,
  onSelectChat,
  onBackFromChat,
  onChatAction,
  scrollToMessageId,
  onScrollComplete,
  fetchAllData,
  onNavigateToMessage,
}: HomeDesktopProps) {
  return (
    <div className="hidden md:flex h-screen w-full">
      <Sidebar
        currentUser={currentUser}
        groups={groups}
        allUsers={allUsers}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setShowCreateGroupModal={setShowCreateGroupModal}
        selectedChat={selectedChat}
        onSelectChat={onSelectChat}
        onChatAction={onChatAction}
        onNavigateToMessage={onNavigateToMessage}
      />

      <div className="flex-1 flex flex-col overflow-auto border-l border-gray-200">
        {selectedChat ? (
          <ChatWindow
            reLoad={fetchAllData}
            allUsers={allUsers}
            selectedChat={selectedChat}
            currentUser={currentUser}
            onShowCreateGroup={() => setShowCreateGroupModal(true)}
            onChatAction={onChatAction}
            scrollToMessageId={scrollToMessageId}
            onScrollComplete={onScrollComplete}
            onBackFromChat={onBackFromChat}
            groups={groups}
          />
        ) : (
          <HomeWelcomeBanner currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
