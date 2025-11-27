'use client';

import React from 'react';
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
  return (
    <div className="sm:hidden min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center justify-between px-6 py-5 bg-white hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="text-blue-600">{item.icon}</div>
              <span className="text-base font-medium text-gray-800">{item.label}</span>
            </div>
            <HiChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>

      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">Hupuna phiên bản 2.5.1</p>
      </div>
    </div>
  );
}
