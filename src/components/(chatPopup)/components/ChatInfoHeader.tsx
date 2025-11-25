import React from 'react';

interface ChatInfoHeaderProps {
  onClose: () => void;
}

export default function ChatInfoHeader({ onClose }: ChatInfoHeaderProps) {
  return (
    <div className="p-4 border-b-gray-200 border-b-[1px] flex justify-between items-center">
      <h2 className="text-xl font-bold text-black">Thông tin hội thoại</h2>
      {/* Nút đóng (Chỉ hiện trên mobile) */}
      <button onClick={onClose} className="sm:hidden p-2 hover:bg-gray-100 rounded-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6 text-gray-500"
        >
          <path
            fillRule="evenodd"
            d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}


