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
  HiSparkles,
  HiPencil,
  HiCheck,
} from 'react-icons/hi2';

const menuItems = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: HiUser, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'notifications', label: 'Thông báo', icon: HiBell, gradient: 'from-blue-500 to-cyan-600' },
  { id: 'privacy', label: 'Quyền riêng tư', icon: HiLockClosed, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'chat', label: 'Trò chuyện', icon: HiChatBubbleLeftRight, gradient: 'from-pink-500 to-rose-600' },
  { id: 'media', label: 'Ảnh, video & file', icon: HiPhoto, gradient: 'from-orange-500 to-red-600' },
  { id: 'language', label: 'Ngôn ngữ', icon: HiLanguage, gradient: 'from-purple-500 to-indigo-600' },
  { id: 'help', label: 'Trợ giúp & phản hồi', icon: HiQuestionMarkCircle, gradient: 'from-gray-500 to-slate-600' },
  { id: 'about', label: 'Giới thiệu', icon: HiShieldCheck, gradient: 'from-green-500 to-emerald-600' },
];

export default function SettingsDesktop() {
  const [activeTab, setActiveTab] = useState('profile');

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'notifications':
        return <PlaceholderContent title="Thông báo" icon={HiBell} color="blue" />;
      case 'privacy':
        return <PlaceholderContent title="Quyền riêng tư" icon={HiLockClosed} color="emerald" />;
      case 'chat':
        return <PlaceholderContent title="Cài đặt trò chuyện" icon={HiChatBubbleLeftRight} color="pink" />;
      case 'media':
        return <PlaceholderContent title="Ảnh, video & file" icon={HiPhoto} color="orange" />;
      case 'language':
        return <PlaceholderContent title="Ngôn ngữ" icon={HiLanguage} color="purple" />;
      case 'help':
        return <PlaceholderContent title="Trợ giúp & phản hồi" icon={HiQuestionMarkCircle} color="gray" />;
      case 'about':
        return <PlaceholderContent title="Giới thiệu Hupuna" icon={HiShieldCheck} color="green" />;
      default:
        return <div className="text-center py-20 text-gray-500">Chọn một mục để xem cài đặt</div>;
    }
  };

  return (
    <div className="hidden sm:flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Sidebar trái – Sang trọng như Zalo Premium */}
      <div className="w-96 bg-white/95 backdrop-blur-2xl border-r border-gray-200/50 shadow-2xl">
        <div className="p-8 border-b border-gray-200/50 bg-gradient-to-r from-indigo-600/5 to-purple-600/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl">
              <HiSparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Cài đặt
              </h1>
              <p className="text-sm text-gray-600 mt-1">Tùy chỉnh trải nghiệm của bạn</p>
            </div>
          </div>
        </div>

        <nav className="py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full cursor-pointer flex items-center gap-5 px-8 py-5 text-left transition-all duration-300 group relative overflow-hidden ${
                  isActive ? 'text-white font-bold' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {/* Gradient background khi active */}
                {isActive && <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-90`} />}
                {isActive && <div className="absolute inset-y-0 left-0 w-2 bg-white/50" />}

                {/* Icon với hiệu ứng */}
                <div
                  className={`relative z-10 p-3 rounded-2xl transition-all duration-300 ${
                    isActive ? 'bg-white/30 shadow-xl' : 'bg-gray-100 group-hover:bg-gray-200 group-hover:scale-110'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-current'}`} />
                </div>

                <span className="relative z-10 text-lg">{item.label}</span>

                {/* Hover glow */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Nội dung chính */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-10">{renderContent()}</div>
      </div>
    </div>
  );
}

// Placeholder cho các tab chưa làm
const PlaceholderContent = ({
  title,
  icon: Icon,
  color,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
}) => {
  const gradients = {
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-teal-600',
    pink: 'from-pink-500 to-rose-600',
    orange: 'from-orange-500 to-red-600',
    purple: 'from-purple-500 to-indigo-600',
    gray: 'from-gray-500 to-slate-600',
    green: 'from-green-500 to-emerald-600',
  };

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div
        className={`p-10 bg-gradient-to-br ${gradients[color as keyof typeof gradients]} rounded-3xl shadow-2xl mb-8`}
      >
        <Icon className="w-24 h-24 text-white" />
      </div>
      <h2 className="text-4xl font-bold text-gray-800 mb-4">{title}</h2>
      <p className="text-xl text-gray-600">Tính năng đang được phát triển</p>
      <p className="text-sm text-gray-500 mt-4">Sắp ra mắt trong bản cập nhật tiếp theo</p>
    </div>
  );
};

// Profile Settings – Đẹp như Zalo PC Pro 2025
const ProfileSettings = () => (
  <div className="space-y-10">
    <div>
      <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
        Hồ sơ cá nhân
      </h2>
      <p className="text-lg text-gray-600">Cập nhật thông tin và cách mọi người nhìn thấy bạn</p>
    </div>

    {/* Avatar Section */}
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 p-10">
      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="relative group">
          <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-7xl font-bold text-white shadow-2xl ring-8 ring-white/50">
            H
          </div>
          <button className="absolute cursor-pointer inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <HiPencil className="w-12 h-12 text-white" />
          </button>
          <div className="absolute -bottom-2 -right-2 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl">
            <HiSparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center md:text-left">
          <h3 className="text-3xl font-bold text-gray-900">Hupuna User</h3>
          <p className="text-xl text-gray-600 mt-2">@hupuna123</p>
          <p className="text-sm text-gray-500 mt-4 max-w-md">
            Thành viên từ 2024 • Đã gửi 1.234 tin nhắn • Đang hoạt động
          </p>
          <button className="mt-6 px-8 py-4 cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-xl transition-all duration-300 active:scale-95 flex items-center gap-3">
            <HiPencil className="w-6 h-6" />
            Thay đổi ảnh đại diện
          </button>
        </div>
      </div>
    </div>

    {/* Form chỉnh sửa */}
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 p-10 space-y-8">
      <div>
        <label className="block text-lg font-bold text-gray-800 mb-3">Tên hiển thị</label>
        <input
          type="text"
          className="w-full px-6 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 transition-all duration-300"
          defaultValue="Hupuna User"
        />
      </div>

      <div>
        <label className="block text-lg font-bold text-gray-800 mb-3">Tiểu sử</label>
        <textarea
          rows={4}
          className="w-full px-6 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 resize-none"
          placeholder="Nói gì đó về bạn... Ví dụ: 'Yêu công nghệ, thích chat và ăn bánh mì'"
        />
      </div>

      <div className="flex gap-4">
        <button className="px-10 py-5 cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xl rounded-2xl shadow-2xl transition-all duration-300 active:scale-95 flex items-center gap-3">
          <HiCheck className="w-7 h-7" />
          Lưu thay đổi
        </button>
        <button className="px-10 py-5 cursor-pointer border-2 border-gray-300 text-gray-700 font-bold text-xl rounded-2xl hover:bg-gray-50 transition-all duration-300 active:scale-95">
          Hủy
        </button>
      </div>
    </div>
  </div>
);
