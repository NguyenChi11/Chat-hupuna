'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ChatItem } from '@/types/Group';
import type { Message } from '@/types/Message';
 

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

  const [isMediaExpanded, setIsMediaExpanded] = useState(false);
  const [isFileExpanded, setIsFileExpanded] = useState(false);
  const [isLinkExpanded, setIsLinkExpanded] = useState(false);

  const [mediaTotalCount, setMediaTotalCount] = useState<number>(0);
  const [fileTotalCount, setFileTotalCount] = useState<number>(0);
  const [linkTotalCount, setLinkTotalCount] = useState<number>(0);

  const [mediaGroups, setMediaGroups] = useState<{ dateKey: string; dateLabel: string; items: { id: string; type: string; url: string; fileName?: string }[] }[]>([]);
  const [fileGroups, setFileGroups] = useState<{ dateKey: string; dateLabel: string; items: { id: string; url: string; fileName: string }[] }[]>([]);
  const [linkGroups, setLinkGroups] = useState<{ dateKey: string; dateLabel: string; items: { id: string; url: string }[] }[]>([]);

  const [mediaHasAll, setMediaHasAll] = useState(false);
  const [fileHasAll, setFileHasAll] = useState(false);
  const [linkHasAll, setLinkHasAll] = useState(false);

  

  const limitGroupsByCount = useCallback(
    <T>(groups: { dateKey: string; dateLabel: string; items: T[] }[], limit: number) => {
      let remaining = limit;
      const out: { dateKey: string; dateLabel: string; items: T[] }[] = [];
      for (const g of groups) {
        if (remaining <= 0) break;
        const take = g.items.slice(0, Math.min(remaining, g.items.length));
        if (take.length > 0) out.push({ dateKey: g.dateKey, dateLabel: g.dateLabel, items: take });
        remaining -= take.length;
      }
      return out;
    },
    [],
  );

  const mediaVisibleGroups = useMemo(
    () => (isMediaExpanded ? mediaGroups : limitGroupsByCount(mediaGroups, 6)),
    [isMediaExpanded, mediaGroups, limitGroupsByCount],
  );
  const fileVisibleGroups = useMemo(
    () => (isFileExpanded ? fileGroups : limitGroupsByCount(fileGroups, 6)),
    [isFileExpanded, fileGroups, limitGroupsByCount],
  );
  const linkVisibleGroups = useMemo(
    () => (isLinkExpanded ? linkGroups : limitGroupsByCount(linkGroups, 6)),
    [isLinkExpanded, linkGroups, limitGroupsByCount],
  );

  const fetchAssets = useCallback(
    async (assetType: 'media' | 'file' | 'link', needAll: boolean) => {
      const postBody = {
        action: 'readAssets',
        roomId: currentRoomId,
        assetType,
        limit: needAll
          ? assetType === 'media'
            ? mediaTotalCount || 9999
            : assetType === 'file'
              ? fileTotalCount || 9999
              : linkTotalCount || 9999
          : 6,
      };
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postBody),
        });
        const json = await res.json();
        const groups = Array.isArray(json.groups) ? json.groups : [];
        const total =
          typeof json.total === 'number'
            ? json.total
            : groups.reduce((acc: number, g: { items: unknown[] }) => acc + (Array.isArray(g.items) ? g.items.length : 0), 0);
        if (assetType === 'media') {
          setMediaGroups(groups);
          setMediaTotalCount(total);
          setMediaHasAll(needAll);
        } else if (assetType === 'file') {
          setFileGroups(groups);
          setFileTotalCount(total);
          setFileHasAll(needAll);
        } else {
          setLinkGroups(groups);
          setLinkTotalCount(total);
          setLinkHasAll(needAll);
        }
      } catch {}
    }, [currentRoomId, mediaTotalCount, fileTotalCount, linkTotalCount],
  );

  useEffect(() => {
    setMediaGroups([]);
    setFileGroups([]);
    setLinkGroups([]);
    setMediaHasAll(false);
    setFileHasAll(false);
    setLinkHasAll(false);
    setMediaTotalCount(0);
    setFileTotalCount(0);
    setLinkTotalCount(0);
  }, [currentRoomId, messages]);

  useEffect(() => {
    if (openItems['Ảnh/Video'] && mediaGroups.length === 0) {
      void fetchAssets('media', false);
    }
  }, [openItems, mediaGroups.length, fetchAssets]);

  useEffect(() => {
    if (openItems['File'] && fileGroups.length === 0) {
      void fetchAssets('file', false);
    }
  }, [openItems, fileGroups.length, fetchAssets]);

  useEffect(() => {
    if (openItems['Link'] && linkGroups.length === 0) {
      void fetchAssets('link', false);
    }
  }, [openItems, linkGroups.length, fetchAssets]);

  useEffect(() => {
    if (openItems['Ảnh/Video'] && isMediaExpanded && !mediaHasAll) {
      void fetchAssets('media', true);
    }
  }, [openItems, isMediaExpanded, mediaHasAll, fetchAssets]);

  useEffect(() => {
    if (openItems['File'] && isFileExpanded && !fileHasAll) {
      void fetchAssets('file', true);
    }
  }, [openItems, isFileExpanded, fileHasAll, fetchAssets]);

  useEffect(() => {
    if (openItems['Link'] && isLinkExpanded && !linkHasAll) {
      void fetchAssets('link', true);
    }
  }, [openItems, isLinkExpanded, linkHasAll, fetchAssets]);

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
    mediaVisibleGroups,
    mediaTotalCount,
    isMediaExpanded,
    setIsMediaExpanded,
    fileVisibleGroups,
    fileTotalCount,
    isFileExpanded,
    setIsFileExpanded,
    linkVisibleGroups,
    linkTotalCount,
    isLinkExpanded,
    setIsLinkExpanded,
  };
}
