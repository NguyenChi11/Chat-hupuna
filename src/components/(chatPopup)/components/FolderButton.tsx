'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiFolder } from 'react-icons/hi';

type FolderNode = { id: string; name: string; children: FolderNode[] };

type Props = {
  roomId: string;
  messageId: string;
  isMine: boolean;
  visible?: boolean;
  className?: string;
  onSaved?: (folderId: string) => void;
  preview: string;
};

export default function FolderButton({ roomId, messageId, isMine, visible, className = '', onSaved, preview }: Props) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Array<{ id: string; content: string }>>>({});
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [placeBelow, setPlaceBelow] = useState(false);

  const storageKey = useMemo(() => `chatFolders:${roomId}`, [roomId]);
  const itemsKey = useMemo(() => `chatFolderItems:${roomId}`, [roomId]);

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
      const raw = localStorage.getItem(itemsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const norm = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          k,
          Array.isArray(v)
            ? v
                .map((it: unknown) =>
                  typeof it === 'string' ? { id: it, content: '' } : (it as { id: string; content: string }),
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((x: any) => x && typeof x.id === 'string' && x.id)
            : [],
        ]),
      );
      setItemsMap(norm as Record<string, Array<{ id: string; content: string }>>);
    } catch {
      setItemsMap({});
    }
  }, [itemsKey]);

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

  const flatList = useMemo(() => {
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

  const sideCls = isMine ? 'right-full mr-3' : 'left-full ml-3';
  const pickerSideCls = isMine ? 'left-1/2 -translate-x-1/2' : 'left-1/2 -translate-x-3/4';

  const handleSave = (folderId: string) => {
    try {
      const raw = localStorage.getItem(itemsKey);
      const map = raw ? (JSON.parse(raw) as Record<string, Array<{ id: string; content: string }>>) : {};
      const arr = Array.isArray(map[folderId]) ? map[folderId] : [];
      if (!arr.some((x) => x.id === messageId)) arr.push({ id: messageId, content: preview });
      map[folderId] = arr;
      localStorage.setItem(itemsKey, JSON.stringify(map));
      try {
        const ev = new CustomEvent('chatFolderItemsChanged', { detail: { roomId, folderId, messageId } });
        window.dispatchEvent(ev);
      } catch {}
      try {
        const payload = { action: 'saveItem', roomId, folderId, messageId, preview };
        fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      } catch {}
      onSaved?.(folderId);
      setOpen(false);
    } catch {
      setOpen(false);
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
            <div className="text-xs text-gray-500 pb-2">Chọn thư mục</div>
            {flatList.length > 0 ? (
              <div className="max-h-[16rem] overflow-y-auto custom-scrollbar">
                {flatList.map(({ node, depth }) => (
                  <button
                    key={node.id}
                    onClick={() => handleSave(node.id)}
                    className="w-full text-left px-1 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-gray-800"
                  >
                    <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow">
                        <HiFolder className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{node.name}</span>
                      {(itemsMap[node.id]?.length || 0) > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
                          {itemsMap[node.id]?.length || 0}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">Chưa có thư mục, hãy tạo trong mục Folder</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
