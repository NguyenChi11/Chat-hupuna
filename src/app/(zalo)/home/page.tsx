'use client';

import React, { useEffect } from 'react';

import HomeDesktop from '@/components/(home)/HomeDesktop';
import HomeMobile from '@/components/(home)/HomeMobile';
import HomeOverlays from '@/components/(home)/HomeOverlays';
import { useHomePage } from '@/hooks/useHomePage';
import type { GroupConversation } from '@/types/Group';
import { subscribeNotification, addUserTags, loginOneSignal, ensureSubscribed, waitForOneSignalReady } from '@/lib/onesignal';

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

  useEffect(() => {
    const run = async () => {
      if (!currentUser || !currentUser._id) return;
      await waitForOneSignalReady();
      await subscribeNotification();
      const subId = await ensureSubscribed();
      await loginOneSignal(String(currentUser._id));
      await addUserTags({ userId: String(currentUser._id) });
      if (typeof window !== 'undefined') {
        try {
          console.log('OneSignal subscription id', subId);
        } catch {}
      }
      if (subId) {
        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'addOneSignalSub',
              currentUserId: String(currentUser._id),
              data: { subId: String(subId) },
            }),
          });
        } catch {}
      }
    };
    void run();
  }, [currentUser]);

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
        onBackFromChat={() => setSelectedChat(null)}
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
        onNavigateToMessage={handleNavigateToMessage}
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
        // Sau khi tạo nhóm:
        // - Đóng modal
        // - Nếu có group mới trả về -> auto chọn group đó để mở giao diện chat
        onGroupCreated={(group?: GroupConversation) => {
          if (group) {
            setSelectedChat(group);
          }
          setShowCreateGroupModal(false);
        }}
        reLoad={fetchAllData}
      />
    </div>
  );
}
