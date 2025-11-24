'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import ChatInfoPopup from '@/ui/base/ChatInfoPopup';

import IconShow from '@/public/icons/show.svg';
import IconShow1 from '@/public/icons/show2.svg';
import IconFile from '@/public/icons/file.svg';
import ModalMembers from '@/ui/base/ModalMembers';
import { User } from '@/types/User';
import { Message, MessageCreate, MessageType } from '@/types/Message';
import { ChatItem, GroupConversation, MemberInfo } from '@/types/Group';

import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import IamgeIcon from '@/public/icons/Image-icon.svg';
import FileICon from '@/public/icons/file-icon.svg';
import IconSticker from '@/public/icons/sticker.svg';
import MicroIcon from '@/public/icons/micro-icon.svg';
import ReplyIcon from '@/public/icons/reply-icon.svg';
import PinIcon from '@/public/icons/pin-icon.svg';
import Image from 'next/image';
import { getProxyUrl, isVideoFile } from '@/utils/utils';
import { MessageContent } from './MessageContent';
import { uploadFileWithProgress } from '@/utils/uploadHelper';
import PinnedMessageListModal from '@/ui/base/PinnedMessageListModal';

const showNotification = () => {
  // 1. Kiểm tra xem trình duyệt có hỗ trợ không
  if (!('Notification' in window)) {
    alert('Trình duyệt không hỗ trợ thông báo');
    return;
  }

  // 2. Xin quyền người dùng
  if (Notification.permission === 'granted') {
    // Đã có quyền -> Hiện luôn
    new Notification('Tin nhắn mới!', {
      body: 'Bạn A vừa gửi tin nhắn cho bạn.',
      // icon: '/icons/logo.png', // Đường dẫn icon
    });
  } else if (Notification.permission !== 'denied') {
    // Chưa có quyền -> Hỏi xin quyền
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('Xin chào!', { body: 'Đã bật thông báo thành công' });
      }
    });
  }
};

const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/9408/9408176.png',
  'https://cdn-icons-png.flaticon.com/512/9408/9408201.png',
];

