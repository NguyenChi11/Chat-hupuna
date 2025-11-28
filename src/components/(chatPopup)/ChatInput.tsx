'use client';

import React, { ClipboardEvent, KeyboardEvent, RefObject } from 'react';
import { HiOutlineEmojiHappy } from 'react-icons/hi';
import { HiOutlinePaperClip } from 'react-icons/hi';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { HiOutlineMicrophone } from 'react-icons/hi';
import { HiPaperAirplane } from 'react-icons/hi';

interface ChatInputProps {
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  isListening: boolean;
  onVoiceInput: () => void;
  editableRef: RefObject<HTMLDivElement | null>;
  onInputEditable: () => void;
  onKeyDownEditable: (e: KeyboardEvent<HTMLDivElement>) => void;
  onPasteEditable: (e: ClipboardEvent<HTMLDivElement>) => void;
  onFocusEditable: () => void;
  onSendMessage: () => void;
  onSelectImage: (file: File) => void;
  onSelectFile: (file: File) => void;
}

export default function ChatInput({
  showEmojiPicker,
  onToggleEmojiPicker,
  isListening,
  onVoiceInput,
  editableRef,
  onInputEditable,
  onKeyDownEditable,
  onPasteEditable,
  onFocusEditable,
  onSendMessage,
  onSelectImage,
  onSelectFile,
}: ChatInputProps) {
  return (
    <div className="flex flex-wrap sm:flex-row flex-col items-end w-full gap-3 p-3 bg-white ">
      {/* Toolbar trái */}
      <div className="flex items-center gap-1">
        {/* Emoji */}
        <button
          onClick={onToggleEmojiPicker}
          className="p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-gray-800"
          aria-label="Chọn emoji"
        >
          <HiOutlineEmojiHappy className="w-6 h-6" />
        </button>

        {/* Ảnh/Video */}
        <input
          type="file"
          accept="image/*,video/*"
          id="imageInput"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onSelectImage(e.target.files[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => document.getElementById('imageInput')?.click()}
          className="p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-gray-800"
          aria-label="Gửi ảnh hoặc video"
        >
          <HiOutlinePhotograph className="w-6 h-6" />
        </button>

        {/* File */}
        <input
          type="file"
          id="fileInput"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onSelectFile(e.target.files[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => document.getElementById('fileInput')?.click()}
          className="p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 text-gray-600 hover:text-gray-800 rotate-12"
          aria-label="Gửi file"
        >
          <HiOutlinePaperClip className="w-6 h-6" />
        </button>

        {/* Voice */}
        <button
          onClick={onVoiceInput}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            isListening
              ? 'bg-red-500 text-white shadow-lg animate-pulse ring-4 ring-red-200'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
          }`}
          aria-label="Nhập bằng giọng nói"
        >
          <HiOutlineMicrophone className="w-6 h-6" />
        </button>
      </div>

      {/* Input + Send */}
      <div className="flex-1 flex items-end gap-2 w-full">
        <div
          ref={editableRef}
          contentEditable
          onInput={onInputEditable}
          onKeyDown={onKeyDownEditable}
          onFocus={onFocusEditable}
          onPaste={onPasteEditable}
          className="flex-1 min-h-12 max-h-32 px-4 py-3 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-sm md:text-base text-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400"
          data-placeholder="Aa"
          style={{
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        />

        <button
          onClick={onSendMessage}
          className="mb-1 p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
          aria-label="Gửi tin nhắn"
        >
          <HiPaperAirplane className="w-5 h-5 -rotate-12" />
        </button>
      </div>

      {/* Placeholder đẹp hơn */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          opacity: 0.8;
          pointer-events: none;
          position: absolute;
          left: 15rem;
          top: 50%;
          transform: translateY(-50%);
        }
        [contenteditable]:focus:before {
          opacity: 0.6;
        }
        /* Ẩn placeholder khi có nội dung hoặc focus */
        [contenteditable]:not(:empty):before,
        [contenteditable]:focus:before {
          display: none;
        }

        @media (max-width: 640px) {
          [contenteditable]:empty:before {
            left: 2rem;
            top: 6.25rem;
          }
        }
      `}</style>
    </div>
  );
}
