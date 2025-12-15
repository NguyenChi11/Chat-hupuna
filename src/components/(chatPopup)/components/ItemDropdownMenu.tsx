import React from 'react';

interface ItemDropdownMenuProps {
  itemUrl: string;
  itemId: string;
  fileName?: string;
  activeMenuId: string | null;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onRemoveFromFolder?: (messageId: string) => void;
}

export default function ItemDropdownMenu({
  itemUrl,
  itemId,
  fileName,
  activeMenuId,
  onClose,
  onJumpToMessage,
  onRemoveFromFolder,
}: ItemDropdownMenuProps) {
  if (activeMenuId !== itemId) return null;

  return (
    <>
      {/* Lớp phủ trong suốt để click ra ngoài thì đóng menu */}
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      ></div>

      {/* Dropdown Menu */}
      <div className="absolute top-10 right-0 z-50 w-40 bg-white rounded-md shadow-xl border border-gray-200 py-1 animate-in fade-in zoom-in duration-100 origin-top-right">
        {/* Option 1: Nhảy tới tin nhắn */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJumpToMessage(itemId);
            onClose();
          }}
          className="cursor-pointer w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-gray-500"
          >
            <path
              fillRule="evenodd"
              d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
              clipRule="evenodd"
            />
          </svg>
          Xem tin nhắn
        </button>

        {/* Option 2: Tải xuống */}
        {itemUrl && itemUrl.trim() && (
          <a
            href={itemUrl}
            download={fileName || 'download'}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            target="_blank"
            rel="noreferrer"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-gray-500"
            >
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Tải xuống
          </a>
        )}

        {onRemoveFromFolder && (
          <>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromFolder(itemId);
                onClose();
              }}
              className="cursor-pointer w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              {/* Trash icon inline svg to avoid importing */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path
                  fillRule="evenodd"
                  d="M8 2a1 1 0 00-1 1v1H5a1 1 0 100 2h10a1 1 0 100-2h-2V3a1 1 0 00-1-1H8zm-3 6a1 1 0 011 1v7a1 1 0 001 1h6a1 1 0 001-1V9a1 1 0 112 0v7a3 3 0 01-3 3H8a3 3 0 01-3-3V9a1 1 0 011-1zm4 1a1 1 0 10-2 0v6a1 1 0 102 0V9zm3-1a1 1 0 00-1 1v6a1 1 0 102 0V9a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Loại khỏi folder
            </button>
          </>
        )}
      </div>
    </>
  );
}