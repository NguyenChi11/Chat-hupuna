'use client';

import React from 'react';

import HomeDesktop from '@/components/(home)/HomeDesktop';
import HomeMobile from '@/components/(home)/HomeMobile';
import HomeOverlays from '@/components/(home)/HomeOverlays';
import { useHomePage } from '@/hooks/useHomePage';

export default function HomePage() {
  const {
    currentUser,
    isLoading,
    allUsers,
    groups,
    selectedChat,
    searchTerm,
    setSearchTerm,
    showCreateGroupModal,
    setShowCreateGroupModal,
    showGlobalSearchModal,
    globalSearchTerm,
    globalSearchResults,
    scrollToMessageId,
    setScrollToMessageId,
    handleOpenGlobalSearch,
    handleGlobalSearch,
    handleSelectContact,
    handleNavigateToMessage,
    fetchAllData,
    handleChatAction,
    handleSelectChat,
    setSelectedChat,
  } = useHomePage();

  if (isLoading || !currentUser) {
    return <div className="flex h-screen items-center justify-center bg-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full font-sans">
      <HomeDesktop
        onNavigateToMessage={handleNavigateToMessage}
        currentUser={currentUser}
        groups={groups}
        allUsers={allUsers}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setShowCreateGroupModal={setShowCreateGroupModal}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        onChatAction={handleChatAction}
        scrollToMessageId={scrollToMessageId}
        onScrollComplete={() => setScrollToMessageId(null)}
        fetchAllData={fetchAllData}
        onShowGlobalSearch={handleOpenGlobalSearch}
      />

      <HomeMobile
        currentUser={currentUser}
        groups={groups}
        allUsers={allUsers}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setShowCreateGroupModal={setShowCreateGroupModal}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        onBackFromChat={() => setSelectedChat(null)}
        onChatAction={handleChatAction}
        scrollToMessageId={scrollToMessageId}
        onScrollComplete={() => setScrollToMessageId(null)}
        fetchAllData={fetchAllData}
        onShowGlobalSearch={handleOpenGlobalSearch}
      />

      <HomeOverlays
        currentUser={currentUser}
        allUsers={allUsers}
        showGlobalSearchModal={showGlobalSearchModal}
        globalSearchTerm={globalSearchTerm}
        globalSearchResults={globalSearchResults}
        onCloseGlobalSearch={handleOpenGlobalSearch}
        onSearch={handleGlobalSearch}
        onNavigateToMessage={handleNavigateToMessage}
        onSelectContact={handleSelectContact}
        showCreateGroupModal={showCreateGroupModal}
        onCloseCreateGroup={() => setShowCreateGroupModal(false)}
        onGroupCreated={() => {
          fetchAllData();
          setShowCreateGroupModal(false);
        }}
      />
    </div>
  );
}
