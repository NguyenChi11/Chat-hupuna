'use client';
import React from 'react';

type Props = {
  selectedTopicId: string | null;
  linkInput: string;
  onLinkInputChange: (v: string) => void;
  onAddLink: () => void;
  textInput: string;
  onTextInputChange: (v: string) => void;
  onAddText: () => void;
  onSelectMediaFiles: (files: File[]) => void;
  onSelectAnyFiles: (files: File[]) => void;
};

export default function TopicToolbar({
  selectedTopicId,
  linkInput,
  onLinkInputChange,
  onAddLink,
  textInput,
  onTextInputChange,
  onAddText,
  onSelectMediaFiles,
  onSelectAnyFiles,
}: Props) {
  return (
    <div className="flex flex-col items-start justify-between px-2 py-2 border-b border-gray-200 bg-white">
      <h3 className="text-xs my-2 font-bold text-gray-500 uppercase tracking-wider">Nội dung</h3>
      {selectedTopicId && (
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer hover:bg-blue-700 transition-all shadow-sm hover:shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2z"
                />
              </svg>
              Ảnh/Video
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length) onSelectMediaFiles(files);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer hover:bg-indigo-700 transition-all shadow-sm hover:shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              Tệp
              <input
                type="file"
                accept="*/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length) onSelectAnyFiles(files);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => onLinkInputChange(e.target.value)}
                placeholder="Dán link..."
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-40"
                onKeyDown={(e) => e.key === 'Enter' && onAddLink()}
              />
              <button
                onClick={onAddLink}
                className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-all"
              >
                Thêm
              </button>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
              <input
                type="text"
                value={textInput}
                onChange={(e) => onTextInputChange(e.target.value)}
                placeholder="Nhập văn bản..."
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-40"
                onKeyDown={(e) => e.key === 'Enter' && onAddText()}
              />
              <button
                onClick={onAddText}
                className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-all"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
