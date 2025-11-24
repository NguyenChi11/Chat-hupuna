'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChatItem, GroupConversation } from '@/types/Group';
import type { Message } from '@/types/Message';
import { isLink, isVideoFile } from '@/utils/utils';

interface UseChatInfoPopupParams {
  selectedChat: ChatItem;
  isGroup: boolean;
  messages: Message[];
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroup: boolean) => void;
}

export function useChatInfoPopup({ selectedChat, isGroup, messages, onChatAction }: UseChatInfoPopupParams) {
  const currentRoomId = selectedChat._id;
  const { isPinned: initialIsPinned, isHidden: initialIsHidden } = selectedChat;

  // Trạng thái ghim / ẩn cục bộ (optimistic UI)
  const [localIsPinned, setLocalIsPinned] = useState(initialIsPinned === true);
  const [localIsHidden, setLocalIsHidden] = useState(initialIsHidden === true);

  // Accordion trạng thái mở/đóng cho từng mục
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // Id của item đang mở menu "..."
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Cập nhật state cục bộ khi props thay đổi (theo phòng hiện tại)
  useEffect(() => {
    setLocalIsPinned(initialIsPinned === true);
    setLocalIsHidden(initialIsHidden === true);
  }, [currentRoomId, initialIsPinned, initialIsHidden]);

  const handleChatActionClick = (actionType: 'pin' | 'hide') => {
    if (actionType === 'pin') {
      const newState = !localIsPinned;
      setLocalIsPinned(newState);
      onChatAction(currentRoomId, 'pin', newState, isGroup);
    } else if (actionType === 'hide') {
      const newState = !localIsHidden;
      setLocalIsHidden(newState);
      onChatAction(currentRoomId, 'hide', newState, isGroup);
    }
  };

  const toggleItem = (item: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const closeMenu = () => setActiveMenuId(null);

  // Media (ảnh / video)
  const mediaList = useMemo(() => {
    if (!messages) return [];
    return messages
      .filter((msg) => {
        if (msg.isRecalled) return false;
        if (msg.type === 'image') return true;
        if (msg.type === 'file' && isVideoFile(msg.fileName)) return true;
        return false;
      })
      .map((msg) => ({
        id: msg._id,
        type: msg.type === 'image' ? 'image' : 'video',
        url: msg.fileUrl || msg.content || msg.previewUrl || '',
        fileName: msg.fileName,
      }))
      .reverse();
  }, [messages]);

  // File
  const fileList = useMemo(() => {
    if (!messages) return [];
    return messages
      .filter((msg) => {
        if (msg.isRecalled) return false;
        return msg.type === 'file' && !isVideoFile(msg.fileName);
      })
      .map((msg) => ({
        id: msg._id,
        url: msg.fileUrl || msg.content || '',
        fileName: msg.fileName || 'Tài liệu không tên',
        timestamp: msg.timestamp,
      }))
      .reverse();
  }, [messages]);

  // Link
  const linkList = useMemo(() => {
    if (!messages) return [];
    return messages
      .filter((msg) => {
        if (msg.isRecalled) return false;
        return msg.type === 'text' && isLink(msg.content);
      })
      .map((msg) => ({
        id: msg._id,
        url: msg.content || '',
        timestamp: msg.timestamp,
      }))
      .reverse();
  }, [messages]);

  return {
    currentRoomId,
    localIsPinned,
    localIsHidden,
    openItems,
    activeMenuId,
    setActiveMenuId,
    handleChatActionClick,
    toggleItem,
    closeMenu,
    mediaList,
    fileList,
    linkList,
  };
}


