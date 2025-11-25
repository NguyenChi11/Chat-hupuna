'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useRef, useState } from 'react';
import { User } from '../../types/User';
import { useToast } from './toast';
import { getProxyUrl } from '../../utils/utils';

interface PopupProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onAvatarUpdated?: (newUrl: string) => void;
}

const PopupProfile: React.FC<PopupProfileProps> = ({ isOpen, onClose, user, onAvatarUpdated }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  if (!isOpen) return null;

  const displayName = user.name || user.username || 'Tài khoản của tôi';
  const displayId = user.username || user._id;

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ type: 'error', message: 'Vui lòng chọn file hình ảnh', duration: 2500 });
      e.target.value = '';
      return;
    }

    // Giới hạn ~5MB để tránh quá nặng
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ type: 'warning', message: 'Ảnh quá lớn, vui lòng chọn ảnh < 5MB', duration: 3000 });
      e.target.value = '';
      return;
    }

    try {
      setIsUploading(true);

      // 1. Upload file lên MEGA qua API /api/upload (tái sử dụng hạ tầng có sẵn)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', 'avatar'); // dùng tạm để reuse API
      formData.append('sender', user._id);
      formData.append('receiver', '');
      formData.append('type', 'image');
      formData.append('folderName', 'Avatars');

      const uploadRes = await fetch(`/api/upload?uploadId=avatar_${user._id}`, {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success || !uploadJson.link) {
        throw new Error(uploadJson.message || 'Upload ảnh thất bại');
      }

      const newAvatarUrl = uploadJson.link as string;

      // 2. Cập nhật avatar của user trong DB qua /api/users
      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: user._id,
          data: { avatar: newAvatarUrl },
        }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) {
        throw new Error(updateJson.error || 'Cập nhật avatar thất bại');
      }

      // 3. Cập nhật localStorage info_user (để sidebar & nơi khác nhận avatar mới)
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('info_user');
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            localStorage.setItem(
              'info_user',
              JSON.stringify({
                ...parsed,
                avatar: newAvatarUrl,
              }),
            );
          }
        } catch (err) {
          console.error('Không cập nhật được info_user trong localStorage', err);
        }
      }

      // 4. Gọi callback lên cha để update UI ngay lập tức
      if (onAvatarUpdated) {
        onAvatarUpdated(newAvatarUrl);
      }

      toast({ type: 'success', message: 'Cập nhật ảnh đại diện thành công', duration: 2500 });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Có lỗi khi cập nhật ảnh đại diện';
      toast({ type: 'error', message, duration: 3000 });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-profile-title"
      >
        {/* Header cover giống Zalo */}
        <div className="relative h-28 bg-gradient-to-r from-blue-500 via-blue-400 to-sky-400">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_white,_transparent_60%)]" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Avatar nổi */}
          <div className="absolute left-1/2 -bottom-10 -translate-x-1/2">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="group relative w-20 h-20 rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-blue-200 flex items-center justify-center text-white text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              {user.avatar ? (
                <img
                  src={getProxyUrl(user.avatar)}
                  alt={displayName}
                  className={`w-full h-full object-cover ${isUploading ? 'opacity-60' : ''}`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                (displayName || 'U').charAt(0).toUpperCase()
              )}

              {/* Overlay đổi ảnh */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[11px] font-medium transition text-white">
                {isUploading ? 'Đang cập nhật...' : 'Đổi ảnh đại diện'}
              </div>
            </button>

            {/* input file ẩn */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="pt-14 pb-4 px-5">
          {/* Tên + ID */}
          <div className="text-center mb-4">
            <h2 id="popup-profile-title" className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
              {displayName}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Tài khoản: {displayId}</p>
          </div>

          {/* Thông tin tài khoản giống phong cách Zalo */}
          <div className="space-y-2 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Tên hiển thị</span>
              <span className="font-medium text-gray-900 max-w-[60%] truncate text-right">{displayName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">ID Zalo nội bộ</span>
              <span className="font-medium text-gray-900">{displayId}</span>
            </div>
            {user.department && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Phòng ban</span>
                <span className="font-medium text-gray-900 max-w-[60%] truncate text-right">
                  {String(user.department)}
                </span>
              </div>
            )}
            {user.role && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Vai trò</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {String(user.role)}
                </span>
              </div>
            )}
            {user.status && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Trạng thái</span>
                <span className="font-medium text-gray-900">{String(user.status)}</span>
              </div>
            )}
          </div>

          {/* Khu vực hành động */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-500/30 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Cập nhật thông tin
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopupProfile;
