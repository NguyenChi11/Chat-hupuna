'use client';

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import IncomingCallModal from '@/components/(call)/IncomingCallModal';

import HomeDesktop from '@/components/(home)/HomeDesktop';
import HomeMobile from '@/components/(home)/HomeMobile';
import HomeOverlays from '@/components/(home)/HomeOverlays';
import { useHomePage } from '@/hooks/useHomePage';
import type { GroupConversation } from '@/types/Group';
import {
  subscribeNotification,
  addUserTags,
  loginOneSignal,
  ensureSubscribed,
  waitForOneSignalReady,
} from '@/lib/onesignal';
import { playGlobalRingTone, stopGlobalRingTone } from '@/utils/callRing';

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

  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [incomingCallHome, setIncomingCallHome] = useState<{
    from: string;
    type: 'voice' | 'video';
    roomId: string;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);

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

 useEffect(() => {
    if (!currentUser || !currentUser._id) return;
    
    const socket = (socketRef.current = io(resolveSocketUrl(), { 
      transports: ['websocket'], 
      withCredentials: false 
    }));
    
    socket.emit('join_user', { userId: String(currentUser._id) });

    // Cleanup cũ
    socket.off('call_offer');
    socket.off('call_end');
    socket.off('call_reject');
    socket.off('call_answer'); // ✅ THÊM LISTENER MỚI

    const handleOffer = (data: { 
      roomId: string; 
      target: string; 
      from: string; 
      type: 'voice' | 'video'; 
      sdp: RTCSessionDescriptionInit 
    }) => {
      if (String(data.target) !== String(currentUser._id)) return;
      if (selectedChat) return; // Đã mở chat, để ChatPopup xử lý
      if (incomingCallHome) return;
      
      setIncomingCallHome({ 
        from: String(data.from), 
        type: data.type, 
        roomId: String(data.roomId), 
        sdp: data.sdp 
      });
      
      playGlobalRingTone(); // ✅ DÙNG GLOBAL
    };

    const handleEnd = () => {
      stopGlobalRingTone(); // ✅ DÙNG GLOBAL
      setIncomingCallHome(null);
      try {
        localStorage.removeItem('pendingIncomingCall');
      } catch {}
    };

    const handleReject = () => {
      stopGlobalRingTone(); // ✅ DÙNG GLOBAL
      setIncomingCallHome(null);
      try {
        localStorage.removeItem('pendingIncomingCall');
      } catch {}
    };

    // ✅ THÊM HANDLER call_answer
    const handleAnswer = () => {
      stopGlobalRingTone(); // ✅ DÙNG GLOBAL
    };

    socket.on('call_offer', handleOffer);
    socket.on('call_end', handleEnd);
    socket.on('call_reject', handleReject);
    socket.on('call_answer', handleAnswer); // ✅ LẮNG NGHE call_answer

    return () => {
      socket.off('call_offer', handleOffer);
      socket.off('call_end', handleEnd);
      socket.off('call_reject', handleReject);
      socket.off('call_answer', handleAnswer);
    };
  }, [currentUser, selectedChat, incomingCallHome]);

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

      {incomingCallHome && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4">
            {(() => {
              const caller = allUsers.find((u) => String(u._id) === String(incomingCallHome.from));
              const avatar = caller?.avatar;
              const name = caller?.name || 'Cuộc gọi đến';
              return (
                <IncomingCallModal
                  avatar={avatar}
                  name={name}
                  onAccept={() => {
                    try {
                      localStorage.setItem('pendingIncomingCall', JSON.stringify(incomingCallHome));
                    } catch {}
                    const group = groups.find((g) => String(g._id) === String(incomingCallHome.roomId));
                    if (group) {
                      setSelectedChat(group as unknown as GroupConversation);
                    } else {
                      const c = allUsers.find((u) => String(u._id) === String(incomingCallHome.from));
                      if (c) {
                        setSelectedChat(c as unknown as GroupConversation);
                      }
                    }
                    setIncomingCallHome(null);
                    stopGlobalRingTone();
                  }}
                  onReject={() => {
                    socketRef.current?.emit('call_reject', {
                      roomId: incomingCallHome.roomId,
                      targets: [String(incomingCallHome.from)],
                    });
                    setIncomingCallHome(null);
                    stopGlobalRingTone();
                  }}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
