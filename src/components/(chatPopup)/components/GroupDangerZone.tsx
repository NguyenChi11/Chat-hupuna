import React from 'react';
import { HiTrash } from 'react-icons/hi';
import { HiOutlineUserMinus } from 'react-icons/hi2';

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
    <div className="bg-red-50/70 border-t-2 border-red-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-4 text-center">Khu vực nguy hiểm</h3>

        <div className="flex justify-center gap-10">
          {/* Rời nhóm */}
          {canLeaveGroup && (
            <button
              type="button"
              onClick={onLeaveClick}
              className="cursor-pointer group flex flex-col items-center gap-3 p-5 rounded-2xl hover:bg-red-100/70 transition-all duration-300 active:scale-95"
              title="Rời khỏi nhóm này"
            >
              <div className="p-4 rounded-2xl bg-red-100 text-red-600 ring-4 ring-red-100 group-hover:ring-red-200 group-hover:bg-red-200 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <HiOutlineUserMinus className="w-7 h-7" />
              </div>
              <span className="text-sm font-semibold text-red-700 group-hover:text-red-800">Rời nhóm</span>
            </button>
          )}

          {/* Giải tán nhóm (chỉ chủ nhóm) */}
          {canDisbandGroup && (
            <button
              type="button"
              onClick={onDisbandClick}
              className="cursor-pointer group flex flex-col items-center gap-3 p-5 rounded-2xl hover:bg-red-100/70 transition-all duration-300 active:scale-95"
              title="Xóa hoàn toàn nhóm này"
            >
              <div className="p-4 rounded-2xl bg-red-600 text-white ring-4 ring-red-200 group-hover:ring-red-300 group-hover:bg-red-700 transition-all duration-300 shadow-lg group-hover:shadow-xl animate-pulse group-hover:animate-none">
                <HiTrash className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-red-700 group-hover:text-red-800">Giải tán nhóm</span>
            </button>
          )}
        </div>

        <p className="text-center text-xs text-red-600 mt-4 font-medium">Các hành động này không thể hoàn tác</p>
      </div>
    </div>
  );
}
