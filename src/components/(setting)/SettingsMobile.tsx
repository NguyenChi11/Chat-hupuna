'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineLogout } from 'react-icons/hi';
import {
  HiUser,
  HiBell,
  HiLockClosed,
  HiChatBubbleLeftRight,
  HiPhoto,
  HiLanguage,
  HiQuestionMarkCircle,
  HiShieldCheck,
  HiChevronRight,
} from 'react-icons/hi2';

const menuItems = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: <HiUser className="w-6 h-6" /> },
  { id: 'notifications', label: 'Thông báo', icon: <HiBell className="w-6 h-6" /> },
  { id: 'privacy', label: 'Quyền riêng tư', icon: <HiLockClosed className="w-6 h-6" /> },
  { id: 'chat', label: 'Trò chuyện', icon: <HiChatBubbleLeftRight className="w-6 h-6" /> },
  { id: 'media', label: 'Ảnh, video & file', icon: <HiPhoto className="w-6 h-6" /> },
  { id: 'language', label: 'Ngôn ngữ', icon: <HiLanguage className="w-6 h-6" /> },
  { id: 'help', label: 'Trợ giúp & phản hồi', icon: <HiQuestionMarkCircle className="w-6 h-6" /> },
  { id: 'about', label: 'Giới thiệu', icon: <HiShieldCheck className="w-6 h-6" /> },
];

export default function SettingsMobile() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    try {
      localStorage.removeItem('info_user');
      localStorage.removeItem('remember_login');
    } catch {}
    router.push('/');
  };

  return (
    <div className="md:hidden flex flex-col h-screen bg-gray-50">
      {/* Header cố định */}
      <div className="bg-white shadow-sm border-b border-gray-200 z-10">
        <div className="px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        </div>
      </div>

      {/* Nội dung cuộn được */}
      <div className="flex-1 overflow-y-auto">
        {/* Danh sách cài đặt */}
        <div className="divide-y divide-gray-200 bg-white">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="w-full cursor-pointer flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="text-blue-600">{item.icon}</div>
                <span className="text-base font-medium text-gray-800">{item.label}</span>
              </div>
              <HiChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Nút Đăng xuất + thông tin phiên bản */}
        <div className="mt-12 px-6 mb-20 pb-10 bg-white">
          <button
            onClick={handleLogout}
            className="w-full cursor-pointer flex items-center justify-center gap-3 py-4 bg-red-600 text-white font-semibold rounded-2xl hover:bg-red-700 active:scale-98 transition-all shadow-lg"
          >
            <HiOutlineLogout className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
