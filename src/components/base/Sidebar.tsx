import React, { useState, useCallback, useRef, useMemo } from 'react';
import ChatItem from './ChatItem';
import IconBB from '@/public/icons/bb.svg';
import IconGroup from '@/public/icons/group.svg';
import { User } from '@/types/User';
import { GroupConversation } from '@/types/Group';
import SearchResults from '@/components/(chatPopup)/SearchResults';

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

  // Handle global search
  const handleGlobalSearch = useCallback(
    async (term: string) => {
      if (!term.trim() || !currentUser) {
        setGlobalSearchResults({ contacts: [], messages: [] });
        return;
      }

      const lowerCaseTerm = term.toLowerCase();

      // 1. Tìm liên hệ/nhóm (bao gồm cả chat đã ẩn)
      const allChats = [...groups, ...allUsers];
      const contactResults = allChats.filter((c) => c.name?.toLowerCase().includes(lowerCaseTerm)).slice(0, 10);

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

  // Debounce search
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

  // Phân loại messages
  const regularMessages = useMemo(
    () => globalSearchResults.messages.filter((msg) => msg.type !== 'file' && msg.type !== 'image'),
    [globalSearchResults.messages],
  );

  const fileMessages = useMemo(
    () => globalSearchResults.messages.filter((msg) => msg.type === 'file' || msg.type === 'image'),
    [globalSearchResults.messages],
  );

  // Group messages by conversation
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

  // Group files by conversation
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

  // Handle select contact from search
  const handleSelectContact = (contact: any) => {
    onSelectChat(contact);
    setSearchTerm('');
    setGlobalSearchResults({ contacts: [], messages: [] });
  };

  // Regular chat filtering (for non-search mode)
  const mixedChats = useMemo(() => [...groups, ...allUsers], [groups, allUsers]);

  const filteredChats = useMemo(() => {
    return mixedChats.filter((chat: any) => {
      const isHidden = chat.isHidden;
      const isSearching = searchTerm.trim() !== '';
      const matchesSearch = chat.name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (isSearching) {
        return matchesSearch;
      } else {
        return !isHidden;
      }
    });
  }, [mixedChats, searchTerm]);

  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a: any, b: any) => {
      const timeA = a.lastMessageAt || 0;
      const timeB = b.lastMessageAt || 0;
      const aPinned = a.isPinned || false;
      const bPinned = b.isPinned || false;

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (timeA === 0 && timeB === 0) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return timeB - timeA;
    });
  }, [filteredChats]);

  const hasSearchResults =
    globalSearchResults.contacts.length > 0 || globalSearchResults.messages.length > 0;

  return (
    <aside className="relative flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80">
      {/* Header Sidebar */}
      <div className="p-4 border-b-[1px] border-b-gray-300 bg-gray-50 flex-col space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm truncate max-w-[120px]">{currentUser.name}</span>
          </div>
        </div>

        {/* Search Container */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm tin nhắn, file, liên hệ..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="px-3 py-1 pr-10 text-sm w-full rounded-lg text-black bg-gray-100 focus:outline-none  focus:ring-1 focus:ring-blue-500"
            />
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

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-2 ml-2">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <img src={IconGroup.src} alt="Group Icon" className="w-6 h-6 object-contain" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - Chat List hoặc Search Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Hiển thị khi ĐANG TÌM KIẾM */}
        {searchTerm.trim() ? (
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
          /* Hiển thị danh sách chat bình thường khi KHÔNG TÌM KIẾM */
          <>
            {sortedChats.length === 0 ? (
              <div className="p-5 text-center text-gray-400 text-sm">Chưa có cuộc trò chuyện nào.</div>
            ) : (
              sortedChats.map((item: any) => {
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