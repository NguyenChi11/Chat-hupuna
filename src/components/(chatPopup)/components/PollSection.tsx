import React from 'react';
import { HiChartBar } from 'react-icons/hi2';

interface PollSectionProps {
  onOpen: () => void;
}

export default function PollSection({ onOpen }: PollSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button className="cursor-pointer w-full px-5 py-5 flex items-center gap-4 hover:bg-gray-50 transition-all duration-200 group" onClick={onOpen} title="Xem danh sách bình chọn">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg group-hover:shadow-xl transition-all duration-300">
          <HiChartBar className="w-6 h-6" />
        </div>
        <div className="text-left">
          <p className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Danh sách bình chọn</p>
          <p className="text-xs text-gray-500 mt-0.5">Nhấn để xem các bình chọn trong cuộc trò chuyện</p>
        </div>
        <div className="ml-auto text-gray-400 group-hover:text-indigo-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
