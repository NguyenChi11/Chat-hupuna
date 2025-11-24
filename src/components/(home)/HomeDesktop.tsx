'use client';

import React from 'react';

import Sidebar from '../base/Sidebar';
import ChatWindow from '../../app/(zalo)/home/ChatPopup';
import HomeWelcomeBanner from './HomeWelcomeBanner';
import { User } from '@/types/User';
import { ChatItem, GroupConversation } from '@/types/Group';

interface HomeDesktopProps {
  currentUser: User;
  groups: GroupConversation[];
  allUsers: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setShowCreateGroupModal: (show: boolean) => void;
  selectedChat: ChatItem | null;
  onSelectChat: (item: ChatItem) => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => void;
  scrollToMessageId: string | null;
  onScrollComplete: () => void;
  fetchAllData: () => Promise<void> | void;
  onShowGlobalSearch: () => void;
  onNavigateToMessage: (message: any) => void;
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
  onChatAction,
  scrollToMessageId,
  onScrollComplete,
  fetchAllData,
  onShowGlobalSearch,
                                      onNavigateToMessage
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
        onShowGlobalSearch={onShowGlobalSearch}
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
          />
        ) : (
          <HomeWelcomeBanner currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
