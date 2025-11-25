'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import io, { type Socket } from 'socket.io-client';

import { User } from '@/types/User';
import { ChatItem, GroupConversation } from '@/types/Group';
import type { GlobalSearchMessage, GlobalSearchContact } from '@/components/(home)/HomeOverlays'; // Cập nhật đường dẫn nếu cần // Cập nhật đường dẫn nếu cần

interface SidebarUpdateData {
  sender: string;
  senderName?: string;
  receiver?: string;
  type?: string;
  content?: string;
  isRecalled?: boolean;
  isGroup?: boolean;
  roomId: string;
  members?: Array<string | { _id: string }>;
}

// Kiểu dữ liệu cho bản ghi tin nhắn trả về từ API globalSearch
interface GlobalSearchMessageApi {
  _id: string;
  content: string;
  type: string;
  fileName?: string;
  timestamp: number;
  sender: string;
  senderName?: string;
  roomId: string;
  roomName?: string;
  isGroupChat?: boolean;
  partnerId?: string;
  partnerName?: string;
  fileUrl?: string;
  receiver?: string;
  displayRoomName?: string;
}

const SOCKET_URL = 'http://localhost:3002'; // Đã thống nhất dùng 3001 từ component HomePage

export function useHomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State quản lý dữ liệu
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{
    contacts: GlobalSearchContact[];
    messages: GlobalSearchMessage[];
  }>({
    contacts: [],
    messages: [],
  });

  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);

  // 1. Hàm Fetch Data (User & Group)
  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;

    // Fetch Users
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', currentUserId: currentUser._id }),
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setAllUsers(list.filter((u: User) => u._id !== currentUser._id));
    } catch (e) {
      console.error('Fetch users error:', e);
    }

    // Fetch Groups
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'readGroups', _id: currentUser._id }),
      });
      const data = await res.json();

      if (data.data) {
        setGroups(data.data);
      }
    } catch (e) {
      console.error('Fetch groups error:', e);
    }
  }, [currentUser]);

  // Hàm xử lý chọn Chat (Optimistic Update - Xóa badge)
  const handleSelectChat = useCallback((item: ChatItem) => {
    setSelectedChat(item);

    if ((item as GroupConversation).isGroup || (item as GroupConversation).members) {
      setGroups((prev) => prev.map((g) => (g._id === item._id ? { ...g, unreadCount: 0 } : g)));
    } else {
      setAllUsers((prev) => prev.map((u) => (u._id === item._id ? { ...u, unreadCount: 0 } : u)));
    }
  }, []);

  const handleSelectContact = useCallback(
    (contact: GlobalSearchContact) => {
      setShowGlobalSearchModal(false);
      setScrollToMessageId(null);

      // Tìm contact đầy đủ từ allUsers hoặc groups
      let fullContact: ChatItem | null = null;
      if (contact.isGroup) {
        fullContact = groups.find((g) => g._id === contact._id) ?? null;
      } else {
        fullContact = allUsers.find((u) => u._id === contact._id) ?? null;
      }

      if (fullContact) {
        // Chọn chat bằng hàm đã tối ưu
        handleSelectChat(fullContact);
      } else {
        console.warn('Contact not found:', contact._id);
      }
    },
    [groups, allUsers, handleSelectChat],
  );

  const handleGlobalSearch = useCallback(
    async (term: string) => {
      setGlobalSearchTerm(term);

      if (!term.trim() || !currentUser) {
        setGlobalSearchResults({ contacts: [], messages: [] });
        return;
      }

      const lowerCaseTerm = term.toLowerCase();

      // 1. Lọc liên hệ/nhóm (Local - Instant)
      const allChats = [...groups, ...allUsers];
      const contactResults: GlobalSearchContact[] = allChats
        .filter((c) => c.name?.toLowerCase().includes(lowerCaseTerm))
        .filter((c) => !c.isHidden)
        .map((c) => ({
          _id: c._id,
          name: c.name,
          avatar: c.avatar,
          isGroup: (c as GroupConversation).isGroup || !!(c as GroupConversation).members,
        }))
        .slice(0, 10); // Giới hạn 10 kết quả

      // 2. Gọi API tìm kiếm tin nhắn (Backend)
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'globalSearch',
            data: {
              userId: currentUser._id,
              searchTerm: term,
              limit: 50,
            },
          }),
        });

        const messageData = await res.json();
        const allMessages = (messageData.data || []) as GlobalSearchMessageApi[];

        const messages: GlobalSearchMessage[] = allMessages
          .filter((msg: GlobalSearchMessageApi) => ['text', 'image', 'file', 'sticker'].includes(msg.type))
          .map((msg: GlobalSearchMessageApi) => ({
            _id: msg._id,
            content: msg.content,
            type: msg.type as 'text' | 'image' | 'file' | 'sticker',
            fileName: msg.fileName,
            timestamp: msg.timestamp,
            sender: msg.sender,
            senderName: msg.senderName || '',
            roomId: msg.roomId,
            roomName: msg.roomName || '',
            isGroupChat: msg.isGroupChat || false,
            partnerId: msg.partnerId,
            partnerName: msg.partnerName,
            fileUrl: msg.fileUrl,
            receiver: msg.receiver,
            displayRoomName: msg.displayRoomName,
          }));

        setGlobalSearchResults({
          contacts: contactResults,
          messages,
        });
      } catch (e) {
        console.error('Global search API error:', e);
        setGlobalSearchResults({ contacts: contactResults, messages: [] });
      }
    },
    [currentUser, groups, allUsers],
  );

  // 🔥 HÀM MỞ / ĐÓNG MODAL TÌM KIẾM TOÀN CỤC (TOGGLE)
  const handleOpenGlobalSearch = useCallback(() => {
    setShowGlobalSearchModal((prev) => {
      const next = !prev;
      if (next) {
        // Khi mở lại modal thì reset state tìm kiếm
        setGlobalSearchTerm('');
        setGlobalSearchResults({ contacts: [], messages: [] });
      }
      return next;
    });
  }, []);

  const handleNavigateToMessage = useCallback(
    (message: GlobalSearchMessage) => {
      console.log('💬 ========== Navigate to message START ==========');
      let targetChat: ChatItem | null = null;
      const myId = String(currentUser?._id);

      // Cố gắng tìm chat dựa trên message
      // Cố gắng tìm chat dựa trên message
      if (message.isGroupChat === true && message.roomId) {
        targetChat = groups.find((g) => String(g._id) === String(message.roomId)) ?? null;
      } else if (message.isGroupChat === false) {
        let partnerId: string | null = null;
        if (message.partnerId) {
          partnerId = String(message.partnerId);
        } else if (message.roomId && message.roomId.includes('_')) {
          const parts = message.roomId.split('_');
          partnerId = parts[0] === myId ? parts[1] : parts[0];
        } else {
          const senderId = String(message.sender);
          const receiverId = message.receiver ? String(message.receiver) : null;
          partnerId = senderId === myId ? receiverId : senderId;
        }

        if (partnerId) {
          targetChat = allUsers.find((u) => String(u._id) === partnerId) ?? null;
        }
      }

      // Logic mở chat và scroll
      if (targetChat) {
        setShowGlobalSearchModal(false);
        setScrollToMessageId(String(message._id));
        handleSelectChat(targetChat); // Tái sử dụng hàm select/reset unread

        console.log('🎯 SUCCESS! Opening chat and setting scroll ID.');
      } else {
        // Fallback nếu không tìm thấy: Refetch và thử lại
        console.warn('❌ Chat not found locally. Refetching data...');
        fetchAllData().then(() => {
          console.log('🔄 Refetch complete. User must click again or perform complex retry logic.');
          // Thường sau khi refetch, người dùng phải click lại hoặc cần một logic retry phức tạp
          alert('Không tìm thấy cuộc trò chuyện. Đã tải lại dữ liệu, vui lòng thử lại.');
        });
      }
    },
    [groups, allUsers, currentUser, fetchAllData, handleSelectChat],
  );

  // ============================================================
  // 🔥 FETCH CURRENT USER
  // ============================================================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem('info_user') || '{}');
        if (user && user._id) {
          setCurrentUser(user);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, [router]);

  // 3. Gọi Fetch Data lần đầu
  useEffect(() => {
    if (currentUser) fetchAllData();
  }, [currentUser, fetchAllData]);

  // 4. Kết nối Socket & Xử lý Realtime Sidebar
  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_room', currentUser._id);

    socketRef.current.on('update_sidebar', (data: any) => {
      const isMyMsg = data.sender === currentUser._id;

      // 1. Xác định tên người gửi
      let senderName = 'Người lạ';
      if (isMyMsg) {
        senderName = 'Bạn';
      } else {
        const foundUser = allUsers.find((u) => u._id === data.sender);
        if (foundUser) senderName = foundUser.name || 'Người lạ';
        if (data.senderName) senderName = data.senderName;
      }

      // 2. Format nội dung tin nhắn hiển thị
      let contentDisplay = '';
      if (data.isRecalled) {
        contentDisplay = isMyMsg ? 'Bạn: Tin nhắn đã bị thu hồi' : `${senderName}: Tin nhắn đã bị thu hồi`;
      } else {
        const rawContent = data.type === 'text' ? data.content : `[${data.type}]`;
        contentDisplay = `${senderName}: ${rawContent}`;
      }

      // 3. CẬP NHẬT STATE
      if (data.isGroup) {
        setGroups((prev) => {
          const index = prev.findIndex((g) => g._id === data.roomId);
          if (index === -1) {
            fetchAllData();
            return prev;
          }
          const updatedGroup = {
            ...prev[index],
            lastMessage: contentDisplay,
            lastMessageAt: Date.now(),
            isRecall: data.isRecalled || false,
            unreadCount: !isMyMsg ? (prev[index].unreadCount || 0) + 1 : prev[index].unreadCount,
          };
          const newGroups = [...prev];
          newGroups.splice(index, 1);
          return [updatedGroup, ...newGroups];
        });
      } else {
        // --- Xử lý 1-1 (User List) ---
        const partnerId = isMyMsg ? data.receiver : data.sender;
        setAllUsers((prev) => {
          const index = prev.findIndex((u) => u._id === partnerId);
          if (index === -1) {
            fetchAllData();
            return prev;
          }
          const updatedUser = {
            ...prev[index],
            lastMessage: contentDisplay,
            lastMessageAt: Date.now(),
            isRecall: data.isRecalled || false,
            unreadCount: !isMyMsg ? (prev[index].unreadCount || 0) + 1 : prev[index].unreadCount,
          };
          const newUsers = [...prev];
          newUsers.splice(index, 1);
          return [updatedUser, ...newUsers];
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser, fetchAllData, allUsers]);

  // 5. Xử lý Chat Action (Pin/Hide)
  const handleChatAction = useCallback(
    async (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => {
      if (!currentUser?._id) return;

      const apiRoute = isGroupChat ? '/api/groups' : '/api/users';

      try {
        const payload: {
          action: 'toggleChatStatus';
          _id: string;
          currentUserId: string;
          roomId: string;
          conversationId: string;
          data: { isPinned?: boolean; isHidden?: boolean };
        } = {
          action: 'toggleChatStatus',
          _id: currentUser._id,
          currentUserId: currentUser._id,
          roomId,
          conversationId: roomId,
          data: actionType === 'pin' ? { isPinned: isChecked } : { isHidden: isChecked },
        };

        const res = await fetch(apiRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          if (isGroupChat) {
            setGroups((prev) =>
              prev.map((chat) => {
                if (chat._id === roomId) {
                  const updateField = actionType === 'pin' ? 'isPinned' : 'isHidden';
                  return { ...chat, [updateField]: isChecked };
                }
                return chat;
              }),
            );
          } else {
            setAllUsers((prev) =>
              prev.map((chat) => {
                if (chat._id === roomId) {
                  const updateField = actionType === 'pin' ? 'isPinned' : 'isHidden';
                  return { ...chat, [updateField]: isChecked };
                }
                return chat;
              }),
            );
          }

          setTimeout(() => {
            fetchAllData();
          }, 500);
        }
      } catch (error) {
        console.error(`Lỗi ${actionType} chat:`, error);
      }
    },
    [currentUser, fetchAllData],
  );

  return {
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
  };
}
