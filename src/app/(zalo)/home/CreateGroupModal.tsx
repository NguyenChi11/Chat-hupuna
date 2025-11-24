'use client';

import React from 'react';
import Image from 'next/image';
import SearchIcon from '@/public/icons/icon-search.svg';
import { User } from '../../../types/User';
import { useCreateGroupModal } from '@/hooks/useCreateGroupModal';

interface Props {
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onGroupCreated: () => void;
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

  return (
    // 1. Lớp phủ ngoài cùng: Bỏ padding (p-0) để nội dung chạm mép
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white sm:bg-black/50 py-1 rounded-lg">
      <div className="bg-white w-full h-full sm:max-w-2xl shadow-none sm:shadow-2xl animate-fade-in-up flex flex-col ">
        {/* --- HEADER (Cố định) --- */}
        <div className="flex-none flex justify-between items-center p-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-bold text-gray-800">{mode === 'create' ? 'Tạo nhóm mới' : 'Thêm thành viên'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            {/* Icon X lớn hơn chút cho dễ bấm */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-gray-500"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* --- BODY (Co giãn) --- */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50">
          {/* Input Section */}
          <div className="flex-none p-4 space-y-4 bg-white pb-6 shadow-sm z-10">
            {mode === 'create' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Tên nhóm</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="VD: Nhóm ăn trưa..."
                  className="w-full py-2 text-lg border-b-2 border-gray-200 focus:border-blue-600 outline-none bg-transparent transition-colors placeholder:font-normal font-medium"
                />
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên bạn bè..."
                className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-500 transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Image src={SearchIcon} alt="search" width={20} height={20} className="opacity-40" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
          </div>

          {/* Danh sách User (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h4 className="font-semibold text-sm text-gray-500 mb-3 uppercase tracking-wider">
              {mode === 'create' ? 'Thành viên' : 'Bạn bè'}
              <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
                {selectedMembers.length}
              </span>
            </h4>

            {sortedGroupKeys.map((letter) => (
              <div key={letter} className="mb-6">
                <div className="sticky top-0 z-0 mb-2">
                  <span className="text-xs font-bold text-gray-400 px-1">{letter}</span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                  {groupedUsers[letter].map((user) => {
                    const userIdStr = user._id;
                    const isAlreadyMember = existingMemberIds.includes(userIdStr);
                    const isSelected = selectedMembers.includes(userIdStr);
                    const isMe = userIdStr === currentUser._id;

                    return (
                      <label
                        key={user._id}
                        className={`flex items-center p-3 cursor-pointer transition-colors
                                                    ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}
                                                    ${
                                                      isAlreadyMember || isMe
                                                        ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                                        : ''
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
