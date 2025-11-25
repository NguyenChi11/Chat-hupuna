'use client';

import React from 'react';

export type FilterType = 'all' | 'unread' | 'read';

interface MessageFilterProps {
  filterType: FilterType;
  setFilterType: (filter: FilterType) => void;
  counts: {
    all: number;
    unread: number;
    read: number;
  };
}

export default function MessageFilter({ filterType, setFilterType, counts }: MessageFilterProps) {
  return (
    <div className="p-2 border-b border-gray-200 flex space-x-2 bg-white">
      {(['all', 'unread', 'read'] as FilterType[]).map((filter) => (
        <button
          key={filter}
          onClick={() => setFilterType(filter)}
          className={`
            px-3 py-1.5 text-xs rounded-full transition-all font-medium
            flex items-center gap-1.5
            ${
            filterType === filter
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
          `}
        >
          <span>{filter === 'all' ? 'Tất cả' : filter === 'unread' ? 'Chưa đọc' : 'Đã đọc'}</span>
          <span
            className={`
              text-[10px] px-1.5 py-0.5 rounded-full font-semibold
              ${filterType === filter ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}
            `}
          >
            {counts[filter]}
          </span>
        </button>
      ))}
    </div>
  );
}