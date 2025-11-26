'use client';

import React from 'react';
import Image from 'next/image';

interface MediaPreviewModalProps {
  media: { url: string; type: 'image' | 'video' } | null;
  chatName?: string;
  isGroup?: boolean;
  onClose: () => void;
}

export default function MediaPreviewModal({ media, chatName, isGroup, onClose }: MediaPreviewModalProps) {
  if (!media) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl mx-auto px-4 sm:px-6"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header kiểu Zalo */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-100 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
            <span className="font-semibold truncate max-w-[60vw]">
              {chatName || (isGroup ? 'Nhóm chat' : 'Cuộc trò chuyện')}
            </span>
            <span className="hidden sm:inline text-gray-400">•</span>
            <span className="text-gray-300">
              {media.type === 'image' ? 'Ảnh gửi trong trò chuyện' : 'Video gửi trong trò chuyện'}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center px-2 py-1 rounded-full bg-white/5 hover:bg-white/15 text-[0.6875rem] sm:text-xs text-gray-100 border border-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Tải xuống
            </a>

            <button
              type="button"
              className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/15 text-white border border-white/10"
              onClick={onClose}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 sm:w-5 sm:h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Khung media chính */}
        <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl max-h-[80vh]">
          {media.type === 'image' ? (
            <Image
              src={media.url}
              alt="Xem ảnh"
              width={1200}
              height={800}
              className="max-h-[80vh] w-auto max-w-full object-contain select-none"
            />
          ) : (
            <video src={media.url} controls autoPlay className="max-h-[80vh] w-full max-w-full bg-black select-none" />
          )}
        </div>
      </div>
    </div>
  );
}
