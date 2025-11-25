import React, { useState, useCallback, useRef, useMemo } from 'react';
import ChatItem from './ChatItem';
import IconBB from '@/public/icons/bb.svg';
import IconGroup from '@/public/icons/group.svg';
import SearchResults from '@/components/(chatPopup)/SearchResults';
import { User } from '../../types/User';
import type { GroupConversation, ChatItem as ChatItemType } from '../../types/Group';
import Image from 'next/image';
import MessageFilter from '@/components/(chatPopup)/MessageFilter';
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
  onNavigateToMessage: (message: any) => void;
}

interface Message {
  _id: string;
  content?: string;
  type: 'text' | 'image' | 'file' | 'sticker';
  fileName?: string;
  timestamp: number;
  sender: string;
  senderName: string;
  roomId: string;
  roomName: string;
  isGroupChat: boolean;
  partnerId?: string;
  partnerName?: string;
  fileUrl?: string;
}

interface GlobalSearchResult {
  contacts: any[];
  messages: Message[];
}

const getChatDisplayName = (chat: any): string => {
  const maybeGroup = chat as GroupConversation;
  const isGroupChat = maybeGroup.isGroup === true || Array.isArray(maybeGroup.members);

  if (isGroupChat) {
    return (maybeGroup.name || '').trim() || 'Nhóm';
  }

  const user = chat as User;
  return (user.name || user.username || 'Người dùng').trim();
};

export const formatMessagePreview = (content: string | undefined, maxLength: number = 50): string => {
  if (!content) return '';
  const formatted = content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
  if (formatted.length > maxLength) {
    return formatted.slice(0, maxLength) + '...';
  }
  return formatted;
};

