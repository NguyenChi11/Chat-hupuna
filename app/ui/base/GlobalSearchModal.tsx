import React, { useState, useRef, useEffect, useMemo } from 'react';

// Types
interface User {
  _id: string;
  name: string;
  avatar?: string;
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

interface SearchResult {
  contacts: any[];
  messages: Message[];
}

interface Props {
  results: SearchResult;
  searchTerm: string;
  onClose: () => void;
  onSearch: (term: string) => void;
  currentUser: User;
  allUsers: User[];
  onNavigateToMessage: (message: Message) => void;
  onSelectContact: (phonebook: any) => void;
}

export default function GlobalSearchModal({
  results,
  searchTerm,
  onClose,
  onSearch,
  currentUser,
  allUsers,
  onNavigateToMessage,
  onSelectContact,
}: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'contacts' | 'messages' | 'files'>('all');
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setLocalSearchTerm(term);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!term.trim()) {
      onSearch('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      onSearch(term);
      setIsSearching(false);
    }, 400);
  };

  // 🔥 PHÂN LOẠI TIN NHẮN: Messages vs Files
  const { regularMessages, fileMessages } = useMemo(() => {
    if (!results?.messages || !Array.isArray(results.messages)) {
      return { regularMessages: [], fileMessages: [] };
    }

    const regular: Message[] = [];
    const files: Message[] = [];

    results.messages.forEach((msg) => {
      if (msg.type === 'file' || msg.type === 'image') {
        files.push(msg);
      } else {
        regular.push(msg);
      }
    });

    return { regularMessages: regular, fileMessages: files };
  }, [results?.messages]);

  // 🔥 NHÓM TIN NHẮN THEO CUỘC HỘI THOẠI
  const groupedMessages = useMemo(() => {
    if (!regularMessages || regularMessages.length === 0) return [];

    const groups = new Map<
      string,
      {
        roomId: string;
        roomName: string;
        roomAvatar?: string;
        isGroupChat: boolean;
        partnerId?: string;
        messages: Message[];
        latestTimestamp: number;
      }
    >();

    regularMessages.forEach((msg) => {
      if (!msg || !msg.roomId) return;

      const key = msg.roomId;

      if (!groups.has(key)) {
        groups.set(key, {
          roomId: msg.roomId,
          roomName: msg.roomName || 'Cuộc trò chuyện',
          roomAvatar: msg.isGroupChat ? undefined : allUsers?.find((u) => u._id === msg.partnerId)?.avatar,
          isGroupChat: msg.isGroupChat || false,
          partnerId: msg.partnerId,
          messages: [],
          latestTimestamp: msg.timestamp || Date.now(),
        });
      }

      const group = groups.get(key)!;
      group.messages.push(msg);
      if (msg.timestamp && msg.timestamp > group.latestTimestamp) {
        group.latestTimestamp = msg.timestamp;
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [regularMessages, allUsers]);

  // 🔥 NHÓM FILE THEO CUỘC HỘI THOẠI
  const groupedFiles = useMemo(() => {
    if (!fileMessages || fileMessages.length === 0) return [];

    const groups = new Map<
      string,
      {
        roomId: string;
        roomName: string;
        roomAvatar?: string;
        isGroupChat: boolean;
        files: Message[];
        latestTimestamp: number;
      }
    >();

    fileMessages.forEach((msg) => {
      if (!msg || !msg.roomId) return;

      const key = msg.roomId;

      if (!groups.has(key)) {
        groups.set(key, {
          roomId: msg.roomId,
          roomName: msg.roomName || 'Cuộc trò chuyện',
          roomAvatar: msg.isGroupChat ? undefined : allUsers?.find((u) => u._id === msg.partnerId)?.avatar,
          isGroupChat: msg.isGroupChat || false,
          files: [],
          latestTimestamp: msg.timestamp || Date.now(),
        });
      }

      const group = groups.get(key)!;
      group.files.push(msg);
      if (msg.timestamp && msg.timestamp > group.latestTimestamp) {
        group.latestTimestamp = msg.timestamp;
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [fileMessages, allUsers]);

  const HighlightText = ({ text, keyword }: { text: string; keyword: string }) => {
    if (!keyword.trim() || !text) return <>{text}</>;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getContentPreview = (msg: Message) => {
    if (msg.type === 'file' && msg.fileName) return msg.fileName;
    if (msg.type === 'image') return '[Hình ảnh]';
    if (msg.type === 'sticker') return '[Sticker]';
    return msg.content || 'Tin nhắn';
  };

  const MessageIcon = ({ type }: { type: Message['type'] }) => {
    const icons = {
      image: (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      file: (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      text: (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      sticker: (
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
    return icons[type] || icons.text;
  };

  const tabs = [
    {
      key: 'all' as const,
      label: 'Tất cả',
      count: (results?.contacts?.length || 0) + groupedMessages.length + groupedFiles.length,
    },
    { key: 'contacts' as const, label: 'Liên hệ', count: results?.contacts?.length || 0 },
    { key: 'messages' as const, label: 'Tin nhắn', count: groupedMessages.length },
    { key: 'files' as const, label: 'File', count: groupedFiles.length },
  ];

  const hasResults = (results?.contacts?.length || 0) > 0 || (results?.messages?.length || 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[700px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-4 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm kiếm tin nhắn, file, liên hệ..."
                value={localSearchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-full text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {localSearchTerm && (
                <button
                  onClick={() => {
                    setLocalSearchTerm('');
                    onSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium relative transition-colors ${
                activeTab === tab.key ? 'text-blue-600 bg-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && localSearchTerm && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 font-medium">Đang tìm kiếm...</span>
            </div>
          )}

          {!isSearching && !localSearchTerm.trim() && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-lg font-medium">Nhập từ khóa để tìm kiếm</p>
              <p className="text-sm mt-2">Tìm kiếm tin nhắn, file, liên hệ trong tất cả cuộc trò chuyện</p>
            </div>
          )}

          {!isSearching && localSearchTerm.trim() && !hasResults && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-lg font-medium">Không tìm thấy kết quả</p>
              <p className="text-sm mt-2">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}

          {!isSearching && hasResults && (
            <div className="p-4 space-y-6">
              {/* LIÊN HỆ */}
              {(activeTab === 'all' || activeTab === 'contacts') &&
                results?.contacts &&
                results.contacts.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <div className="w-1 h-4 bg-blue-500 rounded-full" />
                      Liên hệ
                      <span className="text-xs text-gray-500 font-normal">({results?.contacts?.length || 0})</span>
                    </h4>
                    <div className="space-y-1">
                      {results.contacts.map((phonebook) => (
                        <div
                          key={phonebook._id}
                          onClick={() => onSelectContact(phonebook)}
                          className="flex items-center p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-all group"
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                              {phonebook.avatar ? (
                                <img src={phonebook.avatar} className="w-full h-full object-cover" alt="" />
                              ) : (
                                phonebook.name?.charAt(0).toUpperCase()
                              )}
                            </div>
                            {phonebook.isGroup && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 ml-3">
                            <p className="font-medium text-gray-800 truncate">
                              <HighlightText text={phonebook.name} keyword={localSearchTerm} />
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              {phonebook.isGroup ? 'Nhóm' : 'Liên hệ'}
                            </p>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* TIN NHẮN */}
              {(activeTab === 'all' || activeTab === 'messages') && groupedMessages.length > 0 && (
                <section>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <div className="w-1 h-4 bg-green-500 rounded-full" />
                    Tin nhắn
                    <span className="text-xs text-gray-500 font-normal">
                      ({groupedMessages.length} cuộc trò chuyện)
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {groupedMessages.map((group) => (
                      <div
                        key={group.roomId}
                        className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all bg-white shadow-sm"
                      >
                        <div className="bg-gradient-to-r from-gray-50 to-white p-3 border-b flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                              {group.roomAvatar ? (
                                <img src={group.roomAvatar} className="w-full h-full object-cover" alt="" />
                              ) : (
                                group.roomName.charAt(0).toUpperCase()
                              )}
                            </div>
                            {group.isGroupChat && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center border border-white">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate text-sm">{group.roomName}</p>
                            <p className="text-xs text-gray-500">
                              {group.isGroupChat ? '📱 Nhóm' : '💬 Chat'} • {group.messages.length} tin nhắn
                            </p>
                          </div>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {group.messages.slice(0, 3).map((msg) => (
                            <div
                              key={msg._id}
                              onClick={() => onNavigateToMessage(msg)}
                              className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  <MessageIcon type={msg.type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-600">{msg.senderName}</span>
                                    <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 line-clamp-2">
                                    <HighlightText text={getContentPreview(msg)} keyword={localSearchTerm} />
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {group.messages.length > 3 && (
                          <div className="p-2 bg-gray-50 text-center border-t">
                            <button
                              onClick={() => onNavigateToMessage(group.messages[0])}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Xem thêm {group.messages.length - 3} tin nhắn
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 🔥 FILE */}
              {(activeTab === 'all' || activeTab === 'files') && groupedFiles.length > 0 && (
                <section>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                    File
                    <span className="text-xs text-gray-500 font-normal">({fileMessages.length} file)</span>
                  </h4>
                  <div className="space-y-3">
                    {groupedFiles.map((group) => (
                      <div
                        key={group.roomId}
                        className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-300 transition-all bg-white shadow-sm"
                      >
                        <div className="bg-gradient-to-r from-orange-50 to-white p-3 border-b flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold overflow-hidden">
                              {group.roomAvatar ? (
                                <img src={group.roomAvatar} className="w-full h-full object-cover" alt="" />
                              ) : (
                                group.roomName.charAt(0).toUpperCase()
                              )}
                            </div>
                            {group.isGroupChat && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate text-sm">{group.roomName}</p>
                            <p className="text-xs text-gray-500">
                              {group.isGroupChat ? '📱 Nhóm' : '💬 Chat'} • {group.files.length} file
                            </p>
                          </div>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {group.files.slice(0, 3).map((file) => (
                            <div
                              key={file._id}
                              onClick={() => onNavigateToMessage(file)}
                              className="p-3 hover:bg-orange-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  {file.type === 'image' ? (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                      <img
                                        src={file.fileUrl}
                                        alt={file.fileName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                      <svg
                                        className="w-6 h-6 text-green-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate text-sm">
                                    <HighlightText text={file.fileName || 'File'} keyword={localSearchTerm} />
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span>{file.senderName}</span>
                                    <span>•</span>
                                    <span>{formatTime(file.timestamp)}</span>
                                  </p>
                                </div>
                                <svg
                                  className="w-5 h-5 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>

                        {group.files.length > 3 && (
                          <div className="p-2 bg-orange-50 text-center border-t">
                            <button
                              onClick={() => onNavigateToMessage(group.files[0])}
                              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Xem thêm {group.files.length - 3} file
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none px-4 py-3 bg-gray-50 border-t text-xs text-gray-500 text-center">
          Nhấn <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono">ESC</kbd> để đóng
        </div>
      </div>
    </div>
  );
}
