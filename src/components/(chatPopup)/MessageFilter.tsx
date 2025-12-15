'use client';

import React from 'react';

// React Icons – Bộ hiện đại nhất
import { HiChatBubbleLeftRight, HiEnvelopeOpen, HiEnvelope, HiEyeSlash, HiUsers, HiUserCircle } from 'react-icons/hi2';

export type FilterType = 'all' | 'unread' | 'read' | 'group' | 'personal' | 'hidden';

interface MessageFilterProps {
  filterType: FilterType;
  setFilterType: (filter: FilterType) => void;
  counts: {
    all: number;
    unread: number;
    read: number;
    group: number;
    personal: number;
    hidden: number;
  };
}

const FILTER_CONFIG: Record<FilterType, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'Tất cả', icon: HiChatBubbleLeftRight, color: 'indigo' },
  group: { label: 'Nhóm', icon: HiUsers, color: 'purple' },
  personal: { label: 'Cá nhân', icon: HiUserCircle, color: 'pink' },
  unread: { label: 'Chưa đọc', icon: HiEnvelope, color: 'blue' },
  read: { label: 'Đã đọc', icon: HiEnvelopeOpen, color: 'green' },
  hidden: { label: 'Ẩn', icon: HiEyeSlash, color: 'gray' },
};

export default function MessageFilter({ filterType, setFilterType, counts }: MessageFilterProps) {
  const filters: FilterType[] =
    counts.hidden > 0
      ? ['all', 'group', 'personal', 'unread', 'read', 'hidden']
      : ['all', 'group', 'personal', 'unread', 'read'];

  return (
    <div className=" bg-gradient-to-b from-white via-white to-gray-50/50 border-b border-gray-200">
      <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-3 pt-1">
        {filters.map((filter) => {
          const { label, icon: Icon, color } = FILTER_CONFIG[filter];
          const isActive = filterType === filter;
          const count = counts[filter];

          // Màu gradient theo từng filter
          const gradientFrom = {
            indigo: 'from-indigo-500',
            blue: 'from-blue-500',
            green: 'from-emerald-500',
            purple: 'from-purple-500',
            pink: 'from-pink-500',
            gray: 'from-gray-500',
          }[color];

          const gradientTo = {
            indigo: 'to-purple-600',
            blue: 'to-cyan-600',
            green: 'to-teal-600',
            purple: 'to-fuchsia-600',
            pink: 'to-rose-600',
            gray: 'to-slate-600',
          }[color];

          return (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`
                relative flex cursor-pointer items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm
                transition-all duration-300 transform hover:scale-105 active:scale-95
                shadow-lg hover:shadow-2xl flex-shrink-0 min-w-fit
                ${
                  isActive
                    ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white shadow-${color}-500/30`
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-100 border border-gray-200'
                }
              `}
            >
              {/* Icon */}
              <Icon className="w-5 h-5" />

              {/* Label */}
              <span>{label}</span>

              {/* Badge số lượng */}
              {count > 0 && (
                <span
                  className={`
                    min-w-[1.6rem] px-2 py-0.5 text-xs font-bold rounded-full
                    ${isActive ? 'bg-white/30 text-white backdrop-blur-sm' : 'bg-gray-200 text-gray-700'}
                  `}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}

              {/* Active Indicator – thanh dưới đẹp như Zalo Premium */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-white/40 rounded-full blur-md" />
              )}
              {isActive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-t-full shadow-lg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
