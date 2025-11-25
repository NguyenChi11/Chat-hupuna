'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import ChatInfoPopup from './ChatInfoPopup';

import ModalMembers from '../../../components/base/ModalMembers';
import { User } from '../../../types/User';
import { Message, MessageCreate } from '../../../types/Message';
import { ChatItem, GroupConversation } from '../../../types/Group';

import { EmojiClickData } from 'emoji-picker-react';

import PinIcon from '@/public/icons/pin-icon.svg';
import Image from 'next/image';
import ChatHeader from '@/components/(chatPopup)/ChatHeader';
import PinnedMessagesSection from '@/components/(chatPopup)/PinnedMessagesSection';
import EmojiStickerPicker from '@/components/(chatPopup)/EmojiStickerPicker';
import ReplyBanner from '@/components/(chatPopup)/ReplyBanner';
import MentionMenu from '@/components/(chatPopup)/MentionMenu';
import ChatInput from '@/components/(chatPopup)/ChatInput';
import MessageList from '@/components/(chatPopup)/MessageList';
import { useChatMentions } from '@/hooks/useChatMentions';
import { useChatUpload } from '@/hooks/useChatUpload';
import { useChatVoiceInput } from '@/hooks/useChatVoiceInput';
import { useChatMembers } from '@/hooks/useChatMembers';
import {
  createMessageApi,
  readMessagesApi,
  readPinnedMessagesApi,
  togglePinMessageApi,
  recallMessageApi,
  markAsReadApi,
} from '@/fetch/messages';
import SearchSidebar from '@/components/(chatPopup)/SearchMessageModal';
import { isVideoFile } from '@/utils/utils';

const MESSAGE_SOUND_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3';

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/9408/9408176.png',
  'https://cdn-icons-png.flaticon.com/512/9408/9408201.png',
];

const SOCKET_URL = 'http://localhost:3002';

interface ChatWindowProps {
  selectedChat: ChatItem;
  currentUser: User;
  allUsers: User[];
  onShowCreateGroup: () => void;
  reLoad?: () => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => void;
  scrollToMessageId?: string | null; // 🔥 MỚI: ID tin nhắn cần scroll đến
  onScrollComplete?: () => void;
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

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  message: Message;
}

