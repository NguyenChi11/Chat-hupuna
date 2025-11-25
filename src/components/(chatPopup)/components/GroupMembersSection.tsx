import React from 'react';
import ICPeopleGroup from '@/components/svg/ICPeopleGroup';

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
    <div className="bg-white py-2 px-4 mb-2">
      <div className="font-semibold">Thành viên nhóm</div>
      <div className="flex items-center space-x-2">
        <div className="truncate hover:bg-gray-100 hover:cursor-pointer rounded-lg p-2" onClick={onOpenMembers}>
          <h1 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{groupName}</h1>
          <p className="text-xs text-gray-500 flex gap-2 items-center mt-1">
            <ICPeopleGroup className="w-5 h-5" />
            {`${membersCount} thành viên`}
          </p>
        </div>
      </div>
    </div>
  );
}
