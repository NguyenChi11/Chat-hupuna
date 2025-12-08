'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ChatItem } from '@/types/Group';
import type { User } from '@/types/User';
import type { Message } from '@/types/Message';

interface UseChatInfoPopupParams {
  selectedChat: ChatItem;
  isGroup: boolean;
  messages: Message[];
  currentUser: User;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroup: boolean) => void;
}

export function useChatInfoPopup({ selectedChat, isGroup, messages, currentUser, onChatAction }: UseChatInfoPopupParams) {
  const getId = (u: unknown): string => {
    if (!u) return '';
    if (typeof u === 'string') return u;
    if (typeof u === 'number') return String(u);
    if (typeof u === 'object' && u !== null) {
      if ('_id' in (u as Record<string, unknown>) && (u as Record<string, unknown>)._id != null)
        return String((u as Record<string, unknown>)._id);
      if ('id' in (u as Record<string, unknown>) && (u as Record<string, unknown>).id != null)
        return String((u as Record<string, unknown>).id);
    }
    return '';
  };
  const getOneToOneRoomId = (user1Id: string | number, user2Id: string | number) => {
    return [user1Id, user2Id].sort().join('_');
  };
  const currentRoomId = isGroup ? getId(selectedChat) : getOneToOneRoomId(getId(currentUser), getId(selectedChat));
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
    const targetId = isGroup ? currentRoomId : getId(selectedChat);
    if (actionType === 'pin') {
      const newState = !localIsPinned;
      setLocalIsPinned(newState);
      onChatAction(targetId, 'pin', newState, isGroup);
    } else if (actionType === 'hide') {
      const newState = !localIsHidden;
      setLocalIsHidden(newState);
      onChatAction(targetId, 'hide', newState, isGroup);
    }
  };

  const toggleItem = (item: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const closeMenu = () => setActiveMenuId(null);

  const [mediaList, setMediaList] = useState<{
    id: string;
    type: 'image' | 'video' | 'file';
    url: string;
    fileName?: string;
    timestamp?: number;
  }[]>([]);
  const [mediaGroups, setMediaGroups] = useState<
    { dateLabel: string; items: { id: string; url: string; fileName?: string; type: 'image' | 'video'; timestamp?: number }[] }[]
  >([]);
  const [fileList, setFileList] = useState<{ id: string; url: string; fileName: string; timestamp?: number }[]>([]);
  const [fileGroups, setFileGroups] = useState<
    { dateLabel: string; items: { id: string; url: string; fileName: string; timestamp?: number }[] }[]
  >([]);
  const [linkList, setLinkList] = useState<{ id: string; url: string; timestamp?: number }[]>([]);
  const [linkGroups, setLinkGroups] = useState<
    { dateLabel: string; items: { id: string; url: string; timestamp?: number }[] }[]
  >([]);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [fileTotal, setFileTotal] = useState(0);
  const [linkTotal, setLinkTotal] = useState(0);
  const [isMediaExpanded, setIsMediaExpanded] = useState(false);
  const [isFileExpanded, setIsFileExpanded] = useState(false);
  const [isLinkExpanded, setIsLinkExpanded] = useState(false);
  const assetsReqKeyRef = useRef(0);

  const flattenGroups = useCallback(<T,>(groups: { items: T[] }[]) => groups.flatMap((g) => g.items ?? []), []);

  const fetchAssets = useCallback(
    async (assetType: 'media' | 'file' | 'link', needAll: boolean) => {
      const reqKey = assetsReqKeyRef.current;
      const postBody = {
        action: 'readAssets',
        roomId: currentRoomId,
        assetType,
        limit: needAll ? 5000 : 6,
      };
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postBody),
        });
        const json = await res.json();
        if (assetsReqKeyRef.current !== reqKey) return;
        const groups = Array.isArray(json.groups) ? json.groups : [];
        if (assetType === 'media') {
          const items = flattenGroups<{ id: string; url: string; fileName?: string; type: 'image' | 'video'; timestamp?: number }>(groups);
          const total = typeof json.total === 'number' ? json.total : items.length;
          setMediaList(items.map((it) => ({ id: it.id, url: it.url, fileName: it.fileName, type: it.type, timestamp: it.timestamp })));
          setMediaGroups(
            groups.map((g: { dateLabel?: string; items: typeof items }) => ({
              dateLabel: String(g.dateLabel || ''),
              items: (g.items || []).map((it) => ({ id: it.id, url: it.url, fileName: it.fileName, type: it.type, timestamp: it.timestamp })),
            })),
          );
          setMediaTotal(total);
          setIsMediaExpanded(needAll);
        } else if (assetType === 'file') {
          const items = flattenGroups<{ id: string; url: string; fileName?: string; timestamp?: number }>(groups);
          const total = typeof json.total === 'number' ? json.total : items.length;
          setFileList(items.map((it) => ({ id: it.id, url: it.url, fileName: it.fileName || 'Tài liệu', timestamp: it.timestamp })));
          setFileGroups(
            groups.map((g: { dateLabel?: string; items: typeof items }) => ({
              dateLabel: String(g.dateLabel || ''),
              items: (g.items || []).map((it) => ({ id: it.id, url: it.url, fileName: it.fileName || 'Tài liệu', timestamp: it.timestamp })),
            })),
          );
          setFileTotal(total);
          setIsFileExpanded(needAll);
        } else {
          const items = flattenGroups<{ id: string; url: string; timestamp?: number }>(groups);
          const total = typeof json.total === 'number' ? json.total : items.length;
          setLinkList(items);
          setLinkGroups(
            groups.map((g: { dateLabel?: string; items: typeof items }) => ({
              dateLabel: String(g.dateLabel || ''),
              items: (g.items || []).map((it) => ({ id: it.id, url: it.url, timestamp: it.timestamp })),
            })),
          );
          setLinkTotal(total);
          setIsLinkExpanded(needAll);
        }
      } catch {}
    },
    [currentRoomId, flattenGroups],
  );

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const videoRegex = /(\.mp4|\.mov|\.mkv|\.webm|\.avi|\.m4v)$/i;
    const linkRegex = /(https?:\/\/|www\.)\S+/i;

    const isMediaMsg =
      latest.type === 'image' ||
      latest.type === 'video' ||
      (latest.type === 'file' && (videoRegex.test(String(latest.fileUrl || '')) || videoRegex.test(String(latest.fileName || ''))));
    const isFileMsg = latest.type === 'file' && !(videoRegex.test(String(latest.fileUrl || '')) || videoRegex.test(String(latest.fileName || '')));
    const isLinkMsg = latest.type === 'text' && linkRegex.test(String(latest.content || ''));

    if (isMediaMsg && openItems['Ảnh/Video']) void fetchAssets('media', isMediaExpanded);
    if (isFileMsg && openItems['File']) void fetchAssets('file', isFileExpanded);
    if (isLinkMsg && openItems['Link']) void fetchAssets('link', isLinkExpanded);
  }, [messages, openItems, isMediaExpanded, isFileExpanded, isLinkExpanded, fetchAssets]);

  useEffect(() => {
    if (openItems['Ảnh/Video'] && mediaList.length === 0) void fetchAssets('media', false);
  }, [openItems, mediaList.length, fetchAssets]);
  useEffect(() => {
    if (openItems['File'] && fileList.length === 0) void fetchAssets('file', false);
  }, [openItems, fileList.length, fetchAssets]);
  useEffect(() => {
    if (openItems['Link'] && linkList.length === 0) void fetchAssets('link', false);
  }, [openItems, linkList.length, fetchAssets]);

  useEffect(() => {
    assetsReqKeyRef.current += 1;
    setOpenItems({});
    setActiveMenuId(null);
    setMediaList([]);
    setMediaGroups([]);
    setFileList([]);
    setFileGroups([]);
    setLinkList([]);
    setLinkGroups([]);
    setMediaTotal(0);
    setFileTotal(0);
    setLinkTotal(0);
    setIsMediaExpanded(false);
    setIsFileExpanded(false);
    setIsLinkExpanded(false);
  }, [currentRoomId]);

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
    mediaGroups,
    fileList,
    fileGroups,
    linkList,
    linkGroups,
    mediaTotal,
    fileTotal,
    linkTotal,
    isMediaExpanded,
    isFileExpanded,
    isLinkExpanded,
    fetchAssets,
  };
}
