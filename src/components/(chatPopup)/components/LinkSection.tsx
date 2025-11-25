import React from 'react';
import Image from 'next/image';
import ArrowRightICon from '@/public/icons/arrow-right-icon.svg';
import ItemDropdownMenu from './ItemDropdownMenu';

interface LinkItem {
  id: string;
  url: string;
}

interface LinkSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  linkList: LinkItem[];
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onJumpToMessage: (messageId: string) => void;
  closeMenu: () => void;
}

export default function LinkSection({
  isOpen,
  onToggle,
  linkList,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
  closeMenu,
}: LinkSectionProps) {
  return (
    <div className="space-y-3 font-medium text-sm bg-white py-2 px-4 mb-2">
      {/* 3️⃣ LINK */}
      <div className="space-y-1">
        <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
          <span>Link</span>
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
            {linkList && linkList.length > 0 ? (
              <div className="flex flex-col gap-2">
                {linkList.map((link) => {
                  const href = link.url.startsWith('http') ? link.url : `https://${link.url}`;

                  return (
                    <div
                      key={link.id}
                      className="relative flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors group cursor-pointer"
                      onClick={() => window.open(href, '_blank')}
                    >
                      <div className="bg-gray-200 p-2 rounded-full shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-5 h-5 text-gray-600"
                        >
                          <path
                            fillRule="evenodd"
                            d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>

                      <div className="flex flex-col overflow-hidden flex-1">
                        <span className="text-sm font-medium text-blue-600 truncate break-all group-hover:underline">
                          {link.url}
                        </span>
                        <span className="text-[0.625rem] text-gray-400">
                          {(() => {
                            try {
                              return new URL(href).hostname;
                            } catch {
                              return 'Website';
                            }
                          })()}
                        </span>
                      </div>

                      {/* 🔥 Nút "..." cho Link */}
                      <button
                        className={`p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-opacity
                                ${activeMenuId === link.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                              `}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === link.id ? null : link.id);
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
            ) : (
              <p className="text-xs text-gray-400 ml-2">Chưa có Link được chia sẻ</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
