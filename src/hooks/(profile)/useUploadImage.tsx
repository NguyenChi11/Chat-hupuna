'use client';

import { useState } from 'react';

export function useUploadImage(
  currentId: string,
  isOwner: boolean,
  setAvatar: (url: string) => void,
  setBackground: (url: string) => void,
) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  const handleUpload = async (file: File, kind: 'avatar' | 'background') => {
    if (!isOwner || !currentId) return;
    if (!file.type.startsWith('image/')) return;

    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) return;

    if (kind === 'avatar') setIsUploadingAvatar(true);
    else setIsUploadingBackground(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', kind);
      formData.append('sender', currentId);
      formData.append('receiver', '');
      formData.append('type', 'image');
      formData.append('folderName', kind === 'avatar' ? 'Avatars' : 'Backgrounds');

      const uploadRes = await fetch(`/api/upload?uploadId=${kind}_${currentId}`, {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadJson.success || !uploadJson.link) return;

      const newUrl = uploadJson.link as string;

      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: currentId,
          data: { [kind]: newUrl },
        }),
      });

      const json = await updateRes.json();
      if (json.error) return;

      if (kind === 'avatar') setAvatar(newUrl);
      else setBackground(newUrl);

      // update localStorage
      try {
        const raw = localStorage.getItem('info_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem('info_user', JSON.stringify({ ...parsed, [kind]: newUrl }));
        }
      } catch {}
    } finally {
      if (kind === 'avatar') setIsUploadingAvatar(false);
      else setIsUploadingBackground(false);
    }
  };

  return {
    handleUpload,
    isUploadingAvatar,
    isUploadingBackground,
  };
}
