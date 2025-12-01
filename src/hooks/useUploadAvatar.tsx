'use client';

import { useState } from 'react';
import { User } from '@/types/User';
import { useToast } from '@/components/base/toast';

export function useUploadAvatar(user: User, onAvatarUpdated?: (u: string) => void) {
  const toast = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const upload = async (file: File, resetInput: () => void) => {
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

      const json = await uploadRes.json();
      if (!json.success || !json.link) throw new Error('Upload thất bại');

      const avatarUrl = json.link;

      // Update DB
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: String(user._id),
          data: { avatar: avatarUrl },
        }),
      });

      // Update localStorage
      const raw = localStorage.getItem('info_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem('info_user', JSON.stringify({ ...parsed, avatar: avatarUrl }));
      }

      onAvatarUpdated?.(avatarUrl);
      toast({ type: 'success', message: 'Cập nhật ảnh đại diện thành công!' });
    } catch {
      toast({ type: 'error', message: 'Lỗi khi cập nhật ảnh' });
    } finally {
      setIsUploading(false);
      resetInput();
    }
  };

  return { upload, isUploading, avatarFailed, setAvatarFailed };
}
