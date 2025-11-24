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
}

export default function ChatHeader({
  chatName,
  isGroup,
  memberCount,
  showPopup,
  onTogglePopup,
  onOpenMembers,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center space-x-2">
        <div className="truncate hover:bg-gray-100 hover:cursor-pointer rounded-lg p-2" onClick={onOpenMembers}>
          <h1 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{chatName}</h1>
          <p className="text-xs text-gray-500">{isGroup ? `${memberCount} thành viên` : 'Đang hoạt động'}</p>
        </div>
      </div>
      <button className="p-1 sm:p-2 rounded-full hover:bg-gray-100 cursor-pointer" onClick={onTogglePopup}>
        <img
          src={showPopup ? IconShow1.src : IconShow.src}
          alt="More"
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain "
        />
      </button>
    </div>
  );
}


