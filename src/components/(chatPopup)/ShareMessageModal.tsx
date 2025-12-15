'use client';

import React, { useState, useMemo } from 'react';
import { IoClose, IoSearch, IoSend, IoCheckmark } from 'react-icons/io5';
import { HiUsers, HiUser, HiOutlineDocumentText } from 'react-icons/hi2';
import { User } from '@/types/User';
import { GroupConversation } from '@/types/Group';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';
import { Message } from '@/types/Message';

// Mock types

interface ShareMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message;
  currentUser: User;
  allUsers: User[];
  groups: GroupConversation[];
  onShare: (targetRoomIds: string[], message: Message, attachedText?: string) => Promise<void>;
}

type ShareTarget = {
  id: string;
  name: string;
  avatar?: string;
  isGroup: boolean;
  type: 'user' | 'group';
};

export default function ShareMessageModal({
  isOpen,
  onClose,
  message,
  currentUser,
  allUsers,
  groups = [],
  onShare,
}: ShareMessageModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [attachedText, setAttachedText] = useState('');

  const shareTargets: ShareTarget[] = useMemo(() => {
    const userTargets: ShareTarget[] = allUsers
      .filter((u) => u._id !== currentUser._id)
      .map((u) => ({
        id: String(u._id),
        name: u.name || 'Người dùng',
        avatar: u.avatar,
        isGroup: false,
        type: 'user' as const,
      }));

    const groupTargets: ShareTarget[] = groups.map((g) => ({
      id: String(g._id),
      name: g.name || 'Nhóm',
      avatar: g.avatar,
      isGroup: true,
      type: 'group' as const,
    }));

    return [...groupTargets, ...userTargets];
  }, [allUsers, groups, currentUser._id]);

  const filteredTargets = useMemo(() => {
    if (!searchTerm.trim()) return shareTargets;
    const lower = searchTerm.toLowerCase();
    return shareTargets.filter((t) => t.name.toLowerCase().includes(lower));
  }, [shareTargets, searchTerm]);

  const toggleSelect = (targetId: string) => {
    setSelectedTargets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const handleShare = async () => {
    if (selectedTargets.size === 0) return;

    setIsSharing(true);
    try {
      const targetRoomIds = Array.from(selectedTargets).map((targetId) => {
        const target = shareTargets.find((t) => t.id === targetId);
        if (target?.isGroup) {
          return targetId;
        } else {
          const ids = [currentUser._id, targetId].sort();
          return `${ids[0]}_${ids[1]}`;
        }
      });

      await onShare(targetRoomIds, message, attachedText);

      setSelectedTargets(new Set());
      setSearchTerm('');
      setAttachedText('');
      onClose();
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const getMessagePreview = () => {
    if (message.type === 'text') {
      return message.content?.slice(0, 50) + (message.content && message.content.length > 50 ? '...' : '');
    }

    if (message.type === 'image') return '🖼️ Hình ảnh';
    if (message.type === 'video') return '🎥 Video';

    if (message.type === 'file')
      return (
        <a
          href={getProxyUrl(message.fileUrl)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-2xl max-w-[70vw] sm:max-w-[18rem] shadow-sm hover:bg-gray-50"
        >
          <div className="p-2 bg-blue-600 rounded-xl">
            <HiOutlineDocumentText className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{message.fileName || 'Tệp đính kèm'}</p>
            <p className="text-xs text-gray-500 truncate">Nhấn để tải xuống</p>
          </div>
        </a>
      );

    if (message.type === 'sticker') return '😊 Sticker';
    return 'Tin nhắn';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header - Modern gradient */}
        <div className="relative p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 hover:cursor-pointer p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:rotate-90"
          >
            <IoClose className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <IoSend className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Chia sẻ tin nhắn</h3>
              <p className="text-blue-100 text-sm mt-0.5">Chọn người hoặc nhóm để chia sẻ</p>
            </div>
          </div>
        </div>

        <div className="p-3  bg-white">
          <input
            type="text"
            placeholder="Nhập tin nhắn đính kèm (tùy chọn)"
            value={attachedText}
            onChange={(e) => setAttachedText(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
          />
        </div>

        {/* Message Preview - Enhanced */}
        <div className="p-3 bg-gradient-to-br from-gray-50 to-blue-50/30 ">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nội dung chia sẻ</p>
          <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">{getMessagePreview()}</p>
          </div>
        </div>

        {/* Search - Modern design */}
        <div className="p-3  bg-white">
          <div className="relative">
            <IoSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng hoặc nhóm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white"
            />
          </div>

          {selectedTargets.size > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                <IoCheckmark className="w-5 h-5" />
                <span>{selectedTargets.size} đã chọn</span>
              </div>
            </div>
          )}
        </div>

        {/* Target List - Improved styling */}
        <div className="flex-1 overflow-y-auto">
          {filteredTargets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoSearch className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Không tìm thấy kết quả</p>
              <p className="text-gray-400 text-sm mt-1">Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTargets.map((target) => {
                const isSelected = selectedTargets.has(target.id);
                return (
                  <button
                    key={target.id}
                    onClick={() => toggleSelect(target.id)}
                    className={`w-full p-2 flex items-center gap-4 transition-all hover:cursor-pointer duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-2 border-blue-500 '
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Avatar with selection indicator */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition-all duration-200 ${
                          isSelected ? 'ring-blue-500 ring-offset-2' : 'ring-gray-200'
                        }`}
                      >
                        {target.avatar ? (
                          <Image
                            src={getProxyUrl(target.avatar)}
                            alt=""
                            width={36}
                            height={36}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                            {target.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Selection Badge */}
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in duration-200">
                          <IoCheckmark className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* Group Badge */}
                      {target.isGroup && !isSelected && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                          <HiUsers className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{target.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {target.isGroup ? (
                          <>
                            <HiUsers className="w-4 h-4 text-purple-500" />
                            <span className="text-xs text-purple-600 font-medium">Nhóm</span>
                          </>
                        ) : (
                          <>
                            <HiUser className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Người dùng</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Selection Checkbox */}
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <IoCheckmark className="w-5 h-5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Modern actions */}
        <div className="p-5  bg-gradient-to-br from-gray-50 to-white rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2  hover:cursor-pointer border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
              disabled={isSharing}
            >
              Hủy
            </button>
            <button
              onClick={handleShare}
              disabled={selectedTargets.size === 0 || isSharing}
              className="flex-1 px-4 py-2 hover:cursor-pointer bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isSharing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang chia sẻ...</span>
                </>
              ) : (
                <>
                  <IoSend className="w-4 h-4" />
                  <span>Chia sẻ {selectedTargets.size > 0 && `(${selectedTargets.size})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
