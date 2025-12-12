'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatContext } from '@/context/ChatContext';
import { HiDocumentText, HiLink, HiCheck, HiX } from 'react-icons/hi';
import { FaFolder } from 'react-icons/fa';
import Image from 'next/image';
import { getProxyUrl, resolveSocketUrl } from '@/utils/utils';
import io, { type Socket } from 'socket.io-client';
import FolderCreateModal from '@/components/(chatPopup)/components/Folder/FolderCreateModal';
import ItemDropdownMenu from '@/components/(chatPopup)/components/ItemDropdownMenu';
import UploadProgressBar from '@/components/(chatPopup)/UploadProgressBar';
import FolderSidebar from '@/components/(chatPopup)/components/Folder/Sidebar';
import ContentToolbar from '@/components/(chatPopup)/components/Folder/ContentToolbar';
import ContentList from '@/components/(chatPopup)/components/Folder/ContentList';
import RenameModal from '@/components/(chatPopup)/components/Folder/RenameModal';
import DeleteModal from '@/components/(chatPopup)/components/Folder/DeleteModal';
import type { FolderNode } from '@/components/(chatPopup)/components/Folder/types';
import type { Message } from '@/types/Message';

type Scope = 'room' | 'global';
type FolderItem = {
  id: string;
  content?: string;
  type?: 'image' | 'video' | 'file' | 'text';
  fileUrl?: string;
  fileName?: string;
};

type Props = {
  roomId: string;
  onClose?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onInsertToInput?: (text: string) => void;
  onAttachFromFolder?: (att: { url: string; type: 'image' | 'video' | 'file'; fileName?: string }) => void;
};

