import React from 'react';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';
import type { ChatItem as ChatItemType } from '@/types/Group';

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

interface MessageGroup {
  roomId: string;
  roomName: string;
  isGroupChat: boolean;
  messages: Message[];
}

interface FileGroup {
  roomId: string;
  roomName: string;
  isGroupChat: boolean;
  files: Message[];
}

interface SearchResultsProps {
  activeTab: 'all' | 'contacts' | 'messages' | 'files';
  setActiveTab: (tab: 'all' | 'contacts' | 'messages' | 'files') => void;
  isSearching: boolean;
  hasResults: boolean;
  contacts: ChatItemType[];
  groupedMessages: MessageGroup[];
  groupedFiles: FileGroup[];
  fileMessages: Message[];
  searchTerm: string;
  onSelectContact: (contact: ChatItemType) => void;
  onNavigateToMessage: (message: Message) => void;
}

// Component Tabs
const SearchTabs = ({
  activeTab,
  setActiveTab,
  contactsCount,
  messagesCount,
  filesCount,
}: {
  activeTab: 'all' | 'contacts' | 'messages' | 'files';
  setActiveTab: (tab: 'all' | 'contacts' | 'messages' | 'files') => void;
  contactsCount: number;
  messagesCount: number;
  filesCount: number;
}) => {
  const tabs = [
    { key: 'all' as const, label: 'Tất cả', count: contactsCount + messagesCount },
    { key: 'contacts' as const, label: 'Liên hệ', count: contactsCount },
    { key: 'messages' as const, label: 'Tin nhắn', count: messagesCount },
    { key: 'files' as const, label: 'File', count: filesCount },
  ];

  return (
    <div className="flex border-b mb-3 -mx-3 px-3 bg-gray-50 sticky top-0 z-10">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 px-2 py-2 text-xs font-medium relative transition-colors ${
            activeTab === tab.key ? 'text-blue-600 bg-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {tab.label}
          {/*{tab.count > 0 && (*/}
          {/*  <span*/}
          {/*    className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${*/}
          {/*      activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'*/}
          {/*    }`}*/}
          {/*  >*/}
          {/*    {tab.count > 99 ? '99+' : tab.count}*/}
          {/*  </span>*/}
          {/*)}*/}
          {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
        </button>
      ))}
    </div>
  );
};

// Component Highlight Text
const HighlightText = ({ text, keyword }: { text: string; keyword: string }) => {
  if (!keyword.trim() || !text) return <>{text}</>;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          // 🔥 ĐÃ SỬA: Thay đổi class để loại bỏ nền vàng (bg-yellow-200) và dùng màu chữ tối (text-gray-900)
          <mark key={i} className="bg-transparent text-blue-600  rounded font-medium">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
};

// Component Loading State
const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    <span className="ml-2 text-sm text-gray-600">Đang tìm kiếm...</span>
  </div>
);

// Component Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    <p className="text-sm font-medium">Không tìm thấy kết quả</p>
  </div>
);

// Format time utility
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

