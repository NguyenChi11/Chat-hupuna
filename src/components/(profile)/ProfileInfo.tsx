'use client';

import React, { useEffect, useMemo, useState } from 'react';
import InfoRow from '@/components/(profile)/InforRow';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/base/toast';

export function ProfileInfo({
  onDataChange,
  isOwner: isOwnerProp,
}: {
  onDataChange?: (data: {
    phone: string;
    gender: string;
    birthday: string;
    email: string;
    address: string;
    department: string;
    title: string;
  }) => void;
  isOwner?: boolean;
}) {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [form, setForm] = useState({
    phone: '',
    gender: '',
    birthday: '',
    email: '',
    address: '',
    department: '',
    title: '',
  });

  const [, setAvatar] = useState<string | undefined>(undefined);
  const [, setBackground] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('info_user') : null;
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, []);

  const currentId = useMemo(
    () => String((currentUser?.['username'] as string) || currentUser?.['_id'] || ''),
    [currentUser],
  );

  const viewingId = searchParams.get('user') || '';
  const isOwner = typeof isOwnerProp === 'boolean' ? isOwnerProp : currentId && viewingId && currentId === viewingId;

  const updateField: '_id' | 'username' =
    currentUser && typeof currentUser['username'] === 'string' && currentUser['username'] ? 'username' : '_id';

  const departmentOptions = [
    { value: '101', label: 'Kinh doanh' },
    { value: '102', label: 'Marketing' },
    { value: '103', label: 'Kỹ thuật' },
    { value: '104', label: 'Nhân sự' },
    { value: '105', label: 'Tài chính' },
  ];

  useEffect(() => {
    if (currentUser) {
      const newForm = {
        phone: String(currentUser['phone'] || ''),
        gender: String(currentUser['gender'] || ''),
        birthday: String(currentUser['birthday'] || ''),
        email: String(currentUser['email'] || ''),
        address: String(currentUser['address'] || ''),
        department: String(currentUser['department'] || ''),
        title: String(currentUser['title'] || ''),
      };

      setForm(newForm);
      onDataChange?.(newForm);

      setAvatar(typeof currentUser['avatar'] === 'string' ? (currentUser['avatar'] as string) : undefined);
      setBackground(typeof currentUser['background'] === 'string' ? (currentUser['background'] as string) : undefined);
    }
  }, [currentUser, onDataChange]);

  const handleSave = async () => {
    if (!isOwner || !currentId) return;
    try {
      setIsSaving(true);
      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: updateField,
          value: currentId,
          data: { ...form },
        }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) throw new Error(updateJson.error || 'Cập nhật thất bại');

      try {
        const raw = localStorage.getItem('info_user');
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          localStorage.setItem('info_user', JSON.stringify({ ...parsed, ...form }));
        }
      } catch {}

      toast({
        type: 'success',
        message: 'Đã lưu thông tin cá nhân',
        duration: 2500,
      });
    } catch (err) {
      toast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi hệ thống',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isOwner ? (
        <>
          <InfoRow label="Số điện thoại" value={form.phone || ''} />
          <InfoRow label="Giới tính" value={form.gender || ''} />
          <InfoRow label="Ngày sinh" value={form.birthday || ''} />
          <InfoRow label="Email" value={form.email || ''} />
          <InfoRow label="Địa chỉ" value={form.address || ''} />
          <InfoRow label="Phòng ban" value={form.department || ''} />
          <InfoRow label="Chức vụ" value={form.title || ''} />
        </>
      ) : (
        <div className="space-y-3">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
            placeholder="Số điện thoại"
          />

          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
          >
            <option value="">Giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>

          <input
            type="date"
            value={form.birthday}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
          />

          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
            placeholder="Email"
          />

          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
            placeholder="Địa chỉ"
          />

          <select
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
          >
            <option value="">Phòng ban</option>
            {departmentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 rounded-lg border"
            placeholder="Chức vụ"
          />

          <div className="pt-2">
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-3 rounded-lg bg-blue-600 text-white">
              {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
