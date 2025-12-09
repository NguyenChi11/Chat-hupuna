'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HiX, HiDownload, HiPhotograph, HiVideoCamera, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { getProxyUrl } from '@/utils/utils';

interface MediaPreviewModalProps {
  media: { url: string; type: 'image' | 'video' } | null;
  chatName?: string;
  isGroup?: boolean;
  onClose: () => void;
  roomId?: string;
}

export default function MediaPreviewModal({ media, chatName, isGroup, onClose, roomId }: MediaPreviewModalProps) {
  const [groups, setGroups] = useState<
    { dateLabel: string; items: { id: string; type: 'image' | 'video'; url: string; timestamp?: number }[] }[]
  >([]);
  const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const [current, setCurrent] = useState<{ url: string; type: 'image' | 'video' } | null>(media);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    setCurrent(media);
    if (media) openedAtRef.current = Date.now();
  }, [media]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!roomId) return;
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'readAssets', roomId, assetType: 'media', limit: 5000 }),
        });
        const json = await res.json();
        const gs = Array.isArray(json?.groups) ? json.groups : [];
        setGroups(gs);
      } catch {}
    };
    fetchAll();
  }, [roomId]);

  useEffect(() => {
    if (!current) return;
    const el = itemRefs.current[current.url];
    const list = listRef.current;
    if (el && list) {
      try {
        const targetLeft = el.offsetLeft - (list.clientWidth / 2 - el.clientWidth / 2);
        list.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      } catch {}
    }
  }, [current, items]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center px-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const sinceOpen = Date.now() - openedAtRef.current;
        if (sinceOpen < 200) return;
        onClose();
      }}
    >
      <div className="relative w-full max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header siêu đẹp */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 flex items-start justify-between text-white">
          {/* Thông tin chat */}
          <div className="flex-1 max-w-full">
            <h3 className="text-lg sm:text-xl font-bold truncate">
              {chatName || (isGroup ? 'Nhóm chat' : 'Cuộc trò chuyện')}
            </h3>
            <p className="text-sm text-white/70 mt-1 flex items-center gap-2">
              {current.type === 'image' ? (
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
              href={getProxyUrl(current.url)}
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
        <div className="flex items-center justify-center min-h-screen py-20 pb-32 sm:pb-36">
          <div className="relative max-w-full max-h-full">
            {current.type === 'image' ? (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <Image
                  src={getProxyUrl(current.url)}
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
                  src={getProxyUrl(current.url)}
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

        {items.length > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-28 sm:bottom-32 flex items-center gap-3 z-20">
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              onClick={() => {
                const el = listRef.current;
                if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
              }}
            >
              <HiChevronLeft className="w-5 h-5" />
            </button>
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              onClick={() => {
                const el = listRef.current;
                if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
              }}
            >
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {groups.length > 0 && (
          <div
            className="absolute left-0 right-0 bottom-0 h-28 sm:h-32 bg-black/40 backdrop-blur-sm border-t border-white/10 overflow-x-auto no-scrollbar"
            ref={listRef}
          >
            <div className="flex items-start gap-4 px-3 py-2">
              {groups.map((g, gi) => (
                <div key={`${g.dateLabel}-${gi}`} className="flex items-start gap-2">
                  {g.dateLabel && (
                    <div className="text-[0,625rem] text-white/70 font-semibold mt-1 mr-1 min-w-max">{g.dateLabel}</div>
                  )}
                  <div className="flex items-center gap-2">
                    {g.items.map((it) => (
                      <div
                        key={it.id}
                        ref={(el) => {
                          itemRefs.current[it.url] = el;
                        }}
                        className={`relative rounded-md overflow-hidden border ${
                          current && current.url === it.url ? 'border-blue-400' : 'border-transparent'
                        } cursor-pointer w-24 h-20`}
                        onClick={() => setCurrent({ url: it.url, type: it.type })}
                      >
                        {it.type === 'image' ? (
                          <Image
                            src={getProxyUrl(it.url)}
                            alt="thumb"
                            width={160}
                            height={120}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video src={getProxyUrl(it.url)} className="w-full h-full object-cover" preload="metadata" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hướng dẫn chạm (chỉ hiện trên mobile) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-white/60 text-xs sm:hidden">
          Chạm để đóng
        </div>
      </div>
    </div>
  );
}
