'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiFolder } from 'react-icons/hi';
import { useChatContext } from '@/context/ChatContext';
import { folderRoomApi } from '@/services/folderRoom.service';

type FolderNode = { id: string; name: string; children: FolderNode[] };

type Props = {
  roomId: string;
  messageId: string;
  isMine: boolean;
  visible?: boolean;
  className?: string;
  onSaved?: (folderId: string) => void;
  preview: string;
  content?: string;
  type?: 'image' | 'video' | 'file' | 'text' | string;
  fileUrl?: string;
  fileName?: string;
};

type FolderItem = {
  id: string;
  content?: string;
  type?: 'image' | 'video' | 'file' | 'text';
  fileUrl?: string;
  fileName?: string;
};

type Scope = 'room' | 'global';

export default function FolderButton({
  roomId,
  messageId,
  isMine,
  visible,
  className = '',
  onSaved,
  preview,
  content,
  type,
  fileUrl,
  fileName,
}: Props) {
  const { currentUser } = useChatContext();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, FolderItem[]>>({});
  const [foldersGlobal, setFoldersGlobal] = useState<FolderNode[]>([]);
  const [itemsMapGlobal, setItemsMapGlobal] = useState<Record<string, FolderItem[]>>({});
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [placeBelow, setPlaceBelow] = useState(false);
  const [scope, setScope] = useState<Scope>('room');

  const storageKey = useMemo(() => `chatFolders:${roomId}`, [roomId]);
  const itemsKey = useMemo(() => `chatFolderItems:${roomId}`, [roomId]);
  const globalStorageKey = useMemo(
    () => `chatFolders:__global__:${String(currentUser?._id || '')}`,
    [currentUser?._id],
  );
  const globalItemsKey = useMemo(
    () => `chatFolderItems:__global__:${String(currentUser?._id || '')}`,
    [currentUser?._id],
  );

  const postFoldersGlobal = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/folders-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setFolders(raw ? (JSON.parse(raw) as FolderNode[]) : []);
    } catch {
      setFolders([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(globalStorageKey);
      setFoldersGlobal(raw ? (JSON.parse(raw) as FolderNode[]) : []);
    } catch {
      setFoldersGlobal([]);
    }
  }, [globalStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(itemsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setItemsMap(parsed as Record<string, FolderItem[]>);
    } catch {
      setItemsMap({});
    }
  }, [itemsKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(globalItemsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setItemsMapGlobal(parsed as Record<string, FolderItem[]>);
    } catch {
      setItemsMapGlobal({});
    }
  }, [globalItemsKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const anyE = e as unknown as { detail?: { roomId?: string } };
      const d = anyE.detail;
      if (!d || d.roomId !== roomId) return;
      try {
        const raw = localStorage.getItem(itemsKey);
        setItemsMap(raw ? JSON.parse(raw) : {});
      } catch {}
    };
    window.addEventListener('chatFolderItemsChanged' as unknown as string, handler);
    return () => window.removeEventListener('chatFolderItemsChanged' as unknown as string, handler);
  }, [roomId, itemsKey]);

  useEffect(() => {
    const handler = (e: Event) => {
      const anyE = e as unknown as { detail?: { roomId?: string } };
      const d = anyE.detail;
      if (!d || d.roomId !== '__global__') return;
      try {
        const raw = localStorage.getItem(globalItemsKey);
        setItemsMapGlobal(raw ? JSON.parse(raw) : {});
      } catch {}
    };
    window.addEventListener('chatFolderItemsChanged' as unknown as string, handler);
    return () => window.removeEventListener('chatFolderItemsChanged' as unknown as string, handler);
  }, [globalItemsKey]);

  const flatListRoom = useMemo(() => {
    const res: Array<{ node: FolderNode; depth: number }> = [];
    const walk = (arr: FolderNode[], d: number) => {
      for (const n of arr) {
        res.push({ node: n, depth: d });
        if (n.children?.length) walk(n.children, d + 1);
      }
    };
    walk(folders, 0);
    return res;
  }, [folders]);

  const flatListGlobal = useMemo(() => {
    const res: Array<{ node: FolderNode; depth: number }> = [];
    const walk = (arr: FolderNode[], d: number) => {
      for (const n of arr) {
        res.push({ node: n, depth: d });
        if (n.children?.length) walk(n.children, d + 1);
      }
    };
    walk(foldersGlobal, 0);
    return res;
  }, [foldersGlobal]);

  const sideCls = isMine ? 'right-full mr-3' : 'left-full ml-3';
  const pickerSideCls = isMine ? 'left-1/2 -translate-x-1/2' : 'left-1/2 -translate-x-3/4';

  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const handleSave = async (folderId: string, name?: string) => {
    try {
      const isGlobal = scope === 'global';
      if (isGlobal) {
        const ownerId = String(currentUser?._id || '');
        const kind = String(type || '').toLowerCase();
        let payload: Record<string, unknown> = { ownerId, folderId, itemId: messageId, name: name || '' };
        if (kind === 'image') {
          payload = { ...payload, action: 'updateImage', url: fileUrl, fileName };
        } else if (kind === 'video') {
          payload = { ...payload, action: 'updateVideo', url: fileUrl, fileName };
        } else if (kind === 'file') {
          payload = { ...payload, action: 'updateFile', url: fileUrl, fileName };
        } else {
          payload = { ...payload, action: 'updateText', content: content ?? preview ?? '' };
        }
        const json = await postFoldersGlobal(payload);
        if (json && json.success) {
          const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
          const patched = Array.isArray(arr)
            ? arr.map((it) =>
                String(it.id) === String(messageId)
                  ? { ...it, fileName: it.fileName, content: it.content, type: it.type, fileUrl: it.fileUrl, name }
                  : it,
              )
            : arr;
          setItemsMapGlobal((prev) => ({ ...prev, [folderId]: arr }));
          try {
            const raw = localStorage.getItem(globalItemsKey);
            const map = raw ? JSON.parse(raw) : {};
            map[folderId] = patched;
            localStorage.setItem(globalItemsKey, JSON.stringify(map));
          } catch {}
        }
      } else {
        const kind = String(type || '').toLowerCase();
        let payload: Record<string, unknown> = { roomId, folderId, itemId: messageId, name: name || '' };
        if (kind === 'image') {
          payload = { ...payload, action: 'updateImage', url: fileUrl, fileName };
        } else if (kind === 'video') {
          payload = { ...payload, action: 'updateVideo', url: fileUrl, fileName };
        } else if (kind === 'file') {
          payload = { ...payload, action: 'updateFile', url: fileUrl, fileName };
        } else {
          payload = { ...payload, action: 'updateText', content: content ?? preview ?? '' };
        }
        const json = await folderRoomApi(payload);
        if (json && json.success) {
          const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
          setItemsMap((prev) => ({ ...prev, [folderId]: arr }));
          try {
            const raw = localStorage.getItem(itemsKey);
            const map = raw ? JSON.parse(raw) : {};
            map[folderId] = arr;
            localStorage.setItem(itemsKey, JSON.stringify(map));
          } catch {}
          try {
            const ev = new CustomEvent('chatFolderItemsChanged', {
              detail: { roomId, folderId, messageId },
            });
            window.dispatchEvent(ev);
          } catch {}
        }
      }
      onSaved?.(folderId);
      setOpen(false);
      setPendingFolderId(null);
      setNameInput('');
    } catch {
      setOpen(false);
      setPendingFolderId(null);
      setNameInput('');
    }
  };

  useEffect(() => {
    const fn = () => {
      if (!open) return;
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const ph = popupRef.current?.getBoundingClientRect().height || 220;
      setPlaceBelow(below >= ph + 8 || below >= above);
    };
    fn();
    window.addEventListener('resize', fn);
    window.addEventListener('scroll', fn, true);
    return () => {
      window.removeEventListener('resize', fn);
      window.removeEventListener('scroll', fn, true);
    };
  }, [open]);

  return (
    <div
      className={`
        absolute top-1/2 -translate-y-1/2 z-20 ${sideCls}
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        transition-opacity duration-150 ${className}
      `}
    >
      <div ref={anchorRef} className="relative inline-flex mr-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="w-8 h-8 hover:cursor-pointer rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-all"
          aria-label="Lưu vào thư mục"
          title="Lưu vào thư mục"
        >
          <HiFolder className="w-4 h-4 text-gray-700" />
        </button>
        <div
          ref={popupRef}
          className={`absolute ${pickerSideCls} z-50 ${placeBelow ? 'top-full mt-2 origin-top' : 'bottom-full mb-2 origin-bottom'} min-w-[14rem] bg-white rounded-2xl shadow-xl border border-gray-200 transition-all ${open ? 'opacity-100 visible pointer-events-auto scale-100' : 'opacity-0 invisible pointer-events-none scale-95'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-1 py-1">
            <div className="text-xs text-gray-500 pb-2 flex items-center gap-2">
              <button
                className={`px-2 py-1 rounded-lg text-xs border ${scope === 'global' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setScope('global')}
              >
                Dùng nhiều đoạn chat
              </button>
              <button
                className={`px-2 py-1 rounded-lg text-xs border ${scope === 'room' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setScope('room')}
              >
                Đoạn chat hiện tại
              </button>
            </div>
            {(scope === 'global' ? flatListGlobal.length : flatListRoom.length) > 0 ? (
              <div className="max-h-[16rem] overflow-y-auto custom-scrollbar">
                {(scope === 'global' ? flatListGlobal : flatListRoom).map(({ node, depth }) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setPendingFolderId(node.id);
                      const suggested = (type === 'file' ? fileName || '' : '') || content || '' || preview || '' || '';
                      setNameInput(String(suggested).slice(0, 100));
                    }}
                    className="w-full text-left px-1 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-gray-800"
                  >
                    <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow">
                        <HiFolder className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{node.name}</span>
                      {((scope === 'global' ? itemsMapGlobal[node.id] : itemsMap[node.id])?.length || 0) > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
                          {(scope === 'global' ? itemsMapGlobal[node.id] : itemsMap[node.id])?.length || 0}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">Chưa có thư mục, hãy tạo trong mục Folder</div>
            )}
            {pendingFolderId && (
              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="text-xs text-gray-600 mb-1">Đặt tên nội dung</div>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Nhập tên hiển thị"
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-400"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                    onClick={() => {
                      if (!pendingFolderId) return;
                      const name = nameInput.trim();
                      handleSave(pendingFolderId, name || undefined);
                    }}
                  >
                    Xác nhận
                  </button>
                  <button
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 border border-gray-200"
                    onClick={() => {
                      setPendingFolderId(null);
                      setNameInput('');
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
