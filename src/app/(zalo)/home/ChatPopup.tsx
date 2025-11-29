'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatTimeAgo } from '@/utils/dateUtils';
const PRESENCE_THRESHOLD_MS = 5 * 60 * 1000;
import io, { Socket } from 'socket.io-client';
import ChatInfoPopup from './ChatInfoPopup';

import ModalMembers from '../../../components/base/ModalMembers';
import { User } from '../../../types/User';
import { Message, MessageCreate } from '../../../types/Message';
import { ChatItem, GroupConversation } from '../../../types/Group';

import { EmojiClickData } from 'emoji-picker-react';
import ChatHeader from '@/components/(chatPopup)/ChatHeader';
import PinnedMessagesSection from '@/components/(chatPopup)/PinnedMessagesSection';
import EmojiStickerPicker from '@/components/(chatPopup)/EmojiStickerPicker';
import ReplyBanner from '@/components/(chatPopup)/ReplyBanner';
import MentionMenu from '@/components/(chatPopup)/MentionMenu';
import ChatInput from '@/components/(chatPopup)/ChatInput';
import MessageList from '@/components/(chatPopup)/MessageList';
import MediaPreviewModal from '@/components/(chatPopup)/MediaPreviewModal';
import UploadProgressBar from '@/components/(chatPopup)/UploadProgressBar';
import MessageContextMenu, { type ContextMenuState } from '@/components/(chatPopup)/MessageContextMenu';
import { useChatMentions } from '@/hooks/useChatMentions';
import { useChatUpload } from '@/hooks/useChatUpload';
import { useChatVoiceInput } from '@/hooks/useChatVoiceInput';
import { useChatMembers } from '@/hooks/useChatMembers';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import {
  createMessageApi,
  readMessagesApi,
  readPinnedMessagesApi,
  recallMessageApi,
  markAsReadApi,
} from '@/fetch/messages';
import SearchSidebar from '@/components/(chatPopup)/SearchMessageModal';
import { isVideoFile } from '@/utils/utils';
import { insertTextAtCursor } from '@/utils/chatInput';
import { groupMessagesByDate } from '@/utils/chatMessages';
import { ChatProvider } from '@/context/ChatContext';
import { useRouter } from 'next/navigation';

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/9408/9408176.png',
  'https://cdn-icons-png.flaticon.com/512/9408/9408201.png',
];

const SOCKET_URL = `http://${process.env.DOMAIN || 'localhost'}:${process.env.PORT || '3001'}`;
const SCROLL_BUMP_PX = 80;

interface ChatWindowProps {
  selectedChat: ChatItem;
  currentUser: User;
  allUsers: User[];
  onShowCreateGroup: () => void;
  reLoad?: () => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => void;
  scrollToMessageId?: string | null; // 🔥 MỚI: ID tin nhắn cần scroll đến
  onScrollComplete?: () => void;
  onBackFromChat?: () => void;
}

