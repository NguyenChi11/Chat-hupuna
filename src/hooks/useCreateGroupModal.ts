'use client';

import { useMemo, useState } from 'react';
import type { User } from '@/types/User';
import type { GroupConversation } from '@/types/Group';

interface UseCreateGroupModalParams {
  currentUser: User;
  allUsers: User[];
  mode: 'create' | 'add';
  conversationId?: string;
  existingMemberIds?: string[];
  reLoad?: () => void;
  onMembersAdded?: (users: User[]) => void;
  /**
   * Được gọi sau khi tạo nhóm / thêm thành viên thành công.
   * - Với mode "create": nhận về group vừa tạo để FE có thể auto mở khung chat.
   * - Với mode "add": không cần tham số.
   */
  onGroupCreated: (group?: GroupConversation) => void;
  onClose: () => void;
}

export function useCreateGroupModal({
  currentUser,
  allUsers,
  mode,
  conversationId,
  existingMemberIds = [],
  reLoad,
  onMembersAdded,
  onGroupCreated,
  onClose,
}: UseCreateGroupModalParams) {
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedMembers, setSelectedMembers] = useState<string[]>(() => {
    const currentUserId = currentUser._id;
    const initialSet = new Set([...existingMemberIds, currentUserId]);
    return Array.from(initialSet);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMemberToggle = (_id: string) => {
    if (mode === 'add' && existingMemberIds.includes(_id)) return;
    setSelectedMembers((prev) => (prev.includes(_id) ? prev.filter((id) => id !== _id) : [...prev, _id]));
  };

  const groupedUsers = useMemo(() => {
    let filtered = allUsers;
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = allUsers.filter((u) => (u.name || '').toLowerCase().includes(lowerTerm));
    }

    const sortedUsers = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const groups: Record<string, User[]> = {};
    sortedUsers.forEach((user) => {
      const firstLetter = (user.name?.charAt(0) || '#').toUpperCase();
      const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(user);
    });

    return groups;
  }, [allUsers, searchTerm]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedUsers).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }, [groupedUsers]);

  const handleSubmit = async () => {
    if (mode === 'create' && !groupName.trim()) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }

    const newMembersOnly = selectedMembers.filter((_id) => !existingMemberIds.includes(_id));

    if (mode === 'add' && newMembersOnly.length === 0) {
      setError('Bạn chưa chọn thêm thành viên mới nào');
      return;
    }
    if (mode === 'create' && selectedMembers.length < 3) {
      setError('Nhóm phải có ít nhất 3 thành viên (bao gồm bạn)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      type CreateGroupBody = {
        action: 'createGroup';
        data: {
          name: string;
          members: string[];
          createdBy: string;
        };
      };

      type AddMembersBody = {
        action: 'addMembers';
        conversationId: string | undefined;
        newMembers: string[];
      };

      let bodyData: CreateGroupBody | AddMembersBody;

      if (mode === 'create') {
        bodyData = {
          action: 'createGroup',
          data: {
            name: groupName,
            members: selectedMembers,
            createdBy: currentUser._id,
          },
        };
      } else {
        bodyData = {
          action: 'addMembers',
          conversationId,
          newMembers: newMembersOnly,
        };
      }

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const result = await res.json();

      if (result.success) {
        // Chỉ reload lại dữ liệu khi thao tác thành công
        reLoad?.();

        if (mode === 'add' && onMembersAdded) {
          const addedUsersFullInfo = allUsers.filter((u) => newMembersOnly.includes(String(u._id)));
          onMembersAdded(addedUsersFullInfo);
          // Với mode "add" không cần mở chat mới
          onGroupCreated();
        } else if (mode === 'create') {
          // Khi tạo nhóm mới, backend trả về group => truyền cho callback
          const createdGroup = result.group as GroupConversation | undefined;
          onGroupCreated(createdGroup);
        }

        onClose();
      } else {
        setError(result.error || 'Thực hiện thất bại');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return {
    groupName,
    setGroupName,
    searchTerm,
    setSearchTerm,
    selectedMembers,
    loading,
    error,
    groupedUsers,
    sortedGroupKeys,
    handleMemberToggle,
    handleSubmit,
  };
}
