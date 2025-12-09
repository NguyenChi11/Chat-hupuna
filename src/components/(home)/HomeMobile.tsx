'use client';

import React, { useEffect } from 'react';

import Sidebar from '../base/Sidebar';
import ChatWindow from '../../app/(zalo)/home/ChatPopup';

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

interface HomeMobileProps {
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

export default function HomeMobile({
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
}: HomeMobileProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mobile-footer', {
          detail: { hidden: !!selectedChat },
        }),
      );
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('mobile-footer', {
            detail: { hidden: false },
          }),
        );
      }
    };
  }, [selectedChat]);
  return (
    <div className="block md:hidden relative w-full h-full">
      {selectedChat ? (
        <div className="absolute inset-0 w-full h-full bg-white flex flex-col z-50">
          <ChatWindow
            reLoad={fetchAllData}
            allUsers={allUsers}
            selectedChat={selectedChat}
            currentUser={currentUser}
            onShowCreateGroup={() => setShowCreateGroupModal(true)}
            onChatAction={onChatAction}
            scrollToMessageId={scrollToMessageId}
            onScrollComplete={onScrollComplete}
            // Nút quay lại sẽ được render bên trong ChatHeader (mobile)
            onBackFromChat={onBackFromChat}
            groups={groups}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}
