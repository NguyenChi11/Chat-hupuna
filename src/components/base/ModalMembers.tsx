'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { HiX, HiSearch, HiShieldCheck, HiCheck, HiChevronDown } from 'react-icons/hi';

import CreateGroupModal from '../../app/(zalo)/home/CreateGroupModal';
import { User } from '../../types/User';
import { MemberInfo, GroupRole } from '../../types/Group';
import { getProxyUrl, resolveSocketUrl } from '../../utils/utils';
import { useToast } from './toast';
import { confirmAlert } from './alert';
import { HiUserMinus, HiUserPlus } from 'react-icons/hi2';
import ICPeopleGroup from '@/components/svg/ICPeopleGroup';
import io from 'socket.io-client';

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

// 🔥 Helper function để normalize ID
function normalizeId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    if ('_id' in value) return normalizeId(value._id);
    if ('id' in value) return normalizeId(value.id);
  }
  return String(value);
}

// 🔥 Helper function để so sánh ID
function compareIds(id1: unknown, id2: unknown): boolean {
  const normalized1 = normalizeId(id1);
  const normalized2 = normalizeId(id2);

  if (normalized1 === normalized2) return true;

  // So sánh cả dạng number
  const num1 = Number(normalized1);
  const num2 = Number(normalized2);
  if (!isNaN(num1) && !isNaN(num2) && num1 === num2) return true;

  return false;
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

  // 🔥 Tạo user map với nhiều key formats
  const userMap = React.useMemo(() => {
    const map = new Map<string, User>();

    // Add current user
    if (currentUser) {
      const currentId = normalizeId(currentUser._id || currentUser.id);
      if (currentId) {
        map.set(currentId, currentUser);

        // Thêm key dạng number nếu có thể
        if (!isNaN(Number(currentId))) {
          map.set(String(Number(currentId)), currentUser);
        }
      }
    }

    // Add all users
    allUsers.forEach((user) => {
      const userId = normalizeId(user._id || user.id);
      if (userId) {
        map.set(userId, user);

        // Thêm key dạng number nếu có thể
        if (!isNaN(Number(userId))) {
          map.set(String(Number(userId)), user);
        }
      }
    });

    return map;
  }, [currentUser, allUsers]);

  useEffect(() => {
    const enriched: MemberInfo[] = (members || [])
      .map((m: unknown) => {
        const raw = m as Partial<MemberInfo> & { id?: string | number; _id?: string | number };
        const memberId = normalizeId(raw._id ?? raw.id);

        if (!memberId) {
          console.warn('⚠️ Member without ID:', raw);
          return null;
        }

        const baseRole = (raw.role as GroupRole) ?? 'MEMBER';
        const baseJoinedAt = typeof raw.joinedAt === 'number' ? raw.joinedAt : Date.now();

        // 🔥 Tìm user info trong userMap
        let foundUser = userMap.get(memberId);

        // Thử tìm với number format nếu chưa có
        if (!foundUser && !isNaN(Number(memberId))) {
          foundUser = userMap.get(String(Number(memberId)));
        }

        const name = raw.name || foundUser?.name || 'Thành viên';
        const avatar = raw.avatar || foundUser?.avatar;

        return {
          _id: memberId,
          name,
          avatar,
          role: baseRole,
          joinedAt: baseJoinedAt,
        } as MemberInfo;
      })
      .filter(Boolean) as MemberInfo[];

    setLocalMembers(enriched);
  }, [members, allUsers, userMap, currentUser]);

  if (!isOpen) return null;

  const myId = normalizeId(currentUser._id || currentUser.id);
  const myMemberInfo = localMembers.find((m) => compareIds(m._id || m.id, myId));
  const myRole: GroupRole = myMemberInfo?.role || 'MEMBER';

  const canKick = (targetRole: GroupRole) => {
    if (myRole === 'OWNER') return true;
    if (myRole === 'ADMIN' && targetRole === 'MEMBER') return true;
    return false;
  };

  const canPromote = (targetRole: GroupRole) => myRole === 'OWNER' && targetRole === 'MEMBER';
  const canDemote = (targetRole: GroupRole) => myRole === 'OWNER' && targetRole === 'ADMIN';

  const handleOpenProfile = (targetUserId: string) => {
    const id = normalizeId(targetUserId);
    router.push(`/profile/${id}`);
  };

  const handleOptimisticAddMember = (newUsers: User[]) => {
    const newMembersFormatted: MemberInfo[] = newUsers.map((u) => ({
      _id: normalizeId(u._id ?? u.id),
      name: u.name,
      avatar: u.avatar,
      role: 'MEMBER',
      joinedAt: Date.now(),
    }));
    setLocalMembers((prev) => [...prev, ...newMembersFormatted]);
    setShowCreateGroupModal(false);
    onMembersAdded(newUsers);
  };

  const handleAction = async (action: 'kick' | 'promote' | 'demote', targetUserId: string) => {
    if (!conversationId) return;
    setLoadingAction(targetUserId);

    const targetMember = localMembers.find((m) => compareIds(m._id || m.id, targetUserId));
    const targetName = targetMember ? targetMember.name : 'Thành viên';


    try {
      const prevMembersSnapshot = [...localMembers];
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
          setLocalMembers((prev) => prev.filter((m) => !compareIds(m._id || m.id, targetUserId)));
          if (onMemberRemoved) onMemberRemoved(targetUserId, targetName);

          // 🔥 Báo realtime để cập nhật sidebar & đóng phòng cho người bị kick
          try {
            const roomIdStr = String(conversationId || '');
            const nextMembers = prevMembersSnapshot.filter((m) => !compareIds(m._id || m.id, targetUserId));
            const payloadMembers = nextMembers.map((m) => ({
              _id: String(m._id || m.id || ''),
              role: m.role,
              name: m.name,
              avatar: m.avatar,
            }));
            const prevMembers = prevMembersSnapshot.map((m) => ({
              _id: String(m._id || m.id || ''),
            }));
            const sock = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
            sock.emit('group_members_updated', {
              roomId: roomIdStr,
              members: payloadMembers,
              prevMembers,
              sender: myId,
              senderName: currentUser.name,
              groupName,
            });
            setTimeout(() => sock.disconnect(), 500);
          } catch {}
        } else if (action === 'promote' || action === 'demote') {
          const newRole: GroupRole = action === 'promote' ? 'ADMIN' : 'MEMBER';
          setLocalMembers((prev) =>
            prev.map((m) => (compareIds(m._id || m.id, targetUserId) ? { ...m, role: newRole } : m)),
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
  const existingMemberIds = localMembers.map((m) => normalizeId(m._id || m.id));

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
    <div className="fixed inset-0 z-50 flex items-center  justify-center bg-black/40 backdrop-blur-sm px-2 sm:px-4 py-4 sm:py-6">
      <div className="bg-white w-full h-full sm:h-auto rounded-t-2xl rounded-b-2xl max-h-[90vh] sm:max-w-2xl rounded-none sm:rounded-2xl shadow-none sm:shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex-none px-2 py-1  bg-[#f3f6fb] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#0088ff] flex items-center justify-center text-white shadow-sm">
              <ICPeopleGroup className="w-5 h-5" stroke="#ffffff" />
            </div>
            <div>
              <h2 className="sm:text-sm text-lg font-bold">Thành viên nhóm</h2>
              {groupName && <p className="sm:text-sm text-xs opacity-90 mt-1">{groupName}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-full cursor-pointer hover:bg-white/20 transition-all duration-200 active:scale-95"
          >
            <HiX className="sm:w-7 sm:h-7 h-5 w-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/60">
          {/* Search & Add Section */}
          <div className="flex-none p-2 space-y-3 bg-white shadow-sm z-10">
            {/* {(myRole === 'OWNER' || myRole === 'ADMIN') && ( */}
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="w-full py-1 cursor-pointer sm:py-2 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold sm:text-sm rounded-2xl shadow-xl transition-all duration-300 active:scale-98"
              >
                <HiUserPlus className="sm:w-6 sm:h-6 w-4 h-4" />
                Thêm thành viên mới
              </button>
            {/* )} */}

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
                const memberId = normalizeId(member._id || member.id);
                const memberRole: GroupRole = member.role;
                const isMe = compareIds(memberId, myId);
                const isLoading = loadingAction === memberId;

                return (
                  <div
                    key={memberId}
                    className={`relative flex items-center gap-3 p-2 sm:p-2 bg-white sm:rounded-xl rounded-xl shadow-md border-2 border-transparent transition-all duration-300 group
                      ${isLoading ? 'opacity-60' : 'hover:border-indigo-200 hover:shadow-xl'}`}
                  >
                    {/* Avatar */}
                    <div
                      className="sm:w-8 sm:h-8 h-8 w-8 rounded-3xl overflow-hidden ring-4 ring-white shadow-2xl cursor-pointer transition-transform hover:scale-105"
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

                    {/* Actions */}
                    {!isMe && !isLoading && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                        {canPromote(memberRole) && (
                          <button
                            onClick={() => handleAction('promote', memberId)}
                            className="p-3 cursor-pointer bg-green-100 hover:bg-green-200 rounded-2xl transition-all active:scale-95"
                            title="Bổ nhiệm làm Phó nhóm"
                          >
                            <HiCheck className="w-4 h-4 text-green-700" />
                          </button>
                        )}

                        {canDemote(memberRole) && (
                          <button
                            onClick={() => handleAction('demote', memberId)}
                            className="p-3 cursor-pointer bg-yellow-100 hover:bg-yellow-200 rounded-2xl transition-all active:scale-95"
                            title="Bãi nhiệm"
                          >
                            <HiUserMinus className="w-4 h-4 text-yellow-700" />
                          </button>
                        )}

                        {canKick(memberRole) && (
                          <button
                            onClick={() =>
                              confirmAlert({
                                title: 'Xóa thành viên',
                                message: `Xóa ${member.name} khỏi nhóm?`,
                                okText: 'Xóa',
                                onOk: () => handleAction('kick', memberId),
                              })
                            }
                            className="p-3 cursor-pointer bg-red-100 hover:bg-red-200 rounded-2xl transition-all active:scale-95"
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

        {/* FOOTER */}
        <div className="flex-none px-4 py-3 bg-white border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full py-1 cursor-pointer sm:py-1.5 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 font-bold text-sm sm:text-lg rounded-3xl shadow-lg transition-all duration-300 active:scale-98"
          >
            Đóng
          </button>
        </div>
      </div>

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
