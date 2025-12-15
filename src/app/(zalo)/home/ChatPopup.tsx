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
  updateMessageApi,
} from '@/fetch/messages';
import SearchSidebar from '@/components/(chatPopup)/SearchMessageModal';
import { isVideoFile, resolveSocketUrl, getProxyUrl } from '@/utils/utils';
import ModalCall from '@/components/(call)/ModalCall';
import { insertTextAtCursor } from '@/utils/chatInput';
import { groupMessagesByDate } from '@/utils/chatMessages';
import { ChatProvider } from '@/context/ChatContext';
import { useRouter } from 'next/navigation';
import ShareMessageModal from '@/components/(chatPopup)/ShareMessageModal';
import { stopGlobalRingTone } from '@/utils/callRing';
import { useCallSession } from '@/hooks/useCallSession';
import IncomingCallModal from '@/components/(call)/IncomingCallModal';

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/9408/9408176.png',
  'https://cdn-icons-png.flaticon.com/512/9408/9408201.png',
];

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
  groups: GroupConversation[];
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
  groups,
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
  const isAtBottomRef = useRef(true);
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
  const [attachments, setAttachments] = useState<
    { file: File; type: 'image' | 'video' | 'file'; previewUrl: string; fileName?: string }[]
  >([]);
  const reminderScheduledIdsRef = useRef<Set<string>>(new Set());
  const reminderTimersByIdRef = useRef<Map<string, number>>(new Map());
  const messagesRef = useRef<Message[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [messageToShare, setMessageToShare] = useState<Message | null>(null);
  const [callTicker, setCallTicker] = useState(0);
  const getOneToOneRoomId = (user1Id: string | number, user2Id: string | number) => {
    return [user1Id, user2Id].sort().join('_');
  };
  const roomId = isGroup ? getId(selectedChat) : getOneToOneRoomId(getId(currentUser), getId(selectedChat));
  const {
    callActive,
    callType,
    callStartAt,
    callConnecting,
    remoteStreamsState,
    incomingCall,
    localVideoRef,
    startCall: startCall_s2,
    endCall: endCall_s2,
    toggleMic: toggleMic_s2,
    toggleCamera: toggleCamera_s2,
    acceptIncomingCall: acceptIncomingCall_s2,
    acceptIncomingCallWith: acceptIncomingCallWith_s2,
    setIncomingCall: setIncomingCall_s2,
    micEnabled,
    camEnabled,
    roomCallActive,
    roomCallType,
    roomParticipants,
    activeRoomId,
    counterpartId,
  } = useCallSession({
    socketRef,
    roomId,
    currentUserId: String(currentUser._id),
    isGroup,
    selectedChat,
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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
          setTimeout(() => {
            const el = messagesContainerRef.current;
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          }, 0);
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

  const startCall = useCallback(
    async (type: 'voice' | 'video') => {
      await startCall_s2(type);
    },
    [startCall_s2],
  );

  const endCall = useCallback(
    (source: 'local' | 'remote' = 'local') => {
      endCall_s2(source);
    },
    [endCall_s2],
  );

  const toggleMic = useCallback(() => {
    toggleMic_s2();
  }, [toggleMic_s2]);

  const toggleCamera = useCallback(() => {
    toggleCamera_s2();
  }, [toggleCamera_s2]);

  const handleVoiceCall = useCallback(() => {
    void startCall('voice');
  }, [startCall]);

  const handleVideoCall = useCallback(() => {
    void startCall('video');
  }, [startCall]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const d = (e as CustomEvent).detail || {};
        const t = d.type === 'video' ? 'video' : 'voice';
        void startCall(t);
      } catch {}
    };
    window.addEventListener('startCall', handler as EventListener);
    return () => window.removeEventListener('startCall', handler as EventListener);
  }, [startCall]);

  useEffect(() => {
    if (!callActive) return;
    const id = window.setInterval(() => setCallTicker((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [callActive]);

  const [callModalSize, setCallModalSize] = useState<{ w: number; h: number | null }>({ w: 320, h: null });
  const callModalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const v = callType === 'video';
    let w = 320;
    let h: number | null = null;
    try {
      const raw = localStorage.getItem('callModalSize');
      const s = raw ? JSON.parse(raw) : null;
      if (s && typeof s.w === 'number') w = s.w;
      if (s && typeof s.h === 'number') h = s.h;
    } catch {}
    const maxW = Math.max(320, window.innerWidth - 64);
    const maxH = Math.max(200, window.innerHeight - 64);
    if (v) {
      w = Math.max(w, 640);
      h = h == null ? 420 : h;
    }
    w = Math.min(Math.max(w, 320), maxW);
    h = h == null ? null : Math.min(Math.max(h, 200), maxH);
    setCallModalSize({ w, h });
  }, [callActive, callConnecting, incomingCall, callType]);
  useEffect(() => {
    const el = callModalRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const maxW = Math.max(320, window.innerWidth - 64);
      const maxH = Math.max(200, window.innerHeight - 64);
      const w = Math.min(Math.max(Math.round(r.width), 320), maxW);
      const h = Math.min(Math.max(Math.round(r.height), 200), maxH);
      try {
        localStorage.setItem('callModalSize', JSON.stringify({ w, h }));
      } catch {}
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [callActive, callConnecting, incomingCall]);

  // Ring tone handled inside useCallSession

  const sendNotifyMessage = useCallback(
    async (text: string, replyToMessageId?: string) => {
      const newMsg: MessageCreate = {
        roomId: roomId,
        sender: currentUser._id,
        content: text,
        type: 'notify',
        timestamp: Date.now(),
        replyToMessageId,
      };
      await sendMessageProcess(newMsg);
    },
    [roomId, currentUser._id, sendMessageProcess],
  );

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const end = messagesEndRef.current;
    if (end && typeof end.scrollIntoView === 'function') {
      end.scrollIntoView({ block: 'end' });
    }
  }, []);

  const { uploadingFiles, handleUploadAndSend } = useChatUpload({
    roomId,
    currentUser,
    selectedChat,
    isGroup,
    sendMessageProcess,
    setMessages,
    onScrollBottom: scrollToBottom,
  });
  const uploadingValues = Object.values(uploadingFiles);
  const hasUploading = uploadingValues.length > 0;
  const overallUploadPercent = hasUploading
    ? uploadingValues.reduce((sum, v) => sum + v, 0) / uploadingValues.length
    : 0;
  const uploadingCount = uploadingValues.length;

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const latest = messages[messages.length - 1];
    const mine = latest && String(latest.sender) === String(currentUser._id);
    const should = mine || uploadingCount > 0;
    if (!should) return;
    scrollToBottom();
    setTimeout(scrollToBottom, 0);
    setTimeout(scrollToBottom, 250);
  }, [messages.length, uploadingCount, currentUser._id, scrollToBottom]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const imgs = Array.from(el.querySelectorAll('img'));
    const handler = () => {
      scrollToBottom();
    };
    imgs.forEach((img) => img.addEventListener('load', handler, { once: true }));
    return () => {
      imgs.forEach((img) => img.removeEventListener('load', handler));
    };
  }, [messages.length, scrollToBottom]);

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
      name: 'All',
      avatar: undefined,
    } as User;

    // Tránh trùng nếu đã có trong list
    if (mentionSuggestions.some((u) => (u as User)._id === ALL_MENTION_ID)) return mentionSuggestions;

    return [...mentionSuggestions, allOption];
  }, [isGroup, mentionSuggestions]);

  // Kết hợp keydown: vừa xử lý mention menu, vừa gửi tin nhắn với Enter
  const handleKeyDownCombined = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Đầu tiên cho hook xử lý (ArrowUp/Down, Enter để chọn mention, Escape...)
    handleKeyDownEditable(e);

    // Nếu mention menu đang mở, không xử lý gửi tin nhắn
    if (showMentionMenu) return;

    const el = editableRef.current;
    if (!el) return;
    const plain = String(el.innerText || '');
    const trimmed = plain.trim();

    // Toggle Chat nhanh theo '/key'
    if (e.key === 'Enter' && !e.shiftKey && trimmed === '/key') {
      e.preventDefault();
      try {
        localStorage.setItem(`chatFlashEnabled:${roomId}`, 'true');
      } catch {}
      el.innerText = '';
      handleInputChangeEditable();
      return;
    }
    if (e.key === ' ' && trimmed === '/key') {
      try {
        localStorage.setItem(`chatFlashEnabled:${roomId}`, 'false');
      } catch {}
    }

    // Enter (không Shift) để gửi tin nhắn
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      let expanded = plain;
      try {
        const activeRaw = localStorage.getItem(`chatFlashActiveFolder:${roomId}`);
        const active = activeRaw ? JSON.parse(activeRaw) : null;
        const fid = active?.id;
        const enabled = localStorage.getItem(`chatFlashEnabled:${roomId}`) === 'true';
        if (fid && enabled) {
          const kvRaw = localStorage.getItem(`chatFlashKV:${roomId}:${fid}`);
          const arr = kvRaw ? JSON.parse(kvRaw) : [];
          const map = new Map<string, string>(
            (Array.isArray(arr) ? arr : []).map((x: { key: string; value: string }) => [
              String(x.key),
              String(x.value),
            ]),
          );
          expanded = String(expanded).replace(/(^|\s)\/\s*([\w-]+)/g, (m: string, p1: string, k: string) => {
            const v = map.get(k);
            return v != null ? p1 + v : m;
          });
        }
      } catch {}

      if (expanded !== plain) {
        el.innerText = expanded;
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {}
        handleInputChangeEditable();
        return;
      }
      void handleSendMessage();
    }
  };

  // ✅ FIXED VERSION - Đặt trong ChatWindow.tsx

  const handleToggleReaction = useCallback(
    async (msg: Message, emoji: string) => {
      const myId = String(currentUser._id);
      const old = (msg.reactions || {}) as Record<string, string[]>;

      // Clean up và toggle reaction
      const cleaned: Record<string, string[]> = Object.fromEntries(
        Object.entries(old).map(([k, arr]) => [k, (Array.isArray(arr) ? arr : []).filter((id) => String(id) !== myId)]),
      );

      const had = Array.isArray(old[emoji]) && old[emoji].includes(myId);
      const next: Record<string, string[]> = { ...cleaned };
      const arr = Array.isArray(next[emoji]) ? next[emoji] : [];
      next[emoji] = had ? arr.filter((id) => String(id) !== myId) : [...arr, myId];

      // 1. ✅ Optimistic Update UI ngay lập tức
      setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? { ...m, reactions: next } : m)));

      // 2. ✅ Tạo payload đầy đủ cho socket
      const socketPayload = {
        _id: msg._id,
        roomId,
        reactions: next,
        // Thêm thông tin để server có thể broadcast đầy đủ
        sender: currentUser._id,
        senderName: currentUser.name,
        isGroup: isGroup,
        receiver: isGroup ? null : getId(selectedChat),
        members: isGroup ? (selectedChat as GroupConversation).members : [],
      };

      // 3. ✅ Emit socket với error handling tốt hơn
      try {
        if (socketRef.current?.connected) {
          socketRef.current.emit('toggle_reaction', socketPayload);
        } else {
          // Fallback: reconnect và emit
          const tempSocket = io(resolveSocketUrl(), {
            transports: ['websocket'],
            withCredentials: false,
          });

          tempSocket.on('connect', () => {
            tempSocket.emit('toggle_reaction', socketPayload);
            setTimeout(() => tempSocket.disconnect(), 500);
          });
        }
      } catch (error) {
        console.error('❌ Socket emit error:', error);
      }

      // 4. ✅ Gọi API để persist vào DB
      try {
        await updateMessageApi(String(msg._id), { reactions: next });
      } catch (error) {
        console.error('❌ API update error:', error);

        // Rollback nếu API fail
        setMessages((prev) => prev.map((m) => (String(m._id) === String(msg._id) ? { ...m, reactions: old } : m)));
      }
    },
    [currentUser._id, currentUser.name, roomId, isGroup, selectedChat],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = 200;
    let x = rect.left + (rect.width - menuWidth) / 2;
    x = Math.min(Math.max(x, 8), window.innerWidth - menuWidth - 8);
    let yBelow = rect.bottom + 8;
    let placement: 'above' | 'below' = 'below';
    if (yBelow + menuHeight > window.innerHeight - 8) {
      placement = 'above';
      yBelow = rect.top - menuHeight - 8;
    }
    const y = yBelow;
    setContextMenu({
      visible: true,
      x,
      y,
      placement,
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
    if (!contextMenu?.visible) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const closeOnScroll = () => {
      closeContextMenu();
    };
    container.addEventListener('scroll', closeOnScroll, { passive: true });
    return () => container.removeEventListener('scroll', closeOnScroll);
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
        setAllPinnedMessages((prev) => {
          const updatedMsg = { ...message, isPinned: newPinnedStatus, editedAt: Date.now() } as Message;
          const withoutDup = prev.filter((m) => String(m._id) !== String(message._id));
          return newPinnedStatus ? [updatedMsg, ...withoutDup] : withoutDup;
        });

        // 2.2. Bắn socket ngay để cập nhật realtime cho tất cả client
        socketRef.current?.emit('edit_message', {
          _id: message._id,
          roomId,
          isPinned: newPinnedStatus,
        });

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
        } else if (message.type === 'poll') {
          notificationText = `${senderName} ${action} một bình chọn.`;
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
      const bottomGap = el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = bottomGap <= SCROLL_BUMP_PX;
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [loadMoreMessages]);

  const handleReplyTo = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const handleJumpToMessage = useCallback(
    async (messageId: string) => {
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
            readMessagesApi(roomId, {
              limit: olderLimit,
              sortOrder: 'desc',
              extraFilters: { timestamp: { $lte: targetTs } },
            }),
            readMessagesApi(roomId, {
              limit: newerLimit,
              sortOrder: 'asc',
              extraFilters: { timestamp: { $gt: targetTs } },
            }),
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
    },
    [roomId, messages, oldestTs],
  );

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

    socketRef.current = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
    socketRef.current.emit('join_room', roomId);
    socketRef.current.emit('join_user', { userId: String(currentUser._id) });

    socketRef.current.on('receive_message', (data: Message) => {
      if (String(data.roomId) !== String(roomId)) return;
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
      const shouldScroll = data.sender === currentUser._id || isAtBottomRef.current;
      if (shouldScroll) {
        setTimeout(() => {
          const el = messagesContainerRef.current;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        }, 0);
      }
    });

    socketRef.current.on(
      'reaction_updated',
      (data: { _id: string; roomId: string; reactions: Record<string, string[]> }) => {
        if (String(data.roomId) === String(roomId)) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              String(msg._id) === String(data._id)
                ? {
                    ...msg,
                    reactions: data.reactions, // ✅ Update reactions
                  }
                : msg,
            ),
          );
        }
      },
    );

    // 🔥 LISTENER CHO edit_message
    socketRef.current.on(
      'edit_message',
      (data: {
        _id: string;
        roomId: string;
        content?: string;
        editedAt: number;
        originalContent?: string;
        reminderAt?: number;
        reminderNote?: string;
        pollQuestion?: string;
        pollOptions?: string[];
        pollVotes?: Record<string, string[]>;
        isPollLocked?: boolean;
        pollLockedAt?: number;
        timestamp?: number;
        isPinned?: boolean;
        reactions?: Record<string, string[]>;
      }) => {
        if (String(data.roomId) === String(roomId)) {
          setMessages((prevMessages) => {
            const updated = prevMessages.map((msg) =>
              String(msg._id) === String(data._id)
                ? {
                    ...msg,
                    content: data.content ?? msg.content,
                    editedAt: data.editedAt,
                    originalContent: data.originalContent || msg.originalContent || msg.content,
                    reminderAt: data.reminderAt ?? msg.reminderAt,
                    reminderNote: data.reminderNote ?? msg.reminderNote,
                    pollQuestion: data.pollQuestion ?? msg.pollQuestion,
                    pollOptions: data.pollOptions ?? msg.pollOptions,
                    pollVotes: data.pollVotes ?? msg.pollVotes,
                    isPollLocked: data.isPollLocked ?? msg.isPollLocked,
                    pollLockedAt: data.pollLockedAt ?? msg.pollLockedAt,
                    timestamp: data.timestamp ?? msg.timestamp,
                    isPinned: typeof data.isPinned === 'boolean' ? data.isPinned : msg.isPinned,
                    reactions: data.reactions ?? msg.reactions,
                  }
                : msg,
            );
            const sorted = [...updated].sort(
              (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            );
            return sorted;
          });
          if (typeof data.isPinned === 'boolean') {
            setAllPinnedMessages((prev) => {
              const latest = messagesRef.current.find((m) => String(m._id) === String(data._id));
              const updatedMsg = latest
                ? ({
                    ...latest,
                    content: data.content ?? latest.content,
                    pollQuestion: data.pollQuestion ?? latest.pollQuestion,
                    pollOptions: data.pollOptions ?? latest.pollOptions,
                    pollVotes: data.pollVotes ?? latest.pollVotes,
                    isPollLocked: data.isPollLocked ?? latest.isPollLocked,
                    pollLockedAt: data.pollLockedAt ?? latest.pollLockedAt,
                    timestamp: data.timestamp ?? latest.timestamp,
                    editedAt: data.editedAt ?? latest.editedAt,
                    isPinned: data.isPinned,
                  } as Message)
                : ({
                    _id: data._id as unknown as string,
                    roomId,
                    sender: currentUser._id as unknown as string,
                    content: data.content || '',
                    type: 'text',
                    timestamp: data.timestamp || Date.now(),
                    editedAt: data.editedAt || Date.now(),
                    isPinned: data.isPinned,
                  } as Message);
              const withoutDup = prev.filter((m) => String(m._id) !== String(data._id));
              return data.isPinned ? [updatedMsg, ...withoutDup] : withoutDup;
            });
          }
          const idStr = String(data._id);
          const t = reminderTimersByIdRef.current.get(idStr);
          if (t) {
            clearTimeout(t);
            reminderTimersByIdRef.current.delete(idStr);
            reminderScheduledIdsRef.current.delete(idStr);
          }
          const now = Date.now();
          const at = typeof data.reminderAt === 'number' ? (data.reminderAt as number) : undefined;
          if (typeof at === 'number') {
            const delay = Math.max(0, at - now);
            const timerId = window.setTimeout(async () => {
              const latest = messagesRef.current.find((x) => String(x._id) === idStr);
              if (!latest || latest.isRecalled) {
                reminderScheduledIdsRef.current.delete(idStr);
                const old = reminderTimersByIdRef.current.get(idStr);
                if (old) {
                  clearTimeout(old);
                  reminderTimersByIdRef.current.delete(idStr);
                }
                return;
              }
              let latestAt = (latest as Message & { reminderAt?: number }).reminderAt || latest.timestamp;
              try {
                const r = await fetch('/api/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'getById', _id: latest._id }),
                });
                const j = await r.json();
                const srv = (j && (j.row?.row || j.row)) as Message | undefined;
                const srvAt = srv && (srv as Message & { reminderAt?: number }).reminderAt;
                if (typeof srvAt === 'number') {
                  latestAt = srvAt;
                }
              } catch {}
              const now3 = Date.now();
              if (latestAt > now3) {
                const newDelay = Math.max(0, latestAt - now3);
                const newTimer = window.setTimeout(async () => {
                  const latest2 = messagesRef.current.find((x) => String(x._id) === idStr);
                  if (!latest2 || latest2.isRecalled) {
                    reminderScheduledIdsRef.current.delete(idStr);
                    const t2 = reminderTimersByIdRef.current.get(idStr);
                    if (t2) {
                      clearTimeout(t2);
                      reminderTimersByIdRef.current.delete(idStr);
                    }
                    return;
                  }
                  const latestAt2 = (latest2 as Message & { reminderAt?: number }).reminderAt || latest2.timestamp;
                  const timeStr2 = new Date(latestAt2).toLocaleString('vi-VN');
                  try {
                    const res2 = await fetch('/api/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'update',
                        field: '_id',
                        value: latest2._id,
                        data: { reminderFired: true },
                      }),
                    });
                    const json2 = await res2.json();
                    if (json2?.success) {
                      await sendNotifyMessage(
                        `Đến giờ lịch hẹn: "${latest2.content || ''}" lúc ${timeStr2}`,
                        String(latest2._id),
                      );
                    }
                  } catch {}
                  reminderScheduledIdsRef.current.delete(idStr);
                  reminderTimersByIdRef.current.delete(idStr);
                }, newDelay);
                reminderTimersByIdRef.current.set(idStr, newTimer);
                return;
              }
              const timeStr = new Date(latestAt).toLocaleString('vi-VN');
              try {
                const res = await fetch('/api/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update',
                    field: '_id',
                    value: latest._id,
                    data: { reminderFired: true },
                  }),
                });
                const json = await res.json();
                if (json?.success) {
                  await sendNotifyMessage(
                    `Đến giờ lịch hẹn: "${latest.content || ''}" lúc ${timeStr}`,
                    String(latest._id),
                  );
                }
              } catch {}
              reminderScheduledIdsRef.current.delete(idStr);
              reminderTimersByIdRef.current.delete(idStr);
            }, delay);
            reminderTimersByIdRef.current.set(idStr, timerId);
            reminderScheduledIdsRef.current.add(idStr);
          }
          // Không re-fetch để tránh reload, cập nhật cục bộ qua socket
        }
      },
    );

    socketRef.current.on(
      'edit_message',
      (data: {
        _id: string;
        roomId: string;
        newContent?: string;
        content?: string;
        editedAt: number;
        originalContent?: string;
        timestamp?: number;
      }) => {
        if (String(data.roomId) === String(roomId)) {
          setMessages((prevMessages) => {
            const updated = prevMessages.map((msg) =>
              String(msg._id) === String(data._id)
                ? {
                    ...msg,
                    content: data.newContent ?? data.content ?? msg.content,
                    editedAt: data.editedAt,
                    originalContent: data.originalContent || msg.originalContent || msg.content,
                    timestamp: typeof data.timestamp === 'number' ? data.timestamp : msg.timestamp,
                  }
                : msg,
            );
            return updated;
          });
          const idStr = String(data._id);
          const t = reminderTimersByIdRef.current.get(idStr);
          if (t) {
            clearTimeout(t);
            reminderTimersByIdRef.current.delete(idStr);
            reminderScheduledIdsRef.current.delete(idStr);
          }
          // Không re-fetch để tránh reload, cập nhật cục bộ qua socket
        }
      },
    );

    socketRef.current.on('message_recalled', (data: { _id: string; roomId: string }) => {
      if (data.roomId === roomId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg._id === data._id ? { ...msg, isRecalled: true } : msg)),
        );
        const idStr = String(data._id);
        const t = reminderTimersByIdRef.current.get(idStr);
        if (t) {
          clearTimeout(t);
          reminderTimersByIdRef.current.delete(idStr);
          reminderScheduledIdsRef.current.delete(idStr);
        }
        // Không re-fetch để tránh reload, cập nhật cục bộ qua socket
      }
    });

    socketRef.current.on('message_deleted', (data: { _id: string; roomId: string }) => {
      if (data.roomId === roomId) {
        setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== data._id));
        const idStr = String(data._id);
        const t = reminderTimersByIdRef.current.get(idStr);
        if (t) {
          clearTimeout(t);
          reminderTimersByIdRef.current.delete(idStr);
        }
        reminderScheduledIdsRef.current.delete(idStr);
        void fetchMessages();
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, currentUser._id, playMessageSound, showMessageNotification, fetchMessages, sendNotifyMessage]);

  const endCallRef = useRef<((source: 'local' | 'remote') => void) | null>(null);

  // Socket call events handled inside useCallSession

  // Ring tone handled inside useCallSession

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('pendingIncomingCall') : null;
      if (!raw) return;
      if (incomingCall || callActive || callConnecting) return;
      const data = JSON.parse(raw) as {
        roomId: string;
        from: string;
        type: 'voice' | 'video';
        sdp: RTCSessionDescriptionInit;
      };
      if (!data || String(data.roomId) !== String(roomId)) return;
      localStorage.removeItem('pendingIncomingCall');

      (async () => {
        await acceptIncomingCallWith_s2({
          from: String(data.from),
          type: data.type,
          roomId: String(data.roomId),
          sdp: data.sdp,
        });
      })();
    } catch {}
  }, [roomId, incomingCall, callActive, callConnecting, acceptIncomingCallWith_s2]);
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
          content: 'đã thu hồi tin nhắn',
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const hasAtt = attachments.length > 0;
    if (!plainText && !hasAtt) return;

    const { mentions, displayText } = parseMentions(plainText);
    let expandedText = displayText;
    try {
      const activeRaw = localStorage.getItem(`chatFlashActiveFolder:${roomId}`);
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      const fid = active?.id;
      const enabled = localStorage.getItem(`chatFlashEnabled:${roomId}`) === 'true';
      if (fid && enabled) {
        const kvRaw = localStorage.getItem(`chatFlashKV:${roomId}:${fid}`);
        const arr = kvRaw ? JSON.parse(kvRaw) : [];
        const map = new Map<string, string>(
          (Array.isArray(arr) ? arr : []).map((x: { key: string; value: string }) => [String(x.key), String(x.value)]),
        );
        expandedText = String(expandedText).replace(/(^|\s)\/([\w-]+)/g, (m: string, p1: string, k: string) => {
          const v = map.get(k);
          return v != null ? p1 + v : m;
        });
      }
    } catch {}

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

    if (editableRef.current) {
      editableRef.current.innerHTML = '';
    }

    if (plainText) {
      const textMsg: MessageCreate = {
        roomId,
        sender: currentUser._id,
        content: expandedText,
        type: 'text',
        timestamp: Date.now(),
        replyToMessageId: replyingTo?._id,
        replyToMessageName: repliedUserName,
        mentions: finalMentions.length > 0 ? finalMentions : undefined,
      };
      await sendMessageProcess(textMsg);
    }

    if (hasAtt) {
      const limit = 2;
      const queue = attachments.slice();
      const worker = async () => {
        while (queue.length > 0) {
          const att = queue.shift();
          if (!att) break;
          await handleUploadAndSend(att.file, att.type, undefined, replyingTo?._id, undefined);
        }
      };
      const workers: Promise<void>[] = [];
      for (let i = 0; i < Math.min(limit, attachments.length); i++) workers.push(worker());
      await Promise.all(workers);
      setAttachments((prev) => {
        prev.forEach((a) => {
          try {
            URL.revokeObjectURL(a.previewUrl);
          } catch {}
        });
        return [];
      });
    }
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
  // Render tin nhắn với highlight mentions + link clickable
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
            key={`m-${index}`}
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

      const linkRegex = /(https?:\/\/|www\.)\S+/gi;
      const nodes: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const text = part;
      while ((match = linkRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (start > lastIndex) {
          nodes.push(<span key={`t-${index}-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
        }
        const url = match[0];
        const href = url.startsWith('http') ? url : `https://${url}`;
        nodes.push(
          <a
            key={`a-${index}-${start}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {url}
          </a>,
        );
        lastIndex = end;
      }
      if (lastIndex < text.length) {
        nodes.push(<span key={`t-${index}-${lastIndex}-end`}>{text.slice(lastIndex)}</span>);
      }
      return <React.Fragment key={`p-${index}`}>{nodes}</React.Fragment>;
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

  const handleShareMessage = useCallback((message: Message) => {
    setMessageToShare(message);
    setShowShareModal(true);
  }, []);

  const handleShareToRooms = useCallback(
    async (targetRoomIds: string[], message: Message) => {
      try {
        // Tạo nội dung tin nhắn share
        let shareContent = '';
        const originalSenderName = getSenderName(message.sender);

        if (message.type === 'text') {
          shareContent = message.content || '';
        }
        const safeGroups = Array.isArray(groups) ? groups : [];
        // Gửi tin nhắn đến từng room
        for (const targetRoomId of targetRoomIds) {
          const isGroupChat = safeGroups.some((g) => String(g._id) === String(targetRoomId));

          const newMsg: MessageCreate = {
            roomId: targetRoomId,
            sender: currentUser._id,
            type: message.type,
            content: message.type === 'text' ? shareContent : message.content,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            timestamp: Date.now(),
            // Thêm metadata về shared message
            sharedFrom: {
              messageId: String(message._id),
              originalSender: originalSenderName,
              originalRoomId: String(message.roomId),
            },
          };

          // Gọi API tạo tin nhắn
          const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              data: newMsg,
            }),
          });

          const json = await res.json();

          if (json.success && typeof json._id === 'string') {
            // Emit socket
            const sockBase = isGroupChat
              ? {
                  roomId: targetRoomId,
                  sender: currentUser._id,
                  senderName: currentUser.name,
                  isGroup: true,
                  receiver: null,
                  members: safeGroups.find((g) => String(g._id) === String(targetRoomId))?.members || [],
                }
              : {
                  roomId: targetRoomId,
                  sender: currentUser._id,
                  senderName: currentUser.name,
                  isGroup: false,
                  receiver: targetRoomId.split('_').find((id) => id !== String(currentUser._id)),
                  members: [],
                };

            socketRef.current?.emit('send_message', {
              ...sockBase,
              ...newMsg,
              _id: json._id,
            });
          }
        }
      } catch (error) {
        console.error('Share message error:', error);
        throw error;
      }
    },
    [currentUser, groups, getSenderName],
  );

  return (
    <ChatProvider value={chatContextValue}>
      <main className="flex h-full bg-gray-700 sm:overflow-y-hidden overflow-y-auto no-scrollbar">
        <div
          className={`flex flex-col h-full relative z-10 bg-gray-100 transition-all duration-300 ${showPopup ? 'sm:w-[calc(100%-21.875rem)]' : 'w-full'} border-r border-gray-200`}
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
                if (partnerId) router.push(`/profile/${partnerId}`);
              }
            }}
            showSearchSidebar={showSearchSidebar}
            onToggleSearchSidebar={() => setShowSearchSidebar((prev) => !prev)}
            avatar={chatAvatar}
            onBackFromChat={onBackFromChat}
            presenceText={!isGroup ? presenceInfo.text : undefined}
            presenceOnline={!isGroup ? presenceInfo.online : undefined}
            onVoiceCall={handleVoiceCall}
            onVideoCall={handleVideoCall}
          />
          <PinnedMessagesSection
            allPinnedMessages={allPinnedMessages}
            showPinnedList={showPinnedList}
            onOpenPinnedList={() => setShowPinnedList(true)}
            onClosePinnedList={() => setShowPinnedList(false)}
            onJumpToMessage={handleJumpToMessage}
            getSenderName={getSenderName}
            onUnpinMessage={handlePinMessage}
          />

          {isGroup && !callActive && !callConnecting && roomCallActive && (
            <div className="mx-2 mt-2 mb-0 px-3 py-2 bg-yellow-100 border border-yellow-200 text-yellow-800 rounded flex items-center justify-between">
              <span>Cuộc gọi đang diễn ra</span>
              <button
                className="px-3 py-1 rounded bg-yellow-300 hover:bg-yellow-400 hover:cursor-pointer"
                onClick={() => void startCall(roomCallType === 'video' ? 'video' : 'voice')}
              >
                Tham gia
              </button>
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-4 bg-gray-100 flex flex-col custom-scrollbar"
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
              onReplyMessage={handleReplyTo}
              onJumpToMessage={handleJumpToMessage}
              getSenderInfo={getSenderInfo}
              renderMessageContent={renderMessageContent}
              onOpenMedia={(url, type) => setPreviewMedia({ url, type })}
              editingMessageId={editingMessageId}
              setEditingMessageId={setEditingMessageId}
              editContent={editContent}
              setEditContent={setEditContent}
              onSaveEdit={handleSaveEdit}
              onRefresh={fetchMessages}
              onPinMessage={handlePinMessage}
              onToggleReaction={handleToggleReaction}
              contextMenu={contextMenu}
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
                const items = Array.from(e.clipboardData?.items || []);
                const fileItems = items.filter(
                  (it) => it.kind === 'file' && (it.type.startsWith('image/') || it.type.startsWith('video/')),
                );
                if (fileItems.length > 0) {
                  e.preventDefault();
                  fileItems.forEach((it) => {
                    const f = it.getAsFile();
                    if (f) {
                      const isVid = f.type.startsWith('video/') || isVideoFile(f.name);
                      const isImg = f.type.startsWith('image/');
                      const t = isVid ? 'video' : isImg ? 'image' : 'file';
                      const url = URL.createObjectURL(f);
                      setAttachments((prev) => [...prev, { file: f, type: t, previewUrl: url, fileName: f.name }]);
                    }
                  });
                  return;
                }
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
                handleInputChangeEditable();
              }}
              onSendMessage={handleSendMessage}
              onSelectImage={(file) => {
                const isVideo = file.type.startsWith('video/') || isVideoFile(file.name);
                const msgType = isVideo ? 'video' : 'image';
                const url = URL.createObjectURL(file);
                setAttachments((prev) => [...prev, { file, type: msgType, previewUrl: url, fileName: file.name }]);
              }}
              onSelectFile={(file) => {
                const isVideo = file.type.startsWith('video/') || isVideoFile(file.name);
                const msgType = isVideo ? 'video' : 'file';
                const url = URL.createObjectURL(file);
                setAttachments((prev) => [...prev, { file, type: msgType, previewUrl: url, fileName: file.name }]);
              }}
              onAttachFromFolder={async (att) => {
                const remoteUrl = getProxyUrl(att.url);
                const name =
                  att.fileName || (att.type === 'image' ? 'image.jpg' : att.type === 'video' ? 'video.mp4' : 'file');
                const placeholder = new File([new Blob([])], name, { type: 'application/octet-stream' });
                const placeholderItem = { file: placeholder, type: att.type, previewUrl: remoteUrl, fileName: name };
                setAttachments((prev) => [...prev, placeholderItem]);
                try {
                  const res = await fetch(remoteUrl);
                  const blob = await res.blob();
                  const mime =
                    blob.type ||
                    (att.type === 'image'
                      ? 'image/jpeg'
                      : att.type === 'video'
                        ? 'video/mp4'
                        : 'application/octet-stream');
                  const realFile = new File([blob], name, { type: mime });
                  const previewUrl = URL.createObjectURL(blob);
                  setAttachments((prev) =>
                    prev.map((item) =>
                      item.previewUrl === remoteUrl
                        ? { file: realFile, type: att.type, previewUrl, fileName: name }
                        : item,
                    ),
                  );
                } catch {}
              }}
              onFocusEditable={() => setShowEmojiPicker(false)}
              attachments={attachments.map((a) => ({ previewUrl: a.previewUrl, type: a.type, fileName: a.fileName }))}
              onRemoveAttachment={(index) => {
                setAttachments((prev) => {
                  const next = [...prev];
                  const [removed] = next.splice(index, 1);
                  if (removed) {
                    try {
                      URL.revokeObjectURL(removed.previewUrl);
                    } catch {}
                  }
                  return next;
                });
              }}
              onClearAttachments={() => {
                setAttachments((prev) => {
                  prev.forEach((a) => {
                    try {
                      URL.revokeObjectURL(a.previewUrl);
                    } catch {}
                  });
                  return [];
                });
              }}
            />
          </div>
        </div>

        {showPopup && (
          <div className="fixed inset-0 sm:static sm:inset-auto sm:w-[21.875rem] h-full z-10 ">
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
              onRefresh={fetchMessages}
              sendNotifyMessage={(text) => sendNotifyMessage(text)}
            />
          </div>
        )}
        {showSearchSidebar && (
          <div className="fixed inset-0 sm:static sm:inset-auto sm:w-[21.875rem] h-full z-20 ">
            <SearchSidebar
              isOpen={showSearchSidebar}
              onClose={() => setShowSearchSidebar(false)}
              roomId={roomId}
              onJumpToMessage={handleJumpToMessage}
              getSenderName={getSenderName}
            />
          </div>
        )}

        {showShareModal && messageToShare && (
          <ShareMessageModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false);
              setMessageToShare(null);
            }}
            message={messageToShare}
            currentUser={currentUser}
            allUsers={allUsers}
            groups={groups}
            onShare={handleShareToRooms}
          />
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
            onReplyMessage={handleReplyTo}
            onShareMessage={handleShareMessage}
          />
        )}

        <MediaPreviewModal
          media={previewMedia}
          chatName={chatName}
          isGroup={isGroup}
          roomId={roomId}
          onClose={() => setPreviewMedia(null)}
        />

        {(callActive || incomingCall || callConnecting) && (
          <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center">
            <div
              ref={callModalRef}
              className="bg-white rounded-xl shadow-lg p-4 resize overflow-auto"
              style={{
                width: callModalSize.w,
                height: callModalSize.h ?? undefined,
                maxWidth: 'calc(100vw - 4rem)',
                maxHeight: 'calc(100vh - 4rem)',
              }}
            >
              {!callActive &&
                incomingCall &&
                (() => {
                  const rid = String(incomingCall.roomId || '');
                  const parts = rid.split('_').filter(Boolean);
                  const isOneToOneIncoming = parts.length === 2;
                  const group = !isOneToOneIncoming ? groups.find((g) => String(g._id) === rid) : null;
                  const caller = allUsers.find((u) => String(u._id) === String(incomingCall?.from));
                  const avatar = isOneToOneIncoming ? caller?.avatar : group?.avatar;
                  const name = isOneToOneIncoming ? caller?.name || chatName : group?.name || chatName;
                  return (
                    <IncomingCallModal
                      avatar={avatar}
                      name={name}
                      onAccept={async () => {
                        await acceptIncomingCall_s2();
                      }}
                      onReject={() => {
                        const from = incomingCall?.from;
                        const targetRoom = incomingCall?.roomId || roomId;
                        socketRef.current?.emit('call_reject', {
                          roomId: String(targetRoom),
                          targets: from ? [String(from)] : [],
                        });
                        setIncomingCall_s2(null);
                        stopGlobalRingTone();
                        try {
                          localStorage.removeItem('pendingIncomingCall');
                        } catch {}
                      }}
                    />
                  );
                })()}
              {!callActive &&
                callConnecting &&
                (() => {
                  const parts = String(roomId).split('_');
                  const otherId = isGroup
                    ? null
                    : parts.find((p) => p && p !== String(currentUser._id)) || getId(selectedChat);
                  const other = !isGroup ? allUsers.find((u) => String(u._id) === String(otherId)) : null;
                  const avatar = isGroup ? chatAvatar : other?.avatar;
                  const name = isGroup ? chatName : other?.name || chatName;
                  return (
                    <ModalCall
                      avatar={avatar}
                      name={name}
                      mode="connecting"
                      callType={callType === 'video' ? 'video' : 'voice'}
                      onEndCall={() => endCall('local')}
                    />
                  );
                })()}
              {callActive &&
                (() => {
                  const remoteIds = Array.from(remoteStreamsState.keys());
                  const participantOtherId =
                    roomParticipants && roomParticipants.length > 0
                      ? roomParticipants.find((id) => String(id) !== String(currentUser._id))
                      : undefined;
                  const otherId =
                    counterpartId ||
                    participantOtherId ||
                    remoteIds[0] ||
                    incomingCall?.from ||
                    String(activeRoomId || roomId)
                      .split('_')
                      .find((p) => p && p !== String(currentUser._id)) ||
                    (!isGroup ? getId(selectedChat) : null);
                  const other = otherId ? allUsers.find((u) => String(u._id) === String(otherId)) : null;
                  const isOneToOneCall = counterpartId
                    ? true
                    : roomParticipants && roomParticipants.length > 0
                      ? roomParticipants.length === 2
                      : remoteIds.length <= 1;
                  const currentCallRoomId = String(activeRoomId || roomId);
                  const currentGroup = groups.find((g) => String(g._id) === currentCallRoomId);
                  const avatar = isOneToOneCall ? other?.avatar : currentGroup?.avatar || chatAvatar;
                  const name = isOneToOneCall ? other?.name || chatName : currentGroup?.name || chatName;
                  const remotePeers = Array.from(remoteStreamsState.entries()).map(([uid, stream]) => {
                    const u = allUsers.find((x) => String(x._id) === String(uid));
                    return { userId: uid, stream, name: u?.name, avatar: u?.avatar };
                  });
                  const participantIds = new Set<string>();
                  roomParticipants.forEach((id) => participantIds.add(String(id)));
                  remoteIds.forEach((id) => participantIds.add(String(id)));
                  participantIds.delete(String(currentUser._id));
                  const participants = Array.from(participantIds).map((uid) => {
                    const u = allUsers.find((x) => String(x._id) === String(uid));
                    return { userId: uid, name: u?.name, avatar: u?.avatar };
                  });
                  return (
                    <ModalCall
                      avatar={avatar}
                      name={name}
                      mode="active"
                      callType={callType === 'video' ? 'video' : 'voice'}
                      callStartAt={callStartAt}
                      localVideoRef={localVideoRef}
                      currentUserName={currentUser.name}
                      currentUserAvatar={currentUser.avatar}
                      remotePeers={remotePeers}
                      participants={participants}
                      micEnabled={micEnabled}
                      camEnabled={camEnabled}
                      onToggleMic={toggleMic}
                      onToggleCamera={toggleCamera}
                      onEndCall={() => endCall('local')}
                    />
                  );
                })()}
            </div>
          </div>
        )}
      </main>
    </ChatProvider>
  );
}