declare global {
  interface SpeechRecognitionResultAlternative {
    transcript: string;
  }

  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResultAlternative;
    0: SpeechRecognitionResultAlternative;
  }

  interface SpeechRecognitionEventLike extends Event {
    results: SpeechRecognitionResultList[];
    error?: string;
  }

  interface SpeechRecognitionInstance {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
    onaudioend: ((event: Event) => void) | null;
    onerror: ((event: SpeechRecognitionEventLike) => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  }

  type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
const getId = (u: User | ChatItem | string | undefined | null): string => {
  if (!u) return '';
  if (typeof u === 'string') return u;
  if ('_id' in u && u._id != null) return String(u._id);
  if ('id' in u && u.id != null) return String(u.id);
  return '';
};

export default function ChatWindow({
  selectedChat,
  currentUser,
  allUsers,
  onShowCreateGroup,
  reLoad,
  onChatAction,
  scrollToMessageId, // 🔥 Thêm
  onScrollComplete,
  onBackFromChat,
}: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [openMember, setOpenMember] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const markedReadRef = useRef<string | null>(null);
  const initialScrolledRef = useRef(false);
  const jumpLoadingRef = useRef(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const isGroup = 'isGroup' in selectedChat && selectedChat.isGroup === true;
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [, setPinnedMessage] = useState<Message | null>(null);
  const [allPinnedMessages, setAllPinnedMessages] = useState<Message[]>([]);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState(''); // Lưu nội dung đang chỉnh sửa
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestTs, setOldestTs] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const getOneToOneRoomId = (user1Id: string | number, user2Id: string | number) => {
    return [user1Id, user2Id].sort().join('_');
  };

  const roomId = isGroup ? getId(selectedChat) : getOneToOneRoomId(getId(currentUser), getId(selectedChat));
  const chatName = selectedChat.name;

  const [showSearchSidebar, setShowSearchSidebar] = useState(false);
  const chatAvatar = (selectedChat as { avatar?: string }).avatar;

  const presenceInfo = useMemo(() => {
    if (isGroup) return { online: undefined as boolean | undefined, text: '' };
    const partnerId = getId(selectedChat);
    const partner = allUsers.find((u) => String(u._id) === String(partnerId));
    const lastSeen = partner?.lastSeen ?? null;
    const now = Date.now();
    const online = lastSeen != null ? now - lastSeen <= PRESENCE_THRESHOLD_MS : !!partner?.online;
    const text = online
      ? 'Đang hoạt động'
      : lastSeen
        ? `Hoạt động ${formatTimeAgo(lastSeen)} trước`
        : 'Hoạt động gần đây';
    return { online, text };
  }, [isGroup, selectedChat, allUsers]);

  const sendMessageProcess = useCallback(
    async (msgData: MessageCreate) => {
      try {
        const json = await createMessageApi({ ...msgData, roomId });

        if (json.success && typeof json._id === 'string') {
          const newId = json._id;
          setMessages((prev) => [...prev, { ...msgData, _id: newId } as Message]);
          const socketData = {
            ...msgData,
            _id: newId,
            roomId,
            sender: currentUser._id,
            senderName: currentUser.name,
            isGroup: isGroup,
            receiver: isGroup ? null : getId(selectedChat),
            members: isGroup ? (selectedChat as GroupConversation).members : [],
          };
          socketRef.current?.emit('send_message', socketData);
          setReplyingTo(null);
        }
      } catch (error) {
        console.error('Save message error:', error);
      }
    },
    [roomId, currentUser, isGroup, selectedChat],
  );

  const sendNotifyMessage = useCallback(
    async (text: string) => {
      const newMsg: MessageCreate = {
        roomId: roomId,
        sender: currentUser._id,
        content: text,
        type: 'notify',
        timestamp: Date.now(),
      };
      await sendMessageProcess(newMsg);
    },
    [roomId, currentUser._id, sendMessageProcess],
  );

  const { uploadingFiles, handleUploadAndSend } = useChatUpload({
    roomId,
    currentUser,
    selectedChat,
    isGroup,
    sendMessageProcess,
    setMessages,
  });
  const uploadingValues = Object.values(uploadingFiles);
  const hasUploading = uploadingValues.length > 0;
  const overallUploadPercent = hasUploading
    ? uploadingValues.reduce((sum, v) => sum + v, 0) / uploadingValues.length
    : 0;
  const uploadingCount = uploadingValues.length;

  const { memberCount, activeMembers, handleMemberRemoved, handleRoleChange, handleMembersAdded } = useChatMembers({
    selectedChat,
    isGroup,
    currentUser,
    sendNotifyMessage,
  });

  const {
    showMentionMenu,
    mentionSuggestions,
    selectedMentionIndex,
    mentionMenuRef,
    editableRef,
    getPlainTextFromEditable,
    parseMentions,
    handleInputChangeEditable,
    handleKeyDownEditable,
    selectMention,
    setShowMentionMenu,
  } = useChatMentions({
    allUsers,
    activeMembers,
    currentUserId: currentUser._id,
  });

  // Thêm option @all khi là nhóm
  const ALL_MENTION_ID = '__ALL__';
  const mentionSuggestionsWithAll = useMemo(() => {
    if (!isGroup) return mentionSuggestions;

    const allOption = {
      _id: ALL_MENTION_ID,
      name: 'Tất cả mọi người',
      avatar: undefined,
    } as User;

    // Tránh trùng nếu đã có trong list
    if (mentionSuggestions.some((u) => (u as User)._id === ALL_MENTION_ID)) return mentionSuggestions;

    return [allOption, ...mentionSuggestions];
  }, [isGroup, mentionSuggestions]);

  // Kết hợp keydown: vừa xử lý mention menu, vừa gửi tin nhắn với Enter
  const handleKeyDownCombined = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Đầu tiên cho hook xử lý (ArrowUp/Down, Enter để chọn mention, Escape...)
    handleKeyDownEditable(e);

    // Nếu mention menu đang mở, không xử lý gửi tin nhắn
    if (showMentionMenu) return;

    // Enter (không Shift) để gửi tin nhắn
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message: msg,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const { playMessageSound, showMessageNotification } = useChatNotifications({ chatName });

  useEffect(() => {
    if (!contextMenu?.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const contextMenuElement = document.querySelector('[data-context-menu="true"]');
      if (contextMenuElement && contextMenuElement.contains(target)) {
        return;
      }
      closeContextMenu();
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu, closeContextMenu]);

  useEffect(() => {
    if (!scrollToMessageId) return;
  }, [scrollToMessageId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (!initialScrolledRef.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
      initialScrolledRef.current = true;
    }
  }, [messages.length, roomId]);
  // 🔥 USEMEMO: Phân loại tin nhắn
  const messagesGrouped = useMemo(() => groupMessagesByDate(messages), [messages]);

  const handlePinMessage = async (message: Message) => {
    // 1. Cập nhật trạng thái local trước (Optimistic update)
    setPinnedMessage(message);

    const newPinnedStatus = !message.isPinned; // Xác định trạng thái mới

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'togglePin',
          messageId: message._id,
          data: { isPinned: newPinnedStatus }, // Sử dụng trạng thái mới
        }),
      });

      if (res.ok) {
        // 2. Cập nhật danh sách messages và pinnedMessage
        setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, isPinned: newPinnedStatus } : m)));

        await fetchPinnedMessages();

        // 🔥 BƯỚC MỚI: GỬI THÔNG BÁO VÀO NHÓM
        const action = newPinnedStatus ? 'đã ghim' : 'đã bỏ ghim';
        const senderName = currentUser.name || 'Một thành viên';
        let notificationText = '';

        // Tạo nội dung thông báo dựa trên loại tin nhắn
        if (message.type === 'text') {
          notificationText = `${senderName} ${action} một tin nhắn văn bản.`;
        } else if (message.type === 'image') {
          notificationText = `${senderName} ${action} một hình ảnh.`;
        } else if (message.type === 'file') {
          notificationText = `${senderName} ${action} tệp tin "${message.fileName || 'file'}" vào nhóm.`;
        } else {
          notificationText = `${senderName} ${action} một tin nhắn.`;
        }

        await sendNotifyMessage(notificationText);
        // 🔥 END BƯỚC MỚI
      } else {
        // Nếu API fail, roll back local state
        setPinnedMessage(message.isPinned ? message : null);
        console.error('API togglePin failed');
      }
    } catch (error) {
      console.error('Ghim tin nhắn thất bại', error);

      // 3. Roll back trạng thái local nếu có lỗi mạng/server
      setPinnedMessage(message.isPinned ? message : null);
    }
  };

  //useEffect ghim tin nhắn
  useEffect(() => {
    if (messages.length > 0) {
      const currentlyPinned = messages.find((m) => m.isPinned);

      setPinnedMessage(currentlyPinned || null);
    } else {
      setPinnedMessage(null);
    }
  }, [messages]);

  const loadMoreMessages = useCallback(async () => {
    if (!roomId || loadingMore || !hasMore || oldestTs == null) return;
    const container = messagesContainerRef.current;
    setLoadingMore(true);
    const prevHeight = container ? container.scrollHeight : 0;
    let added = false;
    try {
      const LIMIT = 20;
      const data = await readMessagesApi(roomId, { limit: LIMIT, before: oldestTs, sortOrder: 'desc' });
      const raw = Array.isArray(data.data) ? (data.data as Message[]) : [];
      const existing = new Set(messages.map((m) => String(m._id)));
      const toAddDesc = raw.filter((m) => !existing.has(String(m._id)));
      const toAddAsc = toAddDesc.slice().reverse();
      if (toAddAsc.length > 0) {
        setMessages((prev) => [...toAddAsc, ...prev]);
        const newOldest = toAddAsc[0]?.timestamp ?? oldestTs;
        setOldestTs(newOldest ?? oldestTs);
        added = true;
      }
      // Với truy vấn "before=oldestTs", tổng trả về chỉ là số lượng bản ghi cũ hơn oldestTs,
      // không phải tổng toàn bộ room. Để tránh dừng sớm, dùng ngưỡng theo limit.
      setHasMore(raw.length === LIMIT);
      if (container && !jumpLoadingRef.current) {
        setTimeout(() => {
          const newHeight = container.scrollHeight;
          const delta = newHeight - prevHeight;
          container.scrollTop = delta + SCROLL_BUMP_PX;
        }, 0);
      }
    } catch (e) {
      console.error('Load more messages error:', e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
    return added;
  }, [roomId, loadingMore, hasMore, oldestTs, messages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handler = () => {
      if (el.scrollTop <= 50 && !jumpLoadingRef.current) {
        void loadMoreMessages();
      }
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [loadMoreMessages]);

  const handleReplyTo = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const handleJumpToMessage = useCallback(async (messageId: string) => {
    if (window.innerWidth < 640) {
      setShowPopup(false);
    }

    const messageElement = document.getElementById(`msg-${messageId}`);
    const container = messagesContainerRef.current;

    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (container) {
        const elRect = messageElement.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const delta = elRect.top - cRect.top - container.clientHeight / 2 + elRect.height / 2;
        container.scrollBy({ top: delta, behavior: 'smooth' });
      }

      setHighlightedMsgId(messageId);
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2500);
    } else {
      jumpLoadingRef.current = true;
      try {
        let targetTs: number | null = null;
        try {
          const r = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getById', _id: messageId }),
          });
          const j = await r.json();
          const t = (j && (j.row?.row || j.row)) as Message | undefined;
          if (t && String(t.roomId) === roomId) {
            targetTs = Number(t.timestamp) || null;
          }
        } catch {}

        if (targetTs == null) {
          alert('Tin nhắn này không còn hiển thị trong danh sách hiện tại.');
          return;
        }

        const olderLimit = 200;
        const newerLimit = 60;

        const [olderRes, newerRes] = await Promise.all([
          readMessagesApi(roomId, { limit: olderLimit, sortOrder: 'desc', extraFilters: { timestamp: { $lte: targetTs } } }),
          readMessagesApi(roomId, { limit: newerLimit, sortOrder: 'asc', extraFilters: { timestamp: { $gt: targetTs } } }),
        ]);

        const olderRawDesc = Array.isArray(olderRes.data) ? (olderRes.data as Message[]) : [];
        const olderAsc = olderRawDesc.slice().reverse();
        const newerAsc = Array.isArray(newerRes.data) ? (newerRes.data as Message[]) : [];

        const existing = new Set(messages.map((m) => String(m._id)));
        const mergedAsc = [...olderAsc, ...newerAsc].filter((m) => !existing.has(String(m._id)));

        if (mergedAsc.length > 0) {
          setMessages((prev) => [...mergedAsc, ...prev]);
          const newOldest = mergedAsc[0]?.timestamp ?? oldestTs;
          setOldestTs(newOldest ?? oldestTs);
          setHasMore(olderRawDesc.length === olderLimit);
        }

        await new Promise((r) => setTimeout(r, 60));
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (container) {
            const elRect = el.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            const delta = elRect.top - cRect.top - container.clientHeight / 2 + elRect.height / 2;
            container.scrollBy({ top: delta, behavior: 'smooth' });
          }
          setHighlightedMsgId(messageId);
          setTimeout(() => setHighlightedMsgId(null), 2500);
          return;
        }

        alert('Tin nhắn này không còn hiển thị trong danh sách hiện tại.');
      } finally {
        jumpLoadingRef.current = false;
      }
    }
  }, [hasMore, loadMoreMessages, roomId, messages, oldestTs]);

  useEffect(() => {
    if (!scrollToMessageId) return;
    if (initialLoading) return;
    if (oldestTs == null && messages.length === 0) return;
    const timer = setTimeout(() => {
      void handleJumpToMessage(scrollToMessageId);
      onScrollComplete?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [scrollToMessageId, initialLoading, oldestTs, messages.length, handleJumpToMessage, onScrollComplete]);

  const { isListening, handleVoiceInput } = useChatVoiceInput({
    editableRef,
    handleInputChangeEditable,
  });

  const onEmojiClick = useCallback(
    (emoji: EmojiClickData | string) => {
      if (!editableRef.current) return;

      const toString = (input: EmojiClickData | string): string => {
        const raw = typeof input === 'string' ? input : input.emoji;
        const hexLike = /^[0-9a-fA-F-]+$/;
        if (hexLike.test(raw)) {
          const codePoints = raw
            .split('-')
            .map((h) => parseInt(h, 16))
            .filter((n) => !Number.isNaN(n));
          if (codePoints.length > 0) return String.fromCodePoint(...codePoints);
        }
        return raw;
      };

      const editable = editableRef.current;
      const value = toString(emoji);
      editable.focus();
      insertTextAtCursor(editable, value);
      handleInputChangeEditable();
    },
    [editableRef, handleInputChangeEditable],
  );

  const handleSendSticker = useCallback(
    async (url: string) => {
      const newMsg: MessageCreate = {
        roomId,
        sender: currentUser._id,
        fileUrl: url,
        type: 'sticker',
        timestamp: Date.now(),
      };
      await sendMessageProcess(newMsg);
      setShowEmojiPicker(false);
    },
    [roomId, currentUser._id, sendMessageProcess],
  );

  const fetchPinnedMessages = useCallback(async () => {
    try {
      const data = await readPinnedMessagesApi(roomId);
      setAllPinnedMessages((data.data as Message[]) || []);
    } catch (error) {
      console.error('Fetch Pinned messages error:', error);
    }
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    try {
      setInitialLoading(true);
      const data = await readMessagesApi(roomId, { limit: 20, sortOrder: 'desc' });
      const raw = Array.isArray(data.data) ? (data.data as Message[]) : [];
      const map = new Map<string, Message>();
      raw.forEach((m) => {
        const id = String(m._id);
        if (!map.has(id)) map.set(id, m);
      });
      const desc = Array.from(map.values()).sort(
        (a: Message, b: Message) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const asc = desc.slice().reverse();
      setMessages(asc);
      const first = asc[0]?.timestamp ?? null;
      setOldestTs(first ?? null);
      const total =
        typeof (data as { total?: number }).total === 'number' ? (data as { total?: number }).total : undefined;
      setHasMore(total ? asc.length < total : raw.length === 20);
      setInitialLoading(false);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setMessages([]);
      setHasMore(false);
      setOldestTs(null);
      setInitialLoading(false);
    }
  }, [roomId]);

  // Chỉ load lại dữ liệu khi roomId thay đổi (tránh gọi API lại khi click cùng một group nhiều lần)
  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    void fetchMessages();
    void fetchPinnedMessages();
    initialScrolledRef.current = false;
  }, [roomId, fetchMessages, fetchPinnedMessages]);

  const allUsersMap = useMemo(() => {
    const map = new Map<string, string>();
    if (currentUser) {
      const name = currentUser.name || 'Bạn';
      if (currentUser._id) map.set(String(currentUser._id), name);
    }
    if (Array.isArray(allUsers)) {
      allUsers.forEach((user) => {
        if (user.name) {
          if (user._id) map.set(String(user._id), user.name);
        }
      });
    }

    if (isGroup && Array.isArray(activeMembers)) {
      activeMembers.forEach((mem) => {
        if (mem._id) map.set(String(mem._id), mem.name || 'Thành viên');
      });
    }
    return map;
  }, [currentUser, allUsers, isGroup, activeMembers]);

  useEffect(() => {
    if (!roomId) return;

    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_room', roomId);

    socketRef.current.on('receive_message', (data: Message) => {
      if (data.roomId !== roomId) return;
      setMessages((prev) => {
        const id = String(data._id);
        const exists = prev.some((m) => String(m._id) === id);
        if (exists) {
          return prev.map((m) => (String(m._id) === id ? { ...m, ...data } : m));
        }
        const map = new Map<string, Message>();
        [...prev, data].forEach((m) => map.set(String(m._id), m));
        const unique = Array.from(map.values()).sort(
          (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        return unique;
      });

      if (data.sender !== currentUser._id) {
        playMessageSound();
        showMessageNotification(data);
        void markAsReadApi(roomId, String(currentUser._id));
      }
    });

    // 🔥 LISTENER CHO MESSAGE_EDITED
    socketRef.current.on(
      'message_edited',
      (data: { _id: string; roomId: string; content: string; editedAt: number; originalContent?: string }) => {
        if (data.roomId === roomId) {
          setMessages((prevMessages) => {
            const updated = prevMessages.map((msg) =>
              msg._id === data._id
                ? {
                    ...msg,
                    content: data.content,
                    editedAt: data.editedAt,
                    originalContent: data.originalContent || msg.originalContent || msg.content,
                  }
                : msg,
            );
            return updated;
          });
        }
      },
    );

    socketRef.current.on('message_recalled', (data: { _id: string; roomId: string }) => {
      if (data.roomId === roomId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg._id === data._id ? { ...msg, isRecalled: true } : msg)),
        );
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, currentUser._id, playMessageSound, showMessageNotification]);

  const handleRecallMessage = async (messageId: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) return;

    try {
      const data = await recallMessageApi(roomId, messageId);

      if (data.success) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isRecalled: true } : m)));

        const socketData = {
          _id: messageId,
          roomId,
          sender: currentUser._id,
          isGroup: isGroup,
          receiver: isGroup ? null : getId(selectedChat),
          members: isGroup ? (selectedChat as GroupConversation).members : [],
          type: 'recall',
          content: 'Tin nhắn đã bị thu hồi',
          timestamp: Date.now(),
        };

        socketRef.current?.emit('recall_message', socketData);
      } else if (data.message) {
        alert('Không thể thu hồi: ' + data.message);
      }
    } catch (error) {
      console.error('Recall error:', error);
    }
  };

  const markAsRead = useCallback(async () => {
    if (!roomId || !currentUser) return;
    try {
      await markAsReadApi(roomId, getId(currentUser));
      markedReadRef.current = roomId;
      if (reLoad) reLoad();
    } catch (error) {
      console.error('Mark as read failed:', error);
    }
  }, [roomId, currentUser, reLoad]);

  // Chỉ gọi markAsRead một lần cho mỗi roomId
  useEffect(() => {
    if (!roomId || !currentUser) return;
    if (markedReadRef.current === roomId) return;
    void markAsRead();
  }, [roomId, currentUser, markAsRead]);

  // Đóng mention menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
    };

    if (showMentionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentionMenu, mentionMenuRef, setShowMentionMenu]);

  const getSenderName = (sender: User | string): string => {
    if (typeof sender === 'object' && sender && 'name' in sender && (sender as User).name) {
      return (sender as User).name as string;
    }
    const id = normalizeId(sender);
    const direct = allUsersMap.get(id);
    if (direct) return direct;
    const asNumber = Number(id);
    if (!Number.isNaN(asNumber)) {
      const numericKey = String(asNumber);
      const val = allUsersMap.get(numericKey);
      if (val) return val;
    }
    return 'Người dùng';
  };

  const handleSendMessage = async () => {
    if (!editableRef.current) return;

    const plainText = getPlainTextFromEditable().trim();
    if (!plainText) return;

    const { mentions, displayText } = parseMentions(plainText);

    const repliedUserName = replyingTo ? getSenderName(replyingTo.sender) : undefined;
    const ALL_MENTION_ID = '__ALL__';

    // Expand mentions: nếu có @all thì thêm toàn bộ member IDs
    const expandedMentionIds = new Set<string>();
    mentions.forEach((id) => {
      if (id === ALL_MENTION_ID) {
        activeMembers.forEach((mem) => {
          const memId = String(mem._id || mem.id || '');
          if (memId) expandedMentionIds.add(memId);
        });
      } else {
        expandedMentionIds.add(id);
      }
    });

    const finalMentions = Array.from(expandedMentionIds);

    const newMsg: MessageCreate = {
      roomId,
      sender: currentUser._id,
      content: displayText,
      type: 'text',
      timestamp: Date.now(),
      replyToMessageId: replyingTo?._id,
      replyToMessageName: repliedUserName,
      mentions: finalMentions.length > 0 ? finalMentions : undefined,
    };

    // Xóa nội dung
    if (editableRef.current) {
      editableRef.current.innerHTML = '';
    }

    await sendMessageProcess(newMsg);
  };
  // 🔥 Helper function để normalize ID
  function normalizeId(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object' && value !== null) {
      if ('_id' in value) return normalizeId(value._id);
      if ('id' in value) return normalizeId(value.id);
    }
    return String(value);
  }

  // 🔥 Helper function để so sánh ID
  function compareIds(id1: unknown, id2: unknown): boolean {
    const normalized1 = normalizeId(id1);
    const normalized2 = normalizeId(id2);

    if (normalized1 === normalized2) return true;

    // So sánh cả dạng number
    const num1 = Number(normalized1);
    const num2 = Number(normalized2);
    if (!isNaN(num1) && !isNaN(num2) && num1 === num2) return true;

    return false;
  }
  const getSenderInfo = (sender: User | string) => {
    const senderId = normalizeId(sender);

    // 1. Check currentUser trước
    if (compareIds(currentUser._id, senderId)) {
      return {
        _id: senderId,
        name: currentUser.name || 'Bạn',
        avatar: currentUser.avatar ?? null,
      };
    }

    // 2. Tìm trong allUsers array
    const foundUser = allUsers.find((u) => compareIds(u._id || u.id, senderId));
    if (foundUser) {
      return {
        _id: senderId,
        name: foundUser.name || 'Người dùng',
        avatar: foundUser.avatar ?? null,
      };
    }

    // 3. Tìm trong activeMembers (cho group chat)
    if (isGroup && Array.isArray(activeMembers)) {
      const foundMember = activeMembers.find((m) => compareIds(m._id || m.id, senderId));
      if (foundMember) {
        return {
          _id: senderId,
          name: foundMember.name || 'Thành viên',
          avatar: foundMember.avatar ?? null,
        };
      }
    }

    // 4. Nếu sender là object có đầy đủ data, dùng luôn
    if (typeof sender === 'object' && sender !== null && 'name' in sender && sender.name) {
      return {
        _id: senderId,
        name: sender.name,
        avatar: sender.avatar ?? null,
      };
    }

    // 5. Fallback cuối cùng - dùng allUsersMap
    const mapName = allUsersMap.get(senderId) || allUsersMap.get(String(Number(senderId)));

    return {
      _id: senderId,
      name: mapName || 'Người dùng',
      avatar: null,
    };
  };
  // Render tin nhắn với highlight mentions
  const renderMessageContent = (content: string, mentionedUserIds?: string[], isMe?: boolean) => {
    if (!content) return null;

    const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, index) => {
      const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (mentionMatch) {
        const [, displayName, userId] = mentionMatch;
        const isMentioningMe = userId === currentUser._id;

        return (
          <span
            key={index}
            className={`font-semibold px-1 rounded ${
              isMentioningMe
                ? 'bg-yellow-300 text-yellow-900'
                : isMe
                  ? 'bg-blue-300 text-blue-900'
                  : 'bg-gray-300 text-gray-900'
            }`}
          >
            @{displayName}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const chatContextValue = useMemo(
    () => ({
      currentUser,
      allUsers,
      selectedChat,
      messages,
      isGroup,
      chatName,
    }),
    [currentUser, allUsers, selectedChat, messages, isGroup, chatName],
  );

  const handleSaveEdit = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    const originalMessage = messages.find((m) => m._id === messageId);
    if (!originalMessage) return;

    const editedAtTimestamp = Date.now();
    const originalContentText = originalMessage.originalContent || originalMessage.content || '';

    // 1. Optimistic Update
    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? { ...m, content: newContent, editedAt: editedAtTimestamp, originalContent: originalContentText }
          : m,
      ),
    );
    setEditingMessageId(null);

    // 2. Gọi API Backend
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'editMessage',
          data: { messageId, newContent },
        }),
      });

      // 3. EMIT SOCKET EVENT
      const socketData = {
        _id: messageId,
        roomId: roomId,
        newContent: newContent,
        editedAt: editedAtTimestamp,
        originalContent: originalContentText,
        sender: currentUser._id,
        senderName: currentUser.name,
        isGroup: isGroup,
        receiver: isGroup ? null : getId(selectedChat),
        members: isGroup ? (selectedChat as GroupConversation).members : [],
      };

      socketRef.current?.emit('edit_message', socketData);
    } catch (e) {
      console.error('❌ [CLIENT] Chỉnh sửa thất bại:', e);
      alert('Lỗi khi lưu chỉnh sửa.');
      setMessages((prev) => prev.map((m) => (m._id === messageId ? originalMessage : m)));
    }
  };

  return (
    <ChatProvider value={chatContextValue}>
      <main className="flex h-full bg-gray-700 sm:overflow-y-hidden overflow-y-auto no-scrollbar">
        <div
          className={`flex flex-col h-full relative z-10 bg-gray-200 transition-all duration-300 ${showPopup ? 'sm:w-[calc(100%-21.875rem)]' : 'w-full'} border-r border-gray-200`}
        >
          <ChatHeader
            chatName={chatName}
            isGroup={isGroup}
            memberCount={memberCount}
            showPopup={showPopup}
            onTogglePopup={() => setShowPopup((prev) => !prev)}
            onOpenMembers={() => {
              if (isGroup) {
                setOpenMember(true);
              } else {
                const partnerId = getId(selectedChat);
                if (partnerId) router.push(`/profile?userId=${partnerId}`);
              }
            }}
            showSearchSidebar={showSearchSidebar}
            onToggleSearchSidebar={() => setShowSearchSidebar((prev) => !prev)}
            avatar={chatAvatar}
            onBackFromChat={onBackFromChat}
            presenceText={!isGroup ? presenceInfo.text : undefined}
            presenceOnline={!isGroup ? presenceInfo.online : undefined}
          />
          <PinnedMessagesSection
            allPinnedMessages={allPinnedMessages}
            showPinnedList={showPinnedList}
            onOpenPinnedList={() => setShowPinnedList(true)}
            onClosePinnedList={() => setShowPinnedList(false)}
            onJumpToMessage={handleJumpToMessage}
            getSenderName={getSenderName}
          />
          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-100 flex flex-col custom-scrollbar"
          >
            {(initialLoading || loadingMore) && (
              <div className="sticky top-0 z-20 flex items-center justify-center py-2">
                <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2" />
                <span className="text-xs text-gray-500">
                  {initialLoading ? 'Đang tải tin nhắn...' : 'Đang tải thêm...'}
                </span>
              </div>
            )}
            <MessageList
              messagesGrouped={messagesGrouped}
              messages={messages}
              currentUser={currentUser}
              allUsersMap={allUsersMap}
              uploadingFiles={uploadingFiles}
              highlightedMsgId={highlightedMsgId}
              isGroup={isGroup}
              onContextMenu={handleContextMenu}
              onReply={handleReplyTo}
              onJumpToMessage={handleJumpToMessage}
              getSenderInfo={getSenderInfo}
              renderMessageContent={renderMessageContent}
              onOpenMedia={(url, type) => setPreviewMedia({ url, type })}
              editingMessageId={editingMessageId}
              setEditingMessageId={setEditingMessageId}
              editContent={editContent}
              setEditContent={setEditContent}
              onSaveEdit={handleSaveEdit}
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Phần Footer (Input Chat) */}
          <div className="bg-white p-0  border-t rounded-t-xl border-gray-200 relative space-y-1">
            {/* ... Popup Picker & Inputs ... */}
            <EmojiStickerPicker
              showEmojiPicker={showEmojiPicker}
              pickerTab={pickerTab}
              setPickerTab={setPickerTab}
              onEmojiClick={(unicode: string) => onEmojiClick({ emoji: unicode } as EmojiClickData)}
              stickers={STICKERS}
              onSelectSticker={handleSendSticker}
            />

            <ReplyBanner replyingTo={replyingTo} getSenderName={getSenderName} onCancel={() => setReplyingTo(null)} />

            {/* Chỉ cho phép mention (@) trong nhóm, không áp dụng cho chat 1-1 */}
            {isGroup && (
              <MentionMenu
                showMentionMenu={showMentionMenu}
                mentionSuggestions={mentionSuggestionsWithAll}
                selectedMentionIndex={selectedMentionIndex}
                mentionMenuRef={mentionMenuRef}
                onSelectMention={selectMention}
              />
            )}

            {/* Thanh loading tổng khi đang tải ảnh / video */}
            {hasUploading && (
              <UploadProgressBar uploadingCount={uploadingCount} overallUploadPercent={overallUploadPercent} />
            )}

            <ChatInput
              showEmojiPicker={showEmojiPicker}
              onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
              isListening={isListening}
              onVoiceInput={handleVoiceInput}
              editableRef={editableRef}
              onInputEditable={handleInputChangeEditable}
              onKeyDownEditable={handleKeyDownCombined}
              onPasteEditable={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
                handleInputChangeEditable();
              }}
              onSendMessage={handleSendMessage}
              onSelectImage={(file) => {
                const isVideo = file.type.startsWith('video/') || isVideoFile(file.name);
                const msgType = isVideo ? 'video' : 'image';
                handleUploadAndSend(file, msgType);
              }}
              onSelectFile={(file) => {
                const isVideo = file.type.startsWith('video/') || isVideoFile(file.name);
                const msgType = isVideo ? 'video' : 'file';
                handleUploadAndSend(file, msgType);
              }}
              onFocusEditable={() => setShowEmojiPicker(false)}
            />
          </div>
        </div>

        {showPopup && (
          <div className="fixed inset-0 sm:static sm:inset-auto sm:w-[21.875rem] h-full z-20 ">
            <ChatInfoPopup
              onClose={() => setShowPopup(false)}
              onShowCreateGroup={onShowCreateGroup}
              onMembersAdded={handleMembersAdded}
              members={activeMembers}
              onMemberRemoved={handleMemberRemoved}
              onRoleChange={handleRoleChange}
              onJumpToMessage={handleJumpToMessage}
              onChatAction={onChatAction}
              reLoad={reLoad}
              onLeftGroup={onBackFromChat}
            />
          </div>
        )}
        {showSearchSidebar && (
          <div className="fixed inset-0 sm:static sm:inset-auto sm:w-[21.875rem] h-full  ">
            <SearchSidebar
              isOpen={showSearchSidebar}
              onClose={() => setShowSearchSidebar(false)}
              roomId={roomId}
              onJumpToMessage={handleJumpToMessage}
              getSenderName={getSenderName}
            />
          </div>
        )}

        {openMember && isGroup && (
          <ModalMembers
            conversationId={selectedChat._id}
            currentUser={currentUser}
            reLoad={reLoad}
            isOpen={openMember}
            onClose={() => setOpenMember(false)}
            members={activeMembers}
            groupName={chatName}
            allUsers={allUsers}
            onMembersAdded={handleMembersAdded}
            onMemberRemoved={handleMemberRemoved}
            onRoleChange={handleRoleChange}
          />
        )}

        {contextMenu && contextMenu.visible && (
          <MessageContextMenu
            contextMenu={contextMenu}
            currentUserId={String(currentUser._id)}
            onClose={closeContextMenu}
            onPinMessage={handlePinMessage}
            onRecallMessage={handleRecallMessage}
            setEditingMessageId={setEditingMessageId}
            setEditContent={setEditContent}
            closeContextMenu={closeContextMenu}
          />
        )}

        <MediaPreviewModal
          media={previewMedia}
          chatName={chatName}
          isGroup={isGroup}
          onClose={() => setPreviewMedia(null)}
        />
      </main>
    </ChatProvider>
  );
}
