'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { HiX, HiSearch, HiShieldCheck, HiUserGroup, HiCheck, HiChevronDown } from 'react-icons/hi';

import CreateGroupModal from '../../app/(zalo)/home/CreateGroupModal';
import { User } from '../../types/User';
import { MemberInfo, GroupRole } from '../../types/Group';
import { getProxyUrl } from '../../utils/utils';
import { useToast } from './toast';
import { confirmAlert } from './alert';
import { HiUserMinus, HiUserPlus } from 'react-icons/hi2';

interface Props {
  isOpen: boolean;
  members: MemberInfo[];
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  groupName?: string;
  conversationId?: string;
  reLoad?: () => void;
  onMembersAdded: (users: User[]) => void;
  onMemberRemoved?: (memberId: string, memberName: string) => void;
  onRoleChange?: (memberId: string, memberName: string, newRole: 'ADMIN' | 'MEMBER') => void;
}

function isMemberInfo(member: unknown): member is MemberInfo {
  return typeof member === 'object' && member !== null && ('_id' in member || 'id' in member) && 'name' in member;
}

export default function GroupMembersModal({
  members,
  onClose,
  isOpen,
  groupName,
  currentUser,
  allUsers,
  conversationId,
  reLoad,
  onMembersAdded,
  onMemberRemoved,
  onRoleChange,
}: Props) {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localMembers, setLocalMembers] = useState<MemberInfo[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const valid = members.filter(isMemberInfo);
    setLocalMembers(valid);
  }, [members]);

  if (!isOpen) return null;

  const myId = String(currentUser._id || currentUser.id);
  const myMemberInfo = localMembers.find((m) => String(m._id || m.id) === myId);
  const myRole: GroupRole = myMemberInfo?.role || 'MEMBER';

  // Permission
  const canKick = (targetRole: GroupRole) => {
    if (myRole === 'OWNER') return true;
    if (myRole === 'ADMIN' && targetRole === 'MEMBER') return true;
    return false;
  };
  const canPromote = (targetRole: GroupRole) => myRole === 'OWNER' && targetRole === 'MEMBER';
  const canDemote = (targetRole: GroupRole) => myRole === 'OWNER' && targetRole === 'ADMIN';

  // Handlers
  const handleOpenProfile = (targetUserId: string) => {
    router.push(`/profile?userId=${String(targetUserId)}`);
  };

  const handleOptimisticAddMember = (newUsers: User[]) => {
    const newMembers: MemberInfo[] = newUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      role: 'MEMBER',
      joinedAt: Date.now(),
    }));
    setLocalMembers((prev) => [...prev, ...newMembers]);
    setShowCreateGroupModal(false);
    onMembersAdded(newUsers);
  };

  const handleAction = async (action: 'kick' | 'promote' | 'demote', targetUserId: string) => {
    if (!conversationId) return;
    setLoadingAction(targetUserId);

    const targetMember = localMembers.find((m) => String(m._id || m.id) === targetUserId);
    const targetName = targetMember?.name || 'Thành viên';

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'kick'
            ? { conversationId, targetUserId, action: 'kickMember', _id: myId }
            : {
                conversationId,
                targetUserId,
                action: 'changeRole',
                data: { role: action === 'promote' ? 'ADMIN' : 'MEMBER' },
                _id: myId,
              },
        ),
      });

      if (res.ok) {
        if (action === 'kick') {
          setLocalMembers((prev) => prev.filter((m) => String(m._id || m.id) !== targetUserId));
          onMemberRemoved?.(targetUserId, targetName);
        } else {
          const newRole = action === 'promote' ? 'ADMIN' : 'MEMBER';
          setLocalMembers((prev) =>
            prev.map((m) => (String(m._id || m.id) === targetUserId ? { ...m, role: newRole } : m)),
          );
          onRoleChange?.(targetUserId, targetName, newRole);
        }
        reLoad?.();
      } else {
        toast({ type: 'error', message: 'Thao tác thất bại', duration: 3000 });
      }
    } catch {
      toast({ type: 'error', message: 'Lỗi mạng, vui lòng thử lại', duration: 3000 });
    } finally {
      setLoadingAction(null);
    }
  };

  const searchUser = localMembers.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const existingMemberIds = localMembers.map((m) => String(m._id || m.id));

  // Role Badge đẹp như Zalo Pro
  const RoleBadge = ({ role }: { role: GroupRole }) => {
    if (role === 'OWNER')
      return (
        <span className="ml-2 px-3 py-1.5 rounded-full text-[0.5rem] font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md flex items-center gap-1.5">
          <HiChevronDown className="w-3 h-3" />
          Trưởng nhóm
        </span>
      );
    if (role === 'ADMIN')
      return (
        <span className="ml-2 px-3 py-1.5 rounded-full text-[0.5rem] font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md flex items-center gap-1.5">
          <HiShieldCheck className="w-3 h-3" />
          Phó nhóm
        </span>
      );
    return null;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-3xl sm:h-auto sm:max-h-[90vh]  sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header gradient siêu đẹp */}
        <div className="flex items-center justify-between p-2 sm:px-6 sm:py-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md shadow-lg">
              <HiUserGroup className="sm:w-8 sm:h-8 w-4 h-4" />
            </div>
            <div>
              <h2 className="sm:text-xl text-lg font-bold">Thành viên nhóm</h2>
              {groupName && <p className="sm:text-sm text-xs opacity-90 mt-1">{groupName}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-white/20 transition-all duration-200 active:scale-95"
          >
            <HiX className="sm:w-7 sm:h-7 h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {/* Search & Add */}
          <div className="sm:p-4 p-2 space-y-5 bg-white border-b border-gray-100">
            {(myRole === 'OWNER' || myRole === 'ADMIN') && (
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="w-full py-1.5 sm:py-2.5 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold sm:text-lg text-sm rounded-2xl shadow-xl transition-all duration-300 active:scale-98"
              >
                <HiUserPlus className="sm:w-6 sm:h-6 w-4 h-4" />
                Thêm thành viên mới
              </button>
            )}

            <div className="relative">
              <HiSearch className="absolute left-5 top-1/2 -translate-y-1/2 sm:w-6 sm:h-6 w-4 h-4  text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm thành viên..."
                className="w-full pl-14 pr-6 py-1.5 sm:py-2.5 bg-gray-100 text-sm rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:bg-white sm:text-lg transition-all duration-200"
              />
            </div>
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto sm:px-6 sm:py-4 p-2">
            <div className="flex justify-between items-center sm:mb-5 mb-3">
              <h3 className="sm:text-sm text-xs font-bold text-gray-600 uppercase tracking-wider">
                Danh sách thành viên
              </h3>
              <span className="sm:text-xl text-xs font-bold text-indigo-600">{searchUser.length}</span>
            </div>

            <div className="space-y-4">
              {searchUser.map((member) => {
                const memberId = String(member._id || member.id);
                const isMe = memberId === myId;
                const isLoading = loadingAction === memberId;

                return (
                  <div
                    key={memberId}
                    className={`relative flex items-center gap-3 p-1 sm:p-3 bg-white sm:rounded-3xl rounded-2xl shadow-md border-2 border-transparent transition-all duration-300 group
                      ${isLoading ? 'opacity-60' : 'hover:border-indigo-200 hover:shadow-xl'}`}
                  >
                    {/* Avatar */}
                    <div
                      className="sm:w-12 sm:h-12 h-8 w-8 rounded-3xl overflow-hidden ring-4 ring-white shadow-2xl cursor-pointer transition-transform hover:scale-105"
                      onClick={() => handleOpenProfile(memberId)}
                    >
                      {member.avatar ? (
                        <Image
                          src={getProxyUrl(member.avatar)}
                          alt={member.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold sm:text-2xl text-sm flex items-center justify-center">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 sm:flex-wrap">
                        <p className="sm:text-lg text-[0.675rem] font-bold text-gray-900">{member.name}</p>
                        {isMe && (
                          <span className="sm:px-3 sm:py-1.5 p-1.5 bg-indigo-100 text-indigo-700 rounded-full text-[0.675rem] font-bold">
                            Bạn
                          </span>
                        )}
                        <RoleBadge role={member.role} />
                      </div>
                    </div>

                    {/* Actions - Hiện khi hover */}
                    {!isMe && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {canPromote(member.role) && (
                          <button
                            onClick={() => handleAction('promote', memberId)}
                            className="p-3 bg-green-100 hover:bg-green-200 rounded-2xl transition-all active:scale-95"
                            title="Bổ nhiệm làm Phó nhóm"
                          >
                            <HiCheck className="w-4 h-4 text-green-700" />
                          </button>
                        )}
                        {canDemote(member.role) && (
                          <button
                            onClick={() => handleAction('demote', memberId)}
                            className="p-3 bg-yellow-100 hover:bg-yellow-200 rounded-2xl transition-all active:scale-95"
                            title="Bãi nhiệm"
                          >
                            <HiUserMinus className="w-4 h-4 text-yellow-700" />
                          </button>
                        )}
                        {canKick(member.role) && (
                          <button
                            onClick={() =>
                              confirmAlert({
                                title: 'Xóa thành viên',
                                message: `Xóa ${member.name} khỏi nhóm?`,
                                okText: 'Xóa',
                                onOk: () => handleAction('kick', memberId),
                              })
                            }
                            className="p-3 bg-red-100 hover:bg-red-200 rounded-2xl transition-all active:scale-95"
                            title="Xóa khỏi nhóm"
                          >
                            <HiUserMinus className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Loading overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-white/80 rounded-3xl flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                );
              })}

              {searchUser.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <HiSearch className="w-24 h-24 mx-auto mb-6 opacity-20" />
                  <p className="text-xl font-medium">Không tìm thấy thành viên</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-1 sm:py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 font-bold text-sm sm:text-lg rounded-3xl shadow-lg transition-all duration-300 active:scale-98"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal con */}
      {showCreateGroupModal && (
        <CreateGroupModal
          mode="add"
          conversationId={conversationId}
          existingMemberIds={existingMemberIds}
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setShowCreateGroupModal(false)}
          reLoad={reLoad}
          onMembersAdded={handleOptimisticAddMember}
          onGroupCreated={() => setShowCreateGroupModal(false)}
        />
      )}
    </div>
  );
}
