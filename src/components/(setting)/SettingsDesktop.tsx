'use client';

import React, { useState } from 'react';
import {
  HiUser,
  HiBell,
  HiLockClosed,
  HiChatBubbleLeftRight,
  HiPhoto,
  HiLanguage,
  HiQuestionMarkCircle,
  HiShieldCheck,
} from 'react-icons/hi2';

const menuItems = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: <HiUser /> },
  { id: 'notifications', label: 'Thông báo', icon: <HiBell /> },
  { id: 'privacy', label: 'Quyền riêng tư', icon: <HiLockClosed /> },
  { id: 'chat', label: 'Trò chuyện', icon: <HiChatBubbleLeftRight /> },
  { id: 'media', label: 'Ảnh, video & file', icon: <HiPhoto /> },
  { id: 'language', label: 'Ngôn ngữ', icon: <HiLanguage /> },
  { id: 'help', label: 'Trợ giúp & phản hồi', icon: <HiQuestionMarkCircle /> },
  { id: 'about', label: 'Giới thiệu', icon: <HiShieldCheck /> },
];

export default function SettingsDesktop() {
  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'notifications':
        return <div className="text-gray-600">Cài đặt thông báo sẽ hiện ở đây</div>;
      case 'privacy':
        return <div className="text-gray-600">Cài đặt quyền riêng tư</div>;
      default:
        return <div className="text-gray-600 text-center py-10">Chọn một mục để xem cài đặt</div>;
    }
  };

  return (
    <div className="hidden sm:flex h-screen bg-gray-50">
      {/* Sidebar trái */}
      <div className="w-80 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
        </div>
        <nav className="py-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-medium'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-base">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Nội dung chính */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">{renderContent()}</div>
      </div>
    </div>
  );
}

// Ví dụ 1 phần cài đặt
const ProfileSettings = () => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-8">Hồ sơ cá nhân</h2>
    <div className="space-y-8">
      <div className="flex items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white">
          H
        </div>
        <div>
          <h3 className="text-xl font-semibold">Hupuna User</h3>
          <p className="text-gray-600">@hupuna123</p>
          <button className="mt-3 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            Thay đổi ảnh đại diện
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tên hiển thị</label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue="Hupuna User"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tiểu sử</label>
          <textarea
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Nói gì đó về bạn..."
          ></textarea>
        </div>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
          Lưu thay đổi
        </button>
      </div>
    </div>
  </div>
);
