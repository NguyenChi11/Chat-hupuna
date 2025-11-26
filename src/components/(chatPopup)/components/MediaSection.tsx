import React from 'react';
import Image from 'next/image';
import ArrowRightICon from '@/public/icons/arrow-right-icon.svg';
import { getProxyUrl } from '@/utils/utils';
import ItemDropdownMenu from './ItemDropdownMenu';

interface MediaSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  mediaList: {
    id: string;
    type: string;
    url: string;
    fileName?: string;
  }[];
  setPreviewMedia: (media: { url: string; type: 'image' | 'video' } | null) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onJumpToMessage: (messageId: string) => void;
  closeMenu: () => void;
}

export default function MediaSection({
  isOpen,
  onToggle,
  mediaList,
  setPreviewMedia,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
  closeMenu,
}: MediaSectionProps) {
  return (
    <div className="space-y-3 font-medium text-sm bg-white py-2 px-4 mb-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <span>Ảnh/Video</span>
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
            {mediaList && mediaList.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    // 🔥 Relative để định vị nút menu. KHÔNG overflow-hidden ở đây.
                    className="relative aspect-square cursor-pointer group"
                    onClick={() => {
                      const mediaType = item.type === 'video' ? 'video' : 'image';
                      setPreviewMedia({
                        url: getProxyUrl(item.url),
                        type: mediaType,
                      });
                    }}
                  >
                    {/* Wrapper chứa ảnh/video mới có overflow-hidden */}
                    <div className="w-full h-full rounded-md overflow-hidden bg-gray-100">
                      {item.type === 'video' ? (
                        <>
                          <video
                            src={getProxyUrl(item.url)}
                            className="h-full w-full object-cover pointer-events-none"
                            muted
                            preload="none"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-6 h-6 text-white"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <Image
                          src={getProxyUrl(item.url)}
                          alt="Media"
                          width={200}
                          height={200}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* 🔥 Nút "..." cho Ảnh/Video */}
                    <button
                      className={`absolute top-1 right-1 bg-white/80 hover:bg-white p-1 rounded-full shadow-sm transition-opacity z-10
                              ${activeMenuId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                      onClick={(e) => {
                        e.stopPropagation(); // Chặn mở ảnh
                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-700"
                      >
                        <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                      </svg>
                    </button>

                    {/* Render Menu */}
                    <ItemDropdownMenu
                      itemUrl={item.url}
                      itemId={item.id}
                      fileName={item.fileName}
                      activeMenuId={activeMenuId}
                      onClose={closeMenu}
                      onJumpToMessage={onJumpToMessage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 ml-2">Chưa có Ảnh/Video được chia sẻ</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
