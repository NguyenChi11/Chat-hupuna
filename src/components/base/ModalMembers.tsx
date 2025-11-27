'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import SearchIcon from '@/public/icons/icon-search.svg'; // Đảm bảo đường dẫn đúng
import CreateGroupModal from '../../app/(zalo)/home/CreateGroupModal';
import { User } from '../../types/User';
import { MemberInfo, GroupRole } from '../../types/Group';
import { getProxyUrl } from '../../utils/utils';
import ICPeopleGroup from '@/components/svg/ICPeopleGroup';
import ICClose from '@/components/svg/ICClose';
import ICPersonPlus from '@/components/svg/ICPersonPlus';
import ICUpload from '@/components/svg/ICUpload';
import ICTrashCan from '@/components/svg/ICTrashCan';
import ICTick from '@/components/svg/ICTick';
import { useToast } from './toast';
import { confirmAlert } from './alert';

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
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // Để hiện loading khi kick/promote
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

  // --- LOGIC PERMISSION ---
  const canKick = (targetRole: GroupRole) => {
    if (myRole === 'OWNER') return true;
    if (myRole === 'ADMIN' && targetRole === 'MEMBER') return true;
    return false;
  };
  const canPromote = (targetRole: GroupRole) => myRole === 'OWNER' && targetRole === 'MEMBER';
  const canDemote = (targetRole: GroupRole) => myRole === 'OWNER' && targetRole === 'ADMIN';

  // --- HANDLERS ---
  const handleOpenProfile = (targetUserId: string) => {
    const id = String(targetUserId);
    router.push(`/profile?userId=${id}`);
  };
  const handleOptimisticAddMember = (newUsers: User[]) => {
    const newMembersFormatted: MemberInfo[] = newUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      role: 'MEMBER',
      joinedAt: Date.now(),
    }));
    setLocalMembers((prev) => [...prev, ...newMembersFormatted]);
    setShowCreateGroupModal(false);
    if (onMembersAdded) onMembersAdded(newUsers);
  };

  const handleAction = async (action: 'kick' | 'promote' | 'demote', targetUserId: string) => {
    if (!conversationId) return;
    setLoadingAction(targetUserId); // Bắt đầu loading cho user này

    const targetMember = localMembers.find((m) => String(m._id || m.id) === targetUserId);
    const targetName = targetMember ? targetMember.name : 'Thành viên';

    type GroupActionPayload =
      | {
          conversationId: string;
          targetUserId: string;
          action: 'kickMember';
          _id?: string;
        }
      | {
          conversationId: string;
          targetUserId: string;
          action: 'changeRole';
          data: { role: 'ADMIN' | 'MEMBER' };
          _id: string;
        };

    const payload: GroupActionPayload =
      action === 'kick'
        ? {
            conversationId,
            targetUserId,
            action: 'kickMember',
            _id: myId,
          }
        : {
            conversationId,
            targetUserId,
            action: 'changeRole',
            data: { role: action === 'promote' ? 'ADMIN' : 'MEMBER' },
            _id: myId,
          };

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (action === 'kick') {
          setLocalMembers((prev) => prev.filter((m) => String(m._id || m.id) !== targetUserId));
          if (onMemberRemoved) onMemberRemoved(targetUserId, targetName);
        } else if (action === 'promote' || action === 'demote') {
          const newRole: GroupRole = action === 'promote' ? 'ADMIN' : 'MEMBER';
          setLocalMembers((prev) =>
            prev.map((m) => (String(m._id || m.id) === targetUserId ? { ...m, role: newRole } : m)),
          );
          if (onRoleChange) onRoleChange(targetUserId, targetName, newRole);
        }
        if (reLoad) reLoad();
      } else {
        toast({
          type: 'error',
          message: 'Thao tác thất bại, vui lòng thử lại.',
          duration: 3000,
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        type: 'error',
        message: 'Lỗi kết nối, vui lòng kiểm tra mạng và thử lại.',
        duration: 3000,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Filter
  const searchUser = localMembers.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const existingMemberIds = localMembers.map((m) => String(m._id || m.id));

  // --- SUB COMPONENTS ---
  const RoleBadge = ({ role }: { role: GroupRole }) => {
    if (role === 'OWNER')
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[0.625rem] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
          👑 Trưởng nhóm
        </span>
      );
    if (role === 'ADMIN')
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[0.625rem] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          🛡️ Phó nhóm
        </span>
      );
    return null;
  };

  return (
    // 1. Outer Wrapper kiểu Zalo: overlay mờ, modal bo góc trên desktop, full-screen trên mobile
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-2 sm:px-4 py-4 sm:py-6">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-none sm:rounded-2xl shadow-none sm:shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* --- HEADER --- */}
        <div className="flex-none px-4 py-3 border-b bg-[#f3f6fb] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#0088ff] flex items-center justify-center text-white shadow-sm">
              <ICPeopleGroup className="w-5 h-5" stroke="#ffffff" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">Thành viên nhóm</p>
              {groupName && (
                <p className="text-xs text-gray-500 font-medium truncate max-w-[13.75rem] sm:max-w-[16.25rem]">
                  {groupName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 cursor-pointer h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Đóng"
          >
            <ICClose className="w-4 h-4" stroke="#000000" />
          </button>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/60">
          {/* Search & Add Section */}
          <div className="flex-none p-4 space-y-3 bg-white shadow-sm z-10">
            {/* Chỉ Admin/Owner mới thấy nút Add */}
            {(myRole === 'OWNER' || myRole === 'ADMIN') && (
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="w-full cursor-pointer py-3 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold text-sm transition-all active:scale-95 group"
              >
                <div className="p-1.5 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <ICPersonPlus className="w-4 h-4" stroke="#000000" />
                </div>
                Thêm thành viên mới
              </button>
            )}

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm thành viên..."
                className="w-full h-10 pl-10 pr-4 bg-gray-100 rounded-full outline-none text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-500 transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Image src={SearchIcon} alt="search" width={18} height={18} className="opacity-40" />
              </div>
            </div>
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-gray-50/60">
            <h4 className="font-semibold text-[0.6875rem] text-gray-500 mb-3 uppercase tracking-wider flex justify-between items-center">
              <span>Danh sách</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[0.6875rem]">
                {searchUser.length} thành viên
              </span>
            </h4>

            <div className="space-y-2">
              {searchUser.map((member) => {
                const memberId = String(member._id || member.id);
                const memberRole: GroupRole = member.role;
                const isMe = memberId === myId;
                const isLoading = loadingAction === memberId;

                return (
                  <div
                    key={memberId}
                    className={`flex items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm transition-all hover:shadow-md group relative
                        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                    `}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full bg-gray-200 mr-3 overflow-hidden flex-shrink-0 border border-gray-100 cursor-pointer"
                      onClick={() => handleOpenProfile(memberId)}
                    >
                      {member.avatar ? (
                        <img
                          src={getProxyUrl(member.avatar)}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-lg">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 mr-2 cursor-pointer" onClick={() => handleOpenProfile(memberId)}>
                      <div className="flex items-center flex-wrap gap-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
                        {isMe && (
                          <span className="text-[0.625rem] font-medium text-gray-400 bg-gray-100 px-1.5 rounded">
                            (Bạn)
                          </span>
                        )}
                      </div>
                      <div className="flex mt-0.5">
                        <RoleBadge role={memberRole} />
                        {memberRole === 'MEMBER' && <span className="text-xs text-gray-400 ml-1">Thành viên</span>}
                      </div>
                    </div>

                    {/* Actions - Chỉ hiện khi Hover và không phải là chính mình */}
                    {!isMe && !isLoading && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                        {/* Nút Promote (Lên chức) */}
                        {canPromote(memberRole) && (
                          <button
                            onClick={() => handleAction('promote', memberId)}
                            className="p-2 cursor-pointer text-green-600 hover:bg-green-50 rounded-full transition-colors tooltip-top"
                            title="Bổ nhiệm làm Phó nhóm"
                          >
                            <ICTick className="w-5 h-5" stroke="#2eff00" />
                          </button>
                        )}

                        {/* Nút Demote (Xuống chức) */}
                        {canDemote(memberRole) && (
                          <button
                            onClick={() => handleAction('demote', memberId)}
                            className="p-2 cursor-pointer text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                            title="Bãi nhiệm xuống Thành viên"
                          >
                            <ICUpload className="w-5 h-5" stroke="#000000" />
                          </button>
                        )}

                        {/* Nút Kick (Xóa) */}
                        {canKick(memberRole) && (
                          <button
                            onClick={() => {
                              confirmAlert({
                                title: 'Xác nhận',
                                message: `Xóa ${member.name} khỏi nhóm?`,
                                okText: 'Xóa',
                                cancelText: 'Hủy',
                                onOk: () => handleAction('kick', memberId),
                              });
                            }}
                            className="p-2 cursor-pointer text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Mời ra khỏi nhóm"
                          >
                            <ICTrashCan className="w-5 h-5" stroke="#ff0000" />
                          </button>
                        )}
                      </div>
                    )}
                    {isLoading && (
                      <div className="absolute right-4">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                );
              })}
              {searchUser.length === 0 && (
                <div className="text-center py-10 opacity-60 flex flex-col items-center">
                  <Image src={SearchIcon} alt="" width={40} height={40} className="mb-3 grayscale opacity-30" />
                  <p className="text-gray-500 text-sm font-medium">Không tìm thấy thành viên nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="flex-none px-4 py-3 bg-white border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full cursor-pointer sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal con CreateGroupModal (Giữ nguyên logic) */}
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
