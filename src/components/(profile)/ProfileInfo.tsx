'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    name: '',
    phone: '',
    gender: '',
    birthday: '',
    email: '',
    address: '',
    department: '',
    title: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('info_user') : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const currentId = useMemo(() => String(currentUser?.['username'] || currentUser?.['_id'] || ''), [currentUser]);
  const viewingId = searchParams.get('user') || '';
  const isOwner = isOwnerProp ?? (currentId && viewingId && currentId === viewingId);

  const departmentOptions = [
    { value: '101', label: 'Kinh doanh' },
    { value: '102', label: 'Marketing' },
    { value: '103', label: 'Kỹ thuật' },
    { value: '104', label: 'Nhân sự' },
    { value: '105', label: 'Tài chính' },
  ];

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (currentUser) {
      const newForm = {
        name: String(currentUser['name'] || currentUser['username'] || ''),
        phone: String(currentUser['phone'] || ''),
        gender: String(currentUser['gender'] || ''),
        birthday: String(currentUser['birthday'] || ''),
        email: String(currentUser['email'] || ''),
        address: String(currentUser['address'] || ''),
        department: String(currentUser['department'] || ''),
        title: String(currentUser['title'] || ''),
      };
      setForm(newForm);
      initializedRef.current = true;
      onDataChange?.(newForm);
    }
  }, [currentUser, onDataChange]);

  const handleSave = async () => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: currentUser?.['username'] ? 'username' : '_id',
          value: currentId,
          data: form,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Lưu thất bại');

      localStorage.setItem('info_user', JSON.stringify({ ...currentUser, ...form }));
      onDataChange?.(form);
      toast({ type: 'success', message: 'Đã lưu thông tin!' });
    } catch (err: unknown) {
      toast({ type: 'error', message: (err as Error).message || 'Lỗi hệ thống' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!isOwner ? (
        <>
          <InfoRow label="Tên hiển thị" value={form.name} />
          <InfoRow label="Số điện thoại" value={form.phone} />
          <InfoRow label="Giới tính" value={form.gender} />
          <InfoRow label="Ngày sinh" value={form.birthday} />
          <InfoRow label="Email" value={form.email} />
          <InfoRow label="Địa chỉ" value={form.address} />
          <InfoRow
            label="Phòng ban"
            value={departmentOptions.find((o) => o.value === form.department)?.label || form.department}
          />
          <InfoRow label="Chức vụ" value={form.title} />
        </>
      ) : (
        <>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tên hiển thị"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-lg"
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Số điện thoại"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-lg"
          />
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-lg"
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
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 text-lg"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-lg"
          />
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Địa chỉ"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 text-lg"
          />
          <select
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg"
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
            placeholder="Chức vụ"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 text-lg"
          />

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full mt-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xl rounded-2xl shadow-xl transition-all active:scale-98 disabled:opacity-70"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </>
      )}
    </div>
  );
}
