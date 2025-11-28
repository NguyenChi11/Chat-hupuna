'use client';

import React from 'react';

export type FilterType = 'all' | 'unread' | 'read' | 'hidden';

interface MessageFilterProps {
  filterType: FilterType;
  setFilterType: (filter: FilterType) => void;
  counts: {
    all: number;
    unread: number;
    read: number;
    hidden: number;
  };
}

const LABELS: Record<FilterType, string> = {
  all: 'Tất cả',
  unread: 'Chưa đọc',
  read: 'Đã đọc',
  hidden: 'Ẩn trò chuyện',
};

export default function MessageFilter({ filterType, setFilterType, counts }: MessageFilterProps) {
  const filters: FilterType[] =
    counts.hidden && counts.hidden > 0
      ? (['all', 'unread', 'read', 'hidden'] as FilterType[])
      : (['all', 'unread', 'read'] as FilterType[]);

  return (
    <div className="px-3 py-2 border-b border-gray-200 bg-white flex gap-2 overflow-x-auto whitespace-nowrap custom-scrollbar ">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => setFilterType(filter)}
          className={`
            relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-shrink-0
            min-w-fit shadow-sm hover:shadow-md active:scale-95
            ${
              filterType === filter
                ? 'bg-blue-600 text-white shadow-blue-500/30'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-150'
            }
          `}
        >
          <span>{LABELS[filter]}</span>

          {/* Badge số lượng */}
          <span
            className={`
              min-w-[1.4rem] px-1.5 py-0.5 text-xs font-bold rounded-full
              ${filterType === filter ? 'bg-white text-blue-600' : 'bg-gray-300 text-gray-700'}
            `}
          >
            {counts[filter] > 99 ? '99+' : counts[filter]}
          </span>

          {/* Hiệu ứng active dưới dạng thanh nhỏ (giống Zalo) */}
          {filterType === filter && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-t-full shadow-md" />
          )}
        </button>
      ))}
    </div>
  );
}
