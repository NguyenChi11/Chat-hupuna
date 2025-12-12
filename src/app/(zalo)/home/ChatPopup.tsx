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
import Image from 'next/image';
import { insertTextAtCursor } from '@/utils/chatInput';
import { groupMessagesByDate } from '@/utils/chatMessages';
import { ChatProvider } from '@/context/ChatContext';
import { useRouter } from 'next/navigation';
import { get } from 'http';
import { sendError } from 'next/dist/server/api-utils';
import ShareMessageModal from '@/components/(chatPopup)/ShareMessageModal';
import { HiX } from 'react-icons/hi';
import { playGlobalRingTone, stopGlobalRingTone } from '@/utils/callRing';

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
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [callStartAt, setCallStartAt] = useState<number | null>(null);
  const [callTicker, setCallTicker] = useState(0);
  const [callConnecting, setCallConnecting] = useState(false);
  const ringTimeoutRef = useRef<number | null>(null);
  const callActiveRef = useRef<boolean>(false);
  const callConnectingRef = useRef<boolean>(false);
  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);
  useEffect(() => {
    callConnectingRef.current = callConnecting;
  }, [callConnecting]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteStreamsState, setRemoteStreamsState] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const receiversRef = useRef<string[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    type: 'voice' | 'video';
    roomId: string;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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

  const createPeerConnection = useCallback(
    (otherUserId: string, forceNew = false) => {
      let existing = peerConnectionsRef.current.get(otherUserId);
      if (existing && forceNew) {
        try {
          existing.onicecandidate = null;
          existing.ontrack = null;
          const pcToClose = existing;
          if (pcToClose) {
            pcToClose.getSenders().forEach((s) => {
              try {
                pcToClose.removeTrack(s);
              } catch {}
            });
            pcToClose.close();
          }
        } catch {}
        peerConnectionsRef.current.delete(otherUserId);
        existing = undefined;
      }
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.onicecandidate = (event) => {
        const candidate = event.candidate;
        if (!candidate) return;
        socketRef.current?.emit('call_candidate', {
          roomId,
          target: otherUserId,
          from: String(currentUser._id),
          candidate,
        });
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        remoteStreamsRef.current.set(otherUserId, stream);
        setRemoteStreamsState(new Map(remoteStreamsRef.current));
        stopGlobalRingTone();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          stopGlobalRingTone();
          setCallConnecting(false);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          stopGlobalRingTone();
          setCallConnecting(false);
        }
      };
      peerConnectionsRef.current.set(otherUserId, pc);
      return pc;
    },
    [roomId, currentUser._id],
  );

  const startLocalStream = useCallback(
    async (type: 'voice' | 'video') => {
      const constraints = { audio: true, video: type === 'video' };
      const navi =
        typeof navigator !== 'undefined'
          ? (navigator as Navigator & {
              webkitGetUserMedia?: (
                constraints: MediaStreamConstraints,
                success: (stream: MediaStream) => void,
                error: (err: unknown) => void,
              ) => void;
              mozGetUserMedia?: (
                constraints: MediaStreamConstraints,
                success: (stream: MediaStream) => void,
                error: (err: unknown) => void,
              ) => void;
              getUserMedia?: (
                constraints: MediaStreamConstraints,
                success: (stream: MediaStream) => void,
                error: (err: unknown) => void,
              ) => void;
            })
          : undefined;
      if (!navi) {
        throw new Error('Navigator is unavailable in this context');
      }
      let stream: MediaStream;
      const hasMediaDevices = !!(navi.mediaDevices && typeof navi.mediaDevices.getUserMedia === 'function');
      if (hasMediaDevices) {
        stream = await navi.mediaDevices.getUserMedia(constraints);
      } else {
        const legacyGetUserMedia = navi.getUserMedia ?? navi.webkitGetUserMedia ?? navi.mozGetUserMedia;
        if (typeof legacyGetUserMedia === 'function') {
          stream = await new Promise<MediaStream>((resolve, reject) => {
            try {
              legacyGetUserMedia.call(navi, constraints, resolve, reject);
            } catch (err) {
              reject(err as unknown);
            }
          });
        } else {
          const isSecure =
            typeof window !== 'undefined' && (window.isSecureContext || window.location.protocol === 'https:');
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          const hint =
            isSecure || host === 'localhost' ? '' : ' Truy cập bằng HTTPS hoặc localhost để cấp quyền mic/camera.';
          throw new Error('MediaDevices API is unavailable.' + hint);
        }
      }
      localStreamRef.current = stream;
      const a = stream.getAudioTracks()[0];
      if (a) a.enabled = micEnabled;
      const v = stream.getVideoTracks()[0];
      if (v) v.enabled = camEnabled;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
        } catch {}
      }
      return stream;
    },
    [micEnabled, camEnabled],
  );



  const resetCallLocal = useCallback(() => {
    try {
      setCallActive(false);
      setCallType(null);
      setCallStartAt(null);
      setCallConnecting(false);
      remoteStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      remoteStreamsRef.current.clear();
      setRemoteStreamsState(new Map());
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.close();
        } catch {}
      });
      peerConnectionsRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = null;
        } catch {}
      }
      setIncomingCall(null);
    } catch {}
  }, []);

  const getReceiverIds = useCallback(() => {
    if (isGroup) {
      const members = (selectedChat as GroupConversation).members || [];
      const ids = members
        .map((m) => (typeof m === 'object' ? String(m._id) : String(m)))
        .filter((id) => id !== String(currentUser._id));
      return ids;
    }
    return [String((selectedChat as unknown as { _id: string })._id)];
  }, [isGroup, selectedChat, currentUser._id]);

  const startCall = useCallback(
    async (type: 'voice' | 'video') => {
      // Reset toàn bộ state trước
      resetCallLocal();
      endedRef.current = false;
      // Đảm bảo socket connected
      try {
        if (!socketRef.current || !socketRef.current.connected) {
          socketRef.current = io(resolveSocketUrl(), {
            transports: ['websocket'],
            withCredentials: false,
          });

          // Đợi socket connect
          await new Promise<void>((resolve) => {
            socketRef.current!.on('connect', () => {
              resolve();
            });
          });

          socketRef.current.emit('join_room', roomId);
          socketRef.current.emit('join_user', { userId: String(currentUser._id) });
        }
      } catch (err) {
        console.error('❌ [CLIENT] Socket connection error:', err);
      }

      const receivers = getReceiverIds();
      receiversRef.current = receivers;
      if (receivers.length === 0) {
        console.error('❌ [CLIENT] No receivers found');
        return;
      }
      setCallType(type);
      setCallActive(false);
      setCallStartAt(null);
      setCallConnecting(true);
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      playGlobalRingTone();
      ringTimeoutRef.current = window.setTimeout(() => {
        if (!callActiveRef.current && callConnectingRef.current) {
          stopGlobalRingTone();
          endCall('local');
        }
      }, 30000);

      try {
        // Start local media
        const stream = await startLocalStream(type);

        // Create offers for each receiver
        for (const otherId of receivers) {
          const pc = createPeerConnection(otherId, true);
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === 'video',
          });

          await pc.setLocalDescription(offer);

          socketRef.current?.emit('call_offer', {
            roomId,
            target: otherId,
            from: String(currentUser._id),
            type,
            sdp: offer,
          });
        }
      } catch (err) {
        console.error('❌ [CLIENT] Start call error:', err);
        setCallConnecting(false);

        // Cleanup on error
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
        if (localVideoRef.current) {
          try {
            localVideoRef.current.srcObject = null;
          } catch {}
        }
      }
    },
    [getReceiverIds, startLocalStream, createPeerConnection, roomId, currentUser._id, resetCallLocal],
  );
  const endingRef = useRef(false);
  const endedRef = useRef(false);

  const endCall = useCallback(
    (source: 'local' | 'remote' = 'local') => {
      if (endingRef.current || endedRef.current) return;
      endingRef.current = true;

      if (source === 'local' && socketRef.current?.connected) {
        socketRef.current.emit('call_end', {
          roomId,
          from: String(currentUser._id),
          targets: receiversRef.current,
        });
      }

      setCallActive(false);
      setCallType(null);
      setCallStartAt(null);
      setCallConnecting(false);

      remoteStreamsRef.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      remoteStreamsRef.current.clear();
      setRemoteStreamsState(new Map());

      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.close();
        } catch (err) {
          console.error('❌ Error closing peer connection:', err);
        }
      });
      peerConnectionsRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = null;
        } catch {}
      }

      setIncomingCall(null);
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      try {
        if (typeof window !== 'undefined') localStorage.removeItem('pendingIncomingCall');
      } catch {}
      endedRef.current = true;
      endingRef.current = false;
    },
    [roomId, currentUser._id],
  );

  const toggleMic = useCallback(() => {
    const next = !micEnabled;
    setMicEnabled(next);
    const a = localStreamRef.current?.getAudioTracks()[0];
    if (a) a.enabled = next;
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    const next = !camEnabled;
    setCamEnabled(next);
    const v = localStreamRef.current?.getVideoTracks()[0];
    if (v) v.enabled = next;
  }, [camEnabled]);

  const handleVoiceCall = useCallback(() => {
    void startCall('voice');
  }, [startCall]);

  const handleVideoCall = useCallback(() => {
    void startCall('video');
  }, [startCall]);

  useEffect(() => {
    if (!callActive) return;
    const id = window.setInterval(() => setCallTicker((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [callActive]);

  useEffect(() => {
    if (remoteStreamsState && remoteStreamsState.size > 0) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [remoteStreamsState]);

  useEffect(() => {
    if (callActive) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [callActive]);

  useEffect(() => {
    if (!callConnecting) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [callConnecting]);

  useEffect(() => {
    if (!incomingCall) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [incomingCall]);

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

    // Enter (không Shift) để gửi tin nhắn
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const el = editableRef.current;
      if (!el) return;
      const plain = String(el.innerText || '');
      let expanded = plain;
      try {
        const activeRaw = localStorage.getItem(`chatFlashActiveFolder:${roomId}`);
        const active = activeRaw ? JSON.parse(activeRaw) : null;
        const fid = active?.id;
        if (fid) {
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



  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    callConnectingRef.current = callConnecting;
  }, [callConnecting]);

  // 🔥 2. SỬA LẠI USEEFFECT SOCKET LISTENERS
  useEffect(() => {
    if (!roomId) return;

    const socket = socketRef.current;
    if (!socket) return;

    // ✅ CLEANUP CŨ TRƯỚC KHI ĐĂNG KÝ MỚI
    socket.off('call_offer');
    socket.off('call_answer');
    socket.off('call_candidate');
    socket.off('call_end');
    socket.off('call_reject');

    // ==========================================
    // HANDLER: call_offer
    // ==========================================
    const handleCallOffer = async (data: {
      roomId: string;
      target: string;
      from: string;
      type: 'voice' | 'video';
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (String(data.target) !== String(currentUser._id)) return;

      setIncomingCall({
        from: String(data.from),
        type: data.type,
        roomId: data.roomId,
        sdp: data.sdp,
      });
      playGlobalRingTone();
    };

    // ==========================================
    // HANDLER: call_answer ✅ FIX QUAN TRỌNG
    // ==========================================
    const handleCallAnswer = async (data: {
      roomId: string;
      target: string;
      from: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (String(data.target) !== String(currentUser._id)) return;

      // ✅ TẮT CHUÔNG NGAY LẬP TỨC
      stopGlobalRingTone();

      // ✅ Clear timeout nếu có
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      setCallConnecting(false);
      endedRef.current = false;

      const pc = peerConnectionsRef.current.get(String(data.from));
      if (!pc) {
        console.error('❌ [CLIENT] No peer connection found for:', data.from);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // ✅ Chỉ set callActive sau khi setRemoteDescription thành công
        setCallActive(true);
        setCallStartAt(Date.now());
      } catch (err) {
        console.error('❌ [CLIENT] Set remote description error:', err);
        stopGlobalRingTone(); // Đảm bảo tắt chuông nếu có lỗi
      }
    };

    // ==========================================
    // HANDLER: call_candidate
    // ==========================================
    const handleCallCandidate = async (data: {
      roomId: string;
      target: string;
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (String(data.target) !== String(currentUser._id)) return;

      const pc = peerConnectionsRef.current.get(String(data.from));
      if (!pc) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('❌ [CLIENT] ICE candidate error:', err);
      }
    };

    // ==========================================
    // HANDLER: call_end ✅ TẮT CHUÔNG
    // ==========================================
    const handleCallEnd = (data: { roomId: string }) => {
      stopGlobalRingTone(); // ✅ TẮT CHUÔNG

      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      endCallRef.current?.('remote');
      setIncomingCall(null);
    };

    // ==========================================
    // HANDLER: call_reject ✅ TẮT CHUÔNG
    // ==========================================
    const handleCallReject = (data: { roomId: string }) => {
      stopGlobalRingTone(); // ✅ TẮT CHUÔNG

      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      endCallRef.current?.('remote');
      setIncomingCall(null);
    };

    // ✅ ĐĂNG KÝ LISTENERS MỚI
    socket.on('call_offer', handleCallOffer);
    socket.on('call_answer', handleCallAnswer);
    socket.on('call_candidate', handleCallCandidate);
    socket.on('call_end', handleCallEnd);
    socket.on('call_reject', handleCallReject);

    // ✅ CLEANUP KHI UNMOUNT
    return () => {
      socket.off('call_offer', handleCallOffer);
      socket.off('call_answer', handleCallAnswer);
      socket.off('call_candidate', handleCallCandidate);
      socket.off('call_end', handleCallEnd);
      socket.off('call_reject', handleCallReject);
    };
  }, [roomId, currentUser._id, stopGlobalRingTone, playGlobalRingTone]); // ✅ Chỉ depend vào những giá trị cần thiết


  // 🔥 4. THÊM USEEFFECT ĐỂ TẮT CHUÔNG KHI callActive = true
  useEffect(() => {
    if (callActive) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [callActive, stopGlobalRingTone]);

  // 🔥 5. THÊM USEEFFECT ĐỂ TẮT CHUÔNG KHI CÓ REMOTE STREAM
  useEffect(() => {
    if (remoteStreamsState && remoteStreamsState.size > 0) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [remoteStreamsState, stopGlobalRingTone]);

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
        endedRef.current = false;
        const type = data.type;
        const from = data.from;
        setCallType(type);
        setCallActive(true);
        setCallStartAt(Date.now());
        try {
          const stream = await startLocalStream(type);
          const pc = createPeerConnection(from, true);
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit('call_answer', {
            roomId,
            target: from,
            from: String(currentUser._id),
            sdp: answer,
          });
          receiversRef.current = [String(from)];
          stopGlobalRingTone();
        } catch {}
      })();
      // đã remove ở trên
    } catch {}
  }, [roomId, currentUser._id, incomingCall, callActive, callConnecting]);
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
      const activeRaw = localStorage.getItem('chatFlashActiveFolder');
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      const fid = active?.id;
      if (fid) {
        const kvRaw = localStorage.getItem(`chatFlashKV:${fid}`);
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
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-4">
              {!callActive && incomingCall && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const caller = allUsers.find((u) => String(u._id) === String(incomingCall?.from));
                      const avatar = caller?.avatar;
                      const name = caller?.name || chatName;
                      return (
                        <>
                          {avatar ? (
                            <div className="w-12 h-12 rounded-full overflow-hidden">
                              <Image
                                src={getProxyUrl(avatar)}
                                alt={name || ''}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                              {String(name || '')
                                .trim()
                                .charAt(0)
                                .toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-gray-600">Cuộc gọi đến</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                      onClick={async () => {
                        stopGlobalRingTone();
                        endedRef.current = false;
                        const type = incomingCall!.type;
                        const from = incomingCall!.from;

                        setCallType(type);
                        setCallActive(true);
                        setCallStartAt(Date.now());

                        try {
                          const stream = await startLocalStream(type);
                          const pc = createPeerConnection(from, true);
                          stream.getTracks().forEach((track) => {
                            pc.addTrack(track, stream);
                          });

                          await pc.setRemoteDescription(new RTCSessionDescription(incomingCall!.sdp));

                          const answer = await pc.createAnswer();
                          await pc.setLocalDescription(answer);

                          socketRef.current?.emit('call_answer', {
                            roomId,
                            target: from,
                            from: String(currentUser._id),
                            sdp: answer,
                          });

                          receiversRef.current = [String(from)];

                          setIncomingCall(null);
                          stopGlobalRingTone();
                        } catch (err) {
                          console.error('❌ [CLIENT] Accept call error:', err);
                          endCall();
                        }
                      }}
                    >
                      Chấp nhận
                    </button>
                    <button
                      className="px-3 py-2 bg-gray-200 rounded-lg"
                      onClick={() => {
                        const from = incomingCall?.from;
                        socketRef.current?.emit('call_reject', { roomId, targets: from ? [String(from)] : [] });
                        setIncomingCall(null);
                        stopGlobalRingTone();
                      }}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              )}
              {!callActive && callConnecting && (
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {chatAvatar ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={getProxyUrl(chatAvatar)}
                          alt={chatName}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                        {String(chatName || '')
                          .trim()
                          .charAt(0)
                          .toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="font-medium">{chatName}</div>
                      <div className="text-sm text-gray-600">Đang chờ đối phương chấp nhận...</div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button className="px-3 py-2 bg-gray-200 rounded-lg" onClick={() => endCall('local')}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}
              {callActive && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Đang gọi</div>
                    {callStartAt && (
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const now = Date.now();
                          const ms = now - (callStartAt || now);
                          const s = Math.floor(ms / 1000);
                          const m = Math.floor(s / 60);
                          const ss = s % 60;
                          const mm = String(m).padStart(2, '0');
                          const sss = String(ss).padStart(2, '0');
                          return `${mm}:${sss}`;
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {callType === 'video' && (
                      <div className="bg-black rounded-lg overflow-hidden aspect-video">
                        <video ref={localVideoRef} className="w-full h-full object-cover" muted playsInline />
                      </div>
                    )}
                    {Array.from(remoteStreamsState.entries()).map(([uid, stream]) => (
                      <div key={uid} className="bg-black rounded-lg overflow-hidden aspect-video">
                        {callType === 'video' ? (
                          <video
                            className="w-full h-full object-cover"
                            autoPlay
                            playsInline
                            ref={(el) => {
                              if (el) {
                                el.srcObject = stream;
                                try {
                                  el.play();
                                } catch {}
                              }
                            }}
                          />
                        ) : (
                          <audio
                            autoPlay
                            ref={(el) => {
                              if (el) {
                                el.srcObject = stream;
                                try {
                                  el.play();
                                } catch {}
                              }
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <button className="px-4 py-2 rounded-full bg-gray-200" onClick={toggleMic}>
                      {micEnabled ? 'Tắt mic' : 'Bật mic'}
                    </button>
                    {callType === 'video' && (
                      <button className="px-4 py-2 rounded-full bg-gray-200" onClick={toggleCamera}>
                        {camEnabled ? 'Tắt video' : 'Bật video'}
                      </button>
                    )}
                    <button
                      className="px-4 py-2 rounded-full bg-red-600 text-white flex items-center gap-2"
                      onClick={() => endCall('local')}
                    >
                      <HiX className="w-5 h-5" />
                      Kết thúc
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </ChatProvider>
  );
}
