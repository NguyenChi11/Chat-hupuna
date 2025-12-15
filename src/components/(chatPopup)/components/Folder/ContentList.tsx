'use client';
import React from 'react';
import Image from 'next/image';
import { HiPlay, HiDocumentText, HiLink, HiCheck } from 'react-icons/hi';
import ItemDropdownMenu from '@/components/(chatPopup)/components/ItemDropdownMenu';
import { getProxyUrl, isVideoFile } from '@/utils/utils';
import { Message } from '@/types/Message';

type Props = {
  selectedFolderId: string | null;
  items: Array<{
    id: string;
    content?: string;
    type?: 'image' | 'video' | 'file' | 'text';
    fileUrl?: string;
    fileName?: string;
  }>;
  messages: Message[];
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onJumpToMessage?: (id: string) => void;
  onInsertToInput?: (text: string) => void;
  onAttachFromFolder?: (att: { url: string; type: 'image' | 'video' | 'file'; fileName?: string }) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  removeItemFromFolder: (folderId: string, messageId: string) => void;
};

export default function ContentList({
  selectedFolderId,
  items,
  messages,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
  selectedIds,
  onToggleSelect,
  removeItemFromFolder,
}: Props) {
  const renderContentItem = (
    it: {
      id: string;
      content?: string;
      type?: 'image' | 'video' | 'file' | 'text';
      fileUrl?: string;
      fileName?: string;
    },
    idx: number,
    folderId: string,
  ): React.ReactNode => {
    const msg = messages.find((m) => String(m._id) === String(it.id));
    const openMenuId = String(it.id || idx);
    if (!msg) {
      const kind = it.type;
      const url = String(it.fileUrl || it.content || '');
      const selected = !!selectedIds && selectedIds.has(String(it.id));
      if (kind === 'image' || kind === 'video') {
        return (
          <div
            key={`media-${it.id ?? idx}`}
            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 w-36 h-36 ${selected ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => {
              if (onToggleSelect && it.id) onToggleSelect(String(it.id));
            }}
          >
            {kind === 'video' ? (
              <video src={getProxyUrl(url)} className="w-36 h-36 object-cover pointer-events-none" preload="metadata" />
            ) : String(url).startsWith('blob:') ? (
              <Image width={200} height={200} src={String(url)} alt="Media" className="w-36 h-36 object-cover" />
            ) : (
              <Image width={200} height={200} src={getProxyUrl(url)} alt="Media" className="w-36 h-36 object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              {kind === 'video' && <HiPlay className="w-10 h-10 text-white drop-shadow-lg" />}
            </div>
            {selected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                <HiCheck className="w-4 h-4" />
              </div>
            )}
            <ItemDropdownMenu
              itemUrl={url}
              itemId={openMenuId}
              fileName={it.fileName}
              activeMenuId={activeMenuId}
              onClose={() => setActiveMenuId(null)}
              onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
              onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
            />
          </div>
        );
      }

      if (kind === 'file') {
        return (
          <div
            key={`file-${it.id ?? idx}`}
            className={`relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-blue-300 ${selected ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => {
              if (onToggleSelect && it.id) onToggleSelect(String(it.id));
            }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
              <HiDocumentText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                {it.fileName || 'Tệp đính kèm'}
              </p>
              {it.fileName && (
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
                  .{String(it.fileName).split('.').pop()}
                </p>
              )}
            </div>
            {selected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                <HiCheck className="w-4 h-4" />
              </div>
            )}
            <ItemDropdownMenu
              itemUrl={url}
              itemId={openMenuId}
              fileName={it.fileName}
              activeMenuId={activeMenuId}
              onClose={() => setActiveMenuId(null)}
              onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
              onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
            />
          </div>
        );
      }

      const linkMatch = (it.content || '').match(/(https?:\/\/|www\.)\S+/i);
      if (kind === 'text' && linkMatch) {
        const raw = linkMatch[0];
        const href = raw.startsWith('http') ? raw : `https://${raw}`;
        let hostname = 'Website';
        try {
          hostname = new URL(href).hostname.replace('www.', '');
        } catch {}
        return (
          <div
            key={`link-${it.id ?? idx}`}
            className={`relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-purple-300 ${selected ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => {
              if (onToggleSelect && it.id) onToggleSelect(String(it.id));
            }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
              <HiLink className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-purple-600 truncate group-hover:underline transition-all">
                {raw}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{hostname}</p>
            </div>
            {selected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
                <HiCheck className="w-4 h-4" />
              </div>
            )}
            <ItemDropdownMenu
              itemUrl={href}
              itemId={openMenuId}
              activeMenuId={activeMenuId}
              onClose={() => setActiveMenuId(null)}
              onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
              onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
            />
          </div>
        );
      }

      return (
        <div
          key={`fallback-${it.id ?? idx}`}
          className={`relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800 ${selected ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => {
            if (onToggleSelect && it.id) onToggleSelect(String(it.id));
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="truncate">{it.content || 'Tin nhắn'}</p>
          </div>
          {selected && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
              <HiCheck className="w-4 h-4" />
            </div>
          )}
          <ItemDropdownMenu
            itemUrl={String(it.content || '')}
            itemId={openMenuId}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
    const isVid = msg.type === 'video' || isVideoFile(fileUrl) || isVideoFile(msg.fileName);
    const isImg =
      msg.type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(String(msg.fileName || fileUrl || ''));

    if (isImg || isVid) {
      return (
        <div
          key={`media-${msg._id}`}
          className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 w-36 h-36 ${selectedIds?.has(String(it.id)) ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => {
            if (onToggleSelect && it.id) onToggleSelect(String(it.id));
          }}
        >
          {isVid ? (
            <video
              src={getProxyUrl(fileUrl)}
              className="w-36 h-36 object-cover pointer-events-none"
              preload="metadata"
            />
          ) : String(fileUrl).startsWith('blob:') ? (
            <Image width={200} height={200} src={String(fileUrl)} alt="Media" className="w-36 h-36 object-cover" />
          ) : (
            <Image width={200} height={200} src={getProxyUrl(fileUrl)} alt="Media" className="w-36 h-36 object-cover" />
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            {isVid && <HiPlay className="w-10 h-10 text-white drop-shadow-lg" />}
          </div>
          {selectedIds?.has(String(it.id)) && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
              <HiCheck className="w-4 h-4" />
            </div>
          )}
          <ItemDropdownMenu
            itemUrl={fileUrl}
            itemId={String(msg._id)}
            fileName={msg.fileName}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    if (msg.type === 'file') {
      return (
        <div
          key={`file-${msg._id}`}
          className={`relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-blue-300 ${selectedIds?.has(String(it.id)) ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => {
            if (onToggleSelect && it.id) onToggleSelect(String(it.id));
          }}
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
            <HiDocumentText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
              {msg.fileName || 'Tệp đính kèm'}
            </p>
            {msg.fileName && (
              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
                .{String(msg.fileName).split('.').pop()}
              </p>
            )}
          </div>
          {selectedIds?.has(String(it.id)) && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
              <HiCheck className="w-4 h-4" />
            </div>
          )}
          <ItemDropdownMenu
            itemUrl={fileUrl}
            itemId={String(msg._id)}
            fileName={msg.fileName}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    const linkMatch = (msg.content || '').match(/(https?:\/\/|www\.)\S+/i);
    if (msg.type === 'text' && linkMatch) {
      const raw = linkMatch[0];
      const href = raw.startsWith('http') ? raw : `https://${raw}`;
      let hostname = 'Website';
      try {
        hostname = new URL(href).hostname.replace('www.', '');
      } catch {}
      return (
        <div
          key={`link-${msg._id}`}
          className="relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-purple-300"
          onClick={() => {
            if (onToggleSelect && it.id) onToggleSelect(String(it.id));
          }}
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
            <HiLink className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-purple-600 truncate group-hover:underline transition-all">{raw}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{hostname}</p>
          </div>
          <ItemDropdownMenu
            itemUrl={href}
            itemId={String(msg._id)}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    return (
      <div
        key={`text-${msg._id}`}
        className={`relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800 ${selectedIds?.has(String(it.id)) ? 'ring-2 ring-green-500' : ''}`}
        onClick={() => {
          if (onToggleSelect && it.id) onToggleSelect(String(it.id));
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="truncate">{String(msg.content || it.content || 'Tin nhắn')}</p>
        </div>
        {selectedIds?.has(String(it.id)) && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow">
            <HiCheck className="w-4 h-4" />
          </div>
        )}
        <ItemDropdownMenu
          itemUrl=""
          itemId={String(msg._id)}
          activeMenuId={activeMenuId}
          onClose={() => setActiveMenuId(null)}
          onJumpToMessage={(mid) => onJumpToMessage && onJumpToMessage(mid)}
          onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
        />
      </div>
    );
  };

  const currentItems = selectedFolderId ? items || [] : [];
  const classify = (it: {
    id: string;
    content?: string;
    type?: 'image' | 'video' | 'file' | 'text';
    fileUrl?: string;
    fileName?: string;
  }) => {
    const msg = messages.find((m) => String(m._id) === String(it.id));
    if (msg) {
      const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
      const isVid = msg.type === 'video' || isVideoFile(fileUrl) || isVideoFile(msg.fileName);
      const isImg =
        msg.type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(String(msg.fileName || fileUrl || ''));
      if (isImg || isVid) return 'media';
      if (msg.type === 'file') return 'file';
      return 'text';
    }
    if (it.type === 'image' || it.type === 'video') return 'media';
    if (it.type === 'file') return 'file';
    return 'text';
  };
  const mediaItems = currentItems.filter((it) => classify(it) === 'media');
  const fileItems = currentItems.filter((it) => classify(it) === 'file');
  const textItems = currentItems.filter((it) => classify(it) === 'text');

  if (!selectedFolderId) return <div className="text-sm text-gray-500">Chọn một thư mục ở sidebar</div>;
  if (currentItems.length === 0) return <div className="text-sm text-gray-500">Thư mục chưa có nội dung</div>;

  return (
    <div className="space-y-4">
      {(mediaItems.length > 0 || fileItems.length > 0) && (
        <div>
          <div className="text-xs text-gray-500 mb-2 mt-2">Ảnh/Video/Tệp</div>
          {mediaItems.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-2">
              {mediaItems.map((it, idx) => renderContentItem(it, idx, selectedFolderId))}
            </div>
          )}
          {fileItems.length > 0 && (
            <div className="space-y-2">{fileItems.map((it, idx) => renderContentItem(it, idx, selectedFolderId))}</div>
          )}
        </div>
      )}

      {textItems.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Text</div>
          <div className="space-y-2">{textItems.map((it, idx) => renderContentItem(it, idx, selectedFolderId))}</div>
        </div>
      )}
    </div>
  );
}
