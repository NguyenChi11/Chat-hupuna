import React from 'react';
import { HiClock } from 'react-icons/hi';
interface ReminderSectionProps {
  onOpen: () => void;
}
export default function ReminderSection({ onOpen }: ReminderSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        className="cursor-pointer w-full px-5 py-5 flex items-center gap-4 hover:bg-gray-50 transition-all duration-200 group"
        onClick={onOpen}
        title="Xem danh sách nhắc hẹn"
      >
        {/* Icon với gradient + hiệu ứng */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:shadow-xl transition-all duration-300">
          <HiClock className="w-6 h-6" />
        </div>

        {/* Nội dung */}
        <div className="text-left">
          <p className="text-base font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
            Danh sách nhắc hẹn
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Nhấn để xem các nhắc hẹn trong cuộc trò chuyện</p>
        </div>

        {/* Mũi tên chỉ thị */}
        <div className="ml-auto text-gray-400 group-hover:text-amber-600 transition-colors">
          <svg
            className={`w-5 h-5 transition-transform duration-200 `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
