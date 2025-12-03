'use client';

import { useState } from 'react';
import { useToast } from '@/components/base/toast';

export function useUpdateUser(userId: string, onUpdated?: (data: Record<string, unknown>) => void) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const updateUser = async (data: Record<string, unknown>) => {
    try {
      setLoading(true);
      const isPasswordChange =
        typeof (data as { currentPassword?: unknown }).currentPassword === 'string' &&
        typeof (data as { newPassword?: unknown }).newPassword === 'string';

      if (isPasswordChange) {
        const { currentPassword, newPassword, confirmPassword } = data as {
          currentPassword?: string;
          newPassword?: string;
          confirmPassword?: string;
        };

        if (!currentPassword || !newPassword) {
          toast({ type: 'error', message: 'Vui lòng nhập đầy đủ mật khẩu' });
          return;
        }
        if (newPassword.length < 5) {
          toast({ type: 'error', message: 'Mật khẩu mới quá ngắn' });
          return;
        }
        if (confirmPassword && confirmPassword !== newPassword) {
          toast({ type: 'error', message: 'Xác nhận mật khẩu không khớp' });
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'changePassword',
            data: { userId, currentPassword, newPassword },
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          toast({ type: 'error', message: String(json.message || 'Đổi mật khẩu thất bại') });
          return;
        }
        toast({ type: 'success', message: String(json.message || 'Đổi mật khẩu thành công') });
        onUpdated?.({});
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            field: '_id',
            value: userId,
            data,
          }),
        });

        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error);

        const raw = localStorage.getItem('info_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem('info_user', JSON.stringify({ ...parsed, ...data }));
        }

        onUpdated?.(data);
        toast({ type: 'success', message: 'Cập nhật thành công!' });
      }
    } catch {
      toast({ type: 'error', message: 'Lỗi hệ thống' });
    } finally {
      setLoading(false);
    }
  };

  return { updateUser, loading };
}
