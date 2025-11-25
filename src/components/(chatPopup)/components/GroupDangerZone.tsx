import React from 'react';
import ICOutGroup from '@/components/svg/ICOutGroup';
import ICLayoutGroup from '@/components/svg/ICLayoutGroup';

interface GroupDangerZoneProps {
  isGroup: boolean;
  canLeaveGroup: boolean;
  canDisbandGroup: boolean;
  onLeaveClick: () => void;
  onDisbandClick: () => void;
}

export default function GroupDangerZone({
  isGroup,
  canLeaveGroup,
  canDisbandGroup,
  onLeaveClick,
  onDisbandClick,
}: GroupDangerZoneProps) {
  if (!isGroup) return null;

  return (
    <div className="mt-4 flex justify-center gap-8 items-start text-center border-t border-gray-100 pt-4 px-4">
      {canLeaveGroup && (
        <button
          type="button"
          onClick={onLeaveClick}
          className="flex cursor-pointer flex-col items-center text-xs text-gray-700 hover:text-red-600 transition-colors"
        >
          <div className="rounded-full w-8 h-8 flex justify-center items-center bg-gray-200 hover:bg-red-100 text-red-500 mb-1 transition-colors">
            <ICOutGroup className="w-5 h-5" />
          </div>
          <span>Rời nhóm</span>
        </button>
      )}

      {canDisbandGroup && (
        <button
          type="button"
          onClick={onDisbandClick}
          className="flex cursor-pointer flex-col items-center text-xs text-gray-700 hover:text-red-700 transition-colors"
        >
          <div className="rounded-full w-8 h-8 flex justify-center items-center bg-gray-200 hover:bg-red-100 text-red-600 mb-1 transition-colors">
            <ICLayoutGroup className="w-5 h-5" />
          </div>
          <span>Giải tán nhóm</span>
        </button>
      )}
    </div>
  );
}
