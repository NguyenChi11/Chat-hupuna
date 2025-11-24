'use client';

import React from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import IconSticker from '@/public/icons/sticker.svg';

interface EmojiStickerPickerProps {
  showEmojiPicker: boolean;
  pickerTab: 'emoji' | 'sticker';
  setPickerTab: (tab: 'emoji' | 'sticker') => void;
  onEmojiClick: (emojiData: EmojiClickData) => void;
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
  if (!showEmojiPicker) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white shadow-xl border border-gray-200 rounded-xl z-50 w-full sm:w-80 flex flex-col overflow-hidden">
      <div className="flex border-b">
        <button
          className={`flex-1 p-2 text-sm font-medium ${pickerTab === 'emoji' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
          onClick={() => setPickerTab('emoji')}
        >
          Emoji
        </button>
        <button
          className={`flex-1 p-2 text-sm font-medium ${pickerTab === 'sticker' ? 'bg-gray-100 text-blue-600' : 'hover:bg-gray-50'}`}
          onClick={() => setPickerTab('sticker')}
        >
          <img src={IconSticker.src} alt="Sticker" className="w-4 h-4 inline mr-1" />
          Sticker
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {pickerTab === 'emoji' ? (
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            width="100%"
            height="350px"
            searchDisabled={false}
            skinTonesDisabled
          />
        ) : (
          <div className="grid grid-cols-4 gap-2 p-2">
            {stickers.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="sticker"
                className="w-full h-16 object-contain cursor-pointer hover:bg-gray-100 rounded p-1"
                onClick={() => onSelectSticker(url)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


