import React from 'react';
import { HiChevronRight, HiLink, HiDotsVertical } from 'react-icons/hi';
import ItemDropdownMenu from './ItemDropdownMenu';

interface LinkSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  groups: { dateKey: string; dateLabel: string; items: { id: string; url: string }[] }[];
  totalCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onJumpToMessage: (messageId: string) => void;
  closeMenu: () => void;
}

export default function LinkSection({
  isOpen,
  onToggle,
  groups,
  totalCount,
  isExpanded,
  onToggleExpanded,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
  closeMenu,
}: LinkSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header: Link + mũi tên */}
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-md">
            <HiLink className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-900">Link</span>
        
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
          {totalCount > 0 ? (
            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div key={group.dateKey} className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500">{group.dateLabel}</div>
                  <div className="space-y-3">
                    {group.items.map((link) => {
                      const href = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                      const hostname = (() => {
                        try {
                          return new URL(href).hostname.replace('www.', '');
                        } catch {
                          return 'Website';
                        }
                      })();
                      return (
                        <div
                          key={link.id}
                          className="relative flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-purple-300"
                          onClick={() => window.open(href, '_blank')}
                        >
                          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
                            <HiLink className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-purple-600 truncate group-hover:underline transition-all">{link.url}</p>
                            <p className="text-xs text-gray-500 mt-1 font-medium">{hostname}</p>
                          </div>
                          <button
                            className={`cursor-pointer p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 z-10 ${
                              activeMenuId === link.id ? 'opacity-100 ring-2 ring-purple-500' : 'opacity-0 group-hover:opacity-100'
                            } hover:bg-white hover:scale-110`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === link.id ? null : link.id);
                            }}
                          >
                            <HiDotsVertical className="w-4 h-4 text-gray-700" />
                          </button>
                          <ItemDropdownMenu
                            itemUrl={link.url}
                            itemId={link.id}
                            activeMenuId={activeMenuId}
                            onClose={closeMenu}
                            onJumpToMessage={onJumpToMessage}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {totalCount > 6 && (
                <div className="mt-3">
                  <button
                    onClick={onToggleExpanded}
                    className="cursor-pointer w-full py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {isExpanded ? 'Thu gọn' : 'Xem tất cả'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <div className="bg-gray-100 rounded-2xl w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <HiLink className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium">Chưa có link nào được chia sẻ</p>
              <p className="text-xs mt-1">Các liên kết sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
