'use client';

import React, { ClipboardEvent, KeyboardEvent, RefObject } from 'react';

// React Icons hi2 – Đỉnh cao nhất 2025
import { HiFaceSmile, HiPaperClip, HiPhoto, HiMicrophone, HiPaperAirplane, HiSparkles } from 'react-icons/hi2';

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
    <div className="relative w-full p-2 bg-gradient-to-t from-white via-white to-gray-50/50">
      {/* Toolbar trái – Sang trọng như Zalo Premium */}
      <div className="flex items-center gap-2 mb-2">
        {/* Emoji */}
        <button
          onClick={onToggleEmojiPicker}
          className="group p-2 rounded-2xl cursor-pointer bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 transition-all duration-300 active:scale-90 shadow-lg hover:shadow-xl"
          aria-label="Chọn emoji"
        >
          <HiFaceSmile className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
        </button>

        {/* Ảnh/Video */}
        <label
          className="group relative p-2 rounded-2xl cursor-pointer bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 transition-all duration-300 active:scale-90 shadow-lg hover:shadow-xl"
          aria-label="Gửi ảnh hoặc video"
        >
          <HiPhoto className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          <input
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.[0]) onSelectImage(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </label>

        {/* File */}
        <label
          className="group relative p-2 rounded-2xl cursor-pointer bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 transition-all duration-300 active:scale-90 shadow-lg hover:shadow-xl"
          aria-label="Gửi file"
        >
          <HiPaperClip className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform rotate-12" />
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.[0]) onSelectFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </label>

        {/* Voice – Hiệu ứng pulse đỏ đẹp hơn Zalo */}
        <button
          onClick={onVoiceInput}
          className={`relative p-2 rounded-3xl cursor-pointer transition-all duration-500 shadow-2xl ${
            isListening
              ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white animate-pulse ring-4 ring-red-300/50 scale-110'
              : 'bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 hover:scale-105'
          }`}
          aria-label="Nhập bằng giọng nói"
        >
          <HiMicrophone className="w-5 h-5" />
          {isListening && <div className="absolute inset-0 rounded-3xl bg-red-500/30 animate-ping" />}
        </button>
      </div>

      {/* Input Area + Send Button */}
      <div className="flex items-end gap-3">
        {/* Input contentEditable – Đẹp như iMessage */}
        <div className="relative flex-1">
          <div
            ref={editableRef}
            contentEditable
            onInput={onInputEditable}
            onKeyDown={onKeyDownEditable}
            onFocus={onFocusEditable}
            onPaste={onPasteEditable}
            className="w-full min-h-10 max-h-40 px-6 py-2 bg-white/90 rounded-3xl shadow-xl border border-gray-200/50 focus:outline-none  transition-all duration-300 text-base text-gray-800 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400"
            data-placeholder="Nhập tin nhắn..."
          />

          {/* Placeholder đẹp hơn */}
          <div className="pointer-events-none absolute inset-0 flex items-center px-6 py-4 text-gray-400 select-none">
            <span className="flex items-center gap-2">
              <HiSparkles className="w-5 h-5 text-indigo-400" />
              Nhập tin nhắn...
            </span>
          </div>
        </div>

        {/* Send Button – Gradient + hover scale */}
        <button
          onClick={onSendMessage}
          className="mb-1 p-2 rounded-3xl cursor-pointer bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 active:scale-90 group"
          aria-label="Gửi tin nhắn"
        >
          <HiPaperAirplane className="w-5 h-5 -rotate-12 group-hover:rotate-0 transition-transform duration-300" />
        </button>
      </div>

      {/* Custom CSS cho placeholder */}
      <style jsx>{`
        [contenteditable]:empty ~ div > span {
          opacity: 1;
        }
        [contenteditable]:not(:empty) ~ div > span,
        [contenteditable]:focus ~ div > span {
          opacity: 0;
        }
        [contenteditable]:focus ~ div > span {
          transition: opacity 0.3s ease;
        }
      `}</style>
    </div>
  );
}
