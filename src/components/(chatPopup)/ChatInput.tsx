'use client';

import React, { ClipboardEvent, KeyboardEvent, RefObject } from 'react';

import IamgeIcon from '@/public/icons/Image-icon.svg';
import FileICon from '@/public/icons/file-icon.svg';
import MicroIcon from '@/public/icons/micro-icon.svg';
import Image from 'next/image';

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
  onSendMessage,
  onSelectImage,
  onSelectFile,
  onFocusEditable,
}: ChatInputProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative"
        onClick={onToggleEmojiPicker}
        aria-pressed={showEmojiPicker}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
          />
        </svg>
      </button>

      <input
        type="file"
        accept="image/*"
        id="imageInput"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onSelectImage(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <button
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        onClick={() => document.getElementById('imageInput')?.click()}
      >
        <Image src={IamgeIcon} alt="Chọn ảnh" width={25} height={25} />
      </button>

      <input
        type="file"
        id="fileInput"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onSelectFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <button
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <Image src={FileICon} alt="Chọn file" width={25} height={25} />
      </button>

      <button
        className={`p-2 rounded-full transition-all ${
          isListening ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' : 'hover:bg-gray-100 text-gray-600'
        }`}
        onClick={onVoiceInput}
        title="Nhập bằng giọng nói"
      >
        <Image src={MicroIcon} alt="Micro" width={20} height={20} />
      </button>

      <div
        ref={editableRef}
        contentEditable
        onInput={onInputEditable}
        onKeyDown={onKeyDownEditable}
        onFocus={onFocusEditable}
        onPaste={onPasteEditable}
        className="flex-1 p-2 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm text-black min-h-[40px] max-h-[120px] overflow-y-auto"
        data-placeholder="Nhập tin nhắn... (gõ @ để mention)"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>

      <button className="p-2 rounded-full hover:bg-blue-100 text-blue-500" onClick={onSendMessage}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
          />
        </svg>
      </button>
    </div>
  );
}
