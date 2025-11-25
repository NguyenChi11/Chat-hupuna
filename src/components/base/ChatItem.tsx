import React, { useEffect, useRef, useState } from 'react';
import { formatTimeAgo } from '../../utils/dateUtils';
import IconPin from '@/public/icons/pin.svg';
import { formatMessagePreview } from './Sidebar';
import type { ChatItem as ChatItemType, GroupConversation } from '@/types/Group';
import type { User } from '@/types/User';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';

interface ChatItemProps {
  item: ChatItemType;
  isGroup: boolean;
  selectedChat: ChatItemType | null;
  onSelectChat: (item: ChatItemType) => void;
  currentUserId: string;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroupChat: boolean) => void;
}

export default function ChatItem({
  item,
  isGroup,
  selectedChat,
  onSelectChat,
  currentUserId,
  onChatAction,
}: ChatItemProps) {
  const isSelected = selectedChat?._id === item._id;
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Xử lý dữ liệu hiển thị
  const lastMessage = item.lastMessage || (isGroup ? 'Nhóm mới tạo' : 'Sẵn sàng trò chuyện');
  const isRecall = item.isRecall;
  const unreadCount = item.unreadCount || 0;

  // Tên hiển thị: ưu tiên tên nhóm / tên người dùng, nếu thiếu thì tạo tên tạm
  let name: string;
  if (isGroup) {
    const group = item as GroupConversation;
    if (group.name && group.name.trim()) {
      name = group.name;
    } else if (Array.isArray(group.members) && group.members.length > 0) {
      // Nếu nhóm chưa có name, tạo tên tạm từ tên 1 vài thành viên
      const memberNames = group.members
        .map((m) => {
          if (m && typeof m === 'object' && 'name' in m) {
            return String((m as { name?: unknown }).name ?? '');
          }
          return '';
        })
        .filter((n) => !!n)
        .slice(0, 3)
        .join(', ');
      name = memberNames || 'Nhóm';
    } else {
      name = 'Nhóm';
    }
  } else {
    const user = item as User;
    name = user.name || user.username || 'Người dùng';
  }

  const avatarChar = name.charAt(0).toUpperCase();
  const timeDisplay = formatTimeAgo(item.lastMessageAt);

  const isPinned = item.isPinned === true;
  const isHidden = item.isHidden === true;

  // 🔥 FIX: Tính toán vị trí menu thông minh (không bị tràn màn hình)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Kích thước menu (ước tính)
    const menuWidth = 192; // w-48 = 12rem = 192px
    const menuHeight = 100; // Chiều cao ước tính

    // Kích thước viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Tính toán vị trí để menu không bị tràn
    let finalX = mouseX;
    let finalY = mouseY;

    // Nếu menu tràn bên phải → Dịch sang trái
    if (mouseX + menuWidth > viewportWidth) {
      finalX = viewportWidth - menuWidth - 10;
    }

    // Nếu menu tràn phía dưới → Dịch lên trên
    if (mouseY + menuHeight > viewportHeight) {
      finalY = viewportHeight - menuHeight - 10;
    }

    setMenuPosition({ x: finalX, y: finalY });
    setShowMenu(true);
  };

  const handleActionClick = (actionType: 'pin' | 'hide') => {
    setShowMenu(false);

    if (actionType === 'pin') {
      const newState = !isPinned;
      onChatAction(item._id, 'pin', newState, isGroup);
    } else if (actionType === 'hide') {
      const newState = !isHidden;
      onChatAction(item._id, 'hide', newState, isGroup);
    }
  };

  // 🔥 Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <>
      <div
        onClick={() => {
          onSelectChat(item);
          setShowMenu(false);
        }}
        onContextMenu={handleContextMenu}
        className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 transition-colors relative
                  ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''}`}
      >
        {/* 🔥 ICON GHIM (Góc trên phải) */}
        {isPinned && (
          <Image
            width={16}
            height={16}
            src={IconPin.src}
            alt="Ghim"
            className="w-4 h-4 absolute top-1 right-1 opacity-60"
            title="Đã ghim"
          />
        )}

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
                        ${isGroup ? 'bg-blue-500' : 'bg-gray-400'} overflow-hidden`}
          >
            {item.avatar ? (
              <Image
                width={48}
                height={48}
                src={getProxyUrl(item.avatar)}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarChar
            )}
          </div>
          {!isGroup && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1 min-w-0 flex flex-col justify-center space-y-1">
          <div className="flex justify-between items-baseline">
            <h4
              className={`text-sm truncate max-w-[60%] 
               ${unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}
            >
              {name}
            </h4>

            <span className="text-[11px] text-gray-500 flex-shrink-0 flex items-center gap-1">{timeDisplay}</span>
          </div>

          <div className="flex justify-between items-center">
            <p
              className={`text-xs truncate max-w-[80%] ${
                isRecall ? 'italic text-gray-400' : unreadCount > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'
              }`}
            >
              <p className="text-xs text-gray-500 truncate">{formatMessagePreview(lastMessage)}</p>
            </p>
            {unreadCount > 0 && (
              <div className="flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-600 rounded-full">
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 5 ? '5+' : unreadCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔥 CONTEXT MENU - Render bên ngoài ChatItem để tránh overflow */}
      {showMenu && menuPosition && (
        <>
          {/* Backdrop trong suốt */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />

          {/* Menu */}
          <div
            ref={menuRef}
            style={{
              position: 'fixed', // 🔥 Dùng fixed thay vì absolute
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`,
            }}
            className="z-[9999] w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 text-sm"
          >
            {/* Nút Ghim/Bỏ Ghim */}
            <button
              onClick={() => handleActionClick('pin')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-5 h-5 ${isPinned ? 'text-yellow-600 rotate-45' : 'text-gray-400'}`}
              >
                <path d="M7 3.5c0 .69-.56 1.25-1.25 1.25H4.25c-.69 0-1.25-.56-1.25-1.25S3.56 2.25 4.25 2.25h1.5c.69 0 1.25.56 1.25 1.25z" />
                <path
                  fillRule="evenodd"
                  d="M12 2a.75.75 0 00-.75.75v6.5a.75.75 0 001.5 0v-6.5A.75.75 0 0012 2zM3.5 12.25a.75.75 0 00-1.5 0v6a1 1 0 001 1h13a1 1 0 001-1v-6a.75.75 0 00-1.5 0v5.25H4.25v-5.25z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{isPinned ? 'Bỏ Ghim' : 'Ghim Trò Chuyện'}</span>
            </button>

            {/* Nút Ẩn Trò Chuyện */}
            <button
              onClick={() => handleActionClick('hide')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-red-500"
              >
                <path
                  fillRule="evenodd"
                  d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z"
                  clipRule="evenodd"
                />
                <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
              </svg>
              {isHidden ? 'Hiện Trò Chuyện' : 'Ẩn Trò Chuyện'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
