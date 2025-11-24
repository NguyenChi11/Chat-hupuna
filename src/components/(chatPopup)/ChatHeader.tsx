'use client';

import React from 'react';

import IconShow from '@/public/icons/show.svg';
import IconShow1 from '@/public/icons/show2.svg';

interface ChatHeaderProps {
  chatName: string;
  isGroup: boolean;
  memberCount: number;
  showPopup: boolean;
  onTogglePopup: () => void;
  onOpenMembers: () => void;
  showSearchSidebar: boolean;
  onToggleSearchSidebar: () => void;
}

export default function ChatHeader({
  chatName,
  isGroup,
  memberCount,
  showPopup,
  onTogglePopup,
  onOpenMembers,
  showSearchSidebar,
  onToggleSearchSidebar,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center space-x-2">
        <div className="truncate hover:bg-gray-100 hover:cursor-pointer rounded-lg p-2" onClick={onOpenMembers}>
          <h1 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{chatName}</h1>
          <p className="text-xs text-gray-500">{isGroup ? `${memberCount} thành viên` : 'Đang hoạt động'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          {' '}
          {/* Nhóm các nút bên phải */}
          {/* 🔥 NÚT TÌM KIẾM */}
          <button
            className={`p-1 sm:p-2 rounded-full hover:bg-gray-100 cursor-pointer 
                ${showSearchSidebar ? 'bg-blue-200 ' : ''}`}
            onClick={() => {
              // Đóng Info Popup nếu nó đang mở
              if (showPopup) onTogglePopup();
              // Toggle Search Sidebar
              onToggleSearchSidebar();
            }}
            title="Tìm kiếm tin nhắn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 text-gray-600"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <button
          className="p-1 sm:p-2 rounded-full hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            if (showSearchSidebar) onToggleSearchSidebar();
            onTogglePopup();
          }}
        >
          <img
            src={showPopup ? IconShow1.src : IconShow.src}
            alt="More"
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain "
          />
        </button>
      </div>
    </div>
  );
}


