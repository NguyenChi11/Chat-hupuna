import React from 'react';
import Image from 'next/image';
import ArrowRightICon from '@/public/icons/arrow-right-icon.svg';
import ItemDropdownMenu from './ItemDropdownMenu';

interface FileItem {
  id: string;
  url: string;
  fileName: string;
}

interface FileSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  fileList: FileItem[];
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onJumpToMessage: (messageId: string) => void;
  closeMenu: () => void;
}

export default function FileSection({
  isOpen,
  onToggle,
  fileList,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
  closeMenu,
}: FileSectionProps) {
  return (
    <div className="space-y-3 font-medium text-sm bg-white py-2 px-4 mb-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <span>File</span>
          <Image
            src={ArrowRightICon}
            alt=""
            width={30}
            height={30}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        </div>
        {isOpen && (
          <div className="mt-2 px-2">
            {fileList && fileList.length > 0 ? (
              <div className="flex flex-col gap-2">
                {fileList.map((file) => (
                  <div
                    key={file.id}
                    className="relative flex items-center gap-3 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors group cursor-pointer"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5 text-blue-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>

                    <div className="flex flex-col overflow-hidden flex-1">
                      <span className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600">
                        {file.fileName}
                      </span>
                      <span className="text-[0.625rem] text-gray-400 uppercase">{file.fileName.split('.').pop()}</span>
                    </div>

                    {/* 🔥 Nút "..." cho File */}
                    <button
                      className={`p-1.5 rounded-full hover:bg-white text-gray-500 transition-opacity
                              ${activeMenuId === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === file.id ? null : file.id);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                      </svg>
                    </button>

                    <ItemDropdownMenu
                      itemUrl={file.url}
                      itemId={file.id}
                      fileName={file.fileName}
                      activeMenuId={activeMenuId}
                      onClose={closeMenu}
                      onJumpToMessage={onJumpToMessage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 ml-2">Chưa có File được chia sẻ</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
