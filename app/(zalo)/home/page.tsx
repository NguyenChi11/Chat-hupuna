'use client';

import 'swiper/css';
import 'swiper/css/pagination';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

// Component Import
import ChatWindow from '@/ui/base/ChatPopup';
import CreateGroupModal from '@/ui/base/CreateGroupModal';
import Sidebar from '@/ui/base/Sidebar';
// Data & Utils
import { banners } from '@/(zalo)/home/dataBanner';
import { User } from '@/types/User';
import { ChatItem, GroupConversation } from '@/types/Group';
import GlobalSearchModal from '@/ui/base/GlobalSearchModal';

const SOCKET_URL = 'http://localhost:3001';

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State quản lý dữ liệu
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<GroupConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const socketRef = useRef<any>(null);

  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{ contacts: any[]; messages: any[] }>({
    contacts: [],
    messages: [],
  });

  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);

  const handleSelectContact = useCallback((phonebook: any) => {
    console.log('📱 Select phonebook:', phonebook);

    // Đóng modal
    setShowGlobalSearchModal(false);

    // Reset scroll state
    setScrollToMessageId(null);

    // Chọn chat
    setSelectedChat(phonebook);

    // Reset unread count
    if (phonebook.isGroup || phonebook.members) {
      setGroups((prev) => prev.map((g) => (g._id === phonebook._id ? { ...g, unreadCount: 0 } : g)));
    } else {
      setAllUsers((prev) => prev.map((u) => (u._id === phonebook._id ? { ...u, unreadCount: 0 } : u)));
    }
  }, []);

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
      const contactResults = allChats
        .filter((c) => c.name?.toLowerCase().includes(lowerCaseTerm))
        .filter((c) => !c.isHidden)
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

        setGlobalSearchResults({
          contacts: contactResults,
          messages: messageData.data || [],
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
  // ============================================================ // 🔥 FETCH CURRENT USER // ============================================================
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
  // ================= FETCH CURRENT USER =================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsLoading(true);
      try {
        setCurrentUser(JSON.parse(localStorage.getItem('info_user') || ''));
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
        //
        // if(selectedChat) {
        //     const updateGroup = data.data.groups.find((g: GroupConversation) => g._id === selectedChat._id);
        //     if (updateGroup) {
        //         setSelectedChat(updateGroup);
        //     }
        // }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleNavigateToMessage = useCallback(
    (message: any) => {
      console.log('💬 ========== Navigate to message START ==========');
      console.log('💬 Full message data:', message);

      let targetChat: any = null;
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

        targetChat = groups.find((g) => String(g._id) === String(message.roomId));

        if (targetChat) {
          console.log('✅ [GROUP] Found group:', targetChat.name);
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

          targetChat = allUsers.find((u) => String(u._id) === partnerId);

          if (targetChat) {
            console.log('✅ [1-1] Found user:', targetChat.name);
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
      if (targetChat) {
        console.log('🎯 SUCCESS! Opening chat:', {
          id: targetChat._id,
          name: targetChat.name,
          isGroup: targetChat.isGroup || targetChat.members,
        });

        setShowGlobalSearchModal(false);
        setScrollToMessageId(String(message._id));
        setSelectedChat(targetChat);

        // Reset unread
        if (targetChat.isGroup || targetChat.members) {
          setGroups((prev) => prev.map((g) => (g._id === targetChat._id ? { ...g, unreadCount: 0 } : g)));
        } else {
          setAllUsers((prev) => prev.map((u) => (u._id === targetChat._id ? { ...u, unreadCount: 0 } : u)));
        }

        console.log('💬 ========== Navigate to message END (SUCCESS) ==========');
      } else {
        console.error('❌ CRITICAL ERROR: targetChat is null after all checks!');
        console.error('Available data:', {
          groupsCount: groups.length,
          usersCount: allUsers.length,
          message,
        });
        alert('Lỗi nghiêm trọng: Không thể mở cuộc trò chuyện. Vui lòng F5 refresh trang.');
        console.log('💬 ========== Navigate to message END (FAILED) ==========');
      }
    },
    [groups, allUsers, currentUser, fetchAllData],
  );

  // 3. Gọi Fetch lần đầu
  useEffect(() => {
    if (currentUser) fetchAllData();
  }, [currentUser, fetchAllData]);

  // 4. Kết nối Socket & Xử lý Realtime Sidebar
  // 4. Kết nối Socket & Xử lý Realtime Sidebar
  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_room', currentUser._id);

    socketRef.current.on('update_sidebar', (data: any) => {
      // console.log('Socket update_sidebar received:', data);

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
        if (isMyMsg)
          contentDisplay = 'Bạn: Tin nhắn đã bị thu hồi'; // Format cho mình
        else contentDisplay = `${senderName}: Tin nhắn đã bị thu hồi`; // Format cho người khác
      } else {
        // Nếu là text thì hiện text, nếu là ảnh/file thì hiện [Image]/[File]
        const rawContent = data.type === 'text' ? data.content : `[${data.type}]`;
        contentDisplay = `${senderName}: ${rawContent}`;
      }

      // 3. CẬP NHẬT STATE (Bỏ fetchAllData để tránh xung đột)
      if (data.isGroup) {
        setGroups((prev) => {
          const index = prev.findIndex((g) => g._id === data.roomId);

          // 🔥 QUAN TRỌNG: Nếu không tìm thấy nhóm trong list hiện tại (Nhóm mới tạo hoặc chưa load)
          // Thì mới gọi API để load lại toàn bộ cho chắc.
          if (index === -1) {
            fetchAllData();
            return prev;
          }

          // Nếu đã có, cập nhật thủ công để UI mượt
          const updatedGroup = {
            ...prev[index],
            lastMessage: contentDisplay,
            lastMessageAt: Date.now(), // Cập nhật thời gian để sort lên đầu
            // Cập nhật biến isRecall cho ChatItem hiển thị đúng style
            isRecall: data.isRecalled || false,
          };

          // Chỉ tăng unread nếu không phải mình gửi VÀ đang không mở chat đó
          // (Logic check selectedChat ở trong setState hơi khó, tạm thời cứ tăng,
          // handleSelectChat sẽ reset về 0 sau)
          if (!isMyMsg) {
            // Lưu ý: Nếu đang mở chat này thì không nên tăng unread.
            // Tuy nhiên ở Sidebar khó check selectedChat realtime chuẩn xác trong callback này.
            // Cách tốt nhất là cứ tăng, component ChatWindow sẽ mark read sau.
            updatedGroup.unreadCount = (updatedGroup.unreadCount || 0) + 1;
          }

          // Đưa nhóm này lên đầu danh sách (Sort)
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
  }, [currentUser, fetchAllData, allUsers]); // Thêm allUsers vào dependency để tìm tên

  const handleChatAction = async (
    roomId: string,
    actionType: 'pin' | 'hide',
    isChecked: boolean,
    isGroupChat: boolean,
  ) => {
    if (!currentUser?._id) return;

    // Xác định route API cần gọi
    const apiRoute = isGroupChat ? '/api/groups' : '/api/users';

    try {
      const payload: any = {
        action: 'toggleChatStatus',
        _id: currentUser._id, // Dùng _id cho API groups
        currentUserId: currentUser._id, // Dùng currentUserId cho API users
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
        // 💡 Optimistic Update State Logic (Cập nhật cục bộ ngay lập tức)
        const stateUpdater = (prev: any[]) =>
          prev.map((chat) => {
            if (chat._id === roomId) {
              const updateField = actionType === 'pin' ? 'isPinned' : 'isHidden';
              return { ...chat, [updateField]: isChecked };
            }
            return chat;
          });

        if (isGroupChat) {
          setGroups(stateUpdater);
        } else {
          setAllUsers(stateUpdater);
        }

        // Sau khi ẩn/ghim xong, fetch lại data để đảm bảo đồng bộ với DB
        setTimeout(() => {
          fetchAllData();
        }, 500); // 500ms là đủ để DB kịp commit
      }
    } catch (error) {
      console.error(`Lỗi ${actionType} chat:`, error);
    }
  };
  // 6. Xử lý chọn Chat (Optimistic Update - Xóa badge)
  const handleSelectChat = (item: any) => {
    setSelectedChat(item);

    // Reset unreadCount ngay lập tức trên UI
    if (item.isGroup || item.members) {
      setGroups((prev) => prev.map((g) => (g._id === item._id ? { ...g, unreadCount: 0 } : g)));
    } else {
      setAllUsers((prev) => prev.map((u) => (u._id === item._id ? { ...u, unreadCount: 0 } : u)));
    }
  };

  if (isLoading || !currentUser) {
    return <div className="flex h-screen items-center justify-center bg-white">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full font-sans">
      {/* --- Desktop Layout --- */}
      <div className="hidden md:flex h-screen w-full">
        <Sidebar
          currentUser={currentUser}
          groups={groups}
          allUsers={allUsers}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setShowCreateGroupModal={setShowCreateGroupModal}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onChatAction={handleChatAction}
          onShowGlobalSearch={handleOpenGlobalSearch}
        />

        <div className="flex-1 flex flex-col overflow-auto border-l border-gray-200">
          {selectedChat ? (
            <ChatWindow
              reLoad={fetchAllData} // Tắt reload để đỡ nháy
              allUsers={allUsers}
              selectedChat={selectedChat}
              currentUser={currentUser}
              onShowCreateGroup={() => setShowCreateGroupModal(true)}
              onChatAction={handleChatAction}
              scrollToMessageId={scrollToMessageId} // 🔥 Thêm prop này
              onScrollComplete={() => setScrollToMessageId(null)}
            />
          ) : (
            // Màn hình Chào mừng
            <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 overflow-auto">
              <div className="w-full px-4 py-8">
                <div className="text-center mb-6">
                  <h1 className="text-[23px] text-black">
                    Chào mừng <span className="font-bold text-blue-600">{currentUser.name}</span> đến với Zalo PC!
                  </h1>
                </div>
                <Swiper
                  modules={[Autoplay, Pagination]}
                  slidesPerView={1}
                  autoplay={{ delay: 2500, disableOnInteraction: false }}
                  pagination={{ clickable: true }}
                  className="w-full max-w-[500px]"
                >
                  {banners.map((banner, index) => (
                    <SwiperSlide key={index}>
                      <div className="flex flex-col items-center justify-center text-center p-6 bg-gray-50">
                        <img src={banner.image} alt={banner.title} className="w-full max-w-[400px] h-auto mb-4" />
                        <h2 className="text-lg text-blue-500 font-semibold mb-2">{banner.title}</h2>
                        <p className="text-gray-600 text-sm mb-4">{banner.description}</p>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* --- Mobile Layout --- */}
      <div className="block md:hidden relative w-full h-full">
        {selectedChat ? (
          <div className="absolute inset-0 w-full h-full bg-white flex flex-col z-50">
            <div className="flex items-center p-3 border-b border-gray-200 bg-white">
              <button onClick={() => setSelectedChat(null)} className="mr-3 px-3 py-1 bg-gray-100 rounded-full">
                ← Quay lại
              </button>
              <span className="font-bold">{selectedChat.name}</span>
            </div>
            <ChatWindow
              reLoad={fetchAllData}
              allUsers={allUsers}
              selectedChat={selectedChat}
              currentUser={currentUser}
              onShowCreateGroup={() => setShowCreateGroupModal(true)}
              onChatAction={handleChatAction}
              scrollToMessageId={scrollToMessageId} // 🔥 Thêm prop này
              onScrollComplete={() => setScrollToMessageId(null)}
            />
          </div>
        ) : (
          <Sidebar
            currentUser={currentUser}
            groups={groups}
            allUsers={allUsers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setShowCreateGroupModal={setShowCreateGroupModal}
            selectedChat={selectedChat}
            onSelectChat={handleSelectChat}
            onChatAction={handleChatAction}
            onShowGlobalSearch={handleOpenGlobalSearch}
          />
        )}
      </div>
      {showGlobalSearchModal && currentUser && (
        <GlobalSearchModal
          searchTerm={globalSearchTerm}
          results={globalSearchResults}
          allUsers={allUsers}
          currentUser={currentUser}
          onClose={() => setShowGlobalSearchModal(false)}
          onSearch={handleGlobalSearch}
          onNavigateToMessage={handleNavigateToMessage} // 🔥 Thêm prop mới
          onSelectContact={handleSelectContact}
        />
      )}
      {/* Modal Tạo Nhóm */}
      {showCreateGroupModal && currentUser && (
        <CreateGroupModal
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={() => {
            fetchAllData();
            setShowCreateGroupModal(false);
          }}
        />
      )}
    </div>
  );
}
