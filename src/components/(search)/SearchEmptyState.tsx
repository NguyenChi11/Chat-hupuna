import React from 'react';

interface SearchEmptyStateProps {
  isSearching: boolean;
  searchTerm: string;
  hasResults: boolean;
}

export default function SearchEmptyState({ isSearching, searchTerm, hasResults }: SearchEmptyStateProps) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-[0.1875rem] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-gray-600 font-medium">Đang tìm kiếm...</span>
      </div>
    );
  }

  if (!searchTerm.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg font-medium">Nhập từ khóa để tìm kiếm</p>
        <p className="text-sm mt-2">Tìm kiếm tin nhắn, file, liên hệ trong tất cả cuộc trò chuyện</p>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg font-medium">Không tìm thấy kết quả</p>
        <p className="text-sm mt-2">Thử tìm kiếm với từ khóa khác</p>
      </div>
    );
  }

  return null;
}
