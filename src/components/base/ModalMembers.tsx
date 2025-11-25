'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import IconGroup from '@/public/icons/group.svg'; // Đảm bảo đường dẫn đúng
import SearchIcon from '@/public/icons/icon-search.svg'; // Đảm bảo đường dẫn đúng
import CreateGroupModal from '../../app/(zalo)/home/CreateGroupModal';
import { User } from '../../types/User';
import { MemberInfo, GroupRole } from '../../types/Group';

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
        }
      | {
          conversationId: string;
          targetUserId: string;
          action: 'changeRole';
          data: { role: 'ADMIN' | 'MEMBER' };
        };

    const payload: GroupActionPayload =
      action === 'kick'
        ? {
            conversationId,
            targetUserId,
            action: 'kickMember',
          }
        : {
            conversationId,
            targetUserId,
            action: 'changeRole',
            data: { role: action === 'promote' ? 'ADMIN' : 'MEMBER' },
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
        alert('Thao tác thất bại!');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi kết nối');
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
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
          👑 Trưởng nhóm
        </span>
      );
    if (role === 'ADMIN')
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-5 h-5"
              >
                <path d="M7 7a3 3 0 116 0 3 3 0 01-6 0z" />
                <path d="M4 21v-1a5 5 0 015-5h2" />
                <path d="M16 11a3 3 0 110-6 3 3 0 010 6z" />
                <path d="M21 21v-1a5 5 0 00-4-4.9" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">Thành viên nhóm</p>
              {groupName && (
                <p className="text-xs text-gray-500 font-medium truncate max-w-[220px] sm:max-w-[260px]">{groupName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Đóng"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                className="w-full py-3 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold text-sm transition-all active:scale-95 group"
              >
                <div className="p-1.5 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Image src={IconGroup.src} width={16} height={16} alt="" className="w-4 h-4" />
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
            <h4 className="font-semibold text-[11px] text-gray-500 mb-3 uppercase tracking-wider flex justify-between items-center">
              <span>Danh sách</span>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[11px]">
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
                    <div className="w-11 h-11 rounded-full bg-gray-200 mr-3 overflow-hidden flex-shrink-0 border border-gray-100">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt=""
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
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center flex-wrap gap-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{member.name}</p>
                        {isMe && (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 rounded">
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
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors tooltip-top"
                            title="Bổ nhiệm làm Phó nhóm"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Nút Demote (Xuống chức) */}
                        {canDemote(memberRole) && (
                          <button
                            onClick={() => handleAction('demote', memberId)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                            title="Bãi nhiệm xuống Thành viên"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Nút Kick (Xóa) */}
                        {canKick(memberRole) && (
                          <button
                            onClick={() => {
                              if (confirm(`Xóa ${member.name} khỏi nhóm?`)) handleAction('kick', memberId);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Mời ra khỏi nhóm"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
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
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
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
