'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HiDotsVertical, HiLink, HiTrash, HiReply, HiPencil } from 'react-icons/hi';

export default function ItemDropdownMenu({
  itemId,
  itemUrl,
  fileName,
  folderId,
  activeMenuId,
  onClose,
  onJumpToMessage,
  onRemoveFromFolder,
  onRenameItem,
}: {
  itemId: string;
  itemUrl: string;
  fileName?: string;
  folderId: string;
  activeMenuId: string | null;
  onClose: () => void;
  onJumpToMessage?: (id: string) => void;
  onRemoveFromFolder?: (id: string) => void;
  onRenameItem?: (folderId: string, itemId: string, name: string) => void;
}) {
  const open = activeMenuId === itemId;
  const [localOpen, setLocalOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalOpen(open);
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      if (localOpen) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [localOpen, onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(itemUrl || '');
    } catch {}
    onClose();
  };

  const rename = async () => {
    const next = window.prompt('Đổi tên', fileName || '') || '';
    const trimmed = next.trim();
    if (!trimmed) return;
    onRenameItem?.(folderId, itemId, trimmed);
    onClose();
  };

  return (
    <div ref={ref} className="absolute right-2 top-2 z-30">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (localOpen) onClose();
          else {
            // set active
            (window as Window & { __setChatFolderActiveMenu?: (id: string) => void }).__setChatFolderActiveMenu?.(
              itemId,
            );
          }
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-black/5 hover:bg-white"
        aria-label="Menu"
        title="Menu"
      >
        <HiDotsVertical className="h-5 w-5 text-gray-700" />
      </button>

      {localOpen && (
        <div className="mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {itemUrl ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                copy();
              }}
            >
              <HiLink className="h-4 w-4 text-gray-700" />
              <span className="truncate">Copy link {fileName ? `(${fileName})` : ''}</span>
            </button>
          ) : null}

          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              rename();
            }}
          >
            <HiPencil className="h-4 w-4 text-gray-700" />
            <span>Đổi tên</span>
          </button>

          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToMessage?.(itemId);
              onClose();
            }}
          >
            <HiReply className="h-4 w-4 text-gray-700" />
            <span>Đi tới tin nhắn</span>
          </button>

          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromFolder?.(itemId);
              onClose();
            }}
          >
            <HiTrash className="h-4 w-4" />
            <span>Xóa khỏi thư mục</span>
          </button>
        </div>
      )}
    </div>
  );
}
