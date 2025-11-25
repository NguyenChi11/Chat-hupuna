'use client';

import React from 'react';

/* eslint-disable @next/next/no-img-element */

import IconShow from '@/public/icons/show.svg';
import IconShow1 from '@/public/icons/show2.svg';
import Image from 'next/image';
import { getProxyUrl } from '../../utils/utils';

interface ChatHeaderProps {
  chatName: string;
  isGroup: boolean;
  memberCount: number;
  showPopup: boolean;
  onTogglePopup: () => void;
  onOpenMembers: () => void;
  showSearchSidebar: boolean;
  onToggleSearchSidebar: () => void;
  avatar?: string;
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
  avatar,
}: ChatHeaderProps) {
  const avatarChar = chatName?.trim()?.charAt(0)?.toUpperCase() || (isGroup ? 'N' : 'U');

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Avatar nhóm hoặc user */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base
                        ${isGroup ? 'bg-blue-500' : 'bg-gray-400'} overflow-hidden`}
          >
            {avatar ? (
              // Dùng <img> + proxy để load avatar nhóm/user từ Mega hoặc nguồn ngoài
              <img src={getProxyUrl(avatar)} alt={chatName} className="w-full h-full object-cover" />
            ) : (
              avatarChar
            )}
          </div>
        </div>

        {/* Tên & trạng thái */}
        <div
          className="truncate hover:bg-gray-100 hover:cursor-pointer rounded-lg px-1 py-1 sm:px-2 sm:py-2"
          onClick={onOpenMembers}
        >
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
          <Image
            src={showPopup ? IconShow1.src : IconShow.src}
            width={20}
            height={20}
            alt="More"
            className="w-5 h-5 sm:w-6 sm:h-6 object-contain "
          />
        </button>
      </div>
    </div>
  );
}
