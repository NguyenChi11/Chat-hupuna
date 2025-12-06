'use client';

import React from 'react';
import Sidebar from '@/components/base/Sidebar';
import { useHomePage } from '@/hooks/useHomePage';
import ChatWindow from '@/app/(zalo)/home/ChatPopup';
import MenuWidget from '@/app/(zalo)/chat-iframe/menu-widget';

const styleWidget = {
  margin: 'p-0!',
};

export default function ChatIframe() {
  const {
    currentUser,
    isLoading,
    allUsers,
    groups,
    searchTerm,
    setSearchTerm,
    setShowCreateGroupModal,
    selectedChat,
    handleSelectChat,
    handleChatAction,
    handleNavigateToMessage,
    scrollToMessageId,
    setScrollToMessageId,
    setSelectedChat,
  } = useHomePage();

  if (isLoading || !currentUser) {
    return <div className="flex h-full items-center justify-center bg-white">Loading...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <MenuWidget title="Chat Hupuna" />
      <div className="flex-1 overflow-hidden">
        {!selectedChat ? (
          <Sidebar
            currentUser={currentUser}
            groups={groups}
            allUsers={allUsers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setShowCreateGroupModal={setShowCreateGroupModal}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            onChatAction={handleChatAction}
            onNavigateToMessage={handleNavigateToMessage}
            styleWidget={styleWidget.margin}
          />
        ) : (
          <ChatWindow
            selectedChat={selectedChat}
            currentUser={currentUser}
            allUsers={allUsers}
            onShowCreateGroup={() => setShowCreateGroupModal(true)}
            onChatAction={handleChatAction}
            scrollToMessageId={scrollToMessageId}
            onScrollComplete={() => setScrollToMessageId(null)}
            onBackFromChat={() => setSelectedChat(null)}
          />
        )}
      </div>
    </div>
  );
}