export const parseMentions = (text: string): { mentions: string[]; displayText: string } => {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]);
  }

  return { mentions, displayText: text };
};

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
                                  onNavigateToMessage,
                                }: SidebarProps) {
  const currentUserId = currentUser._id;
  const [activeTab, setActiveTab] = useState<'all' | 'contacts' | 'messages' | 'files'>('all');
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult>({
    contacts: [],
    messages: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');

  // Handle global search (API call logic)
  const handleGlobalSearch = useCallback(
    async (term: string) => {
      if (!term.trim() || !currentUser) {
        setGlobalSearchResults({ contacts: [], messages: [] });
        return;
      }

      const lowerCaseTerm = term.toLowerCase();

      // 1. Tìm liên hệ/nhóm (local search)
      const allChats = [...groups, ...allUsers];
      const contactResults = allChats
        .filter((c) => getChatDisplayName(c).toLowerCase().includes(lowerCaseTerm))
        .slice(0, 10);

      // 2. Gọi API tìm tin nhắn
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

  // Debounce search handler
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setGlobalSearchResults({ contacts: [], messages: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(() => {
      handleGlobalSearch(value);
      setIsSearching(false);
    }, 400);
  };

  // --- Search Results Grouping (Memoized) ---
  const regularMessages = useMemo(
    () => globalSearchResults.messages.filter((msg) => msg.type !== 'file' && msg.type !== 'image'),
    [globalSearchResults.messages],
  );

  const fileMessages = useMemo(
    () => globalSearchResults.messages.filter((msg) => msg.type === 'file' || msg.type === 'image'),
    [globalSearchResults.messages],
  );

  const groupedMessages = useMemo(() => {
    const groups = new Map();
    regularMessages.forEach((msg) => {
      if (!msg || !msg.roomId) return;
      const key = msg.roomId;
      if (!groups.has(key)) {
        groups.set(key, {
          roomId: msg.roomId,
          roomName: msg.roomName || 'Cuộc trò chuyện',
          isGroupChat: msg.isGroupChat || false,
          messages: [],
          latestTimestamp: msg.timestamp || Date.now(),
        });
      }
      const group = groups.get(key);
      group.messages.push(msg);
    });
    return Array.from(groups.values());
  }, [regularMessages]);

  const groupedFiles = useMemo(() => {
    const groups = new Map();
    fileMessages.forEach((msg) => {
      if (!msg || !msg.roomId) return;
      const key = msg.roomId;
      if (!groups.has(key)) {
        groups.set(key, {
          roomId: msg.roomId,
          roomName: msg.roomName || 'Cuộc trò chuyện',
          isGroupChat: msg.isGroupChat || false,
          files: [],
          latestTimestamp: msg.timestamp || Date.now(),
        });
      }
      const group = groups.get(key);
      group.files.push(msg);
    });
    return Array.from(groups.values());
  }, [fileMessages]);

  const hasSearchResults = globalSearchResults.contacts.length > 0 || globalSearchResults.messages.length > 0;

  // Handle select contact from search
  const handleSelectContact = (contact: any) => {
    onSelectChat(contact);
    setSearchTerm('');
    setGlobalSearchResults({ contacts: [], messages: [] });
  };

  // --- Regular Chat List Logic with Filter (Memoized) ---
  const mixedChats = useMemo(() => [...groups, ...allUsers], [groups, allUsers]);

  const isSearchActive = searchTerm.trim().length > 0;

  // 🔥 LOGIC CHÍNH: Áp dụng filter cho cả search và default
  const filteredAndSortedChats = useMemo(() => {
    // 1. Lọc theo search term và hidden status
    let filtered = mixedChats.filter((chat: any) => {
      const isHidden = chat.isHidden;
      const displayName = getChatDisplayName(chat);
      const matchesSearch = isSearchActive
        ? displayName.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      // Khi search: hiển thị cả hidden, khi không search: ẩn hidden
      return isSearchActive ? matchesSearch : (!isHidden && matchesSearch);
    });

    // 2. Áp dụng filter read/unread (chỉ khi KHÔNG search)
    if (!isSearchActive) {
      if (filterType === 'unread') {
        filtered = filtered.filter((chat: any) => (chat.unreadCount || 0) > 0);
      } else if (filterType === 'read') {
        filtered = filtered.filter((chat: any) => (chat.unreadCount || 0) === 0);
      }
    }

    // 3. Sắp xếp: Pin trước, sau đó theo thời gian
    filtered.sort((a: any, b: any) => {
      const timeA = a.lastMessageAt || 0;
      const timeB = b.lastMessageAt || 0;
      const aPinned = a.isPinned || false;
      const bPinned = b.isPinned || false;

      // Ưu tiên ghim
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Nếu không có tin nhắn, sắp xếp theo tên
      if (timeA === 0 && timeB === 0) {
        const nameA = getChatDisplayName(a);
        const nameB = getChatDisplayName(b);
        return nameA.localeCompare(nameB);
      }

      // Sắp xếp theo thời gian
      return timeB - timeA;
    });

    return filtered;
  }, [mixedChats, searchTerm, filterType, isSearchActive]);

  // 🔥 Tính số lượng cho mỗi filter (để hiển thị badge)
  const filterCounts = useMemo(() => {
    const visibleChats = mixedChats.filter((chat: any) => !chat.isHidden);
    return {
      all: visibleChats.length,
      unread: visibleChats.filter((chat: any) => (chat.unreadCount || 0) > 0).length,
      read: visibleChats.filter((chat: any) => (chat.unreadCount || 0) === 0).length,
    };
  }, [mixedChats]);

  return (
    <aside className="relative flex flex-col h-full bg-[#f4f6f9] border-r border-gray-200 w-full md:w-80">
      {/* --- Thanh trên cùng kiểu Zalo --- */}
      <div className="border-b border-blue-600/20">
        {/* Top bar: avatar + action icons */}
        <div className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-sm font-semibold">
              {currentUser.avatar ? (
                <Image
                  src={currentUser.avatar}
                  alt={currentUser.name || 'User Avatar'}
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
                {currentUser.name || currentUser.username}
              </span>
              <span className="text-[11px] opacity-80 truncate max-w-[160px]">ID: {currentUser.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
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

        {/* Thanh tìm kiếm */}
        <div className="px-3 py-3 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm tin nhắn, file, liên hệ..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
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
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setGlobalSearchResults({ contacts: [], messages: [] });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Icon BB */}
            <button className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <Image src={IconBB} width={20} height={20} alt="BB Icon" className="w-5 h-5 object-contain" />
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 Filter Buttons - CHỈ hiện khi KHÔNG search */}
      {!isSearchActive && (
        <MessageFilter
          filterType={filterType}
          setFilterType={setFilterType}
          counts={filterCounts}
        />
      )}
      {/* Content Area - Chat List hoặc Search Results */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Hiển thị khi ĐANG TÌM KIẾM */}
        {isSearchActive ? (
          <SearchResults
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isSearching={isSearching}
            hasResults={hasSearchResults}
            contacts={globalSearchResults.contacts}
            groupedMessages={groupedMessages}
            groupedFiles={groupedFiles}
            fileMessages={fileMessages}
            searchTerm={searchTerm}
            onSelectContact={handleSelectContact}
            onNavigateToMessage={(msg) => {
              onNavigateToMessage(msg);
              setSearchTerm('');
              setGlobalSearchResults({ contacts: [], messages: [] });
            }}
          />
        ) : (
          /* Hiển thị danh sách chat đã lọc */
          <>
            {filteredAndSortedChats.length === 0 ? (
              <div className="p-5 text-center text-gray-400 text-sm">
                {filterType === 'unread' && 'Không có tin nhắn chưa đọc'}
                {filterType === 'read' && 'Không có tin nhắn đã đọc'}
                {filterType === 'all' && 'Chưa có cuộc trò chuyện nào'}
              </div>
            ) : (
              filteredAndSortedChats.map((item: any) => {
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
          </>
        )}
      </div>
    </aside>
  );
}