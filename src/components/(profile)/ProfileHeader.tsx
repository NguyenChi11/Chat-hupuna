'use client';

import Image from 'next/image';
import { HiCamera } from 'react-icons/hi2';
import { getProxyUrl } from '@/utils/utils';
import React from 'react';

export default function ProfileHeader({
  isOwner,
  background,
  avatar,
  handleUpload,
  isUploadingAvatar,
  isUploadingBackground,
}: {
  isOwner: boolean;
  background: string | null;
  avatar: string | null;
  handleUpload: (file: File, type: 'avatar' | 'background') => void;
  isUploadingAvatar: boolean;
  isUploadingBackground: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div className="relative h-30 md:h-30 z-10 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600">
      {/* Background Image */}
      {background ? (
        <Image
          src={getProxyUrl(background)}
          alt="background"
          fill
          className="object-cover brightness-90 saturate-110"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600" />
      )}

      {/* Gradient Overlay - Tối dần xuống dưới, giúp tên + avatar nổi bật */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Nút đổi ảnh bìa - Glassmorphism cực đẹp */}
      {mounted && isOwner && (
        <label className="absolute top-5 right-5 z-10 cursor-pointer group">
          <div className="px-2 py-3.5 bg-white/15 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl hover:bg-white/25 transition-all duration-300 flex items-center gap-3 active:scale-95">
            <HiCamera className="w-6 h-6 text-white" />
            <span className="text-white font-semibold text-sm tracking-wide">
              {isUploadingBackground ? 'Đang tải...' : 'Đổi ảnh bìa'}
            </span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'background')}
            disabled={isUploadingBackground}
          />
        </label>
      )}

      {/* Avatar lớn, bo tròn hoàn hảo, ring trắng mờ sang trọng */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20">
        <label className="group cursor-pointer block">
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden ring-8 ring-white/30 shadow-2xl backdrop-blur-sm relative transition-all group-hover:ring-white/50">
            {avatar ? (
              <Image
                src={getProxyUrl(avatar)}
                alt="avatar"
                width={176}
                height={176}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                <span className="text-7xl font-black text-white/90 tracking-tighter">?</span>
              </div>
            )}
          </div>

          {/* Overlay đổi avatar */}
          {mounted && isOwner && (
            <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              {isUploadingAvatar ? (
                <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <div className="p-4 bg-white/20 rounded-full backdrop-blur-md">
                  <HiCamera className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
              )}
            </div>
          )}

          {isOwner && (
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'avatar')}
              disabled={isUploadingAvatar}
            />
          )}
        </label>
      </div>
    </div>
  );
}
