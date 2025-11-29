import React, { useState, useRef, useEffect } from 'react';

interface SearchHeaderProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onClose: () => void;
  isSearching: boolean;
  onSearchingChange: (searching: boolean) => void;
}

export default function SearchHeader({
  searchTerm,
  onSearch,
  onClose,
  isSearching,
  onSearchingChange,
}: SearchHeaderProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setLocalSearchTerm(term);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!term.trim()) {
      onSearch('');
      onSearchingChange(false);
      return;
    }

    onSearchingChange(true);
    debounceRef.current = setTimeout(() => {
      onSearch(term);
      onSearchingChange(false);
    }, 400);
  };

  return (
    <div className="flex-none px-4 pt-3 pb-2 bg-[#f3f6fb]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0088ff] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Tìm kiếm</p>
            <p className="text-xs text-gray-500">Nhập từ khóa để tìm trong toàn bộ Zalo</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 cursor-pointer flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm kiếm tin nhắn, file, liên hệ..."
          value={localSearchTerm}
          onChange={handleSearchChange}
          className="w-full h-9 pl-9 pr-9 rounded-full bg-white border border-gray-200 text-sm outline-none focus:border-[#0088ff] focus:ring-1 focus:ring-[#0088ff]/40 transition-all placeholder:text-gray-400"
        />
        {localSearchTerm && (
          <button
            onClick={() => {
              setLocalSearchTerm('');
              onSearch('');
            }}
            className="absolute cursor-pointer right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {isSearching && (
        <div className="flex items-center justify-center py-2 mt-2">
          <div className="w-4 h-4 border-[0.125rem] border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-xs text-gray-600">Đang tìm kiếm...</span>
        </div>
      )}
    </div>
  );
}
