'use client';

import React, { ClipboardEvent, KeyboardEvent, RefObject } from 'react';

import IamgeIcon from '@/public/icons/Image-icon.svg';
import FileICon from '@/public/icons/file-icon.svg';
import MicroIcon from '@/public/icons/micro-icon.svg';
import Image from 'next/image';
import ICFile from '@/components/svg/ICFile';
import ICPicture from '@/components/svg/ICPicture';
import ICVoice from '@/components/svg/ICVoice';
import ICSend from '@/components/svg/ICSend';
import ICSmile from '@/components/svg/ICSmile';

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
        <ICSmile className="w-6 h-6" stroke="#000000" />
      </button>

      <input
        type="file"
        accept="image/*,video/*"
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
        <ICPicture className="w-6 h-6" stroke="#000000" />
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
        {/* <Image src={FileICon} alt="Chọn file" width={25} height={25} /> */}
        <ICFile className="w-6 h-6" stroke="#000000" />
      </button>

      <button
        className={`p-2 rounded-full transition-all ${
          isListening ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' : 'hover:bg-gray-100 text-gray-600'
        }`}
        onClick={onVoiceInput}
        title="Nhập bằng giọng nói"
      >
        <ICVoice className="w-6 h-6" stroke="#000000" />
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
        <ICSend className="w-6 h-6" stroke="#2579fe" />
      </button>
    </div>
  );
}
