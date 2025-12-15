import React from 'react';
import { HiChevronRight, HiPlay, HiDotsVertical } from 'react-icons/hi';
import { getProxyUrl } from '@/utils/utils';
import ItemDropdownMenu from './ItemDropdownMenu';
import Image from 'next/image';

interface MediaSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  mediaList: {
    id: string;
    type: string;
    url: string;
    fileName?: string;
  }[];
  groups?: { dateLabel: string; items: { id: string; type: 'image' | 'video'; url: string; fileName?: string }[] }[];
  totalCount?: number;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
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
  groups,
  totalCount,
  isExpanded,
  onToggleExpanded,
  setPreviewMedia,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
  closeMenu,
}: MediaSectionProps) {
  const showToggle = typeof totalCount === 'number' && totalCount > 6;
  const toggleHandler = onToggleExpanded || (() => {});
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 ">
      {/* Header: Ảnh/Video + mũi tên */}
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-md">
            <HiPlay className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-900">Ảnh & Video</span>
         
        </div>

        <HiChevronRight
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-90' : ''
          } group-hover:text-gray-700`}
        />
      </button>

      {/* Nội dung khi mở */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {(groups && groups.length > 0) || mediaList.length > 0 ? (
            <>
              {(groups && groups.length > 0
                ? groups
                : [{ dateLabel: '', items: mediaList as { id: string; type: 'image' | 'video'; url: string; fileName?: string }[] }]
              ).map((group, gi) => (
                <div key={`${group.dateLabel}-${gi}`} className="mt-4">
                  {group.dateLabel && (
                    <div className="text-xs font-semibold text-gray-500 mb-2">{group.dateLabel}</div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className={`relative aspect-square rounded-xl cursor-pointer group bg-gray-100 ${
                          activeMenuId === item.id ? 'z-50' : 'z-0'
                        }`}
                        onClick={() => {
                          const mediaType = item.type === 'video' ? 'video' : 'image';
                          setPreviewMedia({ url: item.url, type: mediaType });
                        }}
                      >
                        {item.type === 'video' ? (
                          <video src={getProxyUrl(item.url)} className="w-full h-full object-cover pointer-events-none" preload="metadata" />
                        ) : (
                          <Image width={200} height={200} src={getProxyUrl(item.url)} alt="Media" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          {item.type === 'video' && <HiPlay className="w-10 h-10 text-white drop-shadow-lg" />}
                        </div>
                        <button
                          className={`cursor-pointer absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 z-10 ${activeMenuId === item.id ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === item.id ? null : item.id);
                          }}
                        >
                          <HiDotsVertical className="w-4 h-4 text-gray-700" />
                        </button>
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
                </div>
              ))}
              {showToggle && (
                <div className="mt-4">
                  <button onClick={toggleHandler} className="cursor-pointer w-full py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    {isExpanded ? 'Thu gọn' : 'Xem tất cả'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <div className="bg-gray-100 rounded-2xl w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <HiPlay className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium">Chưa có ảnh hoặc video nào</p>
              <p className="text-xs mt-1">Các tệp media sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}