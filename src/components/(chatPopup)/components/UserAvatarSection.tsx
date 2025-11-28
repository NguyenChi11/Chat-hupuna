import React from 'react';
import { getProxyUrl } from '@/utils/utils';
import Image from 'next/image';

interface UserAvatarSectionProps {
  userName: string;
  userAvatar?: string;
}

export default function UserAvatarSection({ userName, userAvatar }: UserAvatarSectionProps) {
  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* Avatar người dùng */}
      <div className="relative group">
        <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-2xl bg-gray-200 transition-all duration-500 group-hover:scale-105 group-hover:shadow-3xl">
          {userAvatar ? (
            <Image
              width={100}
              height={100}
              src={getProxyUrl(userAvatar)}
              alt={userName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}

          {/* Fallback: chữ cái đầu + gradient đẹp */}
          <div
            className={`w-full h-full flex items-center justify-center text-5xl font-bold text-white bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 ${
              userAvatar ? 'hidden' : ''
            }`}
          >
            {(userName || 'U').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Hiệu ứng sáng nhẹ khi hover */}
        <div className="absolute inset-0 rounded-full ring-4 ring-transparent group-hover:ring-blue-300/30 transition-all duration-500 pointer-events-none" />
      </div>

      {/* Tên người dùng */}
      <div className="mt-6 text-center">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{userName || 'Người dùng'}</h3>
        <p className="mt-1 text-sm text-gray-500 font-medium">Đang trò chuyện riêng</p>
      </div>
    </div>
  );
}
