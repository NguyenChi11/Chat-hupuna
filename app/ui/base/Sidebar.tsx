import React from 'react';
import ChatItem from './ChatItem'; // Import component con
import IconBB from '@/public/icons/bb.svg';
import IconGroup from '@/public/icons/group.svg';
import { User } from '@/types/User';
import { GroupConversation } from '@/types/Group';

interface SidebarProps {
  currentUser: User;
  groups: GroupConversation[];
  allUsers: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setShowCreateGroupModal: (show: boolean) => void;
  selectedChat: any;
  onSelectChat: (item: any) => void;
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
  // 1. GỘP DATA: Nối mảng groups và allUsers lại
  const mixedChats = [...groups, ...allUsers];

  // 2. LỌC (HIDE): Lọc bỏ những chat đã bị ẩn bởi currentUser
  const visibleChats = mixedChats.filter((chat: any) => {
    // isHidden là trường được tính toán từ API users/groups cho user hiện tại
    return !chat.isHidden;
  });

  // 2. LỌC (SEARCH)
  const filteredChats = mixedChats.filter((chat: any) => {
    const isHidden = chat.isHidden;
    const isSearching = searchTerm.trim() !== '';
    const matchesSearch = chat.name?.toLowerCase().includes(searchTerm.toLowerCase());

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
  filteredChats.sort((a: any, b: any) => {
    const timeA = a.lastMessageAt || 0;
    const timeB = b.lastMessageAt || 0;

    // 🔥 Lấy trạng thái Ghim (isPinned là trường được tính toán từ API users/groups cho user hiện tại)
    const aPinned = a.isPinned || false;
    const bPinned = b.isPinned || false;

    // A. Ưu tiên Ghim: Chat được ghim (true) luôn đứng trước chat không ghim (false)
    if (aPinned && !bPinned) return -1; // a lên trước b
    if (!aPinned && bPinned) return 1; // b lên trước a

    // B. Nếu cùng trạng thái Ghim, sắp xếp theo thời gian
    if (timeA === 0 && timeB === 0) {
      return (a.name || '').localeCompare(b.name || '');
    }
    return timeB - timeA; // Mới nhất lên đầu
  });

  return (
    <aside className="relative flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80">
      {/* --- Header Sidebar --- */}
      <div className="p-4 border-b-[1px] border-b-gray-300 bg-gray-50 flex-col space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm truncate max-w-[120px]">{currentUser.name}</span>
          </div>
        </div>

        {/* 🔥 NÚT MỞ GLOBAL SEARCH (ĐẶT Ở ĐÂY) */}
        <button
          onClick={onShowGlobalSearch}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 ml-2"
          title="Tìm kiếm tin nhắn/liên hệ"
        >
          {/* Icon Search */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-gray-600"
          >
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.5 5.5l5.5 5.5a.75.75 0 11-1.06 1.06l-5.5-5.5a8.25 8.25 0 01-14.5-5.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 text-sm w-full rounded-full text-black bg-gray-100 focus:outline-none"
          />
          {/* Các nút chức năng (Sẽ không bị nháy nữa) */}
          <div className="hidden md:flex items-center gap-2 ml-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              <img src={IconBB.src} alt="BB Icon" className="w-5 h-5 object-contain" />
            </button>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <img src={IconGroup.src} alt="Group Icon" className="w-6 h-6 object-contain" />
            </button>
          </div>
        </div>
      </div>

      {/* --- Danh sách Chat --- */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-5 text-center text-gray-400 text-sm">Chưa có cuộc trò chuyện nào.</div>
        ) : (
          filteredChats.map((item: any) => {
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