// Component Contacts Section
const ContactsSection = ({
  contacts,
  searchTerm,
  onSelectContact,
}: {
  contacts: ChatItemType[];
  searchTerm: string;
  onSelectContact: (contact: ChatItemType) => void;
}) => {
  if (contacts.length === 0) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-700 mb-2 text-xs flex items-center gap-1 sticky top-12 bg-white py-1 -mx-3 px-3">
        <div className="w-1 h-3 bg-blue-500 rounded-full" />
        Liên hệ ({contacts.length})
      </h4>
      <div className="space-y-1">
        {contacts.map((contact) => {
          const isGroupContact = Boolean((contact as ChatItemType & { isGroup?: boolean }).isGroup);

          return (
            <div
              key={contact._id}
              onClick={() => onSelectContact(contact)}
              className="flex items-center p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-all"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {contact.avatar ? (
                    <Image
                      src={getProxyUrl(contact.avatar as string)}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    String(contact.name ?? '')
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                {isGroupContact && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 ml-3">
                <p className="font-medium text-gray-800 truncate text-sm">
                  <HighlightText text={String(contact.name ?? '')} keyword={searchTerm} />
                </p>
                <p className="text-xs text-gray-500">{isGroupContact ? 'Nhóm' : 'Liên hệ'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Component Messages Section
const MessagesSection = ({
  groupedMessages,
  searchTerm,
  onNavigateToMessage,
  onClearSearch,
}: {
  groupedMessages: MessageGroup[];
  searchTerm: string;
  onNavigateToMessage: (message: Message) => void;
  onClearSearch: () => void;
}) => {
  if (groupedMessages.length === 0) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-700 mb-2 text-xs flex items-center gap-1 sticky top-12 bg-white py-1 -mx-3 px-3">
        <div className="w-1 h-3 bg-green-500 rounded-full" />
        Tin nhắn ({groupedMessages.length} cuộc trò chuyện)
      </h4>
      <div className="space-y-3">
        {groupedMessages.map((group: MessageGroup) => (
          <div
            key={group.roomId}
            className="border border-gray-200 rounded-xl overflow-hidden  transition-all bg-white shadow-sm"
          >
            <div className="bg-gradient-to-r from-gray-50 to-white p-3 border-b-[1px] border-gray-300  flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {group.roomName.charAt(0).toUpperCase()}
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
              {group.messages.slice(0, 10).map((msg: Message) => (
                <div
                  key={msg._id}
                  onClick={() => {
                    onNavigateToMessage(msg);
                    onClearSearch();
                  }}
                  className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">{msg.senderName}</span>
                        <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        <HighlightText text={msg.content || msg.fileName || '[Media]'} keyword={searchTerm} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {group.messages.length > 10 && (
              <div className="p-2 bg-gray-50 text-center border-t-[1px] border-gray-300">
                <button
                  onClick={() => {
                    onNavigateToMessage(group.messages[0]);
                    onClearSearch();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xem thêm {group.messages.length - 10} tin nhắn
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// Component Files Section
const FilesSection = ({
  groupedFiles,
  fileMessages,
  searchTerm,
  onNavigateToMessage,
  onClearSearch,
}: {
  groupedFiles: FileGroup[];
  fileMessages: Message[];
  searchTerm: string;
  onNavigateToMessage: (message: Message) => void;
  onClearSearch: () => void;
}) => {
  if (groupedFiles.length === 0) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-700 mb-2 text-xs flex items-center gap-1 sticky top-12 bg-white py-1 -mx-3 px-3">
        <div className="w-1 h-3 bg-orange-500 rounded-full" />
        File ({fileMessages.length} file)
      </h4>
      <div className="space-y-3">
        {groupedFiles.map((group: FileGroup) => (
          <div
            key={group.roomId}
            className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-300 transition-all bg-white shadow-sm"
          >
            <div className="bg-gradient-to-r from-orange-50 to-white p-3 border-b-[1px] border-gray-300 flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {group.roomName.charAt(0).toUpperCase()}
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
              {group.files.slice(0, 10).map((file: Message) => (
                <div
                  key={file._id}
                  onClick={() => {
                    onNavigateToMessage(file);
                    onClearSearch();
                  }}
                  className="p-3 hover:bg-orange-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {file.type === 'image' ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={getProxyUrl(file.fileUrl as string)}
                            width={48}
                            height={48}
                            alt={file.fileName || 'File'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <HighlightText text={file.fileName || 'File'} keyword={searchTerm} />
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{file.senderName}</span>
                        <span>•</span>
                        <span>{formatTime(file.timestamp)}</span>
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {group.files.length > 10 && (
              <div className="p-2 bg-orange-50 text-center border-t-[1px] border-gray-300">
                <button
                  onClick={() => {
                    onNavigateToMessage(group.files[0]);
                    onClearSearch();
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  Xem thêm {group.files.length - 10} file
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// Main SearchResults Component
export default function SearchResults({
  activeTab,
  setActiveTab,
  isSearching,
  hasResults,
  contacts,
  groupedMessages,
  groupedFiles,
  fileMessages,
  searchTerm,
  onSelectContact,
  onNavigateToMessage,
}: SearchResultsProps) {
  const handleClearSearch = () => {
    // This will be called from parent to reset search
  };

  return (
    <div className="p-3">
      {/* Tabs */}
      <SearchTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactsCount={contacts.length}
        messagesCount={groupedMessages.length}
        filesCount={fileMessages.length}
      />

      {/* Loading State */}
      {isSearching && <LoadingState />}

      {/* Empty State */}
      {!isSearching && !hasResults && <EmptyState />}

      {/* Search Results */}
      {!isSearching && hasResults && (
        <div className="space-y-4">
          {/* Contacts */}
          {(activeTab === 'all' || activeTab === 'contacts') && (
            <ContactsSection contacts={contacts} searchTerm={searchTerm} onSelectContact={onSelectContact} />
          )}

          {/* Messages */}
          {(activeTab === 'all' || activeTab === 'messages') && (
            <MessagesSection
              groupedMessages={groupedMessages}
              searchTerm={searchTerm}
              onNavigateToMessage={onNavigateToMessage}
              onClearSearch={handleClearSearch}
            />
          )}

          {/* Files */}
          {(activeTab === 'all' || activeTab === 'files') && (
            <FilesSection
              groupedFiles={groupedFiles}
              fileMessages={fileMessages}
              searchTerm={searchTerm}
              onNavigateToMessage={onNavigateToMessage}
              onClearSearch={handleClearSearch}
            />
          )}
        </div>
      )}
    </div>
  );
}
