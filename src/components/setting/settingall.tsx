'use client';

import React, { useState } from 'react';
import RadioItem from '../ui/radioItem';

interface GeneralSettingsProps {
  defaultShowAllFriends?: boolean;
  defaultLanguage?: string;
}

export default function GeneralSettings({
  defaultShowAllFriends = true,
  defaultLanguage = 'Tiếng Việt',
}: GeneralSettingsProps) {
  const [showAllFriends, setShowAllFriends] = useState(defaultShowAllFriends);
  const [language, setLanguage] = useState(defaultLanguage);

  return (
    <div className="space-y-8 mt-4">
      {/* Contact section */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 ml-3">Danh bạ</h3>
        <p className="text-sm text-gray-500 ml-3">Danh sách bạn bè được hiển thị trong danh bạ</p>
        <div className="rounded-lg bg-white p-2 space-y-2">
          <RadioItem
            label="Hiển thị tất cả bạn bè"
            value="all"
            selectedValue={showAllFriends ? 'all' : 'zaloOnly'}
            onChange={(val) => setShowAllFriends(val === 'all')}
          />
          <RadioItem
            label="Chỉ hiển thị bạn bè đang sử dụng Zalo"
            value="zaloOnly"
            selectedValue={showAllFriends ? 'all' : 'zaloOnly'}
            onChange={(val) => setShowAllFriends(val === 'all')}
          />
        </div>
      </div>

      {/* Language section */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800 ml-3">Ngôn ngữ</h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 sm:p-4 rounded-lg border bg-white border-gray-300">
          <span className="text-gray-700 text-sm sm:text-base">Thay đổi ngôn ngữ</span>
          <div className="relative w-full sm:w-auto">
            <select
              className="w-full sm:w-auto appearance-none bg-white border border-gray-300 rounded-lg py-2 px-3 pr-8 text-sm sm:text-base text-gray-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option>Tiếng Việt</option>
              <option>English</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
