'use client';

import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/base/Sidebar';
import { useHomePage } from '@/hooks/useHomePage';
import ChatWindow from '@/app/(zalo)/home/ChatPopup';
import MenuWidget from '@/app/(zalo)/chat-iframe/menu-widget';
import { io } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import IncomingCallModal from '@/components/(call)/IncomingCallModal';
import { playGlobalRingTone, stopGlobalRingTone } from '@/utils/callRing';

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

  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [incomingCallHome, setIncomingCallHome] = useState<{
    from: string;
    type: 'voice' | 'video';
    roomId: string;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const total =
      [...groups, ...allUsers].reduce((acc, c) => acc + (Number(c.unreadCount || 0) || 0), 0) || 0;
    try {
      window.parent?.postMessage({ type: 'HUPUNA_WIDGET_NOTIFY_COUNT', count: total }, window.location.origin);
    } catch {}
  }, [groups, allUsers, currentUser]);

  useEffect(() => {
    if (!currentUser || !currentUser._id) return;
    const socket = (socketRef.current = io(resolveSocketUrl(), {
      transports: ['websocket'],
      withCredentials: false,
    }));
    socket.emit('join_user', { userId: String(currentUser._id) });

    socket.off('call_offer');
    socket.off('call_end');
    socket.off('call_reject');
    socket.off('call_answer');

    const handleOffer = (data: {
      roomId: string;
      target: string;
      from: string;
      type: 'voice' | 'video';
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (String(data.target) !== String(currentUser._id)) return;
      if (selectedChat) return;
      if (incomingCallHome) return;
      setIncomingCallHome({
        from: String(data.from),
        type: data.type,
        roomId: String(data.roomId),
        sdp: data.sdp,
      });
      playGlobalRingTone();
      try {
        window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CALL', active: true }, window.location.origin);
      } catch {}
    };

    const handleEnd = () => {
      stopGlobalRingTone();
      setIncomingCallHome(null);
      try {
        localStorage.removeItem('pendingIncomingCall');
      } catch {}
      try {
        window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CALL', active: false }, window.location.origin);
      } catch {}
    };
    const handleReject = () => {
      stopGlobalRingTone();
      setIncomingCallHome(null);
      try {
        localStorage.removeItem('pendingIncomingCall');
      } catch {}
      try {
        window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CALL', active: false }, window.location.origin);
      } catch {}
    };
    const handleAnswer = () => {
      stopGlobalRingTone();
      try {
        window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CALL', active: false }, window.location.origin);
      } catch {}
    };

    socket.on('call_offer', handleOffer);
    socket.on('call_end', handleEnd);
    socket.on('call_reject', handleReject);
    socket.on('call_answer', handleAnswer);

    return () => {
      socket.off('call_offer', handleOffer);
      socket.off('call_end', handleEnd);
      socket.off('call_reject', handleReject);
      socket.off('call_answer', handleAnswer);
    };
  }, [currentUser, selectedChat, incomingCallHome]);

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
            groups={groups}
          />
        )}
      </div>
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
                      setSelectedChat(group);
                    } else {
                      const c = allUsers.find((u) => String(u._id) === String(incomingCallHome.from));
                      if (c) setSelectedChat(c as unknown as typeof groups[number]);
                    }
                    setIncomingCallHome(null);
                    stopGlobalRingTone();
                    try {
                      window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CALL', active: false }, window.location.origin);
                    } catch {}
                  }}
                  onReject={() => {
                    socketRef.current?.emit('call_reject', {
                      roomId: incomingCallHome.roomId,
                      targets: [String(incomingCallHome.from)],
                    });
                    setIncomingCallHome(null);
                    stopGlobalRingTone();
                    try {
                      window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CALL', active: false }, window.location.origin);
                    } catch {}
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
