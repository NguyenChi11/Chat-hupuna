'use client';

import { getProxyUrl } from '@/utils/utils';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import { PiUserCircleGearDuotone } from 'react-icons/pi';

// ✅ ĐỊNH NGHĨA INTERFACE RÕ RÀNG
interface GroupInfo {
  _id: string;
  name: string;
  avatar?: string;
  description?: string;
  members: Array<{ _id: string; role?: string } | string>;
}

interface JoinGroupModalProps {
  isOpen: boolean;
  inviteCode: string;
  onClose: () => void;
  onJoin: () => Promise<void>;
}

export default function JoinGroupModal({ isOpen, inviteCode, onClose, onJoin }: JoinGroupModalProps) {
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !inviteCode) return;

    const fetchGroupInfo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/groups/invite/${inviteCode}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Link không hợp lệ hoặc đã hết hạn');
        }

        setGroupInfo(data.group);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Không thể tải thông tin nhóm';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchGroupInfo();
  }, [isOpen, inviteCode]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await onJoin();
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Tham gia nhóm thất bại';
      alert(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tham gia nhóm</h3>
          <button onClick={onClose} className="p-1 hover:cursor-pointer hover:bg-white/20 rounded-full transition">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600">Đang tải thông tin nhóm...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">X</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Đóng
              </button>
            </div>
          ) : groupInfo ? (
            // Success state
            <div className="space-y-6">
              {/* Group Info */}
              <div className="flex flex-col items-center ">
                {groupInfo.avatar ? (
                  <Image
                    src={getProxyUrl(groupInfo.avatar)}
                    alt=""
                    width={36}
                    height={36}
                    className="w-20 h-20 object-cover rounded-full"
                  />
                ) : (
                  <div className="w-[1.25rem] h-[1.25rem] bg-gradient-to-br rounded-full from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                    {groupInfo.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                <h4 className="text-xl font-bold text-gray-800 mb-2">{groupInfo.name}</h4>

                <div className="flex items-center gap-2 text-gray-600">
                  <PiUserCircleGearDuotone className="w-4 h-4" />
                  <span className="text-sm">{groupInfo.members?.length || 0} thành viên</span>
                </div>
              </div>

              {/* Description (if exists) */}
              {groupInfo.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{groupInfo.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 hover:cursor-pointer py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={isJoining}
                >
                  Hủy
                </button>
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="flex-1 px-4 py-3 hover:cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Đang tham gia...' : 'Tham gia nhóm'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
