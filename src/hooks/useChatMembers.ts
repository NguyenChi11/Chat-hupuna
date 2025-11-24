'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/types/User';
import type { ChatItem, GroupConversation, MemberInfo } from '@/types/Group';

interface UseChatMembersParams {
  selectedChat: ChatItem;
  isGroup: boolean;
  currentUser: User;
  sendNotifyMessage: (text: string) => Promise<void>;
}

export function useChatMembers({ selectedChat, isGroup, currentUser, sendNotifyMessage }: UseChatMembersParams) {
  const [memberCount, setMemberCount] = useState(0);
  const [activeMembers, setActiveMembers] = useState<MemberInfo[]>([]);

  useEffect(() => {
    if (isGroup && (selectedChat as GroupConversation).members) {
      const m = (selectedChat as GroupConversation).members as MemberInfo[];
      setActiveMembers(m);
      setMemberCount(m.length);
    } else {
      setActiveMembers([]);
      setMemberCount(0);
    }
  }, [selectedChat, isGroup]);


  const handleMemberRemoved = useCallback(
    async (removedMemberId: string, removedMemberName: string) => {
      setActiveMembers((prev) => prev.filter((m) => String(m._id) !== String(removedMemberId)));
      setMemberCount((prev) => Math.max(0, prev - 1));

      const myName = currentUser.name || 'Quản trị viên';
      await sendNotifyMessage(`${myName} đã mời ${removedMemberName} ra khỏi nhóm.`);
    },
    [currentUser.name, sendNotifyMessage],
  );

  const handleRoleChange = useCallback(
    async (memberId: string, memberName: string, newRole: 'ADMIN' | 'MEMBER') => {
      setActiveMembers((prev) =>
        prev.map((m) => {
          if (String(m._id) === String(memberId)) {
            return { ...m, role: newRole };
          }
          return m;
        }),
      );

      const myName = currentUser.name || 'Quản trị viên';
      let actionText = '';

      if (newRole === 'ADMIN') {
        actionText = `đã bổ nhiệm ${memberName} làm phó nhóm.`;
      } else {
        actionText = `đã hủy quyền phó nhóm của ${memberName}.`;
      }

      await sendNotifyMessage(`${myName} ${actionText}`);
    },
    [currentUser.name, sendNotifyMessage],
  );

  const handleMembersAdded = useCallback(
    async (newUsers: User[]) => {
      if (!newUsers || newUsers.length === 0) return;

      const newMembersFormatted: MemberInfo[] = newUsers.map((u) => ({
        _id: u._id,
        name: u.name || 'Thành viên',
        avatar: u.avatar,
        role: 'MEMBER',
        joinedAt: Date.now(),
      }));

      setActiveMembers((prev) => [...prev, ...newMembersFormatted]);
      setMemberCount((prev) => prev + newUsers.length);

      const names = newUsers.map((u) => u.name);
      const myName = currentUser.name || 'Một thành viên';
      const nameString = names.join(', ');
      await sendNotifyMessage(`${myName} đã thêm ${nameString} vào nhóm.`);
    },
    [currentUser.name, sendNotifyMessage],
  );

  return {
    memberCount,
    activeMembers,
    handleMemberRemoved,
    handleRoleChange,
    handleMembersAdded,
  };
}


