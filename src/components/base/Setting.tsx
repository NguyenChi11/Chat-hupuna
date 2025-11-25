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
    <div className="flex flex-col bg-white rounded-2xl shadow-2xl w-full mx-auto h-full md:h-[600px] max-h-[90vh] overflow-hidden relative">
      {/* Header kiểu Zalo */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <h2 className="text-sm md:text-base font-semibold">Cài đặt Hupuna</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer flex items-center justify-center"
        >
          <IoClose size={18} />
        </button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row bg-[#f4f6f9]">
        {/* Sidebar */}
        <div className="w-full md:w-60 bg-white border-r border-gray-200 flex flex-col">
          {/* Mobile: horizontal scroll tabs */}
          <nav className="md:hidden overflow-x-auto border-b border-gray-100">
            <ul className="flex space-x-2 px-3 pb-2 pt-2 bg-white">
              {settingsOptions.map((option) => (
                <li
                  key={option.label}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap text-xs
                  transition-colors duration-200
                  ${
                    selectedOption === option.label
                      ? 'bg-blue-100 text-blue-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedOption(option.label)}
                >
                  <div className="w-4 h-4 flex items-center justify-center">{option.icon}</div>
                  <span>{option.label}</span>
                  {option.beta && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500 bg-blue-50 rounded-full">
                      Beta
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Desktop: vertical menu */}
          <nav className="hidden md:block flex-grow pt-3">
            <ul className="space-y-1 px-3">
              {settingsOptions.map((option) => (
                <li
                  key={option.label}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm
                  transition-colors duration-200
                  ${
                    selectedOption === option.label
                      ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedOption(option.label)}
                >
                  <div className="w-5 h-5 flex items-center justify-center text-gray-500">{option.icon}</div>
                  <span className="truncate">{option.label}</span>
                  {option.beta && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold text-blue-500 bg-blue-50 rounded-full">
                      Beta
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Nội dung */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#f4f6f9]">
          {selectedOption === 'Cài đặt chung' && <GeneralSettings />}
          {selectedOption === 'Quyền riêng tư' && <SettingsPage />}
          {selectedOption === 'Giao diện' && <InterfaceSettings />}
          {selectedOption === 'Thông báo' && <NotificationSettings />}
          {selectedOption === 'Tin nhắn' && <MessageComponent />}
          {selectedOption === 'Tiện ích' && <UtilitiesPanel />}
        </div>
      </div>
    </div>
  );
}
