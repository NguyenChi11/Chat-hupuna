'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatTimeAgo } from '../../utils/dateUtils';
import { formatMessagePreview } from './Sidebar';
import type { ChatItem as ChatItemType, GroupConversation } from '@/types/Group';
import type { User } from '@/types/User';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';

// React Icons - đúng và đẹp
import { HiOutlinePlus, HiEye, HiEyeSlash } from 'react-icons/hi2';

interface ChatItemProps {
  item: ChatItemType;
  isGroup: boolean;
  selectedChat: ChatItemType | null;
  onSelectChat: (item: ChatItemType) => void;
  currentUserId: string;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => void;
}

export default function ChatItem({ item, isGroup, selectedChat, onSelectChat, onChatAction }: ChatItemProps) {
  const isSelected = selectedChat?._id === item._id;
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = item.unreadCount || 0;
  const isPinned = !!item.isPinned;
  const isHidden = !!item.isHidden;

  // Tối ưu: Gộp logic lấy tên + avatar char
  const displayName = React.useMemo(() => {
    if (isGroup) {
      const group = item as GroupConversation;
      if (group.name?.trim()) return group.name.trim();
      const names = group.members
        ?.map((m) => (m as unknown as User)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      return names || 'Nhóm trống';
    }
    const user = item as User;
    return user.name || user.username || 'Người dùng';
  }, [item, isGroup]);

  const avatarChar = displayName.charAt(0).toUpperCase();
  const lastMessage = item.lastMessage || (isGroup ? 'Nhóm mới tạo' : 'Bắt đầu trò chuyện');
  const timeDisplay = formatTimeAgo(item.lastMessageAt);

  const PRESENCE_THRESHOLD_MS = 5 * 60 * 1000;
  const presenceOnline = (() => {
    if (isGroup) return undefined;
    const u = item as User;
    const ls = u.lastSeen ?? null;
    if (ls != null) return Date.now() - ls <= PRESENCE_THRESHOLD_MS;
    return !!u.online;
  })();

  // Context menu thông minh
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX;
    const y = e.clientY;
    const menuWidth = 220;
    const menuHeight = 110;

    setMenuPosition({
      x: x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 12 : x + 8,
      y: y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 12 : y + 8,
    });
    setShowMenu(true);
  };

  const handleAction = (type: 'pin' | 'hide') => {
    setShowMenu(false);
    onChatAction(item._id, type, type === 'pin' ? !isPinned : !isHidden, isGroup);
  };

  // Click outside để đóng menu
  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  return (
    <>
      {/* Chat Item */}
      <div
        onClick={() => onSelectChat(item)}
        onContextMenu={handleContextMenu}
        className={`
          group relative flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-all duration-200 rounded-lg mx-2 my-1
          ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}
          ${isHidden ? 'opacity-65' : ''}
        `}
      >
        {/* Icon ghim chuẩn */}
        {isPinned && (
          <HiOutlinePlus
            className="absolute top-2 right-3 w-4 h-4 text-yellow-600 drop-shadow-sm z-10"
            title="Đã ghim"
          />
        )}

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`
            w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-lg flex items-center justify-center text-white font-bold text-lg
            ${isGroup ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'}
          `}
          >
            {item.avatar ? (
              <Image
                src={getProxyUrl(item.avatar)}
                alt={displayName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">{avatarChar}</span>
            )}
          </div>
          {!isGroup && (
            <div
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${
                presenceOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          )}
        </div>

        {/* Nội dung */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4
              className={`
              text-sm font-semibold truncate max-w-[10rem]
              ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'}
            `}
            >
              {displayName}
            </h4>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{timeDisplay}</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p
              className={`
              text-xs truncate max-w-[12.5rem]
              ${unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-500'}
            `}
            >
              {formatMessagePreview(lastMessage)}
            </p>

            {unreadCount > 0 && (
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-xs font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && menuPosition && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />

          <div
            ref={menuRef}
            style={{ top: menuPosition.y, left: menuPosition.x, position: 'fixed' }}
            className="z-[9999] w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <button
              onClick={() => handleAction('pin')}
              className="flex items-center gap-3 w-full px-5 py-4 text-gray-800 hover:bg-gray-50 transition-colors font-medium"
            >
              <HiOutlinePlus className={`w-5 h-5 ${isPinned ? 'text-yellow-600 rotate-45' : 'text-gray-500'}`} />
              <span>{isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}</span>
            </button>

            <button
              onClick={() => handleAction('hide')}
              className="flex items-center gap-3 w-full px-5 py-4 text-gray-800 hover:bg-gray-50 transition-colors font-medium border-t border-gray-100"
            >
              {isHidden ? (
                <HiEye className="w-5 h-5 text-green-600" />
              ) : (
                <HiEyeSlash className="w-5 h-5 text-red-600" />
              )}
              <span>{isHidden ? 'Hiện lại' : 'Ẩn trò chuyện'}</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
