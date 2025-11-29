'use client';

import React from 'react';
import Image from 'next/image';
import { HiX, HiDownload, HiPhotograph, HiVideoCamera } from 'react-icons/hi';

interface MediaPreviewModalProps {
  media: { url: string; type: 'image' | 'video' } | null;
  chatName?: string;
  isGroup?: boolean;
  onClose: () => void;
}

export default function MediaPreviewModal({ media, chatName, isGroup, onClose }: MediaPreviewModalProps) {
  if (!media) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center px-4" onClick={onClose}>
      <div className="relative w-full max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header siêu đẹp */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 flex items-start justify-between text-white">
          {/* Thông tin chat */}
          <div className="flex-1 max-w-full">
            <h3 className="text-lg sm:text-xl font-bold truncate">
              {chatName || (isGroup ? 'Nhóm chat' : 'Cuộc trò chuyện')}
            </h3>
            <p className="text-sm text-white/70 mt-1 flex items-center gap-2">
              {media.type === 'image' ? (
                <>
                  <HiPhotograph className="w-4 h-4" />
                  Ảnh
                </>
              ) : (
                <>
                  <HiVideoCamera className="w-4 h-4" />
                  Video
                </>
              )}
              <span className="hidden sm:inline">• Gửi trong cuộc trò chuyện</span>
            </p>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center gap-3 ml-4">
            {/* Tải xuống */}
            <a
              href={media.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 transition-all duration-200 active:scale-95 shadow-lg"
              title="Tải xuống"
            >
              <HiDownload className="w-5 h-5 sm:w-6 sm:h-6" />
            </a>

            {/* Nút đóng */}
            <button
              onClick={onClose}
              className="p-3 rounded-full cursor-pointer bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 transition-all duration-200 active:scale-95 shadow-lg"
              title="Đóng"
            >
              <HiX className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </div>
        </div>

        {/* Media chính – full trải nghiệm */}
        <div className="flex items-center justify-center min-h-screen py-20">
          <div className="relative max-w-full max-h-full">
            {media.type === 'image' ? (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <Image
                  src={media.url}
                  alt="Xem ảnh lớn"
                  width={1600}
                  height={1200}
                  className="max-h-[85vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl select-none pointer-events-none"
                  priority
                />
              </div>
            ) : (
              <div className="animate-in fade-in duration-500 rounded-2xl overflow-hidden shadow-2xl">
                <video
                  src={media.url}
                  controls
                  autoPlay
                  loop
                  muted={false}
                  className="max-h-[85vh] w-auto max-w-full rounded-2xl select-none"
                  playsInline
                />
              </div>
            )}
          </div>
        </div>

        {/* Hướng dẫn chạm (chỉ hiện trên mobile) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-white/60 text-xs sm:hidden">
          Chạm để đóng
        </div>
      </div>
    </div>
  );
}
