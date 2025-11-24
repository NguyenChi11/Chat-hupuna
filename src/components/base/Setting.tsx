'use client';

import React, { useState } from 'react';
import {
  IoSettingsOutline,
  IoLockClosedOutline,
  IoBrushOutline,
  IoNotificationsOutline,
  IoChatbubbleEllipsesOutline,
  IoBulbOutline,
  IoClose,
} from 'react-icons/io5';

import GeneralSettings from '../setting/settingall';
import SettingsPage from '../setting/privacy';
import InterfaceSettings from '../setting/interface';
import NotificationSettings from '../setting/notification';
import MessageComponent from '../setting/message';
import UtilitiesPanel from '../setting/utilities';

const settingsOptions = [
  { icon: <IoSettingsOutline />, label: 'Cài đặt chung' },
  { icon: <IoLockClosedOutline />, label: 'Quyền riêng tư' },
  { icon: <IoBrushOutline />, label: 'Giao diện', beta: true },
  { icon: <IoNotificationsOutline />, label: 'Thông báo' },
  { icon: <IoChatbubbleEllipsesOutline />, label: 'Tin nhắn' },
  { icon: <IoBulbOutline />, label: 'Tiện ích' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [selectedOption, setSelectedOption] = useState(settingsOptions[0].label);

  return (
    <div
      className="flex flex-col md:flex-row bg-gray-100 border rounded-lg shadow-lg 
      w-full max-w-4xl mx-auto 
      h-auto md:h-[600px] 
      overflow-hidden relative"
    >
      {/* Sidebar */}
      <div className="bg-gray-50 border-b md:border-r md:border-b-0 border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6">
          <h2 className="text-base md:text-xl font-bold text-gray-800">Cài đặt</h2>
        </div>

        {/* Mobile: horizontal scroll tabs */}
        <nav className="md:hidden overflow-x-auto">
          <ul className="flex space-x-2 px-3 pb-3">
            {settingsOptions.map((option) => (
              <li
                key={option.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap 
                transition-colors duration-200
                ${
                  selectedOption === option.label
                    ? 'bg-blue-100 text-blue-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedOption(option.label)}
              >
                <div className="w-4 h-4 flex items-center justify-center">{option.icon}</div>
                <span className="text-sm">{option.label}</span>
                {option.beta && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold text-blue-500 bg-blue-200 rounded-full">
                    Beta
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop: vertical menu */}
        <nav className="hidden md:block flex-grow">
          <ul className="space-y-2 px-4">
            {settingsOptions.map((option) => (
              <li
                key={option.label}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-200 
                ${
                  selectedOption === option.label
                    ? 'bg-blue-100 text-blue-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedOption(option.label)}
              >
                <div className="w-5 h-5 flex items-center justify-center">{option.icon}</div>
                <span className="text-sm">{option.label}</span>
                {option.beta && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-semibold text-blue-500 bg-blue-200 rounded-full">
                    Beta
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Nội dung */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-100">
        {selectedOption === 'Cài đặt chung' && <GeneralSettings />}
        {selectedOption === 'Quyền riêng tư' && <SettingsPage />}
        {selectedOption === 'Giao diện' && <InterfaceSettings />}
        {selectedOption === 'Thông báo' && <NotificationSettings />}
        {selectedOption === 'Tin nhắn' && <MessageComponent />}
        {selectedOption === 'Tiện ích' && <UtilitiesPanel />}
      </div>

      {/* Nút đóng */}
      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      >
        <IoClose size={24} />
      </button>
    </div>
  );
}
