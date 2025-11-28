'use client';

import React from 'react';
import { HiX, HiSearch, HiCheck, HiUserGroup } from 'react-icons/hi';
import Image from 'next/image';
import { User } from '../../../types/User';
import { GroupConversation } from '@/types/Group';
import { useCreateGroupModal } from '@/hooks/useCreateGroupModal';
import { getProxyUrl } from '@/utils/utils';
import { HiOutlineUserPlus } from 'react-icons/hi2';

interface Props {
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onGroupCreated: (group?: GroupConversation) => void;
  mode?: 'create' | 'add';
  conversationId?: string;
  existingMemberIds?: string[];
  reLoad?: () => void;
  onMembersAdded?: (users: User[]) => void;
}

export default function CreateGroupModal({
  currentUser,
  allUsers,
  onClose,
  onGroupCreated,
  mode = 'create',
  conversationId,
  existingMemberIds = [],
  reLoad,
  onMembersAdded,
}: Props) {
  const {
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
  } = useCreateGroupModal({
    currentUser,
    allUsers,
    mode,
    conversationId,
    existingMemberIds,
    reLoad,
    onMembersAdded,
    onGroupCreated,
    onClose,
  });

  const selectedUsers = React.useMemo(
    () => allUsers.filter((u) => selectedMembers.includes(u._id)),
    [allUsers, selectedMembers],
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 sm:px-0">
      <div className="bg-white w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 sm:px-6 sm:py-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <HiOutlineUserPlus className="w-4 h-4 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">{mode === 'create' ? 'Tạo nhóm mới' : 'Thêm thành viên'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-white/20 transition-all duration-200 active:scale-90"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {/* Input Section */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white border-b border-gray-100">
            {/* Tên nhóm */}
            {mode === 'create' && (
              <div>
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <HiUserGroup className="w-4 h-4 text-indigo-600" />
                  Tên nhóm
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nhóm ăn trưa, Gia đình..."
                  className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base font-medium placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Thanh tìm kiếm */}
            <div className="relative">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm bạn bè..."
                className="w-full pl-12 px-4 py-2 bg-gray-100 sm:rounded-2xl rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm sm:text-base placeholder:text-gray-500"
              />
            </div>

            {/* Thành viên đã chọn */}
            {selectedUsers.length > 0 && (
              <div className="pt-1">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Đã chọn <span className="font-bold text-indigo-600">{selectedUsers.length}</span> thành viên
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex-shrink-0"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white">
                        {user.avatar ? (
                          <Image
                            src={getProxyUrl(user.avatar)}
                            alt=""
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 max-w-20 truncate">{user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lỗi */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                <HiX className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Danh sách bạn bè */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {sortedGroupKeys.length > 0 ? (
              <div className="space-y-5">
                {sortedGroupKeys.map((letter) => (
                  <div key={letter}>
                    <div className="sticky top-0 bg-gray-100 py-1 z-10 -mx-4 px-4 sm:mx-0">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{letter}</span>
                    </div>
                    <div className="space-y-2">
                      {groupedUsers[letter].map((user) => {
                        const userIdStr = user._id;
                        const isSelected = selectedMembers.includes(userIdStr);
                        const isAlreadyMember = existingMemberIds.includes(userIdStr);
                        const isMe = userIdStr === currentUser._id;

                        return (
                          <label
                            key={user._id}
                            className={`flex relative top-2 items-center gap-4 px-1 py-2 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-indigo-50 border-2 border-indigo-500'
                                : 'bg-white border-2 border-transparent hover:bg-gray-50'
                            } ${isAlreadyMember || isMe ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAlreadyMember || isMe}
                                onChange={() => handleMemberToggle(userIdStr)}
                                className="sr-only peer"
                              />
                              <div className="sm:w-6 sm:h-6 w-4 h-4 rounded-full border-2 border-gray-400 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 transition-all flex items-center justify-center">
                                <HiCheck className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100" />
                              </div>
                            </div>

                            <div className="sm:w-12 sm:h-12 w-8 h-8 rounded-full overflow-hidden sm:ring-4 ring-2 ring-white shadow-md">
                              {user.avatar ? (
                                <Image
                                  src={getProxyUrl(user.avatar)}
                                  alt=""
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm sm:text-lg flex items-center justify-center">
                                  {user.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-base">{user.name}</p>
                              {isMe && <span className="text-xs text-indigo-600 font-medium">Bạn</span>}
                              {isAlreadyMember && mode === 'add' && (
                                <span className="text-xs text-gray-500 font-medium">Đã trong nhóm</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <HiSearch className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Không tìm thấy bạn bè</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Nút cố định dưới cùng */}
        <div className="p-2 sm:p-6 bg-white border-t border-gray-200 flex gap-3 shadow-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 sm:py-4 sm:text-base text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all duration-200 active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedMembers.length === 0}
            className={`flex-1 py-2 sm:py-4 text-sm sm:text-base font-bold text-white rounded-2xl shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-2
              ${
                loading || selectedMembers.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
          >
            {loading ? (
              'Đang xử lý...'
            ) : (
              <>
                <HiOutlineUserPlus className="w-5 h-5" />
                {mode === 'create'
                  ? `Tạo nhóm (${selectedMembers.length})`
                  : `Thêm (${selectedMembers.length - existingMemberIds.length})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
