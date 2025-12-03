'use client';

import React, { useRef, useEffect, useState } from 'react';
import EmojiFB from '@/components/(chatPopup)/EmojiFB';
import { FB_EMOJIS } from '@/data/fbEmojis';
import Image from 'next/image';

interface EmojiStickerPickerProps {
  showEmojiPicker: boolean;
  pickerTab: 'emoji' | 'sticker';
  setPickerTab: (tab: 'emoji' | 'sticker') => void;
  onEmojiClick: (unicode: string) => void;
  stickers: string[];
  onSelectSticker: (url: string) => void;
}

export default function EmojiStickerPicker({
  showEmojiPicker,
  pickerTab,
  setPickerTab,
  onEmojiClick,
  stickers,
  onSelectSticker,
}: EmojiStickerPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pickerHeight, setPickerHeight] = useState(300);

  // Resize để Emoji FB responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height;
      if (h > 50) {
        setPickerHeight(h - 10);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  if (!showEmojiPicker) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 sm:right-auto mb-2 bg-white shadow-xl border border-gray-200 rounded-xl z-50 w-full sm:w-80 lg:w-[28rem] xl:w-[32rem] max-w-[90vw] flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 p-2 sm:p-3 cursor-pointer text-xs sm:text-sm font-medium ${pickerTab === 'emoji' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
          onClick={() => setPickerTab('emoji')}
        >
          Emoji
        </button>

        {/* <button
          className={`flex-1 p-2 sm:p-3 cursor-pointer text-xs sm:text-sm font-medium ${pickerTab === 'sticker' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
          onClick={() => setPickerTab('sticker')}
        >
          <Image width={14} height={14} src={IconSticker.src} alt="Sticker" className="inline mr-1 w-[14px] h-[14px]" />
          Sticker
        </button> */}
      </div>

      {/* Emoji / Sticker Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar min-h-[18rem] max-h-[70vh] p-2">
        {pickerTab === 'emoji' ? (
          <div style={{ height: pickerHeight }} className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {FB_EMOJIS.map((unicode) => (
              <div
                key={unicode}
                onClick={() => onEmojiClick(unicode)}
                className="cursor-pointer flex items-center justify-center rounded hover:bg-gray-100"
              >
                <EmojiFB unicode={unicode} size={36} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {stickers.map((url, idx) => (
              <Image
                key={idx}
                width={40}
                height={40}
                src={url}
                className="w-full h-16 object-contain cursor-pointer hover:bg-gray-100 rounded p-1"
                onClick={() => onSelectSticker(url)}
                alt="sticker"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
