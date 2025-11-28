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
  onUserUpdated?: (updatedUser: Partial<User>) => void;
}

type ViewMode = 'profile' | 'editInfo' | 'changePassword';

const PopupProfile: React.FC<PopupProfileProps> = ({
                                                     isOpen,
                                                     onClose,
                                                     user,
                                                     onAvatarUpdated,
                                                     onUserUpdated
                                                   }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states - Department và Status là number nên cần convert
  const [editForm, setEditForm] = useState({
    name: String(user.name || ''),
    department: user.department !== undefined && user.department !== null ? String(user.department) : '',
    status: user.status !== undefined && user.status !== null ? String(user.status) : '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({ type: 'warning', message: 'Ảnh quá lớn, vui lòng chọn ảnh < 5MB', duration: 3000 });
      e.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', 'avatar');
      formData.append('sender', String(user._id)); // 🔥 FIX: Convert to string
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

      // 🔥 FIX: Sử dụng string cho _id thay vì gửi trực tiếp user._id
      const userId = String(user._id);

      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: userId,
          data: { avatar: newAvatarUrl },
        }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) {
        console.error('Update avatar failed:', updateJson);
        throw new Error(updateJson.error || 'Cập nhật avatar thất bại');
      }

      // Cập nhật localStorage
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

  // 🔥 XỬ LÝ CẬP NHẬT THÔNG TIN
  const handleUpdateInfo = async () => {
    if (!editForm.name.trim()) {
      toast({ type: 'error', message: 'Tên hiển thị không được để trống', duration: 2500 });
      return;
    }

    try {
      setIsSubmitting(true);

      // 🔥 Convert department và status về số nếu có giá trị
      const departmentValue = editForm.department.trim() ? Number(editForm.department.trim()) : undefined;
      const statusValue = editForm.status.trim() ? Number(editForm.status.trim()) : undefined;

      const updateData: Record<string, unknown> = {
        name: editForm.name.trim(),
      };

      // Chỉ thêm department và status nếu có giá trị
      if (departmentValue !== undefined && !isNaN(departmentValue)) {
        updateData.department = departmentValue;
      }
      if (statusValue !== undefined && !isNaN(statusValue)) {
        updateData.status = statusValue;
      }

      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: String(user._id),
          data: updateData,
        }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) {
        throw new Error(updateJson.error || 'Cập nhật thông tin thất bại');
      }

      // Cập nhật localStorage
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('info_user');
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            const updatedUser: Record<string, unknown> = {
              ...parsed,
              name: editForm.name.trim(),
            };

            if (departmentValue !== undefined && !isNaN(departmentValue)) {
              updatedUser.department = departmentValue;
            }
            if (statusValue !== undefined && !isNaN(statusValue)) {
              updatedUser.status = statusValue;
            }

            localStorage.setItem('info_user', JSON.stringify(updatedUser));
          }
        } catch (err) {
          console.error('Không cập nhật được info_user trong localStorage', err);
        }
      }

      // Callback để cập nhật UI
      if (onUserUpdated) {
        const updatedFields: Record<string, unknown> = {
          name: editForm.name.trim(),
        };

        if (departmentValue !== undefined && !isNaN(departmentValue)) {
          updatedFields.department = departmentValue;
        }
        if (statusValue !== undefined && !isNaN(statusValue)) {
          updatedFields.status = statusValue;
        }

        onUserUpdated(updatedFields);
      }

      toast({ type: 'success', message: 'Cập nhật thông tin thành công', duration: 2500 });
      setViewMode('profile');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Có lỗi khi cập nhật thông tin';
      toast({ type: 'error', message, duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 XỬ LÝ ĐỔI MẬT KHẨU
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin', duration: 2500 });
      return;
    }

    if (newPassword.length < 6) {
      toast({ type: 'error', message: 'Mật khẩu mới phải có ít nhất 6 ký tự', duration: 2500 });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ type: 'error', message: 'Mật khẩu xác nhận không khớp', duration: 2500 });
      return;
    }

    try {
      setIsSubmitting(true);

      const changeRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          data: {
            userId: String(user._id), // 🔥 FIX: Convert to string
            currentPassword,
            newPassword,
          },
        }),
      });

      const changeJson = await changeRes.json();

      if (!changeRes.ok || !changeJson.success) {
        throw new Error(changeJson.message || 'Đổi mật khẩu thất bại');
      }

      toast({ type: 'success', message: 'Đổi mật khẩu thành công', duration: 2500 });

      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setViewMode('profile');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Có lỗi khi đổi mật khẩu';
      toast({ type: 'error', message, duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🎨 RENDER CÁC VIEW MODES
  const renderContent = () => {
    switch (viewMode) {
      case 'editInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Cập nhật thông tin</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập tên hiển thị"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phòng ban
              </label>
              <input
                type="number"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập mã phòng ban"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái
              </label>
              <input
                type="number"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập mã trạng thái"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleUpdateInfo}
                disabled={isSubmitting}
                className="flex-1 h-10 hover:cursor-pointer bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-full transition"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditForm({
                    name: String(user.name || ''),
                    department: user.department !== undefined && user.department !== null ? String(user.department) : '',
                    status: user.status !== undefined && user.status !== null ? String(user.status) : '',
                  });
                  setViewMode('profile');
                }}
                disabled={isSubmitting}
                className="flex-1 h-10 border hover:cursor-pointer border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-full transition"
              >
                Hủy
              </button>
            </div>
          </div>
        );

      case 'changePassword':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Đổi mật khẩu</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu hiện tại <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={isSubmitting}
                className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-full transition"
              >
                {isSubmitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setViewMode('profile');
                }}
                disabled={isSubmitting}
                className="flex-1 h-10 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-full transition"
              >
                Hủy
              </button>
            </div>
          </div>
        );

      default:
        return (
          <>
            {/* Thông tin tài khoản */}
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
              {/*{user.role && (*/}
              {/*  <div className="flex items-center justify-between text-sm">*/}
              {/*    <span className="text-gray-500">Vai trò</span>*/}
              {/*    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">*/}
              {/*      {String(user.role)}*/}
              {/*    </span>*/}
              {/*  </div>*/}
              {/*)}*/}
              {user.status && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Trạng thái</span>
                  <span className="font-medium text-gray-900">{String(user.status)}</span>
                </div>
              )}
            </div>

            {/* Khu vực hành động */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setViewMode('editInfo')}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-full border-none hover:cursor-pointer bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-500/30 transition"
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
                onClick={() => setViewMode('changePassword')}
                className="w-full h-10 inline-flex items-center justify-center gap-2 hover:cursor-pointer rounded-full border border-blue-500 bg-white hover:bg-blue-50 text-blue-500 text-sm font-semibold transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="w-4 h-4"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Đổi mật khẩu
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-10 inline-flex hover:cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
              >
                Đóng
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-profile-title"
      >
        {/* Header cover */}
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
              className="group relative w-20 h-20 rounded-full border-[0.1875rem] border-white shadow-lg overflow-hidden bg-blue-200 flex items-center justify-center text-white text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-white/80"
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

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[0.6875rem] font-medium transition text-white">
                {isUploading ? 'Đang cập nhật...' : 'Đổi ảnh đại diện'}
              </div>
            </button>

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

          {/* Dynamic content based on view mode */}
          {renderContent()}
        </div>

        {/* Loading overlay */}
        {isUploading && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-3">
              <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-700">Đang cập nhật ảnh đại diện...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupProfile;