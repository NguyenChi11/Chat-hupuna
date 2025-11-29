import React from 'react';
import { HiEye, HiUserGroup } from 'react-icons/hi';
import { HiEyeSlash, HiMapPin } from 'react-icons/hi2';

interface ChatQuickActionsProps {
  localIsPinned: boolean;
  localIsHidden: boolean;
  onPinToggle: () => void;
  onHideToggle: () => void;
  onCreateGroup: () => void;
}

export default function ChatQuickActions({
  localIsPinned,
  localIsHidden,
  onPinToggle,
  onHideToggle,
  onCreateGroup,
}: ChatQuickActionsProps) {
  return (
    <div className="flex justify-around items-center py-6 px-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Ghim / Bỏ ghim */}
      <button
        onClick={onPinToggle}
        className="cursor-pointer group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-gray-50 active:scale-95"
        title={localIsPinned ? 'Bỏ ghim hội thoại' : 'Ghim lên đầu'}
      >
        <div
          className={`p-4 rounded-2xl transition-all duration-300 shadow-md group-hover:shadow-lg ${
            localIsPinned
              ? 'bg-yellow-100 text-yellow-600 ring-4 ring-yellow-200'
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }`}
        >
          <HiMapPin className={`w-6 h-6 ${localIsPinned ? 'rotate-45' : ''} transition-transform`} />
        </div>
        <span className={`text-xs font-medium ${localIsPinned ? 'text-yellow-700' : 'text-gray-600'}`}>
          {localIsPinned ? 'Đã ghim' : 'Ghim'}
        </span>
      </button>

      {/* Ẩn / Hiện trò chuyện */}
      <button
        onClick={onHideToggle}
        className="cursor-pointer group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-gray-50 active:scale-95"
        title={localIsHidden ? 'Hiện lại trò chuyện' : 'Ẩn trò chuyện'}
      >
        <div
          className={`p-4 rounded-2xl transition-all duration-300 shadow-md group-hover:shadow-lg ${
            localIsHidden
              ? 'bg-red-100 text-red-600 ring-4 ring-red-200'
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }`}
        >
          {localIsHidden ? <HiEyeSlash className="w-6 h-6" /> : <HiEye className="w-6 h-6" />}
        </div>
        <span className={`text-xs font-medium ${localIsHidden ? 'text-red-600' : 'text-gray-600'}`}>
          {localIsHidden ? 'Đã ẩn' : 'Ẩn'}
        </span>
      </button>

      {/* Tạo nhóm trò chuyện */}
      <button
        onClick={onCreateGroup}
        className="cursor-pointer group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-blue-50 active:scale-95"
        title="Tạo nhóm chat mới"
      >
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg group-hover:shadow-xl ring-4 ring-blue-200 transition-all duration-300">
          <HiUserGroup className="w-6 h-6" />
        </div>
        <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700">Tạo nhóm</span>
      </button>
    </div>
  );
}