export default function ChatWindow({
  selectedChat,
  currentUser,
  allUsers,
  onShowCreateGroup,
  reLoad,
  onChatAction,
  scrollToMessageId, // 🔥 Thêm
  onScrollComplete,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [openMember, setOpenMember] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const markedReadRef = useRef<string | null>(null);
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
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

  const getOneToOneRoomId = (user1Id: string | number, user2Id: string | number) => {
    return [user1Id, user2Id].sort().join('_');
  };

  const roomId = isGroup ? getId(selectedChat) : getOneToOneRoomId(getId(currentUser), getId(selectedChat));
  const chatName = selectedChat.name;

  const [showSearchSidebar, setShowSearchSidebar] = useState(false);
  const chatAvatar = (selectedChat as { avatar?: string }).avatar;

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

  const MenuItem = ({
    children,
    onClick,
    isRed = false,
    isAnchor = false,
    href = '#',
    download = '',
  }: {
    children: React.ReactNode;
    onClick: (e: React.MouseEvent<HTMLElement | HTMLAnchorElement>) => void;
    isRed?: boolean;
    isAnchor?: boolean;
    href?: string;
    download?: string;
  }) => {
    const className = `w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-3 ${isRed ? 'text-red-500' : 'text-gray-700'}`;

    return isAnchor ? (
      <a href={href} download={download} onClick={onClick} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    ) : (
      <button onClick={onClick} className={className} type="button">
        {children}
      </button>
    );
  };

  const ContextMenuRenderer = () => {
    if (!contextMenu || !contextMenu.visible) return null;

    const { x, y, message: msg } = contextMenu;
    const isMe = (msg.sender as any)._id === currentUser._id;
    const isText = msg.type === 'text';
    const isRecalled = msg.isRecalled;
    const canCopy = isText && !isRecalled;
    const canDownload = (msg.type === 'image' || msg.type === 'file' || msg.type === 'sticker') && msg.fileUrl;
    const canRecall = isMe && !isRecalled;

    const style = {
      top: y,
      left: x > window.innerWidth - 200 ? x - 180 : x,
    };

    return (
      <div
        data-context-menu="true"
        className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 py-1 w-44 text-sm"
        style={style}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!isRecalled && (
          <MenuItem
            onClick={(e) => {
              console.log('🔵 [Reply] MenuItem clicked');
              e.stopPropagation();
              e.preventDefault();
              handlePinMessage(msg);
              closeContextMenu();
            }}
          >
            <Image src={PinIcon} className="text-black" title="Ghim tin nhắn" width={20} height={20} alt="" />
            Ghim tin nhắn
          </MenuItem>
        )}

        {canCopy && (
          <MenuItem
            onClick={async (e) => {
              console.log('🟢 [Copy] MenuItem clicked');
              e.stopPropagation();
              e.preventDefault();
              try {
                await navigator.clipboard.writeText(msg.content || '');
                console.log('✅ Copy thành công:', msg.content);
              } catch (err) {
                console.error('❌ Copy lỗi:', err);
                alert('Sao chép thất bại!');
              } finally {
                closeContextMenu();
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M7 6V5h6v1h-6zM3 8v10a2 2 0 002 2h10a2 2 0 002-2V8h-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2H3zm12 2v8H5v-8h10z" />
            </svg>
            Copy
          </MenuItem>
        )}

        {canDownload && (
          <MenuItem
            isAnchor={true}
            href={msg.fileUrl}
            download={msg.fileName || 'file_chat'}
            onClick={(e) => {
              console.log('🟡 [Download] MenuItem clicked');
              e.stopPropagation();

              setTimeout(() => closeContextMenu(), 100);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Tải xuống
          </MenuItem>
        )}

        {canRecall && (
          <MenuItem
            isRed={true}
            onClick={(e) => {
              console.log('🔴 [Recall] MenuItem clicked');
              e.stopPropagation();
              e.preventDefault();
              handleRecallMessage(msg._id);
              closeContextMenu();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
            Thu hồi
          </MenuItem>
        )}
      </div>
    );
  };

  const playMessageSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!messageAudioRef.current) {
        messageAudioRef.current = new Audio(MESSAGE_SOUND_URL);
      }
      const audio = messageAudioRef.current;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // ignore autoplay errors
      });
    } catch {
      // ignore
    }
  }, []);

  const showMessageNotification = useCallback(
    (msg: Message) => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;

      // Nếu chưa xin quyền, xin ngay lúc nhận tin nhắn
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(chatName || 'Tin nhắn mới', {
              body:
                msg.content ||
                (msg.type === 'image'
                  ? 'Đã gửi cho bạn một ảnh.'
                  : msg.type === 'video' || isVideoFile(msg.fileName)
                    ? 'Đã gửi cho bạn một video.'
                    : msg.type === 'file'
                      ? 'Đã gửi cho bạn một file.'
                      : 'Bạn có tin nhắn mới.'),
            });
          }
        });
        return;
      }

      if (Notification.permission !== 'granted') return;

      const body =
        msg.content ||
        (msg.type === 'image'
          ? 'Đã gửi cho bạn một ảnh.'
          : msg.type === 'video' || isVideoFile(msg.fileName)
            ? 'Đã gửi cho bạn một video.'
            : msg.type === 'file'
              ? 'Đã gửi cho bạn một file.'
              : 'Bạn có tin nhắn mới.');

      new Notification(chatName || 'Tin nhắn mới', {
        body,
      });
    },
    [chatName],
  );

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

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups = new Map<string, Message[]>();
    msgs.forEach((msg) => {
      const dateKey = new Date(msg.timestamp).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(msg);
    });
    return groups;
  };

  useEffect(() => {
    if (!scrollToMessageId || messages.length === 0) return;

    // Đợi DOM render
    const timer = setTimeout(() => {
      const el = document.getElementById(`msg-${scrollToMessageId}`);

      if (el) {
        // Scroll đến tin nhắn
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight
        setHighlightedMsgId(scrollToMessageId);

        // Tắt highlight sau 2.5s
        setTimeout(() => setHighlightedMsgId(null), 2500);

        // Callback
        onScrollComplete?.();
      } else {
        console.warn('Message element not found:', scrollToMessageId);
        onScrollComplete?.();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [scrollToMessageId, messages.length, onScrollComplete]);
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

    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  const handleReplyTo = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const handleJumpToMessage = (messageId: string) => {
    if (window.innerWidth < 640) {
      setShowPopup(false);
    }

    const messageElement = document.getElementById(`msg-${messageId}`);

    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      setHighlightedMsgId(messageId);

      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2000);
    } else {
      alert('Tin nhắn này không còn hiển thị trong danh sách hiện tại.');
    }
  };

  const { isListening, handleVoiceInput } = useChatVoiceInput({
    editableRef,
    handleInputChangeEditable,
  });

  const insertTextAtCursor = (editable: HTMLDivElement, text: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editable.appendChild(document.createTextNode(text));
      return;
    }

    const range = selection.getRangeAt(0);

    // Đảm bảo range nằm bên trong editable
    let current: Node | null = range.commonAncestorContainer;
    let isInside = false;
    while (current) {
      if (current === editable) {
        isInside = true;
        break;
      }
      current = current.parentNode;
    }

    if (!isInside) {
      editable.appendChild(document.createTextNode(text));
      return;
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Di chuyển caret sau emoji vừa chèn
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const onEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      if (editableRef.current) {
        const editable = editableRef.current;
        editable.focus();
        insertTextAtCursor(editable, emojiData.emoji);
        handleInputChangeEditable();
      }
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
      const data = await readMessagesApi(roomId);
      const rawMessages = Array.isArray(data.data) ? (data.data as Message[]) : [];
      const sortedMsgs = rawMessages.sort(
        (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      setMessages(sortedMsgs);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setMessages([]);
    }
  }, [roomId]);

  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);
    fetchMessages();
    fetchPinnedMessages();
  }, [selectedChat, roomId, fetchMessages, fetchPinnedMessages]);

  const allUsersMap = useMemo(() => {
    const map = new Map<string, string>();
    if (currentUser) {
      const name = currentUser.name || 'Bạn';
      if (currentUser._id) map.set(currentUser._id, name);
    }
    if (Array.isArray(allUsers)) {
      allUsers.forEach((user) => {
        if (user.name) {
          if (user._id) map.set(user._id, user.name);
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
      setMessages((prev) => [...prev, data]);

      // Chỉ thông báo & phát tiếng khi tin nhắn không phải của chính mình
      if (data.sender !== currentUser._id) {
        playMessageSound();
        showMessageNotification(data);
      }
    });

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
    if (markedReadRef.current === roomId) return;
    try {
      await markAsReadApi(roomId, getId(currentUser));
      markedReadRef.current = roomId;
      if (reLoad) reLoad();
    } catch (error) {
      console.error('Mark as read failed:', error);
    }
  }, [roomId, currentUser, reLoad]);

  useEffect(() => {
    markedReadRef.current = null;
    markAsRead();
  }, [roomId, markAsRead]);

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
    if (typeof sender === 'object' && sender.name) {
      return sender.name;
    }

    if (typeof sender === 'string') {
      return allUsersMap.get(sender) || 'Người dùng';
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

  const getSenderInfo = (sender: User | string) => {
    if (typeof sender === 'object' && sender !== null) {
      return {
        _id: sender._id,
        name: sender.name || 'Unknown',
        avatar: sender.avatar ?? null,
      };
    }
    return {
      _id: sender,
      name: '...',
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

  if (!selectedChat) return null;

  // Xin quyền thông báo 1 lần khi mở cửa sổ chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // ignore
      });
    }
  }, []);

  // Khởi tạo audio sau lần click đầu tiên (để tránh bị chặn autoplay)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initAudio = () => {
      if (!messageAudioRef.current) {
        messageAudioRef.current = new Audio(MESSAGE_SOUND_URL);
      }
      window.removeEventListener('click', initAudio);
    };

    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  return (
    <main className="flex h-full bg-gray-700">
      <div
        className={`flex flex-col h-full bg-gray-200 transition-all duration-300 ${showPopup ? 'sm:w-[calc(100%-350px)]' : 'w-full'} border-r border-gray-200`}
      >
        <ChatHeader
          chatName={chatName}
          isGroup={isGroup}
          memberCount={memberCount}
          showPopup={showPopup}
          onTogglePopup={() => setShowPopup((prev) => !prev)}
          onOpenMembers={() => setOpenMember(true)}
          showSearchSidebar={showSearchSidebar}
          onToggleSearchSidebar={() => setShowSearchSidebar((prev) => !prev)}
          avatar={chatAvatar}
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-100 flex flex-col">
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
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Phần Footer (Input Chat) giữ nguyên */}
        <div className="bg-white p-2 sm:p-3 border-t border-gray-200 relative">
          {/* ... Popup Picker & Inputs ... */}
          <EmojiStickerPicker
            showEmojiPicker={showEmojiPicker}
            pickerTab={pickerTab}
            setPickerTab={setPickerTab}
            onEmojiClick={onEmojiClick}
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
              const msgType = isVideo ? 'file' : 'image';
              handleUploadAndSend(file, msgType);
            }}
            onSelectFile={(file) => handleUploadAndSend(file, 'file')}
            onFocusEditable={() => setShowEmojiPicker(false)}
          />
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 sm:static sm:inset-auto sm:w-[350px] h-full ">
          <ChatInfoPopup
            messages={messages}
            chatName={chatName}
            allUsers={allUsers}
            currentUser={currentUser}
            selectedChat={selectedChat}
            isGroup={isGroup}
            onClose={() => setShowPopup(false)}
            onShowCreateGroup={onShowCreateGroup}
            onMembersAdded={handleMembersAdded}
            members={activeMembers}
            onMemberRemoved={handleMemberRemoved}
            onRoleChange={handleRoleChange}
            onJumpToMessage={handleJumpToMessage}
            onChatAction={onChatAction}
            reLoad={reLoad}
          />
        </div>
      )}
      {showSearchSidebar && (
        <div className="fixed inset-0 sm:static sm:inset-auto sm:w-[350px] h-full ">
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

      {contextMenu && contextMenu.visible && <ContextMenuRenderer />}

      {previewMedia && (
        <div
          className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full px-4"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="absolute -top-2 right-4 text-white bg-black/60 hover:bg-black rounded-full p-1"
              onClick={() => setPreviewMedia(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="flex items-center justify-center max-h-[80vh]">
              {previewMedia.type === 'image' ? (
                <Image
                  src={previewMedia.url}
                  alt="Xem ảnh"
                  width={1200}
                  height={800}
                  className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <video src={previewMedia.url} controls autoPlay className="max-h-[80vh] w-full rounded-lg bg-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
