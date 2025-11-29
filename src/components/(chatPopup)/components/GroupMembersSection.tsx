import React from 'react';
import { HiOutlineArrowRight, HiUserGroup } from 'react-icons/hi';

interface GroupMembersSectionProps {
  isGroup: boolean;
  groupName: string;
  membersCount: number;
  onOpenMembers: () => void;
}

export default function GroupMembersSection({
  isGroup,
  groupName,
  membersCount,
  onOpenMembers,
}: GroupMembersSectionProps) {
  if (!isGroup) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Thành viên nhóm</h3>
      </div>

      <button
        onClick={onOpenMembers}
        className="cursor-pointer w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-all duration-200 group flex items-center justify-between border-t border-gray-200"
      >
        <div className="flex items-center gap-4">
          {/* Icon + số lượng */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg group-hover:shadow-xl transition-all duration-300">
            <HiUserGroup className="w-6 h-6" />
          </div>

          {/* Thông tin nhóm */}
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {groupName}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <HiUserGroup className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">{membersCount} thành viên</span>
            </p>
          </div>
        </div>

        {/* Mũi tên chỉ thị */}
        <div className="text-gray-400 group-hover:text-indigo-600 transition-colors">
          <HiOutlineArrowRight className="w-5 h-5" />
        </div>
      </button>
    </div>
  );
}
