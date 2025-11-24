'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import io, { type Socket } from 'socket.io-client';

import { User } from '@/types/User';
import { ChatItem, GroupConversation } from '@/types/Group';
import type { GlobalSearchMessage, GlobalSearchContact } from '@/components/(home)/HomeOverlays';

type SearchContact = ChatItem;

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

const SOCKET_URL = 'http://localhost:3002';

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

  const handleSelectContact = useCallback(
    (contact: GlobalSearchContact) => {
      // Đóng modal
      setShowGlobalSearchModal(false);

      // Reset scroll state
      setScrollToMessageId(null);

      // Tìm contact đầy đủ từ allUsers hoặc groups
      let fullContact: ChatItem | null = null;

      if (contact.isGroup) {
        fullContact = groups.find((g) => g._id === contact._id) ?? null;
      } else {
        fullContact = allUsers.find((u) => u._id === contact._id) ?? null;
      }

      if (!fullContact) {
        console.warn('Contact not found:', contact._id);
        return;
      }

      // Chọn chat
      setSelectedChat(fullContact);

      // Reset unread count
      if ((fullContact as GroupConversation).isGroup || (fullContact as GroupConversation).members) {
        setGroups((prev) => prev.map((g) => (g._id === fullContact!._id ? { ...g, unreadCount: 0 } : g)));
      } else {
        setAllUsers((prev) => prev.map((u) => (u._id === fullContact!._id ? { ...u, unreadCount: 0 } : u)));
      }
    },
    [groups, allUsers],
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
        const allMessages = (messageData.data || []) as any[];
        
        // Filter messages to only include allowed types and map to GlobalSearchMessage format
        const messages: GlobalSearchMessage[] = allMessages
          .filter((msg: any) => ['text', 'image', 'file', 'sticker'].includes(msg.type))
          .map((msg: any) => ({
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

  // 🔥 HÀM MỞ MODAL TÌM KIẾM TOÀN CỤC
  const handleOpenGlobalSearch = () => {
    // Reset trạng thái tìm kiếm và mở Modal
    setGlobalSearchTerm('');
    setGlobalSearchResults({ contacts: [], messages: [] });
    setShowGlobalSearchModal(true);
  };

  // ============================================================
  // 🔥 FETCH CURRENT USER
  // ============================================================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true);
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('info_user') ?? '{}'));
      } catch {
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, [router]);

  // 2. Hàm Fetch Data (User & Group)
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
      console.error(e);
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
      console.error(e);
    }
  }, [currentUser]);

  const handleNavigateToMessage = useCallback(
    (message: GlobalSearchMessage) => {
      console.log('💬 ========== Navigate to message START ==========');
      console.log('💬 Full message data:', message);

      let targetChat: ChatItem | null = null;
      const myId = String(currentUser?._id);

      // 🔥 CASE 1: TIN NHẮN TRONG GROUP (Kiểm tra isGroupChat flag)
      if (message.isGroupChat === true && message.roomId) {
        console.log('🔍 [GROUP] Detected group message. Looking for roomId:', message.roomId);
        console.log(
          '📋 [GROUP] Available groups:',
          groups.map((g) => ({
            id: String(g._id),
            name: g.name,
            match: String(g._id) === String(message.roomId),
          })),
        );

        targetChat = groups.find((g) => String(g._id) === String(message.roomId)) ?? null;

        if (targetChat) {
          console.log('✅ [GROUP] Found group:', (targetChat as GroupConversation).name);
        } else {
          console.warn('❌ [GROUP] Not found! Will try to refetch...');

          // Fallback: Fetch lại groups
          fetchAllData().then(() => {
            console.log('🔄 [GROUP] Refetch complete. Retrying find...');
            const retryFind = groups.find((g) => String(g._id) === String(message.roomId));
            if (retryFind) {
              console.log('✅ [GROUP] Found after refetch:', retryFind.name);
              setShowGlobalSearchModal(false);
              setScrollToMessageId(String(message._id));
              setSelectedChat(retryFind);
              setGroups((prev) => prev.map((g) => (g._id === retryFind._id ? { ...g, unreadCount: 0 } : g)));
            } else {
              console.error('❌ [GROUP] Still not found after refetch!');
              alert('Không tìm thấy nhóm: ' + (message.displayRoomName || message.roomId));
            }
          });
          return;
        }
      }
      // 🔥 CASE 2: TIN NHẮN CHAT 1-1 (isGroupChat = false)
      else if (message.isGroupChat === false) {
        console.log('🔍 [1-1] Detected 1-1 chat message');
        let partnerId: string | null = null;

        // Ưu tiên 1: Dùng partnerId từ API
        if (message.partnerId) {
          partnerId = String(message.partnerId);
          console.log('  ✅ [1-1] Using partnerId from API:', partnerId);
        }
        // Ưu tiên 2: Parse từ roomId
        else if (message.roomId && message.roomId.includes('_')) {
          const parts = message.roomId.split('_');
          partnerId = parts[0] === myId ? parts[1] : parts[0];
          console.log('  ⚠️ [1-1] Parsed partnerId from roomId:', partnerId);
        }
        // Ưu tiên 3: Sender/receiver
        else {
          const senderId = String(message.sender);
          const receiverId = message.receiver ? String(message.receiver) : null;
          partnerId = senderId === myId ? receiverId : senderId;
          console.log('  ⚠️ [1-1] Using sender/receiver:', partnerId);
        }

        if (partnerId) {
          console.log('  🔎 [1-1] Looking for partnerId in allUsers:', partnerId);
          console.log(
            '  📋 [1-1] Available users (first 3):',
            allUsers.slice(0, 3).map((u) => ({
              id: u._id,
              name: u.name,
              match: String(u._id) === partnerId,
            })),
          );

          targetChat = allUsers.find((u) => String(u._id) === partnerId) ?? null;

          if (targetChat) {
            console.log('✅ [1-1] Found user:', (targetChat as User).name);
          } else {
            console.error('❌ [1-1] User not found!');

            // Fallback: Refetch users
            fetchAllData().then(() => {
              console.log('🔄 [1-1] Refetch complete. Retrying find...');
              const retryFind = allUsers.find((u) => String(u._id) === partnerId);
              if (retryFind) {
                console.log('✅ [1-1] Found after refetch:', retryFind.name);
                setShowGlobalSearchModal(false);
                setScrollToMessageId(String(message._id));
                setSelectedChat(retryFind);
                setAllUsers((prev) => prev.map((u) => (u._id === retryFind._id ? { ...u, unreadCount: 0 } : u)));
              } else {
                alert('Không tìm thấy người dùng này.');
              }
            });
            return;
          }
        } else {
          console.error('❌ [1-1] Could not determine partnerId!');
          alert('Không thể xác định người chat.');
          return;
        }
      }
      // ⚠️ CASE 3: Không xác định được loại (Lỗi dữ liệu)
      else {
        console.error('❌ Cannot determine message type! isGroupChat:', message.isGroupChat);
        alert('Dữ liệu tin nhắn không hợp lệ. Vui lòng báo lỗi cho admin.');
        return;
      }

      // ========== KẾT QUẢ ==========
      if (!targetChat) {
        console.error('❌ CRITICAL ERROR: targetChat is null after all checks!');
        console.error('Available data:', {
          groupsCount: groups.length,
          usersCount: allUsers.length,
          message,
        });
        alert('Lỗi nghiêm trọng: Không thể mở cuộc trò chuyện. Vui lòng F5 refresh trang.');
        console.log('💬 ========== Navigate to message END (FAILED) ==========');
        return;
      }

      console.log('🎯 SUCCESS! Opening chat:', {
        id: targetChat._id,
        name: (targetChat as User | GroupConversation).name,
        isGroup: (targetChat as GroupConversation).isGroup || (targetChat as GroupConversation).members,
      });

      setShowGlobalSearchModal(false);
      setScrollToMessageId(String(message._id));
      setSelectedChat(targetChat);

      // Reset unread
      if ((targetChat as GroupConversation).isGroup || (targetChat as GroupConversation).members) {
        setGroups((prev) => prev.map((g) => (g._id === targetChat!._id ? { ...g, unreadCount: 0 } : g)));
      } else {
        setAllUsers((prev) => prev.map((u) => (u._id === targetChat!._id ? { ...u, unreadCount: 0 } : u)));
      }

      console.log('💬 ========== Navigate to message END (SUCCESS) ==========');
    },
    [groups, allUsers, currentUser, fetchAllData],
  );

  // 3. Gọi Fetch lần đầu
  useEffect(() => {
    if (currentUser) fetchAllData();
  }, [currentUser, fetchAllData]);

  // 4. Kết nối Socket & Xử lý Realtime Sidebar
  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_room', currentUser._id);

    socketRef.current.on('update_sidebar', (data: SidebarUpdateData) => {
      const isMyMsg = data.sender === currentUser._id;

      // 1. Xác định tên người gửi (Fix lỗi senderName có thể thiếu)
      let senderName = 'Người lạ';
      if (isMyMsg) {
        senderName = 'Bạn';
      } else {
        // Tìm trong list user hiện có
        const foundUser = allUsers.find((u) => u._id === data.sender);
        if (foundUser) senderName = foundUser.name || 'Người lạ';
        // Nếu server có gửi kèm senderName thì ưu tiên dùng
        if (data.senderName) senderName = data.senderName;
      }

      // 2. Format nội dung tin nhắn hiển thị
      let contentDisplay = '';
      if (data.isRecalled) {
        contentDisplay = 'Tin nhắn đã bị thu hồi';
        if (isMyMsg) contentDisplay = 'Bạn: Tin nhắn đã bị thu hồi';
        else contentDisplay = `${senderName}: Tin nhắn đã bị thu hồi`;
      } else {
        const rawContent = data.type === 'text' ? data.content : `[${data.type}]`;
        contentDisplay = `${senderName}: ${rawContent}`;
      }

      // 3. CẬP NHẬT STATE (Bỏ fetchAllData để tránh xung đột)
      if (data.isGroup) {
        setGroups((prev) => {
          const index = prev.findIndex((g) => g._id === data.roomId);

          // Nếu không tìm thấy nhóm trong list hiện tại (Nhóm mới tạo hoặc chưa load)
          if (index === -1) {
            fetchAllData();
            return prev;
          }

          const updatedGroup = {
            ...prev[index],
            lastMessage: contentDisplay,
            lastMessageAt: Date.now(),
            isRecall: data.isRecalled || false,
          };

          if (!isMyMsg) {
            updatedGroup.unreadCount = (updatedGroup.unreadCount || 0) + 1;
          }

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
          };

          if (!isMyMsg) {
            updatedUser.unreadCount = (updatedUser.unreadCount || 0) + 1;
          }

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

  const handleChatAction = async (
    roomId: string,
    actionType: 'pin' | 'hide',
    isChecked: boolean,
    isGroupChat: boolean,
  ) => {
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
  };

  // 6. Xử lý chọn Chat (Optimistic Update - Xóa badge)
  const handleSelectChat = (item: ChatItem) => {
    setSelectedChat(item);

    if ((item as GroupConversation).isGroup || (item as GroupConversation).members) {
      setGroups((prev) => prev.map((g) => (g._id === item._id ? { ...g, unreadCount: 0 } : g)));
    } else {
      setAllUsers((prev) => prev.map((u) => (u._id === item._id ? { ...u, unreadCount: 0 } : u)));
    }
  };

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