const SOCKET_URL = 'http://localhost:3001';

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
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
const getId = (u: User | ChatItem | string | undefined | null): string => {
  if (!u) return '';
  if (typeof u === 'string') return u;
  if ((u as any)._id) return String((u as any)._id);
  if (u.id) return String(u.id);
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
  const [inputValue, setInputValue] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [openMember, setOpenMember] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const markedReadRef = useRef<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const isGroup = 'isGroup' in selectedChat && selectedChat.isGroup === true;
  const [memberCount, setMemberCount] = useState(0);
  const [activeMembers, setActiveMembers] = useState<MemberInfo[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [allPinnedMessages, setAllPinnedMessages] = useState<Message[]>([]);
  const [showPinnedList, setShowPinnedList] = useState(false);

  // State cho mention
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  // Thay đổi từ useState cho inputValue
  const editableRef = useRef<HTMLDivElement>(null);

  // Lấy text thuần từ contentEditable
  const getPlainTextFromEditable = (): string => {
    if (!editableRef.current) return '';

    let result = '';
    editableRef.current.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeName === 'SPAN' && (node as HTMLElement).dataset.mention) {
        const userId = (node as HTMLElement).dataset.userId;
        const userName = (node as HTMLElement).dataset.userName;
        result += `@[${userName}](${userId})`;
      }
    });

    return result;
  };

  // Lấy vị trí cursor
  const getCursorPosition = (): number => {
    const selection = window.getSelection();
    if (!selection || !editableRef.current) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editableRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  };

  // Parse tin nhắn để tìm mentions
  const parseMentions = (text: string): { mentions: string[]; displayText: string } => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]); // userId
    }

    return { mentions, displayText: text };
  };

  // Lọc danh sách suggestions
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery)
      return activeMembers.length > 0 ? activeMembers : allUsers.filter((u) => u._id !== currentUser._id);

    const query = mentionQuery.toLowerCase();
    const usersList = activeMembers.length > 0 ? activeMembers : allUsers.filter((u) => u._id !== currentUser._id);

    return usersList.filter((user) => user.name && user.name.toLowerCase().includes(query));
  }, [mentionQuery, activeMembers, allUsers, currentUser._id]);

  const handleInputChangeEditable = () => {
    if (!editableRef.current) return;

    const text = editableRef.current.textContent || '';
    const cursorPos = getCursorPosition();

    // Kiểm tra @ gần cursor
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        setShowMentionMenu(false);
        setMentionStartPos(null);
      } else {
        setShowMentionMenu(true);
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setSelectedMentionIndex(0);
      }
    } else {
      setShowMentionMenu(false);
      setMentionStartPos(null);
    }
  };

  // Chọn mention từ menu
  const selectMention = (user: User | MemberInfo) => {
    if (mentionStartPos === null || !editableRef.current) return;

    const userId = user._id || (user as any).id;
    const userName = user.name || 'User';

    // Lấy toàn bộ text hiện tại
    const currentText = editableRef.current.textContent || '';
    const cursorPos = getCursorPosition();

    const beforeMention = currentText.slice(0, mentionStartPos);
    const afterCursor = currentText.slice(cursorPos);

    // Tạo mention span
    const mentionSpan = document.createElement('span');
    mentionSpan.contentEditable = 'false';
    mentionSpan.className =
      'inline-flex items-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium mx-0.5';
    mentionSpan.dataset.mention = 'true';
    mentionSpan.dataset.userId = userId;
    mentionSpan.dataset.userName = userName;
    mentionSpan.textContent = `@${userName}`;

    // Xóa nội dung cũ
    editableRef.current.innerHTML = '';

    // Thêm text trước mention
    if (beforeMention) {
      editableRef.current.appendChild(document.createTextNode(beforeMention));
    }

    // Thêm mention span
    editableRef.current.appendChild(mentionSpan);

    // Thêm space sau mention
    editableRef.current.appendChild(document.createTextNode(' '));

    // Thêm text sau cursor
    if (afterCursor) {
      editableRef.current.appendChild(document.createTextNode(afterCursor));
    }

    setShowMentionMenu(false);
    setMentionStartPos(null);
    setMentionQuery('');

    // Focus và đặt cursor sau mention
    setTimeout(() => {
      editableRef.current?.focus();
      const range = document.createRange();
      const sel = window.getSelection();

      // Đặt cursor sau space
      const spaceNode = mentionSpan.nextSibling;
      if (spaceNode) {
        range.setStartAfter(spaceNode);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const getOneToOneRoomId = (user1Id: string | number, user2Id: string | number) => {
    return [user1Id, user2Id].sort().join('_');
  };
  const roomId = isGroup ? getId(selectedChat) : getOneToOneRoomId(getId(currentUser), getId(selectedChat));
  const chatName = selectedChat.name;

  const sendMessageProcess = async (msgData: MessageCreate) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: { ...msgData, roomId },
        }),
      });
      const json = await res.json();

      if (json.success) {
        setMessages((prev) => [...prev, { ...msgData, _id: json._id }]);
        const socketData = {
          ...msgData,
          _id: json._id,
          roomId,
          sender: currentUser._id,
          senderName: currentUser.name,
          isGroup: isGroup,
          receiver: isGroup ? null : getId(selectedChat),
          members: isGroup ? ((selectedChat as GroupConversation).members as any) : [],
        };
        socketRef.current?.emit('send_message', socketData);
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Save message error:', error);
    }
  };

  const handleUploadAndSend = useCallback(
    async (file: File, type: MessageType) => {
      const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempId = `temp_${Date.now()}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      formData.append('sender', currentUser._id);
      if (!isGroup) formData.append('receiver', selectedChat._id);
      formData.append('type', type);
      formData.append('fileName', file.name);

      let folderNameStr = '';
      if (isGroup) {
        folderNameStr = `Group__${sanitizeName(selectedChat.name)}`;
      } else {
        const myName = sanitizeName(currentUser.name || 'Me');
        const partnerName = sanitizeName(selectedChat.name || 'User');
        const names = [myName, partnerName].sort();
        folderNameStr = `${names[0]}__${names[1]}`;
      }
      formData.append('folderName', folderNameStr);

      const tempMsg: any = {
        _id: tempId,
        roomId,
        sender: currentUser._id,
        senderModel: currentUser,
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        type: type,
        timestamp: Date.now(),
        isSending: true,
      };

      setMessages((prev) => [...prev, tempMsg]);
      setUploadingFiles((prev) => ({ ...prev, [tempId]: 0 }));

      const sseUrl = `/api/upload/progress?id=${uploadId}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const serverRawPercent = data.percent;

          if (serverRawPercent >= 0) {
            const unifiedPercent = 50 + serverRawPercent / 2;

            setUploadingFiles((prev) => {
              const current = prev[tempId] || 0;
              return { ...prev, [tempId]: Math.max(current, unifiedPercent) };
            });

            if (serverRawPercent >= 100) {
              eventSource.close();
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      try {
        const res = await uploadFileWithProgress(`/api/upload?uploadId=${uploadId}`, formData, (clientRawPercent) => {
          const unifiedPercent = clientRawPercent / 2;
          setUploadingFiles((prev) => ({ ...prev, [tempId]: unifiedPercent }));
        });

        if (res.success) {
          const finalMsg = res.data;

          setMessages((prev) => prev.filter((m) => m._id !== tempId));

          const socketData = {
            ...finalMsg,
            _id: res.data._id || Date.now().toString(),
            sender: currentUser._id,
            senderName: currentUser.name,
            isGroup: isGroup,
            receiver: isGroup ? null : getId(selectedChat),
            members: isGroup ? ((selectedChat as GroupConversation).members as any) : [],
          };
          await sendMessageProcess(socketData);
        } else {
          alert('Lỗi server: ' + res.message);
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Gửi file thất bại!');
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      } finally {
        eventSource.close();
        setUploadingFiles((prev) => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }
    },
    [roomId, currentUser, isGroup, selectedChat, sendMessageProcess],
  );

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
        {/* {!isRecalled && (
          <MenuItem
            onClick={(e) => {
              console.log('🔵 [Reply] MenuItem clicked');
              e.stopPropagation();
              e.preventDefault();
              handleReplyTo(msg);
              closeContextMenu();
            }}
          >
            <Image src={ReplyIcon} alt="" width={16} height={16} /> Phản hồi
          </MenuItem>
        )} */}

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

  useEffect(() => {
    showNotification();
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
    setPinnedMessage(message);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'togglePin',
          messageId: message._id,
          data: { isPinned: !message.isPinned },
        }),
      });

      if (res.ok) {
        const newPinnedStatus = !message.isPinned;

        setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, isPinned: newPinnedStatus } : m)));

        await fetchPinnedMessages();
      }
    } catch (error) {
      console.error('Ghim tin nhắn thất bại', error);

      setPinnedMessage(null);
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

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn không hỗ trợ chức năng này. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;

      if (editableRef.current) {
        editableRef.current.focus();
        document.execCommand('insertText', false, transcript);
        handleInputChangeEditable();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Voice error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening]);

  const onEmojiClick = useCallback((emojiData: EmojiClickData) => {
    if (editableRef.current) {
      editableRef.current.focus();
      document.execCommand('insertText', false, emojiData.emoji);
      handleInputChangeEditable();
    }
  }, []);

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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',

          filters: { roomId, isPinned: true },
          sort: { timestamp: -1 },
        }),
      });
      const data = await res.json();

      setAllPinnedMessages(data.data || []);
    } catch (error) {
      console.error('Fetch Pinned messages error:', error);
    }
  }, [roomId]);

  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);
    fetchMessages();
    fetchPinnedMessages();
  }, [selectedChat, roomId, fetchPinnedMessages]);

  useEffect(() => {
    if (isGroup && (selectedChat as GroupConversation).members) {
      const m = (selectedChat as GroupConversation).members as unknown as MemberInfo[];

      setActiveMembers(m);
      setMemberCount(m.length);
    } else {
      setActiveMembers([]);
      setMemberCount(0);
    }
  }, [selectedChat, isGroup]);
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
  }, [roomId]);

  const handleRecallMessage = async (messageId: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recall',
          messageId,
          roomId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isRecalled: true } : m)));

        const socketData = {
          _id: messageId,
          roomId,
          sender: currentUser._id,
          isGroup: isGroup,
          receiver: isGroup ? null : getId(selectedChat),
          members: isGroup ? ((selectedChat as GroupConversation).members as any) : [],

          type: 'recall',
          content: 'Tin nhắn đã bị thu hồi',
          timestamp: Date.now(),
        };

        socketRef.current?.emit('recall_message', socketData);
      } else {
        alert('Không thể thu hồi: ' + data.message);
      }
    } catch (error) {
      console.error('Recall error:', error);
    }
  };

  const sendNotifyMessage = async (text: string) => {
    const newMsg: MessageCreate = {
      roomId: roomId,
      sender: currentUser._id,
      content: text,
      type: 'notify',
      timestamp: Date.now(),
    };
    await sendMessageProcess(newMsg);
  };

  const handleMemberRemoved = useCallback(
    async (removedMemberId: string, removedMemberName: string) => {
      setActiveMembers((prev) =>
        prev.filter((m) => {
          const mId = typeof m === 'string' ? m : m._id || (m as any).id;
          return String(mId) !== String(removedMemberId);
        }),
      );
      setMemberCount((prev) => Math.max(0, prev - 1));

      const myName = currentUser.name || 'Quản trị viên';

      await sendNotifyMessage(`${myName} đã mời ${removedMemberName} ra khỏi nhóm.`);
    },
    [currentUser.name, sendNotifyMessage],
  );

  const handleRoleChange = useCallback(
    async (memberId: string, memberName: string, newRole: 'ADMIN' | 'MEMBER') => {
      setActiveMembers((prev) =>
        prev.map((m) => {
          const mId = typeof m === 'string' ? m : m._id || (m as any).id;
          if (String(mId) === String(memberId)) {
            return { ...m, role: newRole };
          }
          return m;
        }),
      );

      const myName = currentUser.name || 'Quản trị viên';
      let actionText = '';

      if (newRole === 'ADMIN') {
        actionText = `đã bổ nhiệm ${memberName} làm phó nhóm.`;
      } else {
        actionText = `đã hủy quyền phó nhóm của ${memberName}.`;
      }

      await sendNotifyMessage(`${myName} ${actionText}`);
    },
    [currentUser.name, sendNotifyMessage],
  );

  const handleMembersAdded = useCallback(
    async (newUsers: User[]) => {
      if (!newUsers || newUsers.length === 0) return;

      const newMembersFormatted: MemberInfo[] = newUsers.map((u) => ({
        _id: u._id,
        name: u.name || 'Thành viên',
        avatar: u.avatar,
        role: 'MEMBER',
        joinedAt: Date.now(),
      }));

      setActiveMembers((prev) => [...prev, ...newMembersFormatted]);
      setMemberCount((prev) => prev + newUsers.length);

      const names = newUsers.map((u) => u.name);
      const myName = currentUser.name || 'Một thành viên';
      const nameString = names.join(', ');
      await sendNotifyMessage(`${myName} đã thêm ${nameString} vào nhóm.`);
    },
    [currentUser.name, sendNotifyMessage],
  );

  const markAsRead = async () => {
    if (!roomId || !currentUser) return;
    if (markedReadRef.current === roomId) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          roomId,
          userId: getId(currentUser),
        }),
      });
      markedReadRef.current = roomId;
      if (reLoad) reLoad();
    } catch (error) {
      console.error('Mark as read failed:', error);
    }
  };

  useEffect(() => {
    markedReadRef.current = null;
    markAsRead();
  }, [roomId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',
          filters: { roomId },
        }),
      });
      const data = await res.json();
      const sortedMsgs = (Array.isArray(data.data) ? data.data : []).sort(
        (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      setMessages(sortedMsgs);
    } catch (error) {
      console.error('Fetch messages error:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);
    fetchMessages();
  }, [selectedChat, roomId]);

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
  }, [showMentionMenu]);

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
    const newMsg: MessageCreate = {
      roomId,
      sender: currentUser._id,
      content: displayText,
      type: 'text',
      timestamp: Date.now(),
      replyToMessageId: replyingTo?._id,
      replyToMessageName: repliedUserName,
      mentions: mentions.length > 0 ? mentions : undefined,
    };

    // Xóa nội dung
    if (editableRef.current) {
      editableRef.current.innerHTML = '';
    }

    await sendMessageProcess(newMsg);
  };

  const sanitizeName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
  };

  const handleKeyDownEditable = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.min(prev + 1, mentionSuggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mentionSuggestions[selectedMentionIndex]) {
          selectMention(mentionSuggestions[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentionMenu(false);
        setMentionStartPos(null);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSenderInfo = (sender: User | string) => {
    if (typeof sender === 'object' && sender !== null) {
      return {
        _id: sender._id,
        name: sender.name || 'Unknown',
        avatar: sender.avatar,
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

  return (
    <main className="flex h-full bg-gray-700">
      <div
        className={`flex flex-col h-full bg-gray-200 transition-all duration-300 ${showPopup ? 'sm:w-[calc(100%-350px)]' : 'w-full'} border-r border-gray-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center space-x-2">
            <div
              className="truncate hover:bg-gray-100 hover:cursor-pointer rounded-lg p-2"
              onClick={() => setOpenMember(true)}
            >
              <h1 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{chatName}</h1>
              <p className="text-xs text-gray-500">{isGroup ? `${memberCount} thành viên` : 'Đang hoạt động'}</p>
            </div>
          </div>
          <button
            className="p-1 sm:p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            onClick={() => setShowPopup((prev) => !prev)}
          >
            <img
              src={showPopup ? IconShow1.src : IconShow.src}
              alt="More"
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain "
            />
          </button>
        </div>
        {allPinnedMessages.length > 0 && (
          <button
            onClick={() => setShowPinnedList(true)}
            className="flex items-center gap-1 rounded-lg shadow-lg p-2 m-2 bg-white hover:cursor-pointer hover:bg-gray-100"
            title={`Xem ${allPinnedMessages.length} tin nhắn đã ghim`}
          >
            {/* Icon Ghim (Pin Icon) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 rotate-45"
            >
              <path d="M11.25 4.755v7.5A1.75 1.75 0 019.5 14H5.75a.75.75 0 010-1.5h3.75a.25.25 0 00.25-.25v-7a.75.75 0 011.5 0zm-7.75 7.5a.75.75 0 01.75-.75H7.5a.75.75 0 010 1.5H4.25a.75.75 0 01-.75-.75z" />
            </svg>
            Danh sách tin nhắn ghim ({allPinnedMessages.length})
          </button>
        )}
        {/* 🔥 MODAL DANH SÁCH GHIM MỚI */}
        {showPinnedList && (
          <PinnedMessageListModal
            messages={allPinnedMessages}
            onClose={() => setShowPinnedList(false)}
            onJumpToMessage={handleJumpToMessage}
            onGetSenderName={getSenderName}
            onGetContentDisplay={(msg) => msg.content || msg.fileName || '[Media]'}
          />
        )}
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-100 flex flex-col">
          {Array.from(messagesGrouped.entries()).map(([dateKey, msgs]) => (
            <React.Fragment key={dateKey}>
              {/* Thanh hiển thị Ngày (Sticky ở trên) */}
              <div className="flex justify-center my-3 sticky top-0 z-10">
                <span className="text-xs text-gray-600 bg-gray-200/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                  {dateKey}
                </span>
              </div>
              {msgs.map((msg, index) => {
                const senderInfo = getSenderInfo(msg.sender);
                const isMe = senderInfo._id === currentUser._id;

                const repliedToMsg = msg.replyToMessageId ? messages.find((m) => m._id === msg.replyToMessageId) : null;

                const uploadProgress = uploadingFiles[msg._id];
                const isUploading = uploadProgress !== undefined;

                if (msg.type === 'notify') {
                  let contentDisplay = msg.content;

                  if (isMe && contentDisplay) {
                    const myName = currentUser.name || '';

                    if (contentDisplay.startsWith(myName)) {
                      contentDisplay = 'Bạn' + contentDisplay.substring(myName.length);
                    }
                  }

                  return (
                    <div key={index} className="flex justify-center my-3">
                      <div className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">
                        <p className="text-xs text-gray-500 font-medium">{contentDisplay}</p>
                      </div>
                    </div>
                  );
                }

                const prevMsg = index > 0 ? messages[index - 1] : null;
                let isGrouped = false;

                if (prevMsg && prevMsg.type !== 'notify') {
                  const prevSenderInfo = getSenderInfo(prevMsg.sender);
                  const currentTimestamp = new Date(msg.timestamp).getTime();
                  const prevTimestamp = new Date(prevMsg.timestamp).getTime();
                  if (prevSenderInfo._id === senderInfo._id && (currentTimestamp - prevTimestamp) / (1000 * 60) < 5) {
                    isGrouped = true;
                  }
                }

                const avatarChar = senderInfo.name ? senderInfo.name.charAt(0).toUpperCase() : '?';
                const senderName = allUsersMap.get(msg.sender) || senderInfo.name;

                const isRecalled = msg.isRecalled === true;

                return (
                  <div
                    key={msg._id || index}
                    id={`msg-${msg._id}`}
                    onContextMenu={(e) => handleContextMenu(e, msg)}
                    className={`max-w-[80%] sm:max-w-xs break-words flex gap-2 group 
                      ${isMe ? 'self-end' : 'self-start'}
                      ${isGrouped ? 'mt-1' : 'mt-4'}
                      transition-all duration-1000 ease-out
                      ${
                        highlightedMsgId === msg._id
                          ? 'bg-yellow-100 ring-8 ring-yellow-100 rounded-lg z-10 scale-105'
                          : ''
                      }
                `}
                  >
                    {/* {!isRecalled && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handlePinMessage(msg);
                        }}
                        className={`invisible group-hover:visible self-center p-1 text-gray-400 hover:text-blue-500 transition-colors ${isMe ? '' : 'order-1'}`}
                        title="Ghim tin nhắn"
                      >
                        <Image src={PinIcon} title="Ghim tin nhắn" width={20} height={20} alt="" />
                      </button>
                    )} */}

                    {/* Nút Thu hồi (Chỉ mình thấy) */}
                    {/* {isMe && !isRecalled && (
                      <button
                        onClick={() => handleRecallMessage(msg._id)}
                        className="invisible group-hover:visible self-center p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Thu hồi tin nhắn"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )} */}

                    {isMe && !isRecalled && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleReplyTo(msg);
                        }}
                        className="invisible group-hover:visible self-center p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Phản hồi"
                      >
                        <Image src={ReplyIcon} alt="" width={20} height={20} />
                      </button>
                    )}

                    {/*Nút Phản hồi (Cho cả mình và người khác) */}
                    {!isRecalled && !isMe && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleReplyTo(msg);
                        }}
                        className={`invisible group-hover:visible self-center p-1 text-gray-400 hover:text-blue-500 transition-colors ${isMe ? 'order-1' : 'order-3'}`}
                        title="Phản hồi"
                      >
                        <Image src={ReplyIcon} alt="" width={20} height={20} />
                      </button>
                    )}

                    {!isMe && (
                      <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : 'visible'}`}>
                        {senderInfo.avatar ? (
                          <img
                            src={senderInfo.avatar}
                            alt={senderInfo.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {avatarChar}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* 🔥 HIỂN THỊ TIN NHẮN GỐC ĐƯỢC REPLY */}
                      {repliedToMsg && (
                        <div
                          className={`w-full text-xs text-gray-500 border-l-2 border-blue-500 pl-2 mb-1 pt-1 pb-0.5 cursor-pointer hover:opacity-90 rounded-sm bg-gray-50 ${isMe ? 'text-right' : 'text-left'}`}
                          onClick={() => handleJumpToMessage(repliedToMsg._id)}
                        >
                          <p className="font-semibold">
                            {msg.replyToMessageName || allUsersMap.get(String(repliedToMsg.sender)) || 'Người dùng'}
                          </p>
                          <p className="truncate">
                            {repliedToMsg.isRecalled
                              ? 'Tin nhắn đã bị thu hồi'
                              : repliedToMsg.content || `[${repliedToMsg.type}]`}
                          </p>
                        </div>
                      )}
                      <div
                        className={`p-2 rounded-lg shadow-sm 
                          ${isMe ? 'bg-blue-100 text-black' : 'bg-white text-black'}
                          ${(msg.type === 'sticker' && !isRecalled) || isVideoFile(msg.fileUrl) ? '!bg-transparent !shadow-none !p-0' : ''} 
                          ${!isGrouped ? (isMe ? 'rounded-br-none' : 'rounded-bl-none') : ''}
                          ${isRecalled ? '!bg-gray-200 !text-gray-500 italic border border-gray-300' : ''}
                        `}
                      >
                        {isGroup && !isMe && !isGrouped && !isRecalled && (
                          <p className="text-gray-500 text-[10px] pb-1 font-medium">{senderName}</p>
                        )}

                        {/* 🔥 MỚI: LOGIC HIỂN THỊ NỘI DUNG */}
                        {isRecalled ? (
                          <p className="text-sm text-gray-500">Tin nhắn đã bị thu hồi</p>
                        ) : (
                          <>
                            {msg.type === 'text' && (
                              <div>{renderMessageContent(msg.content || '', msg.mentions, isMe)}</div>
                            )}

                            {msg.type === 'sticker' && msg.fileUrl && (
                              <img
                                src={msg.fileUrl}
                                alt="Sticker"
                                className="w-32 h-32 object-contain hover:scale-105 transition-transform"
                              />
                            )}

                            {/* --- RENDER IMAGE --- */}
                            {msg.type === 'image' && msg.fileUrl && (
                              <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded border border-gray-200 relative overflow-hidden">
                                <img
                                  src={isUploading ? msg.fileUrl : getProxyUrl(msg.fileUrl)}
                                  alt="Ảnh gửi"
                                  className={`bg-blue-500 transition-all duration-200 rounded-lg max-w-full cursor-pointer ${isUploading ? 'opacity-50' : 'hover:opacity-90'}`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error';
                                  }}
                                />

                                {/* 🔥 LOADING OVERLAY CHO ẢNH */}
                                {isUploading && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                                      {Math.round(uploadProgress)}%
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* --- RENDER FILE / VIDEO --- */}
                            {msg.type === 'file' && !isVideoFile(msg.fileUrl) && msg.fileUrl && (
                              <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded border border-gray-200 relative overflow-hidden">
                                {isUploading && (
                                  <div
                                    className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-200"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                )}

                                {isVideoFile(msg.fileName) ? (
                                  <div className="relative">
                                    <video controls={!isUploading} className={isUploading ? 'opacity-50' : ''}>
                                      <source src={isUploading ? msg.fileUrl : getProxyUrl(msg.fileUrl)} />
                                    </video>
                                    {isUploading && (
                                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold bg-black/40">
                                        {Math.round(uploadProgress)}%
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <img src={IconFile.src} className="w-6 h-6" />
                                    <div className="flex flex-col">
                                      <a
                                        href={!isUploading ? msg.fileUrl : '#'}
                                        download={msg.fileName}
                                        target="_blank"
                                        className={`text-sm underline truncate max-w-[150px] break-words ${isUploading ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'}`}
                                      >
                                        {msg.fileName || 'File'}
                                      </a>
                                      {isUploading && (
                                        <span className="text-[10px] text-gray-500">
                                          Đang gửi {Math.round(uploadProgress)}%...
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        <p className="text-[10px] sm:text-xs opacity-75 mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Phần Footer (Input Chat) giữ nguyên */}
        <div className="bg-white p-2 sm:p-3 border-t border-gray-200 relative">
          {/* ... Popup Picker & Inputs ... */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-white shadow-xl border border-gray-200 rounded-xl z-50 w-full sm:w-80 flex flex-col overflow-hidden">
              {/* Tab chuyển đổi */}
              <div className="flex border-b">
                <button
                  className={`flex-1 p-2 text-sm font-medium ${pickerTab === 'emoji' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setPickerTab('emoji')}
                >
                  Emoji
                </button>
                <button
                  className={`flex-1 p-2 text-sm font-medium ${pickerTab === 'sticker' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
                  onClick={() => setPickerTab('sticker')}
                >
                  <img src={IconSticker.src} alt="Sticker" className="w-4 h-4 inline mr-1" />
                  Sticker
                </button>
              </div>

              {/* Nội dung Tab */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {pickerTab === 'emoji' ? (
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    width="100%"
                    height="350px"
                    searchDisabled={false}
                    skinTonesDisabled
                  />
                ) : (
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {STICKERS.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="sticker"
                        className="w-full h-16 object-contain cursor-pointer hover:bg-gray-100 rounded p-1"
                        onClick={() => handleSendSticker(url)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {replyingTo && (
            <div className="absolute bottom-full left-0 right-0 p-3 bg-blue-50 border-t border-blue-200 flex justify-between items-center text-sm text-gray-700">
              <div className="border-l-2 border-blue-600 pl-2">
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Trả lời {getSenderName(replyingTo.sender)}
                </div>
                <p className="truncate text-xs text-gray-700">
                  {replyingTo.isRecalled ? 'Tin nhắn đã bị thu hồi' : replyingTo.content || `[${replyingTo.type}]`}
                </p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-red-500 hover:text-red-700 p-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Mention Menu */}
          {showMentionMenu && mentionSuggestions.length > 0 && (
            <div
              ref={mentionMenuRef}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50"
            >
              <div className="p-2 border-b bg-gray-50">
                <p className="text-xs text-gray-600 font-medium">Chọn người để mention</p>
              </div>
              {mentionSuggestions.map((user, index) => {
                const userId = user._id || (user as any).id;
                const userName = user.name || 'User';
                const userAvatar = user.avatar;

                return (
                  <button
                    key={userId}
                    onClick={() => selectMention(user)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors ${
                      index === selectedMentionIndex ? 'bg-blue-100' : ''
                    }`}
                  >
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center font-semibold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left flex-1">
                      <p className="font-medium text-gray-800 text-sm">{userName}</p>
                      <p className="text-xs text-gray-500">@{userName.toLowerCase().replace(/\s+/g, '')}</p>
                    </div>
                    {index === selectedMentionIndex && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5 text-blue-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {/* --- INPUT CHAT --- */}
          <div className="flex items-center space-x-2">
            {/* --- NÚT MỞ POPUP --- */}
            <button
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              {/* Icon mặt cười */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                />
              </svg>
            </button>

            {/* --- INPUT ẢNH --- */}
            <input
              type="file"
              accept="image/*"
              id="imageInput"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadAndSend(e.target.files[0], 'image');
                }
                e.target.value = '';
              }}
            />
            <button
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
              onClick={() => document.getElementById('imageInput')?.click()}
            >
              <Image src={IamgeIcon} alt="" width={25} height={25} />
            </button>

            {/* --- INPUT FILE --- */}
            <input
              type="file"
              id="fileInput"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadAndSend(e.target.files[0], 'file');
                }
                e.target.value = '';
              }}
            />
            <button
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Image src={FileICon} alt="" width={25} height={25} />
            </button>

            <button
              className={`p-2 rounded-full transition-all ${
                isListening
                  ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              onClick={handleVoiceInput}
              title="Nhập bằng giọng nói"
            >
              {/* Icon Micro SVG */}
              <Image src={MicroIcon} alt="" width={20} height={20} />
            </button>

            <div
              ref={editableRef}
              contentEditable
              onInput={handleInputChangeEditable}
              onKeyDown={handleKeyDownEditable}
              onFocus={() => setShowEmojiPicker(false)}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
                handleInputChangeEditable();
              }}
              className="flex-1 p-2 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm text-black min-h-[40px] max-h-[120px] overflow-y-auto"
              data-placeholder="Nhập tin nhắn... (gõ @ để mention)"
              style={{
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            />

            <style jsx>{`
              [contenteditable]:empty:before {
                content: attr(data-placeholder);
                color: #9ca3af;
                pointer-events: none;
              }
            `}</style>

            <button className="p-2 rounded-full hover:bg-blue-100 text-blue-500" onClick={handleSendMessage}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
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
    </main>
  );
}
