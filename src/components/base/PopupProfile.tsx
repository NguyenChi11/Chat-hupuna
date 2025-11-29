'use client';

import React, { useState } from 'react';
import { User } from '../../types/User';
import { useToast } from './toast';
import { getProxyUrl } from '../../utils/utils';

// React Icons – Modern & Beautiful
import {
  HiX,
  HiPencil,
  HiLockClosed,
  HiUser,
  HiOfficeBuilding,
  HiStatusOnline,
  HiCamera,
  HiCheck,
  HiChevronDown,
} from 'react-icons/hi';
import Image from 'next/image';

interface PopupProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onAvatarUpdated?: (newUrl: string) => void;
  onUserUpdated?: (updatedUser: Partial<User>) => void;
}

type ViewMode = 'profile' | 'editInfo' | 'changePassword';

const PopupProfile: React.FC<PopupProfileProps> = ({ isOpen, onClose, user, onAvatarUpdated, onUserUpdated }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const departmentOptions = [
    { value: '101', label: 'Kinh doanh' },
    { value: '102', label: 'Marketing' },
    { value: '103', label: 'Kỹ thuật' },
    { value: '104', label: 'Nhân sự' },
    { value: '105', label: 'Tài chính' },
  ];

  const statusOptions = [
    { value: '1', label: 'Hoạt động' },
    { value: '2', label: 'Tạm khóa' },
    { value: '3', label: 'Nghỉ phép' },
  ];

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

  const toast = useToast();

  if (!isOpen) return null;

  const displayName = user.name || user.username || 'Tài khoản của tôi';
  const displayId = user.username || user._id;

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
      formData.append('sender', String(user._id));
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

      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: String(user._id),
          data: { avatar: newAvatarUrl },
        }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) {
        throw new Error(updateJson.error || 'Cập nhật avatar thất bại');
      }

      // Update localStorage
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('info_user');
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            localStorage.setItem('info_user', JSON.stringify({ ...parsed, avatar: newAvatarUrl }));
          }
        } catch (err) {
          console.error('Không cập nhật được info_user trong localStorage', err);
        }
      }

      onAvatarUpdated?.(newAvatarUrl);
      toast({ type: 'success', message: 'Cập nhật ảnh đại diện thành công!', duration: 2500 });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Có lỗi khi cập nhật ảnh đại diện';
      toast({ type: 'error', message, duration: 3000 });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleUpdateInfo = async () => {
    if (!editForm.name.trim()) {
      toast({ type: 'error', message: 'Tên hiển thị không được để trống', duration: 2500 });
      return;
    }

    try {
      setIsSubmitting(true);

      const departmentValue = editForm.department.trim() ? Number(editForm.department.trim()) : undefined;
      const statusValue = editForm.status.trim() ? Number(editForm.status.trim()) : undefined;

      const updateData: Record<string, unknown> = { name: editForm.name.trim() };
      if (departmentValue !== undefined && !isNaN(departmentValue)) updateData.department = departmentValue;
      if (statusValue !== undefined && !isNaN(statusValue)) updateData.status = statusValue;

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
      if (!updateRes.ok || updateJson.error) throw new Error(updateJson.error || 'Cập nhật thất bại');

      // Update localStorage
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('info_user');
        if (raw) {
          const parsed = JSON.parse(raw) as User;
          const updated = { ...parsed, name: editForm.name.trim() };
          if (departmentValue !== undefined) updated.department = String(departmentValue);
          if (statusValue !== undefined) updated.status = String(statusValue);
          localStorage.setItem('info_user', JSON.stringify(updated));
        }
      }

      onUserUpdated?.({
        name: editForm.name.trim(),
        department: departmentValue !== undefined ? String(departmentValue) : undefined,
        status: statusValue !== undefined ? String(statusValue) : undefined,
      });

      toast({ type: 'success', message: 'Cập nhật thông tin thành công!', duration: 2500 });
      setViewMode('profile');
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi hệ thống', duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

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

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          data: { userId: String(user._id), currentPassword, newPassword },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Đổi mật khẩu thất bại');

      toast({ type: 'success', message: 'Đổi mật khẩu thành công!', duration: 2500 });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setViewMode('profile');
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Lỗi hệ thống', duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'editInfo':
        return (
          <div className="space-y-6">
            {/* Tiêu đề */}
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-2xl">
                <HiPencil className="w-6 h-6 text-indigo-600" />
              </div>
              Cập nhật thông tin
            </h3>

            {/* Tên hiển thị */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <HiUser className="w-4 h-4 text-indigo-600" />
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-3xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300 text-base placeholder-gray-400"
                  placeholder="Nhập tên của bạn"
                />
                <HiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-500 opacity-70" />
              </div>
            </div>

            {/* Phòng ban - Custom Dropdown */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <HiOfficeBuilding className="w-4 h-4 text-blue-600" />
                Phòng ban
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDeptOpen(!deptOpen)}
                  className="w-full cursor-pointer pl-12 pr-12 py-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-3xl text-left text-base flex items-center justify-between focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 hover:border-blue-300"
                >
                  <span className={editForm.department ? 'text-gray-900' : 'text-gray-400'}>
                    {departmentOptions.find((o) => o.value === editForm.department)?.label || 'Chọn phòng ban'}
                  </span>
                  <HiChevronDown
                    className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${deptOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <HiOfficeBuilding className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-500 opacity-70 pointer-events-none" />

                {/* Dropdown List */}
                {deptOpen && (
                  <div className="absolute top-full overflow-auto max-h-[16rem] mt-2 w-full bg-white border-2 border-gray-200 rounded-3xl shadow-2xl  z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {departmentOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, department: opt.value });
                          setDeptOpen(false);
                        }}
                        className="w-full cursor-pointer px-12 py-4 text-left hover:bg-indigo-50 transition-all flex items-center justify-between group"
                      >
                        <span className="text-gray-800 group-hover:text-indigo-600 font-medium">{opt.label}</span>
                        {editForm.department === opt.value && <HiCheck className="w-5 h-5 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Trạng thái - Custom Dropdown */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <HiStatusOnline className="w-4 h-4 text-green-600" />
                Trạng thái
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="w-full cursor-pointer pl-12 pr-12 py-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-3xl text-left text-base flex items-center justify-between focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300 hover:border-green-300"
                >
                  <span className={editForm.status ? 'text-gray-900' : 'text-gray-400'}>
                    {statusOptions.find((o) => o.value === editForm.status)?.label || 'Chọn trạng thái'}
                  </span>
                  <HiChevronDown
                    className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${statusOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <HiStatusOnline className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500 opacity-70 pointer-events-none" />

                {/* Dropdown List */}
                {statusOpen && (
                  <div className="absolute top-full mt-2 w-full bg-white border-2 border-gray-200 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, status: opt.value });
                          setStatusOpen(false);
                        }}
                        className="w-full cursor-pointer px-12 py-4 text-left hover:bg-green-50 transition-all flex items-center justify-between group"
                      >
                        <span className="text-gray-800 group-hover:text-green-600 font-medium">{opt.label}</span>
                        {editForm.status === opt.value && <HiCheck className="w-5 h-5 text-green-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleUpdateInfo}
                disabled={isSubmitting}
                className="flex-1 cursor-pointer py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-lg rounded-3xl shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <HiCheck className="w-6 h-6" />
                    Lưu thay đổi
                  </>
                )}
              </button>

              <button
                onClick={() => setViewMode('profile')}
                disabled={isSubmitting}
                className="flex-1 cursor-pointer py-5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-bold text-lg rounded-3xl shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <HiX className="w-6 h-6" />
                Hủy
              </button>
            </div>
          </div>
        );

      case 'changePassword':
        return (
          <div className="space-y-5">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HiLockClosed className="w-5 h-5 text-red-600" />
              Đổi mật khẩu
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại *</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới *</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu *</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleChangePassword}
                disabled={isSubmitting}
                className="flex-1 cursor-pointer py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-98 disabled:opacity-70"
              >
                {isSubmitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </button>
              <button
                onClick={() => {
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setViewMode('profile');
                }}
                disabled={isSubmitting}
                className="flex-1 cursor-pointer py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all active:scale-98"
              >
                Hủy
              </button>
            </div>
          </div>
        );

      default:
        return (
          <>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 space-y-5">
              <div className="flex items-center gap-4">
                <HiUser className="w-6 h-6 text-indigo-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Tên hiển thị</p>
                  <p className="text-lg font-bold text-gray-900">{displayName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <HiUser className="w-6 h-6 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">ID Zalo nội bộ</p>
                  <p className="text-lg font-bold text-gray-900">{displayId}</p>
                </div>
              </div>

              {user.department !== undefined && (
                <div className="flex items-center gap-4">
                  <HiOfficeBuilding className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Phòng ban</p>
                    <p className="text-lg font-bold text-gray-900">
                      {departmentOptions.find((o) => o.value === String(user.department))?.label ||
                        String(user.department)}
                    </p>
                  </div>
                </div>
              )}

              {user.status !== undefined && (
                <div className="flex items-center gap-4">
                  <HiStatusOnline className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Trạng thái</p>
                    <p className="text-lg font-bold text-gray-900">
                      {statusOptions.find((o) => o.value === String(user.status))?.label || String(user.status)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-4">
              <button
                onClick={() => setViewMode('editInfo')}
                className="w-full cursor-pointer py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-3xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-3"
              >
                <HiPencil className="w-6 h-6" />
                Cập nhật thông tin
              </button>

              <button
                onClick={() => setViewMode('changePassword')}
                className="w-full cursor-pointer py-5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-lg rounded-3xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-3"
              >
                <HiLockClosed className="w-6 h-6" />
                Đổi mật khẩu
              </button>

              <button
                onClick={onClose}
                className="w-full cursor-pointer py-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg rounded-3xl transition-all active:scale-98"
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl h-[80vh]  overflow-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="h-40 bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 relative">
          <button
            onClick={onClose}
            className="absolute cursor-pointer top-4 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-all active:scale-95"
          >
            <HiX className="w-6 h-6 text-white" />
          </button>

          {/* Avatar lớn, nổi bật */}
          <div className="absolute left-1/2 -bottom-16 -translate-x-1/2">
            <label className="group cursor-pointer relative w-32 h-32 rounded-full overflow-hidden ring-8 ring-white shadow-2xl transition-all hover:ring-indigo-300">
              {user.avatar ? (
                <Image
                  width={128}
                  height={128}
                  src={getProxyUrl(user.avatar)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div
                className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <HiCamera className="w-10 h-10 mb-1" />
                <span className="text-sm font-medium">{isUploading ? 'Đang tải...' : 'Đổi ảnh'}</span>
              </div>

              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* Nội dung */}
        <div className="pt-20 pb-8 px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{displayName}</h2>
            <p className="text-lg text-gray-500 mt-2">@{displayId}</p>
          </div>

          {renderContent()}
        </div>

        {/* Loading overlay toàn màn hình */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xl font-bold text-gray-800">Đang cập nhật ảnh đại diện...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupProfile;
