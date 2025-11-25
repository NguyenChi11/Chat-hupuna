import React from 'react';
import ICPin from '@/components/svg/ICPin';
import ICEye from '@/components/svg/ICEye';
import ICPeopleGroup from '@/components/svg/ICPeopleGroup';

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
    <div className="flex justify-around items-start text-center">
      {/* Ghim/Bỏ ghim */}
      <div className="flex flex-col items-center w-20">
        <div
          className={`rounded-full w-8 h-8 flex justify-center items-center cursor-pointer transition-colors ${
            localIsPinned ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          onClick={onPinToggle}
        >
          <ICPin
            className={`w-5 h-5 ${localIsPinned ? 'text-yellow-600' : 'text-gray-700'}`}
            stroke={localIsPinned ? '#FFD700' : '#1C274C'}
          />
        </div>
        <p className={`mt-2 text-xs text-center ${localIsPinned ? 'text-yellow-700 font-medium' : 'text-gray-700'}`}>
          {localIsPinned ? 'Bỏ Ghim' : 'Ghim Hội Thoại'}
        </p>
      </div>

      {/* Ẩn/Hiện trò chuyện */}
      <div className="flex flex-col items-center w-20">
        <div
          className={`rounded-full w-8 h-8 flex justify-center items-center cursor-pointer transition-colors ${
            localIsHidden ? 'bg-red-100 text-red-600' : 'bg-gray-200 hover:bg-gray-300'
          }`}
          onClick={onHideToggle}
        >
          <ICEye
            className={`w-5 h-5 ${localIsHidden ? 'text-red-600' : 'text-gray-700'}`}
            stroke={localIsHidden ? '#FF0000' : '#1C274C'}
          />
        </div>
        <p className={`mt-2 text-xs text-center ${localIsHidden ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
          {localIsHidden ? 'Hiện Trò Chuyện' : 'Ẩn Trò Chuyện'}
        </p>
      </div>

      {/* Tạo nhóm trò chuyện */}
      <div className="flex flex-col items-center w-20">
        <div
          onClick={onCreateGroup}
          className="text-xs text-gray-700 break-words text-center cursor-pointer flex flex-col items-center w-20"
        >
          <div className="bg-gray-200 rounded-full w-8 h-8 flex justify-center items-center cursor-pointer mb-2">
            <ICPeopleGroup className="w-5 h-5" stroke="#1C274C" />
          </div>
          Tạo nhóm trò chuyện
        </div>
      </div>
    </div>
  );
}


