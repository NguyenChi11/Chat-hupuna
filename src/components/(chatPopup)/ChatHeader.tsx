'use client';

import React from 'react';
import Image from 'next/image';
import { getProxyUrl } from '../../utils/utils';

// React Icons - chuẩn Zalo, đẹp, nhẹ
import { HiArrowLeft, HiMagnifyingGlass, HiEllipsisVertical, HiUserGroup } from 'react-icons/hi2';

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
  onBackFromChat?: () => void;
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
  onBackFromChat,
}: ChatHeaderProps) {
  const avatarChar = chatName?.trim()?.charAt(0)?.toUpperCase() || (isGroup ? 'N' : 'U');

  return (
    <div className="flex items-center cursor-pointer justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Left: Back + Avatar + Tên */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Nút Back (mobile only) */}
        {onBackFromChat && (
          <button
            onClick={onBackFromChat}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
            title="Quay lại"
          >
            <HiArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden ring-2 ring-white
            ${isGroup ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}
          `}
          >
            {avatar ? (
              <Image
                src={getProxyUrl(avatar)}
                alt={chatName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">{avatarChar}</span>
            )}
          </div>

          {/* Online indicator (chỉ cho cá nhân) */}
          {!isGroup && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
          )}
        </div>

        {/* Tên + info */}
        <button
          onClick={onOpenMembers}
          className="flex-1 min-w-0 cursor-pointer text-left hover:bg-gray-50 rounded-xl px-3 py-2 -ml-2 transition-colors"
        >
          <h1 className="font-semibold text-gray-900 truncate text-base">{chatName}</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            {isGroup ? (
              <>
                <HiUserGroup className="w-3.5 h-3.5" />
                {memberCount} thành viên
              </>
            ) : (
              <>Đang hoạt động</>
            )}
          </p>
        </button>
      </div>

      {/* Right: Tìm kiếm + More */}
      <div className="flex items-center gap-1">
        {/* Nút tìm kiếm */}
        <button
          onClick={() => {
            if (showPopup) onTogglePopup();
            onToggleSearchSidebar();
          }}
          className={`
            p-2.5 rounded-full cursor-pointer transition-all duration-200
            ${showSearchSidebar ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}
          `}
          title="Tìm kiếm tin nhắn"
        >
          <HiMagnifyingGlass className="w-5 h-5" />
        </button>

        {/* Nút More */}
        <button
          onClick={() => {
            if (showSearchSidebar) onToggleSearchSidebar();
            onTogglePopup();
          }}
          className={`
            p-2.5 rounded-full cursor-pointer transition-all duration-200 relative
            ${showPopup ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}
          `}
          title="Thông tin trò chuyện"
        >
          <HiEllipsisVertical className="w-5 h-5" />
          {/* Chấm tròn khi popup đang mở */}
          {showPopup && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />}
        </button>
      </div>
    </div>
  );
}
