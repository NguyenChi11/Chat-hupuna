'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { User } from '@/types/User';
import { getProxyUrl } from '@/utils/utils';

type ViewMode = 'view' | 'edit' | 'password';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [viewer, setViewer] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useSearchParams();

  const [editForm, setEditForm] = useState({ name: '', department: '', status: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      try {
        const targetUserId = searchParams.get('userId');
        const meRes = await fetch('/api/users/me');
        const meJson = await meRes.json();
        if (meJson && meJson.success && meJson.user) {
          setViewer(meJson.user as User);
        }
        if (targetUserId) {
          const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getById', _id: targetUserId }),
          });
          const json = await res.json();
          if (mounted && json && json.row) {
            const u = json.row as User;
            setUser(u);
            setEditForm({
              name: u.name || '',
              department: u.department || '',
              status: u.status || '',
            });
            return;
          }
        } else {
          const res = await fetch('/api/users/me');
          const json = await res.json();
          if (mounted && json.success && json.user) {
            setUser(json.user as User);
            setEditForm({
              name: (json.user as User).name || '',
              department: (json.user as User).department || '',
              status: (json.user as User).status || '',
            });
            return;
          }
        }
      } catch {}
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('info_user');
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            setUser(parsed);
            setEditForm({
              name: parsed.name || '',
              department: parsed.department || '',
              status: parsed.status || '',
            });
          }
        } catch {}
      }
    };
    void loadUser();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const canEdit = !!viewer && !!user && String(viewer._id) === String(user._id);

  const handleAvatarClick = () => {
    if (isUploading) return;
    if (!canEdit) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!canEdit) {
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      e.target.value = '';
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      e.target.value = '';
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', 'avatar');
      formData.append('sender', user._id as string);
      formData.append('receiver', '');
      formData.append('type', 'image');
      formData.append('folderName', 'Avatars');
      const uploadRes = await fetch(`/api/upload?uploadId=avatar_${user._id}`, { method: 'POST', body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success || !uploadJson.link)
        throw new Error(uploadJson.message || 'Upload failed');
      const newAvatarUrl = uploadJson.link as string;
      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', field: '_id', value: user._id, data: { avatar: newAvatarUrl } }),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) throw new Error(updateJson.error || 'Update avatar failed');
      setUser((prev) => (prev ? { ...prev, avatar: newAvatarUrl } : prev));
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('info_user');
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            localStorage.setItem('info_user', JSON.stringify({ ...parsed, avatar: newAvatarUrl }));
          }
        } catch {}
      }
    } catch {
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleUpdateInfo = async () => {
    if (!user) return;
    if (!canEdit) return;
    if (!editForm.name.trim()) return;
    try {
      setIsSubmitting(true);
      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: user._id,
          data: { name: editForm.name.trim(), department: editForm.department.trim(), status: editForm.status.trim() },
        }),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) throw new Error(updateJson.error || 'Update failed');
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: editForm.name.trim(),
              department: editForm.department.trim(),
              status: editForm.status.trim(),
            }
          : prev,
      );
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('info_user');
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            localStorage.setItem(
              'info_user',
              JSON.stringify({
                ...parsed,
                name: editForm.name.trim(),
                department: editForm.department.trim(),
                status: editForm.status.trim(),
              }),
            );
          }
        } catch {}
      }
      setViewMode('view');
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!user) return;
    if (!canEdit) return;
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword.length < 6) return;
    if (newPassword !== confirmPassword) return;
    try {
      setIsSubmitting(true);
      const changeRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', data: { userId: user._id, currentPassword, newPassword } }),
      });
      const changeJson = await changeRes.json();
      if (!changeRes.ok || !changeJson.success) throw new Error(changeJson.message || 'Change password failed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setViewMode('view');
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = user?.name || user?.username || '';
  const displayId = user?.username || user?._id || '';
  const avatarSrc = user?.avatar ? getProxyUrl(user.avatar) : null;
  const copyLink = async () => {
    try {
      const userId = user?._id ? String(user._id) : '';
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${origin}/profile${userId ? `?userId=${userId}` : ''}`;
      await navigator.clipboard.writeText(link);
    } catch {}
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#f0f6ff] to-white">
      {/* COVER BANNER */}
      <div className="w-full h-[14rem] bg-gradient-to-br from-[#0084ff] via-[#4da3ff] to-[#70c2ff] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-20 mix-blend-soft-light" />
      </div>

      {/* AVATAR + NAME */}
      <div className="relative max-w-3xl mx-auto px-5">
        <div className="relative -mt-[5rem] flex flex-col items-center">
          <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white">
            <Image
              width={40}
              height={40}
              src={avatarSrc || '/default-avatar.png'}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="mt-4 text-3xl font-bold text-[#1b1b1b] tracking-tight">{displayName}</h1>
          <p className="text-gray-500 mt-1 text-sm">ID: {displayId}</p>
          <button
            onClick={copyLink}
            className="mt-2 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Sao chép link hồ sơ
          </button>

          <p className="mt-3 max-w-md text-center text-gray-700 text-[0.95rem] leading-relaxed">
            “Luôn mang đến giá trị qua công việc. Sẵn sàng học hỏi và thử những điều mới.”
          </p>
        </div>

        {/* MAIN INFO CARD */}
        <div className="mt-8 bg-white shadow-xl rounded-3xl p-6 divide-y">
          {/* Thông tin cá nhân */}
          <div className="pb-5">
            <h2 className="text-lg font-semibold text-[#1b1b1b]">Thông tin cá nhân</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Họ và tên" value="Nguyễn Văn A" />
              <InfoRow label="Ngày sinh" value="20/05/2001" />
              <InfoRow label="Giới tính" value="Nam" />
              <InfoRow label="Số điện thoại" value="0912 345 678" />
              <InfoRow label="Email" value="nguyenvana@example.com" />
              <InfoRow label="Địa chỉ" value="Hà Nội, Việt Nam" />
            </div>
          </div>

          {/* Công việc */}
          <div className="py-5">
            <h2 className="text-lg font-semibold text-[#1b1b1b]">Công việc</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Phòng ban" value="Kỹ thuật – Công nghệ" />
              <InfoRow label="Chức vụ" value="Frontend Developer" />
              <InfoRow label="Tình trạng" value="Đang làm việc" />
            </div>
          </div>

          {/* Mạng xã hội */}
          <div className="pt-5">
            <h2 className="text-lg font-semibold text-[#1b1b1b]">Mạng xã hội</h2>
            <div className="mt-4 space-y-3">
              <InfoRow label="Facebook" value="@nguyenvana.fb" />
              <InfoRow label="Instagram" value="@nguyenvana.ig" />
              <InfoRow label="LinkedIn" value="linkedin.com/in/nguyenvana" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[0.95rem]">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}
