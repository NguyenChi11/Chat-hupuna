'use client';

import React from 'react';
import Image from 'next/image';
import SearchIcon from '@/public/icons/icon-search.svg';
import { User } from '../../../types/User';
import { GroupConversation } from '@/types/Group';
import { useCreateGroupModal } from '@/hooks/useCreateGroupModal';

interface Props {
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  /**
   * Được gọi sau khi tạo nhóm / thêm thành viên xong.
   * - Với tạo nhóm: nhận group mới để có thể auto chọn mở chat.
   * - Với thêm thành viên: không cần tham số.
   */
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
    // 1. Lớp phủ ngoài cùng
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] py-1">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh] overflow-hidden">
        {/* --- HEADER (Cố định) kiểu Zalo --- */}
        <div className="flex-none flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 className="text-base sm:text-lg font-semibold">
            {mode === 'create' ? 'Tạo nhóm chat mới' : 'Thêm thành viên vào nhóm'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 sm:w-6 sm:h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* --- BODY (Co giãn) --- */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#f4f6f9]">
          {/* Input Section */}
          <div className="flex-none p-4 space-y-4 bg-white pb-4 shadow-sm z-10 border-b border-gray-100">
            {mode === 'create' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tên nhóm</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="VD: Nhóm ăn trưa, Đội dự án ABC..."
                  className="w-full py-2 text-sm sm:text-base border-b border-gray-200 focus:border-blue-500 outline-none bg-transparent transition-colors placeholder:font-normal font-medium"
                />
                <p className="mt-1 text-xs text-gray-400">Đặt tên dễ nhớ để mọi người dễ nhận ra nhóm của bạn.</p>
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên bạn bè để thêm vào nhóm..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 border border-transparent focus:border-blue-400 text-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Image src={SearchIcon} alt="search" width={20} height={20} className="opacity-40" />
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="pt-1 space-y-1">
                <p className="text-xs font-medium text-gray-500">
                  Đã chọn <span className="font-semibold text-blue-600">{selectedUsers.length}</span>{' '}
                  {mode === 'create' ? 'thành viên cho nhóm' : 'người để thêm vào nhóm'}.
                </p>
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {selectedUsers.slice(0, 8).map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-full flex-shrink-0"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-600">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt=""
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700 max-w-[90px] truncate">{user.name}</span>
                    </div>
                  ))}
                  {selectedUsers.length > 8 && (
                    <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700 flex items-center flex-shrink-0">
                      +{selectedUsers.length - 8}
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                <span>⚠️</span> {error}
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
                  <span className="inline-flex items-center justify-center text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {letter}
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {groupedUsers[letter].map((user) => {
                    const userIdStr = user._id;
                    const isAlreadyMember = existingMemberIds.includes(userIdStr);
                    const isSelected = selectedMembers.includes(userIdStr);
                    const isMe = userIdStr === currentUser._id;

                    return (
                      <label
                        key={user._id}
                        className={`flex items-center p-2 cursor-pointer transition-colors
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${
                            isAlreadyMember || isMe ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''
                          }
                                                `}
                      >
                        <div className="relative flex items-center justify-center w-6 h-6 mr-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlreadyMember || isMe}
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

                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt=""
                              className="w-full h-full object-cover"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                          </div>

                          {isAlreadyMember && mode === 'add' && (
                            <span className="text-xs text-gray-400 font-medium">Đã tham gia</span>
                          )}
                        </div>
                        {isMe && <span className="text-xs text-gray-400 font-medium">Bạn</span>}
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

        {/* --- FOOTER (Cố định) --- */}
        <div className="flex-none p-4 bg-white border-t border-gray-200 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 py-3 text-sm font-semibold text-white rounded-xl transition-all shadow-lg shadow-blue-200
                            ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
          >
            {loading
              ? 'Đang xử lý...'
              : mode === 'create'
                ? `Tạo (${selectedMembers.length})`
                : `Thêm (${selectedMembers.length - existingMemberIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
