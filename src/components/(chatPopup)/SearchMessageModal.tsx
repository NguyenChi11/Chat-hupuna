'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { Message } from '@/types/Message';
import { User } from '@/types/User';
import Image from 'next/image';
import ArrowRightICon from '@/public/icons/arrow-right-icon.svg'; // Reuse existing icon

interface SearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onJumpToMessage: (messageId: string) => void;
  getSenderName: (sender: User | string) => string;
}

const SearchSidebar: React.FC<SearchSidebarProps> = ({ isOpen, onClose, roomId, onJumpToMessage, getSenderName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchSearchResults = useCallback(
    async (query: string) => {
      if (!query.trim() || !roomId) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      setSearchResults([]);

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'read',
            filters: {
              roomId,
              searchQuery: query.trim(),
              isRecalled: { $ne: true },
              isDeleted: { $ne: true },
            },
            limit: 100,
            sort: { timestamp: -1 },
          }),
        });
        const data = await res.json();
        setSearchResults(data.data || []);
      } catch (error) {
        console.error('Fetch search results error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [roomId],
  );
  // 🔥 THÊM LOGIC DEBOUNCING DÙNG useEffect
  useEffect(() => {
    // 1. Nếu searchTerm rỗng, xóa kết quả ngay lập tức
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    // 2. Thiết lập timer: Trì hoãn gọi API 500ms
    const handler = setTimeout(() => {
      fetchSearchResults(searchTerm);
    }, 500); // <-- 500ms (Nửa giây) là thời gian chờ hợp lý

    // 3. Hàm cleanup: Xóa timer cũ nếu searchTerm thay đổi trước 500ms
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchSearchResults]); // Chạy lại hiệu ứng mỗi khi searchTerm thay đổi

  if (!isOpen) return null;

  const handleJump = (messageId: string) => {
    onJumpToMessage(messageId);
    // Tùy chọn: Đóng sidebar tìm kiếm sau khi nhảy
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchSearchResults(searchTerm);
    }
  };

  return (
    // Sử dụng cơ chế fixed/static tương tự ChatInfoPopup
    <div
      className={
        `bg-white shadow-lg w-full sm:w-[21.875rem] flex flex-col h-full overflow-y-auto relative transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}` // Thêm hiệu ứng slide
      }
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-black">Tìm kiếm tin nhắn</h2>
        {/* Nút đóng (Sử dụng icon ArrowRight để trông như đóng tab) */}
        <button onClick={onClose} className="cursor-pointer p-2 hover:bg-gray-200 rounded-full" title="Đóng tìm kiếm">
          <Image
            src={ArrowRightICon}
            alt="Close"
            width={24}
            height={24}
            className="w-6 h-6 rotate-180" // Xoay ngược để chỉ mũi tên sang trái
          />
        </button>
      </div>

      {/* Input Tìm kiếm */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập từ khóa tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border-b outline-none p-2  text-sm "
            disabled={isSearching}
          />
          <button
            onClick={() => fetchSearchResults(searchTerm)}
            className="cursor-pointer bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors shrink-0"
            disabled={isSearching || !searchTerm.trim()}
          >
            {isSearching ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              'Tìm'
            )}
          </button>
        </div>
      </div>

      {/* Kết quả Tìm kiếm */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isSearching && <p className="text-center text-blue-500 text-sm">Đang tìm kiếm...</p>}

        {!isSearching && searchTerm.trim() && searchResults.length === 0 && (
          <p className="text-center text-gray-500 text-sm">Không tìm thấy tin nhắn nào khớp với: **{searchTerm}**</p>
        )}

        {!isSearching && !searchTerm.trim() && (
          <p className="text-center text-gray-400 text-sm">Nhập từ khóa để tìm kiếm trong hội thoại này.</p>
        )}

        {searchResults
          .slice()
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
          .map((msg: Message) => {
          const isRecalled = msg.isRecalled === true;
          const contentDisplay = isRecalled
            ? 'đã thu hồi tin nhắn'
            : msg.content || `[${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}]`;

          // Lấy tên người gửi (sender được khai báo là string ID trong Message)
          const senderName = getSenderName(msg.sender);
          const d = new Date(msg.timestamp);
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          const sameDate = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
          const dateLabel = sameDate(d, today)
            ? 'Hôm nay'
            : sameDate(d, yesterday)
              ? 'Hôm qua'
              : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeLabel = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={msg._id}
              className="p-3 bg-white rounded-lg shadow-sm hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
              onClick={() => handleJump(msg._id)}
            >
              <p className="text-xs text-blue-600 font-semibold">
                {senderName} • {dateLabel} • {timeLabel}
              </p>
              <p className={`text-sm mt-1 line-clamp-2 ${isRecalled ? 'italic text-gray-500' : 'text-gray-800'}`}>
                {contentDisplay}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchSidebar;