export default function FolderDashboard({
  roomId,
  onClose,
  onJumpToMessage,
  onInsertToInput,
  onAttachFromFolder,
}: Props) {
  const { messages, currentUser, selectedChat, isGroup } = useChatContext();
  const GLOBAL_ID = '__global__';
  const storageKey = useMemo(() => `chatFolders:${roomId}`, [roomId]);
  const itemsKey = useMemo(() => `chatFolderItems:${roomId}`, [roomId]);
  const globalStorageKey = useMemo(() => `chatFolders:${GLOBAL_ID}`, []);
  const globalItemsKey = useMemo(() => `chatFolderItems:${GLOBAL_ID}`, []);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, FolderItem[]>>({});
  const [foldersGlobal, setFoldersGlobal] = useState<FolderNode[]>([]);
  const [itemsMapGlobal, setItemsMapGlobal] = useState<Record<string, FolderItem[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<Scope>('room');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [textInput, setTextInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; scope: 'room' | 'global' } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; scope: 'room' | 'global' } | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [uploadIds, setUploadIds] = useState<string[]>([]);
  const [uploadPercents, setUploadPercents] = useState<Record<string, number>>({});
  const [uploadingCount, setUploadingCount] = useState(0);
  const [overallPercent, setOverallPercent] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const uploadStreamsRef = useRef<Record<string, EventSource>>({});

  const [compact, setCompact] = useState(false);
  const [activeTab, setActiveTab] = useState<'sidebar' | 'content'>('sidebar');

  useEffect(() => {
    const update = () => {
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
      setCompact(!isDesktop);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const getItemCountById = (nodeId: string): number => {
    const map = selectedScope === 'room' ? itemsMap : itemsMapGlobal;
    return map[nodeId]?.length || 0;
  };

  const findNodeById = (nodes: FolderNode[], id: string | null): FolderNode | null => {
    if (!id) return null;
    const stack = [...nodes];
    while (stack.length) {
      const n = stack.shift()!;
      if (n.id === id) return n;
      if (n.children?.length) stack.push(...n.children);
    }
    return null;
  };

  const selectedChildren = useMemo(() => {
    const source = selectedScope === 'room' ? folders : foldersGlobal;
    const node = findNodeById(source, selectedFolderId);
    return node?.children || [];
  }, [selectedScope, folders, foldersGlobal, selectedFolderId]);

  const findPath = (nodes: FolderNode[], id: string | null): FolderNode[] => {
    if (!id) return [];
    const dfs = (arr: FolderNode[]): FolderNode[] => {
      for (const n of arr) {
        if (n.id === id) return [n];
        const childPath = dfs(n.children);
        if (childPath.length) return [n, ...childPath];
      }
      return [];
    };
    return dfs(nodes);
  };

  const breadcrumbNodes = useMemo(() => {
    const source = selectedScope === 'room' ? folders : foldersGlobal;
    return findPath(source, selectedFolderId);
  }, [selectedScope, folders, foldersGlobal, selectedFolderId]);

  const startUploadTracking = (uploadId: string) => {
    setUploadIds((prev) => [...prev, uploadId]);
    setUploadingCount((prev) => prev + 1);
    try {
      const es = new EventSource(`/api/upload/progress?id=${uploadId}`);
      uploadStreamsRef.current[uploadId] = es;
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { id: string; percent: number; done: boolean };
          setUploadPercents((prev) => {
            const next = { ...prev, [uploadId]: Math.max(0, Math.round(data.percent || 0)) };
            const vals = Object.values(next);
            const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
            setOverallPercent(avg);
            return next;
          });
          if (data.done) {
            setUploadingCount((prev) => Math.max(0, prev - 1));
            setUploadIds((prev) => prev.filter((x) => x !== uploadId));
            setUploadPercents((prev) => {
              const next = { ...prev };
              delete next[uploadId];
              const vals = Object.values(next);
              const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
              setOverallPercent(avg);
              return next;
            });
            try {
              uploadStreamsRef.current[uploadId]?.close();
              delete uploadStreamsRef.current[uploadId];
            } catch {}
          }
        } catch {}
      };
      es.onerror = () => {
        try {
          uploadStreamsRef.current[uploadId]?.close();
          delete uploadStreamsRef.current[uploadId];
        } catch {}
      };
    } catch {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setFolders(raw ? (JSON.parse(raw) as FolderNode[]) : []);
    } catch {
      setFolders([]);
    }
    try {
      const raw = localStorage.getItem(itemsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const norm = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          k,
          Array.isArray(v)
            ? v
                .map((it: unknown) =>
                  typeof it === 'string' ? ({ id: it, content: '' } as FolderItem) : (it as FolderItem),
                )
                .filter((x: FolderItem) => x && typeof x.id === 'string' && x.id)
            : [],
        ]),
      );
      setItemsMap(norm as Record<string, FolderItem[]>);
    } catch {
      setItemsMap({});
    }
    try {
      const rawG = localStorage.getItem(globalStorageKey);
      setFoldersGlobal(rawG ? (JSON.parse(rawG) as FolderNode[]) : []);
    } catch {
      setFoldersGlobal([]);
    }
    try {
      const rawGI = localStorage.getItem(globalItemsKey);
      const parsedG = rawGI ? JSON.parse(rawGI) : {};
      const normG = Object.fromEntries(
        Object.entries(parsedG as Record<string, unknown>).map(([k, v]) => [
          k,
          Array.isArray(v)
            ? v
                .map((it: unknown) =>
                  typeof it === 'string' ? ({ id: it, content: '' } as FolderItem) : (it as FolderItem),
                )
                .filter((x: FolderItem) => x && typeof x.id === 'string' && x.id)
            : [],
        ]),
      );
      setItemsMapGlobal(normG as Record<string, FolderItem[]>);
    } catch {
      setItemsMapGlobal({});
    }
  }, [storageKey, itemsKey, globalStorageKey, globalItemsKey]);

  useEffect(() => {
    const s = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
    socketRef.current = s;
    if (roomId) s.emit('join_room', roomId);
    s.on('folder_tree_updated', (data: { roomId?: unknown; folders?: FolderNode[] }) => {
      if (String(data?.roomId) !== String(roomId)) return;
      const next = Array.isArray(data?.folders) ? data.folders : [];
      setFolders(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    });
    s.on('folder_item_updated', (data: { roomId?: unknown; folderId?: unknown; items?: FolderItem[] }) => {
      if (String(data?.roomId) !== String(roomId)) return;
      const fid = String(data?.folderId || '');
      const arr = Array.isArray(data?.items) ? (data.items as FolderItem[]) : [];
      setItemsMap((prev) => ({ ...prev, [fid]: arr }));
      try {
        const raw = localStorage.getItem(itemsKey);
        const map = raw ? JSON.parse(raw) : {};
        map[fid] = arr;
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    });
    return () => {
      try {
        s.disconnect();
      } catch {}
    };
  }, [roomId]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateNode = (nodes: FolderNode[], id: string, updater: (n: FolderNode) => FolderNode | null): FolderNode[] => {
    const loop = (arr: FolderNode[]): FolderNode[] =>
      arr
        .map((n) => {
          if (n.id === id) {
            const res = updater(n);
            return res as FolderNode;
          }
          const children = loop(n.children);
          return { ...n, children };
        })
        .filter(Boolean) as FolderNode[];
    return loop(nodes);
  };

  const handleCreateRoot = (scope: Scope) => {
    setCreateParentId(null);
    setShowCreateModal(true);
    setSelectedScope(scope);
  };

  const removeItemFromFolder = (folderId: string, messageId: string) => {
    try {
      const isGlobal = selectedScope === 'global';
      const key = isGlobal ? globalItemsKey : itemsKey;
      const raw = localStorage.getItem(key);
      const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
      const arr = Array.isArray(map[folderId]) ? map[folderId] : [];
      const next = arr.filter((x) => String(x.id) !== String(messageId));
      map[folderId] = next;
      localStorage.setItem(key, JSON.stringify(map));
      if (isGlobal) {
        setItemsMapGlobal((prev) => ({ ...prev, [folderId]: next }));
      } else {
        setItemsMap((prev) => ({ ...prev, [folderId]: next }));
      }
      try {
        const ev = new CustomEvent('chatFolderItemsChanged', {
          detail: { roomId: isGlobal ? GLOBAL_ID : roomId, folderId, messageId, action: 'remove' },
        });
        window.dispatchEvent(ev);
      } catch {}
      if (!isGlobal) {
        try {
          socketRef.current?.emit('folder_item_updated', { roomId, folderId, items: next });
        } catch {}
      }
    } catch {}
  };

  const renderContentItem = (it: { id: string; content: string }, idx: number, folderId: string): React.ReactNode => {
    const msg = messages.find((m) => String(m._id) === String(it.id));
    const openMenuId = String(it.id || idx);
    if (!msg) {
      return (
        <div
          key={`fallback-${it.id ?? idx}`}
          className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800"
          onClick={() => {
            if (it.id) onJumpToMessage?.(String(it.id));
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="truncate">{it.content || 'Tin nhắn'}</p>
          </div>
          <ItemDropdownMenu
            itemUrl=""
            itemId={openMenuId}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
    if (msg.type === 'image' || msg.type === 'video') {
      return (
        <div
          key={`media-${msg._id}`}
          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 w-36 h-36"
          onClick={() => onInsertToInput?.(String(fileUrl))}
        >
          {msg.type === 'video' ? (
            <video
              src={getProxyUrl(fileUrl)}
              className="w-36 h-36 object-cover pointer-events-none"
              preload="metadata"
            />
          ) : (
            <Image width={200} height={200} src={getProxyUrl(fileUrl)} alt="Media" className="w-36 h-36 object-cover" />
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            {msg.type === 'video' && <HiLink className="w-10 h-10 text-white drop-shadow-lg" />}
          </div>
          <ItemDropdownMenu
            itemUrl={fileUrl}
            itemId={String(msg._id)}
            fileName={msg.fileName}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    if (msg.type === 'file') {
      return (
        <div
          key={`file-${msg._id}`}
          className="relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-blue-300"
          onClick={() => onInsertToInput?.(String(fileUrl))}
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
          <ItemDropdownMenu
            itemUrl={fileUrl}
            itemId={String(msg._id)}
            fileName={msg.fileName}
            activeMenuId={activeMenuId}
            onClose={() => setActiveMenuId(null)}
            onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
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
          onClick={() => onInsertToInput?.(href)}
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
            onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
            onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
          />
        </div>
      );
    }

    return (
      <div
        key={`text-${msg._id}`}
        className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800"
        onClick={() => onInsertToInput?.(String(msg.content || it.content || ''))}
      >
        <div className="flex-1 min-w-0">
          <p className="truncate">{String(msg.content || it.content || 'Tin nhắn')}</p>
        </div>
        <ItemDropdownMenu
          itemUrl=""
          itemId={String(msg._id)}
          activeMenuId={activeMenuId}
          onClose={() => setActiveMenuId(null)}
          onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
          onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
        />
      </div>
    );
  };

  const currentItems = selectedFolderId
    ? (selectedScope === 'room' ? itemsMap[selectedFolderId] : itemsMapGlobal[selectedFolderId]) || []
    : [];
  const mediaItems = currentItems.filter((it) => {
    const msg = messages.find((m) => String(m._id) === String(it.id));
    return msg && (msg.type === 'image' || msg.type === 'video');
  });
  const fileItems = currentItems.filter((it) => {
    const msg = messages.find((m) => String(m._id) === String(it.id));
    return msg && msg.type === 'file';
  });
  const textItems = currentItems.filter((it) => {
    const msg = messages.find((m) => String(m._id) === String(it.id));
    return msg && (msg.type === 'text' || !msg.type);
  });

  return (
    <div className="w-full">
      {compact ? (
        <div className="flex flex-col">
          <div className="flex flex-nowrap overflow-x-auto border-b border-gray-200 bg-white/80 backdrop-blur-sm -mx-4 px-4">
            <button
              onClick={() => setActiveTab('sidebar')}
              className={`flex-shrink-0 flex items-center justify-center gap-2 py-3 px-3 text-sm font-semibold transition-all ${
                activeTab === 'sidebar' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
              }`}
            >
              Thư mục
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-shrink-0 flex items-center justify-center gap-2 py-3 px-3 text-sm font-semibold transition-all ${
                activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
              }`}
            >
              Nội dung
            </button>
          </div>

          {activeTab === 'sidebar' ? (
            <div className="w-full">
              <FolderSidebar
                folders={folders}
                foldersGlobal={foldersGlobal}
                itemsMap={itemsMap}
                itemsMapGlobal={itemsMapGlobal}
                expanded={expanded}
                selectedFolderId={selectedFolderId}
                selectedScope={selectedScope}
                onSelect={(id, scope) => {
                  setSelectedFolderId(id);
                  setSelectedScope(scope);
                  setSelectedIds(new Set());
                  setActiveTab('content');
                }}
                onToggle={toggleNode}
                onCreateRoot={handleCreateRoot}
                openFolderMenuId={openFolderMenuId}
                setOpenFolderMenuId={(id) => setOpenFolderMenuId(id)}
                onCreateChild={(nodeId, scope) => {
                  setCreateParentId(nodeId);
                  setShowCreateModal(true);
                  setSelectedScope(scope);
                }}
                onRename={(nodeId, name, scope) => {
                  setRenameTarget({ id: nodeId, name, scope });
                  setRenameInput(name);
                }}
                onDelete={(nodeId, name, scope) => {
                  setDeleteTarget({ id: nodeId, name, scope });
                }}
              />
            </div>
          ) : (
            <div className="w-full">
              <div className="mb-2 mt-2 flex items-center flex-wrap gap-2 text-sm">
                <button
                  onClick={() => {
                    setSelectedFolderId(null);
                    setSelectedIds(new Set());
                  }}
                  className="cursor-pointer px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Gốc
                </button>
                {breadcrumbNodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    <span className="text-gray-400">›</span>
                    <button
                      onClick={() => {
                        setSelectedFolderId(node.id);
                        setSelectedIds(new Set());
                      }}
                      className={`cursor-pointer px-2 py-1 rounded-lg ${
                        idx === breadcrumbNodes.length - 1
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {node.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <ContentToolbar
                selectedFolderId={selectedFolderId}
                linkInput={linkInput}
                onLinkInputChange={(v) => setLinkInput(v)}
                onAddLink={async () => {
                  const url = linkInput.trim();
                  if (!url) return;
                  try {
                    if (selectedFolderId) {
                      const isGlobal = selectedScope === 'global';
                      const key = isGlobal ? globalItemsKey : itemsKey;
                      const raw = localStorage.getItem(key);
                      const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                      const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                      const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                      arr.push({ id, content: url, type: 'text' });
                      map[selectedFolderId] = arr;
                      localStorage.setItem(key, JSON.stringify(map));
                      if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      try {
                        const ev = new CustomEvent('chatFolderItemsChanged', {
                          detail: { roomId, folderId: selectedFolderId },
                        });
                        window.dispatchEvent(ev);
                      } catch {}
                      if (!isGlobal) {
                        try {
                          socketRef.current?.emit('folder_item_updated', {
                            roomId,
                            folderId: selectedFolderId,
                            items: arr,
                          });
                        } catch {}
                      }
                    }
                  } catch {}
                  setLinkInput('');
                }}
                textInput={textInput}
                onTextInputChange={(v) => setTextInput(v)}
                onAddText={async () => {
                  const content = textInput.trim();
                  if (!content) return;
                  try {
                    if (selectedFolderId) {
                      const isGlobal = selectedScope === 'global';
                      const key = isGlobal ? globalItemsKey : itemsKey;
                      const raw = localStorage.getItem(key);
                      const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                      const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                      const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                      arr.push({ id, content, type: 'text' });
                      map[selectedFolderId] = arr;
                      localStorage.setItem(key, JSON.stringify(map));
                      if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      try {
                        const ev = new CustomEvent('chatFolderItemsChanged', {
                          detail: { roomId, folderId: selectedFolderId },
                        });
                        window.dispatchEvent(ev);
                      } catch {}
                      if (!isGlobal) {
                        try {
                          socketRef.current?.emit('folder_item_updated', {
                            roomId,
                            folderId: selectedFolderId,
                            items: arr,
                          });
                        } catch {}
                      }
                    }
                  } catch {}
                  setTextInput('');
                }}
                onSelectMediaFiles={async (files) => {
                  for (const f of files) {
                    const isVideo = f.type.startsWith('video/');
                    const uploadId = `fd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    startUploadTracking(uploadId);
                    const form = new FormData();
                    form.append('file', f);
                    form.append('roomId', roomId);
                    form.append('sender', String(currentUser?._id || ''));
                    form.append('receiver', '');
                    form.append('type', isVideo ? 'video' : 'image');
                    form.append('folderName', `Chat_${roomId}`);
                    try {
                      const resUp = await fetch(`/api/upload?uploadId=${uploadId}`, { method: 'POST', body: form });
                      const jsonUp = await resUp.json();
                      if (jsonUp?.success && jsonUp?.data && selectedFolderId) {
                        const payload = jsonUp.data as {
                          roomId: string;
                          type: string;
                          fileUrl: string;
                          fileName?: string;
                        };
                        const isGlobal = selectedScope === 'global';
                        const key = isGlobal ? globalItemsKey : itemsKey;
                        const raw = localStorage.getItem(key);
                        const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                        const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                        const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                        arr.push({
                          id,
                          type: isVideo ? 'video' : 'image',
                          fileUrl: payload.fileUrl,
                          fileName: payload.fileName,
                        });
                        map[selectedFolderId] = arr;
                        localStorage.setItem(key, JSON.stringify(map));
                        if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                        else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                        try {
                          const ev = new CustomEvent('chatFolderItemsChanged', {
                            detail: { roomId, folderId: selectedFolderId },
                          });
                          window.dispatchEvent(ev);
                        } catch {}
                        if (!isGlobal) {
                          try {
                            socketRef.current?.emit('folder_item_updated', {
                              roomId,
                              folderId: selectedFolderId,
                              items: arr,
                            });
                          } catch {}
                        }
                      }
                    } catch {}
                  }
                }}
                onSelectAnyFiles={async (files) => {
                  for (const f of files) {
                    const isVideo = f.type.startsWith('video/');
                    const uploadId = `fd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    startUploadTracking(uploadId);
                    const form = new FormData();
                    form.append('file', f);
                    form.append('roomId', roomId);
                    form.append('sender', String(currentUser?._id || ''));
                    form.append('receiver', '');
                    form.append('type', isVideo ? 'video' : 'file');
                    form.append('folderName', `Chat_${roomId}`);
                    try {
                      const resUp = await fetch(`/api/upload?uploadId=${uploadId}`, { method: 'POST', body: form });
                      const jsonUp = await resUp.json();
                      if (jsonUp?.success && jsonUp?.data && selectedFolderId) {
                        const payload = jsonUp.data as {
                          roomId: string;
                          type: string;
                          fileUrl: string;
                          fileName?: string;
                        };
                        const isGlobal = selectedScope === 'global';
                        const key = isGlobal ? globalItemsKey : itemsKey;
                        const raw = localStorage.getItem(key);
                        const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                        const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                        const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                        arr.push({
                          id,
                          type: isVideo ? 'video' : 'file',
                          fileUrl: payload.fileUrl,
                          fileName: payload.fileName,
                        });
                        map[selectedFolderId] = arr;
                        localStorage.setItem(key, JSON.stringify(map));
                        if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                        else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                        try {
                          const ev = new CustomEvent('chatFolderItemsChanged', {
                            detail: { roomId, folderId: selectedFolderId },
                          });
                          window.dispatchEvent(ev);
                        } catch {}
                        if (!isGlobal) {
                          try {
                            socketRef.current?.emit('folder_item_updated', {
                              roomId,
                              folderId: selectedFolderId,
                              items: arr,
                            });
                          } catch {}
                        }
                      }
                    } catch {}
                  }
                }}
              />
              <div className="flex flex-col w-full h-[35rem] overflow-auto custom-scrollbar">
                {selectedFolderId && selectedChildren.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">Thư mục con</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedChildren.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setSelectedFolderId(child.id);
                            setSelectedIds(new Set());
                          }}
                          className="cursor-pointer flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm text-gray-800"
                        >
                          <div className="flex items-center gap-2">
                            <FaFolder className="w-5 h-5 text-gray-500" />
                            <span className="truncate font-semibold">{child.name}</span>
                          </div>
                          <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                            {getItemCountById(child.id)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedIds.size > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">Xem trước lựa chọn</p>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                          onClick={() => {
                            const selectedArr = currentItems.filter((it) => selectedIds.has(String(it.id)));
                            selectedArr.forEach((it) => {
                              const msg = messages.find((m) => String(m._id) === String(it.id));
                              if (msg) {
                                const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
                                if (msg.type === 'image' || msg.type === 'video') {
                                  onAttachFromFolder?.({ url: fileUrl, type: msg.type, fileName: msg.fileName });
                                } else if (msg.type === 'file') {
                                  onAttachFromFolder?.({ url: fileUrl, type: 'file', fileName: msg.fileName });
                                } else if (msg.type === 'text') {
                                  onInsertToInput?.(String(msg.content || ''));
                                }
                              } else {
                                const url = String(it.fileUrl || it.content || '');
                                const kind = it.type || 'text';
                                if (kind === 'image' || kind === 'video' || kind === 'file') {
                                  onAttachFromFolder?.({ url, type: kind, fileName: it.fileName });
                                } else {
                                  onInsertToInput?.(url);
                                }
                              }
                            });
                            setSelectedIds(new Set());
                          }}
                        >
                          Đồng ý lựa chọn
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 border border-gray-200"
                          onClick={() => setSelectedIds(new Set())}
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {currentItems
                        .filter((it) => selectedIds.has(String(it.id)))
                        .map((it) => {
                          const msg = messages.find((m) => String(m._id) === String(it.id));
                          if (msg) {
                            const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
                            if (msg.type === 'image' || msg.type === 'video') {
                              return (
                                <div
                                  key={`preview-${it.id}`}
                                  className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100"
                                >
                                  {msg.type === 'video' ? (
                                    <video
                                      src={getProxyUrl(fileUrl)}
                                      className="w-24 h-24 object-cover"
                                      preload="metadata"
                                    />
                                  ) : (
                                    <Image
                                      width={96}
                                      height={96}
                                      src={getProxyUrl(fileUrl)}
                                      alt="Media"
                                      className="w-24 h-24 object-cover"
                                    />
                                  )}
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                    <HiCheck className="w-3 h-3" />
                                  </div>
                                </div>
                              );
                            }
                            if (msg.type === 'file') {
                              return (
                                <div
                                  key={`preview-${it.id}`}
                                  className="relative flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 w-48"
                                >
                                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                    <HiDocumentText className="w-4 h-4" />
                                  </div>
                                  <p className="text-xs font-semibold text-gray-800 truncate">
                                    {msg.fileName || 'Tệp'}
                                  </p>
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                    <HiCheck className="w-3 h-3" />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={`preview-${it.id}`}
                                className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 w-48"
                              >
                                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white">
                                  <HiLink className="w-4 h-4" />
                                </div>
                                <p className="text-xs font-semibold text-gray-800 truncate">
                                  {String(msg.content || 'Tin nhắn')}
                                </p>
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <HiCheck className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          } else {
                            const url = String(it.fileUrl || it.content || '');
                            const kind = it.type || 'text';
                            if (kind === 'image' || kind === 'video') {
                              return (
                                <div
                                  key={`preview-${it.id}`}
                                  className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100"
                                >
                                  {kind === 'video' ? (
                                    <video
                                      src={getProxyUrl(url)}
                                      className="w-24 h-24 object-cover"
                                      preload="metadata"
                                    />
                                  ) : String(url).startsWith('blob:') ? (
                                    <img src={url} alt="Media" className="w-24 h-24 object-cover" />
                                  ) : (
                                    <Image
                                      width={96}
                                      height={96}
                                      src={getProxyUrl(url)}
                                      alt="Media"
                                      className="w-24 h-24 object-cover"
                                    />
                                  )}
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                    <HiCheck className="w-3 h-3" />
                                  </div>
                                </div>
                              );
                            }
                            if (kind === 'file') {
                              return (
                                <div
                                  key={`preview-${it.id}`}
                                  className="relative flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 w-48"
                                >
                                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                    <HiDocumentText className="w-4 h-4" />
                                  </div>
                                  <p className="text-xs font-semibold text-gray-800 truncate">{it.fileName || 'Tệp'}</p>
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                    <HiCheck className="w-3 h-3" />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={`preview-${it.id}`}
                                className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 w-48"
                              >
                                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white">
                                  <HiLink className="w-4 h-4" />
                                </div>
                                <p className="text-xs font-semibold text-gray-800 truncate">{url || 'Tin nhắn'}</p>
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <HiCheck className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          }
                        })}
                    </div>
                  </div>
                )}

                <ContentList
                  selectedFolderId={selectedFolderId}
                  items={currentItems}
                  messages={messages as unknown as Message[]}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={(id) => setActiveMenuId(id)}
                  onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
                  onInsertToInput={(txt) => onInsertToInput?.(txt)}
                  onAttachFromFolder={(att) => onAttachFromFolder?.(att)}
                  selectedIds={selectedIds}
                  onToggleSelect={(id) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  }}
                  removeItemFromFolder={(folderId, messageId) => removeItemFromFolder(folderId, messageId)}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 pr-2">
            <FolderSidebar
              folders={folders}
              foldersGlobal={foldersGlobal}
              itemsMap={itemsMap}
              itemsMapGlobal={itemsMapGlobal}
              expanded={expanded}
              selectedFolderId={selectedFolderId}
              selectedScope={selectedScope}
              onSelect={(id, scope) => {
                setSelectedFolderId(id);
                setSelectedScope(scope);
                setSelectedIds(new Set());
              }}
              onToggle={toggleNode}
              onCreateRoot={handleCreateRoot}
              openFolderMenuId={openFolderMenuId}
              setOpenFolderMenuId={(id) => setOpenFolderMenuId(id)}
              onCreateChild={(nodeId, scope) => {
                setCreateParentId(nodeId);
                setShowCreateModal(true);
                setSelectedScope(scope);
              }}
              onRename={(nodeId, name, scope) => {
                setRenameTarget({ id: nodeId, name, scope });
                setRenameInput(name);
              }}
              onDelete={(nodeId, name, scope) => {
                setDeleteTarget({ id: nodeId, name, scope });
              }}
            />
          </div>

          <div className="col-span-8 ">
            <div className="mb-2 mt-2 flex items-center flex-wrap gap-2 text-sm">
              <button
                onClick={() => {
                  setSelectedFolderId(null);
                  setSelectedIds(new Set());
                }}
                className="cursor-pointer px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Gốc
              </button>
              {breadcrumbNodes.map((node, idx) => (
                <React.Fragment key={node.id}>
                  <span className="text-gray-400">›</span>
                  <button
                    onClick={() => {
                      setSelectedFolderId(node.id);
                      setSelectedIds(new Set());
                    }}
                    className={`cursor-pointer px-2 py-1 rounded-lg ${
                      idx === breadcrumbNodes.length - 1
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {node.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <ContentToolbar
              selectedFolderId={selectedFolderId}
              linkInput={linkInput}
              onLinkInputChange={(v) => setLinkInput(v)}
              onAddLink={async () => {
                const url = linkInput.trim();
                if (!url) return;
                try {
                  if (selectedFolderId) {
                    const isGlobal = selectedScope === 'global';
                    const key = isGlobal ? globalItemsKey : itemsKey;
                    const raw = localStorage.getItem(key);
                    const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                    const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                    const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    arr.push({ id, content: url, type: 'text' });
                    map[selectedFolderId] = arr;
                    localStorage.setItem(key, JSON.stringify(map));
                    if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                    else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                    try {
                      const ev = new CustomEvent('chatFolderItemsChanged', {
                        detail: { roomId, folderId: selectedFolderId },
                      });
                      window.dispatchEvent(ev);
                    } catch {}
                    if (!isGlobal) {
                      try {
                        socketRef.current?.emit('folder_item_updated', {
                          roomId,
                          folderId: selectedFolderId,
                          items: arr,
                        });
                      } catch {}
                    }
                  }
                } catch {}
                setLinkInput('');
              }}
              textInput={textInput}
              onTextInputChange={(v) => setTextInput(v)}
              onAddText={async () => {
                const content = textInput.trim();
                if (!content) return;
                try {
                  if (selectedFolderId) {
                    const isGlobal = selectedScope === 'global';
                    const key = isGlobal ? globalItemsKey : itemsKey;
                    const raw = localStorage.getItem(key);
                    const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                    const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                    const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    arr.push({ id, content, type: 'text' });
                    map[selectedFolderId] = arr;
                    localStorage.setItem(key, JSON.stringify(map));
                    if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                    else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                    try {
                      const ev = new CustomEvent('chatFolderItemsChanged', {
                        detail: { roomId, folderId: selectedFolderId },
                      });
                      window.dispatchEvent(ev);
                    } catch {}
                    if (!isGlobal) {
                      try {
                        socketRef.current?.emit('folder_item_updated', {
                          roomId,
                          folderId: selectedFolderId,
                          items: arr,
                        });
                      } catch {}
                    }
                  }
                } catch {}
                setTextInput('');
              }}
              onSelectMediaFiles={async (files) => {
                for (const f of files) {
                  const isVideo = f.type.startsWith('video/');
                  const uploadId = `fd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  startUploadTracking(uploadId);
                  const form = new FormData();
                  form.append('file', f);
                  form.append('roomId', roomId);
                  form.append('sender', String(currentUser?._id || ''));
                  form.append('receiver', '');
                  form.append('type', isVideo ? 'video' : 'image');
                  form.append('folderName', `Chat_${roomId}`);
                  try {
                    const resUp = await fetch(`/api/upload?uploadId=${uploadId}`, { method: 'POST', body: form });
                    const jsonUp = await resUp.json();
                    if (jsonUp?.success && jsonUp?.data && selectedFolderId) {
                      const payload = jsonUp.data as {
                        roomId: string;
                        type: string;
                        fileUrl: string;
                        fileName?: string;
                      };
                      const isGlobal = selectedScope === 'global';
                      const key = isGlobal ? globalItemsKey : itemsKey;
                      const raw = localStorage.getItem(key);
                      const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                      const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                      const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                      arr.push({
                        id,
                        type: isVideo ? 'video' : 'image',
                        fileUrl: payload.fileUrl,
                        fileName: payload.fileName,
                      });
                      map[selectedFolderId] = arr;
                      localStorage.setItem(key, JSON.stringify(map));
                      if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      try {
                        const ev = new CustomEvent('chatFolderItemsChanged', {
                          detail: { roomId, folderId: selectedFolderId },
                        });
                        window.dispatchEvent(ev);
                      } catch {}
                      if (!isGlobal) {
                        try {
                          socketRef.current?.emit('folder_item_updated', {
                            roomId,
                            folderId: selectedFolderId,
                            items: arr,
                          });
                        } catch {}
                      }
                    }
                  } catch {}
                }
              }}
              onSelectAnyFiles={async (files) => {
                for (const f of files) {
                  const isVideo = f.type.startsWith('video/');
                  const uploadId = `fd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  startUploadTracking(uploadId);
                  const form = new FormData();
                  form.append('file', f);
                  form.append('roomId', roomId);
                  form.append('sender', String(currentUser?._id || ''));
                  form.append('receiver', '');
                  form.append('type', isVideo ? 'video' : 'file');
                  form.append('folderName', `Chat_${roomId}`);
                  try {
                    const resUp = await fetch(`/api/upload?uploadId=${uploadId}`, { method: 'POST', body: form });
                    const jsonUp = await resUp.json();
                    if (jsonUp?.success && jsonUp?.data && selectedFolderId) {
                      const payload = jsonUp.data as {
                        roomId: string;
                        type: string;
                        fileUrl: string;
                        fileName?: string;
                      };
                      const isGlobal = selectedScope === 'global';
                      const key = isGlobal ? globalItemsKey : itemsKey;
                      const raw = localStorage.getItem(key);
                      const map = raw ? (JSON.parse(raw) as Record<string, FolderItem[]>) : {};
                      const arr = Array.isArray(map[selectedFolderId]) ? map[selectedFolderId] : [];
                      const id = `fi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                      arr.push({
                        id,
                        type: isVideo ? 'video' : 'file',
                        fileUrl: payload.fileUrl,
                        fileName: payload.fileName,
                      });
                      map[selectedFolderId] = arr;
                      localStorage.setItem(key, JSON.stringify(map));
                      if (isGlobal) setItemsMapGlobal((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      else setItemsMap((prev) => ({ ...prev, [selectedFolderId!]: arr }));
                      try {
                        const ev = new CustomEvent('chatFolderItemsChanged', {
                          detail: { roomId, folderId: selectedFolderId },
                        });
                        window.dispatchEvent(ev);
                      } catch {}
                      if (!isGlobal) {
                        try {
                          socketRef.current?.emit('folder_item_updated', {
                            roomId,
                            folderId: selectedFolderId,
                            items: arr,
                          });
                        } catch {}
                      }
                    }
                  } catch {}
                }
              }}
            />
            <div className="flex flex-col w-full h-[68vh] overflow-auto custom-scrollbar">
              {selectedFolderId && selectedChildren.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">Thư mục con</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedChildren.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelectedFolderId(child.id);
                          setSelectedIds(new Set());
                        }}
                        className="cursor-pointer flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm text-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <FaFolder className="w-5 h-5 text-gray-500" />
                          <span className="truncate font-semibold">{child.name}</span>
                        </div>
                        <span className="ml-2 inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                          {getItemCountById(child.id)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedIds.size > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white border border-green-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">Xem trước lựa chọn</p>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                        onClick={() => {
                          const selectedArr = currentItems.filter((it) => selectedIds.has(String(it.id)));
                          selectedArr.forEach((it) => {
                            const msg = messages.find((m) => String(m._id) === String(it.id));
                            if (msg) {
                              const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
                              if (msg.type === 'image' || msg.type === 'video') {
                                onAttachFromFolder?.({ url: fileUrl, type: msg.type, fileName: msg.fileName });
                              } else if (msg.type === 'file') {
                                onAttachFromFolder?.({ url: fileUrl, type: 'file', fileName: msg.fileName });
                              } else if (msg.type === 'text') {
                                onInsertToInput?.(String(msg.content || ''));
                              }
                            } else {
                              const url = String(it.fileUrl || it.content || '');
                              const kind = it.type || 'text';
                              if (kind === 'image' || kind === 'video' || kind === 'file') {
                                onAttachFromFolder?.({ url, type: kind, fileName: it.fileName });
                              } else {
                                onInsertToInput?.(url);
                              }
                            }
                          });
                          setSelectedIds(new Set());
                        }}
                      >
                        Đồng ý lựa chọn
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 border border-gray-200"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {currentItems
                      .filter((it) => selectedIds.has(String(it.id)))
                      .map((it) => {
                        const msg = messages.find((m) => String(m._id) === String(it.id));
                        if (msg) {
                          const fileUrl = String(msg.fileUrl || msg.previewUrl || '');
                          if (msg.type === 'image' || msg.type === 'video') {
                            return (
                              <div
                                key={`preview-${it.id}`}
                                className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100"
                              >
                                {msg.type === 'video' ? (
                                  <video
                                    src={getProxyUrl(fileUrl)}
                                    className="w-24 h-24 object-cover"
                                    preload="metadata"
                                  />
                                ) : (
                                  <Image
                                    width={96}
                                    height={96}
                                    src={getProxyUrl(fileUrl)}
                                    alt="Media"
                                    className="w-24 h-24 object-cover"
                                  />
                                )}
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <HiCheck className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          }
                          if (msg.type === 'file') {
                            return (
                              <div
                                key={`preview-${it.id}`}
                                className="relative flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 w-48"
                              >
                                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                  <HiDocumentText className="w-4 h-4" />
                                </div>
                                <p className="text-xs font-semibold text-gray-800 truncate">{msg.fileName || 'Tệp'}</p>
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <HiCheck className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={`preview-${it.id}`}
                              className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 w-48"
                            >
                              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white">
                                <HiLink className="w-4 h-4" />
                              </div>
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {String(msg.content || 'Tin nhắn')}
                              </p>
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                <HiCheck className="w-3 h-3" />
                              </div>
                            </div>
                          );
                        } else {
                          const url = String(it.fileUrl || it.content || '');
                          const kind = it.type || 'text';
                          if (kind === 'image' || kind === 'video') {
                            return (
                              <div
                                key={`preview-${it.id}`}
                                className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100"
                              >
                                {kind === 'video' ? (
                                  <video src={getProxyUrl(url)} className="w-24 h-24 object-cover" preload="metadata" />
                                ) : String(url).startsWith('blob:') ? (
                                  <img src={url} alt="Media" className="w-24 h-24 object-cover" />
                                ) : (
                                  <Image
                                    width={96}
                                    height={96}
                                    src={getProxyUrl(url)}
                                    alt="Media"
                                    className="w-24 h-24 object-cover"
                                  />
                                )}
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <HiCheck className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          }
                          if (kind === 'file') {
                            return (
                              <div
                                key={`preview-${it.id}`}
                                className="relative flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 w-48"
                              >
                                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                  <HiDocumentText className="w-4 h-4" />
                                </div>
                                <p className="text-xs font-semibold text-gray-800 truncate">{it.fileName || 'Tệp'}</p>
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <HiCheck className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={`preview-${it.id}`}
                              className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 w-48"
                            >
                              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white">
                                <HiLink className="w-4 h-4" />
                              </div>
                              <p className="text-xs font-semibold text-gray-800 truncate">{url || 'Tin nhắn'}</p>
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                                <HiCheck className="w-3 h-3" />
                              </div>
                            </div>
                          );
                        }
                      })}
                  </div>
                </div>
              )}

              <ContentList
                selectedFolderId={selectedFolderId}
                items={currentItems}
                messages={messages as unknown as Message[]}
                activeMenuId={activeMenuId}
                setActiveMenuId={(id) => setActiveMenuId(id)}
                onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
                onInsertToInput={(txt) => onInsertToInput?.(txt)}
                onAttachFromFolder={(att) => onAttachFromFolder?.(att)}
                selectedIds={selectedIds}
                onToggleSelect={(id) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                removeItemFromFolder={(folderId, messageId) => removeItemFromFolder(folderId, messageId)}
              />
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <FolderCreateModal
          isOpen={showCreateModal}
          folders={selectedScope === 'global' ? foldersGlobal : folders}
          defaultParentId={createParentId || undefined}
          lockParent={!!createParentId}
          onClose={() => {
            setShowCreateModal(false);
            setCreateParentId(null);
          }}
          onCreate={(name: string, parentId?: string) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const pid = parentId || createParentId || undefined;
            if (selectedScope === 'global') {
              if (pid) {
                setFoldersGlobal((prev) => {
                  const next = updateNode(prev, pid, (n) => {
                    const exists = n.children.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                    if (exists) return n;
                    return { ...n, children: [...n.children, { id, name: trimmed, children: [] }] };
                  });
                  try {
                    localStorage.setItem(globalStorageKey, JSON.stringify(next));
                  } catch {}
                  return next;
                });
              } else {
                setFoldersGlobal((prev) => {
                  const exists = prev.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                  if (exists) return prev;
                  const next = [...prev, { id, name: trimmed, children: [] }];
                  try {
                    localStorage.setItem(globalStorageKey, JSON.stringify(next));
                  } catch {}
                  return next;
                });
              }
            } else {
              if (pid) {
                setFolders((prev) => {
                  const next = updateNode(prev, pid, (n) => {
                    const exists = n.children.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                    if (exists) return n;
                    return { ...n, children: [...n.children, { id, name: trimmed, children: [] }] };
                  });
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(next));
                  } catch {}
                  try {
                    socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
                  } catch {}
                  return next;
                });
              } else {
                setFolders((prev) => {
                  const exists = prev.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                  if (exists) return prev;
                  const next = [...prev, { id, name: trimmed, children: [] }];
                  try {
                    localStorage.setItem(storageKey, JSON.stringify(next));
                  } catch {}
                  try {
                    socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
                  } catch {}
                  return next;
                });
              }
            }
            setShowCreateModal(false);
            setCreateParentId(null);
          }}
        />
      )}
      <UploadProgressBar uploadingCount={uploadingCount} overallUploadPercent={overallPercent} />
      <RenameModal
        open={!!renameTarget}
        name={renameInput}
        onChangeName={(v) => setRenameInput(v)}
        onCancel={() => setRenameTarget(null)}
        onSave={() => {
          const name = renameInput.trim();
          if (!name || !renameTarget) return;
          if (renameTarget.scope === 'global') {
            setFoldersGlobal((prev) => {
              const next = prev.map((f) => (f.id === renameTarget.id ? { ...f, name } : f));
              try {
                localStorage.setItem(globalStorageKey, JSON.stringify(next));
              } catch {}
              return next;
            });
          } else {
            setFolders((prev) => {
              const next = prev.map((f) => (f.id === renameTarget.id ? { ...f, name } : f));
              try {
                localStorage.setItem(storageKey, JSON.stringify(next));
              } catch {}
              try {
                socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
              } catch {}
              return next;
            });
          }
          setRenameTarget(null);
          setRenameInput('');
        }}
      />
      <DeleteModal
        open={!!deleteTarget}
        name={deleteTarget?.name || ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.scope === 'global') {
            setFoldersGlobal((prev) => {
              const next = prev.filter((f) => f.id !== deleteTarget.id);
              try {
                localStorage.setItem(globalStorageKey, JSON.stringify(next));
              } catch {}
              return next;
            });
            try {
              const raw = localStorage.getItem(globalItemsKey);
              const map = raw ? (JSON.parse(raw) as Record<string, Array<{ id: string; content: string }>>) : {};
              delete map[deleteTarget.id];
              localStorage.setItem(globalItemsKey, JSON.stringify(map));
              setItemsMapGlobal(map);
            } catch {}
          } else {
            setFolders((prev) => {
              const next = prev.filter((f) => f.id !== deleteTarget.id);
              try {
                localStorage.setItem(storageKey, JSON.stringify(next));
              } catch {}
              try {
                socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
              } catch {}
              return next;
            });
            try {
              const raw = localStorage.getItem(itemsKey);
              const map = raw ? (JSON.parse(raw) as Record<string, Array<{ id: string; content: string }>>) : {};
              delete map[deleteTarget.id];
              localStorage.setItem(itemsKey, JSON.stringify(map));
              setItemsMap(map);
              try {
                socketRef.current?.emit('folder_item_updated', { roomId, folderId: deleteTarget.id, items: [] });
              } catch {}
            } catch {}
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
