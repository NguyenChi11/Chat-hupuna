import React from 'react';
import { getProxyUrl } from '@/utils/utils';

interface UserAvatarSectionProps {
  userName: string;
  userAvatar?: string;
}

export default function UserAvatarSection({ userName, userAvatar }: UserAvatarSectionProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="mt-4 flex flex-col items-center">
        <div
          className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-400 flex items-center justify-center text-white text-2xl font-bold"
          style={userAvatar ? { backgroundImage: `url(${getProxyUrl(userAvatar)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          aria-label={userName}
        >
          {!userAvatar && <span>{(userName || 'U').charAt(0).toUpperCase()}</span>}
        </div>
        <p className="mt-2 text-xs text-gray-500">Ảnh đại diện</p>
      </div>

      <div className="mt-3">
        <p className="text-lg font-semibold text-black">{userName}</p>
      </div>
    </div>
  );
}

