'use client';

import { useState } from 'react';

import ProfileView from '@/components/(profile)/popup-profile/ProfileView';
import EditInfoView from '@/components/(profile)/popup-profile/EditInfoView';
import ChangePasswordView from '@/components/(profile)/popup-profile/ChangePasswordView';

import { useToast } from '@/components/base/toast';
import { PopupProfileProps, ViewMode } from '@/types/types';
import Header from '@/components/(profile)/popup-profile/Header';
import { useUploadAvatar } from '@/hooks/useUploadAvatar';
import { useUpdateUser } from '@/hooks/useUpdateUser';

export default function PopupProfile({ isOpen, onClose, user, onAvatarUpdated, onUserUpdated }: PopupProfileProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('profile');

  const toast = useToast();

  const { upload, isUploading, avatarFailed, setAvatarFailed } = useUploadAvatar(user, onAvatarUpdated);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const { updateUser, loading } = useUpdateUser(String(user._id), onUserUpdated);

  const [form, setForm] = useState({
    name: String(user.name || ''),
    phone: String(user.phone || ''),
    gender: String(user.gender || ''),
    birthday: String(user.birthday || ''),
    email: String(user.email || ''),
    address: String(user.address || ''),
    title: String(user.title || ''),
    department: String(user.department || ''),
    status: String(user.status || ''),
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  if (!isOpen) return null;

  const displayName = user.name || user.username || 'Tài khoản';
  const displayId = user.username || user._id;
  const profilePath = `/profile/${displayId}`;
  const profileUrl = typeof window !== 'undefined' ? window.location.origin + profilePath : profilePath;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl h-[80vh] overflow-auto no-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Header
          onClose={onClose}
          displayName={displayName}
          avatarUrl={user.avatar}
          backgroundUrl={user.background as string | undefined}
          isUploading={isUploading}
          avatarFailed={avatarFailed}
          setAvatarFailed={setAvatarFailed}
          onSelectFile={(e: React.ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) upload(f, () => (e.target.value = ''));
          }}
          isUploadingBackground={isUploadingBackground}
          onSelectBackgroundFile={async (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputEl = e.currentTarget;
            const f = inputEl.files?.[0];
            if (!f) return;
            try {
              setIsUploadingBackground(true);
              const MAX = 5 * 1024 * 1024;
              if (!f.type.startsWith('image/') || f.size > MAX) {
                toast({ type: 'error', message: 'Ảnh không hợp lệ' });
                return;
              }
              const formData = new FormData();
              formData.append('file', f);
              formData.append('roomId', 'background');
              formData.append('sender', String(user._id));
              formData.append('receiver', '');
              formData.append('type', 'image');
              formData.append('folderName', 'Backgrounds');
              const uploadRes = await fetch(`/api/upload?uploadId=background_${user._id}`, {
                method: 'POST',
                body: formData,
              });
              const uploadJson = await uploadRes.json();
              if (!uploadRes.ok || !uploadJson.success || !uploadJson.link) {
                toast({ type: 'error', message: 'Upload thất bại' });
                return;
              }
              const newUrl = String(uploadJson.link);
              let updateOk = false;
              try {
                const res1 = await fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update',
                    field: '_id',
                    value: String(user._id),
                    data: { background: newUrl },
                  }),
                });
                const json1 = await res1.json();
                updateOk = res1.ok && !json1.error;
              } catch {}
              if (!updateOk) {
                try {
                  const res2 = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'update',
                      field: 'username',
                      value: String(user.username || ''),
                      data: { background: newUrl },
                    }),
                  });
                  const json2 = await res2.json();
                  updateOk = res2.ok && !json2.error;
                } catch {}
              }
              if (!updateOk) {
                toast({ type: 'error', message: 'Cập nhật nền thất bại' });
                return;
              }
              try {
                const raw = localStorage.getItem('info_user');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  localStorage.setItem('info_user', JSON.stringify({ ...parsed, background: newUrl }));
                }
              } catch {}
              onUserUpdated?.({ background: newUrl });
              toast({ type: 'success', message: 'Cập nhật nền thành công!' });
            } finally {
              setIsUploadingBackground(false);
              if (inputEl) inputEl.value = '';
            }
          }}
        />

        <div className="pt-20 pb-8 px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">{displayName}</h2>
            <p className="text-lg text-gray-500 mt-2">@{displayId}</p>
          </div>

          {/* MODE SWITCH */}
          {viewMode === 'profile' && (
            <ProfileView
              user={user}
              displayName={displayName}
              displayId={displayId}
              departmentOptions={departmentOptions}
              statusOptions={statusOptions}
              profileUrl={profileUrl}
              onEdit={() => setViewMode('editInfo')}
              onChangePassword={() => setViewMode('changePassword')}
              toast={toast}
            />
          )}

          {viewMode === 'editInfo' && (
            <EditInfoView
              form={form}
              setForm={(updater) => {
                if (typeof updater === 'function') {
                  setForm((prev) => {
                    const next = (updater as (prev: typeof form) => Partial<typeof form>)(prev);
                    return {
                      name: String(next.name ?? prev.name),
                      phone: String(next.phone ?? prev.phone),
                      gender: String(next.gender ?? prev.gender),
                      birthday: String(next.birthday ?? prev.birthday),
                      email: String(next.email ?? prev.email),
                      address: String(next.address ?? prev.address),
                      title: String(next.title ?? prev.title),
                      department: String(next.department ?? prev.department),
                      status: String(next.status ?? prev.status),
                    };
                  });
                } else {
                  setForm({
                    name: String(updater.name ?? form.name),
                    phone: String(updater.phone ?? form.phone),
                    gender: String(updater.gender ?? form.gender),
                    birthday: String(updater.birthday ?? form.birthday),
                    email: String(updater.email ?? form.email),
                    address: String(updater.address ?? form.address),
                    title: String(updater.title ?? form.title),
                    department: String(updater.department ?? form.department),
                    status: String(updater.status ?? form.status),
                  });
                }
              }}
              loading={loading}
              departmentOptions={departmentOptions}
              statusOptions={statusOptions}
              onSubmit={() => updateUser(form)}
              onCancel={() => setViewMode('profile')}
            />
          )}

          {viewMode === 'changePassword' && (
            <ChangePasswordView
              form={passwordForm}
              setForm={setPasswordForm}
              loading={loading}
              onSubmit={async () => {
                await updateUser(passwordForm);
                setViewMode('profile');
              }}
              onCancel={() => setViewMode('profile')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
