'use client';

import React from 'react';

import Sidebar from '../base/Sidebar';
import ChatWindow from '../../app/(zalo)/home/ChatPopup';

import { User } from '@/types/User';
import { ChatItem, GroupConversation } from '@/types/Group';

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
  onShowGlobalSearch,
}: HomeMobileProps) {
  return (
    <div className="block md:hidden relative w-full h-full">
      {selectedChat ? (
        <div className="absolute inset-0 w-full h-full bg-white flex flex-col z-50">
          <div className="flex items-center p-3 border-b border-gray-200 bg-white">
            <button onClick={onBackFromChat} className="mr-3 px-3 py-1 bg-gray-100 rounded-full">
              ← Quay lại
            </button>
            <span className="font-bold">{selectedChat.name}</span>
          </div>
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
          onShowGlobalSearch={onShowGlobalSearch}
        />
      )}
    </div>
  );
}
