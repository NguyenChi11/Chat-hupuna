'use client';
import React, { useState } from 'react';
import Image from 'next/image';

import IconNT1 from '@/public/icons/laptop.svg';
import IconNT2 from '@/public/icons/laptop_simple.svg';
import ToggleSwitch from '../ui/toggleswitch';

// ================= Toggle Switch =================

// ================= Main Settings =================
const NotificationSettings = () => {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  return (
    <>
      {/* --- Cài đặt thông báo --- */}
      <div className="sm:ml-5 mb-4">
        <h2 className="text-[18px] font-bold text-gray-800">Cài đặt thông báo</h2>
        <p className="text-[13px] text-gray-500 mt-1">Nhận được thông báo mỗi khi có tin nhắn mới</p>
      </div>

      <div className="p-4 sm:p-6 w-full sm:w-[600px] mx-auto bg-white rounded-xl shadow-lg mb-6">
        {/* Responsive flex */}
        <div className="flex flex-col sm:flex-row sm:justify-around sm:space-x-4 space-y-4 sm:space-y-0">
          <NotificationOption
            label="Bật"
            isEnabled={false}
            currentStatus={isNotificationsEnabled}
            onClick={() => setIsNotificationsEnabled(false)}
          />
          <NotificationOption
            label="Tắt"
            isEnabled={true}
            currentStatus={isNotificationsEnabled}
            onClick={() => setIsNotificationsEnabled(true)}
          />
        </div>
      </div>

      {/* --- Âm thanh thông báo --- */}
      <h3 className="text-[18px] font-bold text-gray-800 sm:ml-5 mb-4">Âm thanh thông báo</h3>
      <div className="p-4 sm:p-6 w-full sm:w-[600px] mx-auto bg-white rounded-xl shadow-lg mb-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-700">Phát âm thanh khi có tin nhắn & thông báo mới</p>
          <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
        </div>
      </div>
    </>
  );
};

// ================= NotificationOption =================
interface NotificationOptionProps {
  label: string;
  isEnabled: boolean;
  currentStatus: boolean;
  onClick: () => void;
}

const NotificationOption = ({ label, isEnabled, currentStatus, onClick }: NotificationOptionProps) => {
  const isSelected = currentStatus === isEnabled;

  return (
    <div className="flex flex-col items-center cursor-pointer w-full sm:w-1/2" onClick={onClick}>
      <div
        className={`w-full sm:w-32 h-20 p-2 border rounded-lg flex items-center justify-center 
        transition-all duration-200 ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
      >
        <Image src={isEnabled ? IconNT1 : IconNT2} alt={label} className="w-10 sm:w-full h-full object-contain" />
      </div>

      <div className="flex items-center mt-3">
        <input
          type="radio"
          name="notification_status"
          value={label}
          checked={isSelected}
          onChange={onClick}
          className="form-radio h-4 w-4 text-blue-600 border-gray-300"
        />
        <label className={`ml-2 text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>{label}</label>
      </div>
    </div>
  );
};

export default NotificationSettings;
