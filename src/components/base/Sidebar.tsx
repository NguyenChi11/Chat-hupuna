import React from 'react';
import ChatItem from './ChatItem'; // Import component con
import IconBB from '@/public/icons/bb.svg';
import IconGroup from '@/public/icons/group.svg';
import { User } from '../../types/User';
import type { GroupConversation, ChatItem as ChatItemType } from '../../types/Group';
import Image from 'next/image';

interface SidebarProps {
  currentUser: User;
  groups: GroupConversation[];
  allUsers: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setShowCreateGroupModal: (show: boolean) => void;
  selectedChat: ChatItemType | null;
  onSelectChat: (item: ChatItemType) => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroup: boolean) => void;
  onShowGlobalSearch: () => void;
}

// Format tin nhắn có mention để hiển thị trong preview
export const formatMessagePreview = (content: string | undefined, maxLength: number = 50): string => {
  if (!content) return '';

  // Thay thế @[DisplayName](userId) thành @DisplayName
  const formatted = content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

  // Cắt ngắn nếu quá dài
  if (formatted.length > maxLength) {
    return formatted.slice(0, maxLength) + '...';
  }

  return formatted;
};

// Parse mentions từ text
export const parseMentions = (text: string): { mentions: string[]; displayText: string } => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]); // userId
  }

  return { mentions, displayText: text };
};

// Render message content với highlight (cho chat window)
export const renderMessageWithMentions = (
  content: string,
  currentUserId: string,
  isMe: boolean = false,
): React.ReactNode => {
  if (!content) return null;

  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      const [, displayName, userId] = mentionMatch;
      const isMentioningMe = userId === currentUserId;

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

export default function Sidebar({
  currentUser,
  groups,
  allUsers,
  searchTerm,
  setSearchTerm,
  setShowCreateGroupModal,
  selectedChat,
  onSelectChat,
  onChatAction,
  onShowGlobalSearch,
}: SidebarProps) {
  const currentUserId = currentUser._id;
  // Hàm lấy tên hiển thị cho 1 item (User hoặc Group)
  const getChatDisplayName = (chat: ChatItemType | User): string => {
    const maybeGroup = chat as GroupConversation;
    const isGroupChat = maybeGroup.isGroup === true || Array.isArray(maybeGroup.members);

    if (isGroupChat) {
      return (maybeGroup.name || '').trim() || 'Nhóm';
    }

    const user = chat as User;
    return (user.name || user.username || 'Người dùng').trim();
  };

  // 1. GỘP DATA: Nối mảng groups và allUsers lại
  const mixedChats: (GroupConversation | User)[] = [...groups, ...allUsers];

  // 2. LỌC (SEARCH + HIDE)
  const filteredChats = mixedChats.filter((chat) => {
    const isHidden = chat.isHidden === true;
    const isSearching = searchTerm.trim() !== '';
    const displayName = getChatDisplayName(chat);
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase());

    if (isSearching) {
      // TRƯỜNG HỢP 1: Đang tìm kiếm
      // Hiển thị bất kỳ chat nào khớp với searchTerm (kể cả chat đã bị ẩn)
      return matchesSearch;
    } else {
      // TRƯỜNG HỢP 2: Không tìm kiếm (Thanh Search trống)
      // Chỉ hiển thị các chat KHÔNG bị ẩn
      return !isHidden;
    }
  });

  // 4. SẮP XẾP (Ưu tiên Ghim, sau đó đến thời gian)
  filteredChats.sort((a, b) => {
    const timeA = a.lastMessageAt || 0;
    const timeB = b.lastMessageAt || 0;

    // 🔥 Lấy trạng thái Ghim (isPinned là trường được tính toán từ API users/groups cho user hiện tại)
    const aPinned = a.isPinned === true;
    const bPinned = b.isPinned === true;

    // A. Ưu tiên Ghim: Chat được ghim (true) luôn đứng trước chat không ghim (false)
    if (aPinned && !bPinned) return -1; // a lên trước b
    if (!aPinned && bPinned) return 1; // b lên trước a

    // B. Nếu cùng trạng thái Ghim, sắp xếp theo thời gian
    if (timeA === 0 && timeB === 0) {
      const nameA = getChatDisplayName(a);
      const nameB = getChatDisplayName(b);
      return nameA.localeCompare(nameB);
    }
    return timeB - timeA; // Mới nhất lên đầu
  });

  return (
    <aside className="relative flex flex-col h-full bg-[#f4f6f9] border-r border-gray-200 w-full md:w-80">
      {/* --- Thanh trên cùng kiểu Zalo --- */}
      <div className="border-b border-blue-600/20">
        {/* Top bar: avatar + action icons trên nền xanh (giống Zalo) */}
        <div className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-sm font-semibold">
              {currentUser.avatar ? (
                <Image
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate max-w-[140px]">
                {/* Nếu đang chọn một cuộc trò chuyện thì ưu tiên hiển thị tên cuộc trò chuyện (nhất là nhóm) */}
                {selectedChat ? getChatDisplayName(selectedChat) : currentUser.name || currentUser.username}
              </span>
              <span className="text-[11px] opacity-80 truncate max-w-[160px]">ID: {currentUser.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Nút mở Global Search */}
            <button
              onClick={onShowGlobalSearch}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              title="Tìm kiếm tin nhắn/liên hệ"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1110.5 4a6.5 6.5 0 016.5 6.5z"
                />
              </svg>
            </button>

            {/* Nút tạo nhóm mới */}
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="w-8 h-8 hidden md:flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
              title="Tạo nhóm chat mới"
            >
              <Image
                src={IconGroup}
                width={20}
                height={20}
                alt="Group Icon"
                className="w-5 h-5 object-contain text-white"
              />
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm bên dưới, nền sáng */}
        <div className="px-3 py-3 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-full bg-[#f1f3f5] text-gray-900 placeholder:text-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 border border-transparent transition-all"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1110.5 4a6.5 6.5 0 016.5 6.5z"
                />
              </svg>
            </div>

            {/* Icon BB bên phải trên desktop */}
            <button className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <Image src={IconBB} width={20} height={20} alt="BB Icon" className="w-5 h-5 object-contain" />
            </button>
          </div>
        </div>
      </div>

      {/* --- Danh sách Chat --- */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredChats.length === 0 ? (
          <div className="p-5 text-center text-gray-400 text-sm">Chưa có cuộc trò chuyện nào.</div>
        ) : (
          filteredChats.map((item) => {
            // Xác định item là Group hay User để truyền prop isGroup
            const isGroupItem = item.isGroup === true || Array.isArray(item.members);
            return (
              <ChatItem
                key={item._id}
                item={item}
                isGroup={isGroupItem}
                selectedChat={selectedChat}
                onSelectChat={onSelectChat}
                onChatAction={onChatAction}
                currentUserId={currentUserId}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}
