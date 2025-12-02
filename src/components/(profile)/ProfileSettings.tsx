'use client';

import React, { useState } from 'react';
import PasswordChange from '@/components/(profile)/profile-setting/PasswordChange';
import PrivacySettings from '@/components/(profile)/profile-setting/PrivacySettings';
import NotificationSettings from '@/components/(profile)/profile-setting/NotificationSettings';

function ProfileSettings() {
  const [open, setOpen] = useState<null | 'password' | 'privacy' | 'notifications'>(null);

  const items: Array<{ key: 'password' | 'privacy' | 'notifications'; label: string }> = [
    { key: 'password', label: 'Đổi mật khẩu' },
    { key: 'privacy', label: 'Quyền riêng tư' },
    { key: 'notifications', label: 'Cài đặt thông báo' },
  ];

  const titleMap: Record<NonNullable<typeof open>, string> = {
    password: 'Đổi mật khẩu',
    privacy: 'Quyền riêng tư',
    notifications: 'Cài đặt thông báo',
  };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => setOpen(item.key)}
          className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg md:text-lg"
        >
          {item.label}
        </button>
      ))}

      {open && (
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/40 h-[110%]" onClick={() => setOpen(null)} />

          <div className="hidden md:flex absolute inset-0 items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-gray-800">{titleMap[open]}</span>
                <button
                  onClick={() => setOpen(null)}
                  className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Đóng
                </button>
              </div>
              <div className="p-4">
                {open === 'password' && <PasswordChange />}
                {open === 'privacy' && <PrivacySettings />}
                {open === 'notifications' && <NotificationSettings />}
              </div>
            </div>
          </div>

          <div className="md:hidden absolute inset-x-0 bottom-0 p-0">
            <div className="bg-white rounded-t-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-gray-800">{titleMap[open]}</span>
                <button
                  onClick={() => setOpen(null)}
                  className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Đóng
                </button>
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {open === 'password' && <PasswordChange />}
                {open === 'privacy' && <PrivacySettings />}
                {open === 'notifications' && <NotificationSettings />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSettings;
