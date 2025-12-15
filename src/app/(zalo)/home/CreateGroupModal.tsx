'use client';

import React from 'react';
import { HiX, HiSearch, HiUserGroup } from 'react-icons/hi';
import Image from 'next/image';
import { User } from '../../../types/User';
import { formatTimeAgo } from '@/utils/dateUtils';
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
    () => allUsers.filter((u) => selectedMembers.includes(String(u._id))),
    [allUsers, selectedMembers],
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 sm:px-0">
      <div className="bg-white w-full max-w-2xl h-[80vh] sm:h-auto sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 sm:px-2 sm:py-2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-1 sm:p-1 rounded-xl bg-white/20 backdrop-blur-sm">
              <HiOutlineUserPlus className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-sm font-bold">{mode === 'create' ? 'Tạo nhóm mới' : 'Thêm thành viên'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 cursor-pointer rounded-full hover:bg-white/20 transition-all duration-200 active:scale-90"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {/* Input Section */}
          <div className="p-2 sm:p-3 sm:space-y-3 bg-white border-b border-gray-100">
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
                  className="mt-2 w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base font-medium placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Thanh tìm kiếm */}
            <div className="relative mt-1">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm bạn bè..."
                className="w-full pl-12 px-2 py-1 bg-gray-100 sm:rounded-2xl rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm sm:text-base placeholder:text-gray-500"
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

          {/* Danh sách User (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h4 className="font-semibold text-sm text-gray-600 mb-3 flex items-center">
              {mode === 'create' ? 'Danh sách bạn bè' : 'Thành viên có thể thêm'}
              <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
                {selectedMembers.length}
              </span>
            </h4>

            {sortedGroupKeys.map((letter) => (
              <div key={letter} className="mb-2">
                <div className="sticky top-0 z-0 mb-2">
                  <span className="inline-flex items-center justify-center text-[0.6875rem] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {letter}
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {groupedUsers[letter].map((user) => {
                    const userIdStr = String(user._id);
                    const isAlreadyMember = existingMemberIds.includes(userIdStr);
                    const isSelected = selectedMembers.includes(userIdStr);
                    const isMe = userIdStr === String(currentUser._id);

                    return (
                      <label
                        key={user._id}
                        className={`flex items-center p-1 cursor-pointer transition-colors
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${
                            (mode === 'add' && isAlreadyMember) || isMe
                              ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                              : ''
                          }
                                                `}
                      >
                        <div className="relative flex items-center justify-center w-6 h-6 mr-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={(mode === 'add' && isAlreadyMember) || isMe}
                            onChange={() => handleMemberToggle(userIdStr)}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded checked:bg-blue-600 checked:border-blue-600 transition-all"
                          />
                          {/* Custom Checkmark Icon */}
                          <svg
                            className="absolute w-3.5 h-3.5 text-white hidden peer-checked:block pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>

                        <div className="sm:w-10 sm:h-10 w-10 h-10 rounded-full overflow-hidden sm:ring-4 ring-2 ring-white shadow-md">
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

                        <div>
                          <div className="flex-1">
                            <p className="sm:text-sm font-semibold text-gray-900 px-1">{user.name}</p>
                          </div>
                          <span
                            className={`text-xs px-1 font-medium ${user.online ? 'text-green-600' : 'text-gray-500'}`}
                          >
                            {user.online
                              ? 'Đang hoạt động'
                              : user.lastSeen
                                ? `Hoạt động ${formatTimeAgo(user.lastSeen)} trước`
                                : 'Hoạt động gần đây'}
                          </span>
                          {isAlreadyMember && mode === 'add' && (
                            <span className="text-xs text-gray-400 font-medium">Đã tham gia</span>
                          )}
                        </div>
                        {isMe && <span className="text-xs text-gray-400 font-medium px-1">Bạn</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {sortedGroupKeys.length === 0 && (
              <div className="text-center py-10 opacity-50">
                <p>Không tìm thấy kết quả</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Nút cố định dưới cùng */}
        <div className="p-2 sm:p-4 bg-white border-t border-gray-200 flex gap-3 shadow-2xl">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer py-2 sm:py-2 sm:text-base text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all duration-200 active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedMembers.length === 0}
            className={`flex-1 cursor-pointer py-2 sm:py-2 text-sm sm:text-base font-bold text-white rounded-2xl shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-2
              ${
                loading || selectedMembers.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
          >
            {loading
              ? 'Đang xử lý...'
              : mode === 'create'
                ? `Tạo (${selectedMembers.length})`
                : `Thêm (${selectedMembers.filter((id) => !existingMemberIds.includes(id)).length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
