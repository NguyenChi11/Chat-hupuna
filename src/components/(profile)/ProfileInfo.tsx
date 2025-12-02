// components/(profile)/ProfileInfo.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/base/toast';

import ProfileInfoView from './ProfileInfoView';
import ProfileInfoEdit from './ProfileInfoEdit';

export function ProfileInfo({
  onDataChange,
  isOwner: isOwnerProp,
}: {
  onDataChange?: (data: Record<string, unknown>) => void;
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !currentUser) return;
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

  if (!mounted) return null;

  return isOwner ? (
    <ProfileInfoEdit form={form} setForm={setForm} isSaving={isSaving} onSave={handleSave} />
  ) : (
    <ProfileInfoView form={form} />
  );
}

export default ProfileInfo;
