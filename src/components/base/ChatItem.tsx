'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatTimeAgo } from '../../utils/dateUtils';
import { formatMessagePreview } from './Sidebar';
import type { ChatItem as ChatItemType, GroupConversation } from '@/types/Group';
import type { User } from '@/types/User';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';

// React Icons – Bộ hiện đại nhất 2025
import { HiEye, HiEyeSlash, HiUserGroup, HiCheck, HiOutlineMapPin } from 'react-icons/hi2';

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
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

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
    const menuWidth = 240;
    const menuHeight = 130;

    setMenuPosition({
      x: x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 16 : x + 12,
      y: y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 16 : y + 12,
    });
    setShowMenu(true);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    const t = e.touches && e.touches[0];
    const x0 = t ? t.clientX : 0;
    const y0 = t ? t.clientY : 0;
    longPressTimerRef.current = window.setTimeout(() => {
      const menuWidth = 240;
      const menuHeight = 130;
      const x = x0 + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 16 : x0 + 12;
      const y = y0 + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 16 : y0 + 12;
      setMenuPosition({ x, y });
      setShowMenu(true);
      longPressTriggeredRef.current = true;
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const triggered = longPressTriggeredRef.current;
    clearLongPressTimer();
    if (triggered) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchMove = () => {
    clearLongPressTimer();
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
      {/* Chat Item – SIÊU ĐẸP */}
      <div
        onClick={() => onSelectChat(item)}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={clearLongPressTimer}
        onTouchMove={handleTouchMove}
        className={`
          group relative mx-3 my-2 rounded-3xl transition-all duration-300 cursor-pointer
          ${
            isSelected
              ? 'bg-gradient-to-r from-indigo-100 to-purple-100 shadow-xl ring-2 ring-indigo-300'
              : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 hover:shadow-lg'
          }
          ${isHidden ? 'opacity-60' : ''}
          active:scale-98
        `}
      >
        <div className="flex items-center gap-4 p-2">
          {/* Avatar + Online + Group Icon */}
          <div className="relative flex-shrink-0">
            <div
              className={`
                w-12 h-12 rounded-3xl overflow-hidden ring-2 ring-white shadow-2xl flex items-center justify-center text-white font-bold text-2xl
                ${
                  isGroup
                    ? 'bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-600'
                }
              `}
            >
              {item.avatar ? (
                <Image
                  src={getProxyUrl(item.avatar)}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{avatarChar}</span>
              )}
            </div>

            {/* Online indicator (chỉ cá nhân) */}
            {!isGroup && (
              <div
                className={`absolute bottom-0 right-0 w-5
               h-5 rounded-full border-4 border-white shadow-lg
                ${presenceOnline ? 'bg-green-400' : 'bg-gray-400'}`}
              />
            )}

            {/* Group icon */}
            {isGroup && (
              <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-2xl shadow-xl">
                <HiUserGroup className="w-4 h-4 text-purple-600" />
              </div>
            )}

            {/* Pin icon – đẹp hơn */}
            {isPinned && (
              <div className="absolute -top-2 -left-2 p-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-xl animate-pulse">
                <HiOutlineMapPin className="w-4 h-4 text-white rotate-12" />
              </div>
            )}
          </div>

          {/* Nội dung */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4
                className={`
                  text-lg font-bold truncate max-w-[11rem]
                  ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'}
                `}
              >
                {displayName}
              </h4>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <HiCheck className="w-4 h-4 text-indigo-500" />
                {timeDisplay}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <p
                className={`
                  text-sm truncate max-w-[14rem]
                  ${unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}
                `}
              >
                {item.isRecall ? 'Tin nhắn đã được thu hồi' : formatMessagePreview(lastMessage)}
              </p>

              {/* Unread Badge – đẹp hơn Zalo */}
              {unreadCount > 0 && (
                <div className="relative">
                  <div className="relative w-6 h-6 flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-600 rounded-full shadow-xl">
                    <span className="text-sm font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu – ĐẸP NHƯ ZALO PREMIUM */}
      {showMenu && menuPosition && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />

          <div
            ref={menuRef}
            style={{ top: menuPosition.y, left: menuPosition.x, position: 'fixed' }}
            className="z-[9999] w-72 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* Ghim */}
            <button
              onClick={() => handleAction('pin')}
              className="flex items-center cursor-pointer gap-4 w-full px-3 py-2 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all font-semibold text-gray-800"
            >
              <div className={`p-3 rounded-2xl ${isPinned ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <HiOutlineMapPin className={`w-4 h-4 ${isPinned ? 'text-orange-600 rotate-45' : 'text-gray-600'}`} />
              </div>
              <span className="flex-1 text-left">{isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}</span>
              {isPinned && <HiCheck className="w-5 h-5 text-orange-600" />}
            </button>

            {/* Ẩn/Hiện */}
            <button
              onClick={() => handleAction('hide')}
              className="flex items-center cursor-pointer gap-4 w-full px-3 py-2 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all font-semibold text-gray-800 border-t border-gray-100"
            >
              <div className={`p-3 rounded-2xl ${isHidden ? 'bg-green-100' : 'bg-red-100'}`}>
                {isHidden ? (
                  <HiEye className="w-4 h-4 text-green-600" />
                ) : (
                  <HiEyeSlash className="w-4 h-4 text-red-600" />
                )}
              </div>
              <span className="flex-1 text-left">{isHidden ? 'Hiện lại' : 'Ẩn trò chuyện'}</span>
              {isHidden && <HiCheck className="w-5 h-5 text-green-600" />}
            </button>
          </div>
        </>
      )}
    </>
  );
}
