'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FolderItem, FolderNode, Scope } from '@/types/folderTypes';
import { findNodeById, findPath } from '@/utils/folderHelpers';
import { folderRoomApi } from '@/services/folderRoom.service';
import { folderGlobalApi } from '@/services/folderGlobal.service';
import { useUploadTracking } from '@/hooks/useUploadTracking';
import { useFolderSocket } from '@/hooks/useFolderSocket';
import type { Message } from '@/types/Message';

export function useFolderController({
  roomId,
  currentUserId,
  messages,
  onJumpToMessage,
  onInsertToInput,
  onAttachFromFolder,
}: {
  roomId: string;
  currentUserId: string;
  messages: Message[];
  onJumpToMessage?: (id: string) => void;
  onInsertToInput?: (text: string) => void;
  onAttachFromFolder?: (att: { url: string; type: 'image' | 'video' | 'file'; fileName?: string }) => void;
}) {
  const GLOBAL_ID = '__global__';

  const storageKey = useMemo(() => `chatFolders:${roomId}`, [roomId]);
  const itemsKey = useMemo(() => `chatFolderItems:${roomId}`, [roomId]);

  const globalStorageKey = useMemo(() => `chatFolders:${GLOBAL_ID}:${String(currentUserId || '')}`, [currentUserId]);
  const globalItemsKey = useMemo(() => `chatFolderItems:${GLOBAL_ID}:${String(currentUserId || '')}`, [currentUserId]);

  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, FolderItem[]>>({});
  const [foldersGlobal, setFoldersGlobal] = useState<FolderNode[]>([]);
  const [itemsMapGlobal, setItemsMapGlobal] = useState<Record<string, FolderItem[]>>({});

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<Scope>('room');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [compact, setCompact] = useState(false);
  const [activeTab, setActiveTab] = useState<'sidebar' | 'content'>('sidebar');

  // menus + modals
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; scope: Scope } | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; scope: Scope } | null>(null);

  // toolbar inputs
  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // upload
  const upload = useUploadTracking();

  // compact detection
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

  // derived: children + breadcrumb + current items
  const selectedChildren = useMemo(() => {
    const source = selectedScope === 'room' ? folders : foldersGlobal;
    const node = findNodeById(source, selectedFolderId);
    return node?.children || [];
  }, [selectedScope, folders, foldersGlobal, selectedFolderId]);

  const breadcrumbNodes = useMemo(() => {
    const source = selectedScope === 'room' ? folders : foldersGlobal;
    return findPath(source, selectedFolderId);
  }, [selectedScope, folders, foldersGlobal, selectedFolderId]);

  const currentItems = useMemo(() => {
    if (!selectedFolderId) return [];
    return (selectedScope === 'room' ? itemsMap[selectedFolderId] : itemsMapGlobal[selectedFolderId]) || [];
  }, [selectedFolderId, selectedScope, itemsMap, itemsMapGlobal]);

  const toggleNode = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const onSelectFolder = (id: string | null, scope: Scope) => {
    setSelectedFolderId(id);
    setSelectedScope(scope);
    setSelectedIds(new Set());
  };

  // load cache local
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
      setItemsMap(typeof parsed === 'object' && parsed ? parsed : {});
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
      setItemsMapGlobal(typeof parsedG === 'object' && parsedG ? parsedG : {});
    } catch {
      setItemsMapGlobal({});
    }
  }, [storageKey, itemsKey, globalStorageKey, globalItemsKey]);

  // fetch room tree on mount
  useEffect(() => {
    const run = async () => {
      if (!roomId) return;
      const json = await folderRoomApi({ action: 'read', roomId });
      if (json?.success) {
        const nextFolders: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItemsMap: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFolders(nextFolders);
        setItemsMap(nextItemsMap);
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextFolders));
          localStorage.setItem(itemsKey, JSON.stringify(nextItemsMap));
        } catch {}
      }
    };
    run();
  }, [roomId, storageKey, itemsKey]);

  // fetch global tree on mount
  useEffect(() => {
    const run = async () => {
      if (!currentUserId) return;
      const json = await folderGlobalApi({ action: 'read', ownerId: String(currentUserId) });
      if (json?.success) {
        const nextFolders: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItemsMap: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFoldersGlobal(nextFolders);
        setItemsMapGlobal(nextItemsMap);
        try {
          localStorage.setItem(globalStorageKey, JSON.stringify(nextFolders));
          localStorage.setItem(globalItemsKey, JSON.stringify(nextItemsMap));
        } catch {}
      }
    };
    run();
  }, [currentUserId, globalStorageKey, globalItemsKey]);

  // when global folder selected -> list items
  useEffect(() => {
    const run = async () => {
      if (selectedScope !== 'global') return;
      if (!currentUserId) return;
      if (!selectedFolderId) return;
      const json = await folderGlobalApi({
        action: 'listItems',
        ownerId: String(currentUserId),
        folderId: selectedFolderId,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMapGlobal((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(globalItemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(globalItemsKey, JSON.stringify(map));
        } catch {}
      }
    };
    run();
  }, [selectedScope, selectedFolderId, currentUserId, globalItemsKey]);

  // socket (room only)
  const socketRef = useFolderSocket({
    roomId,
    onTreeUpdate: (next) => {
      setFolders(next as FolderNode[]);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    onItemUpdate: (fid, items) => {
      setItemsMap((p) => ({ ...p, [fid]: items as FolderItem[] }));
      try {
        const raw = localStorage.getItem(itemsKey);
        const map = raw ? JSON.parse(raw) : {};
        map[fid] = items;
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    },
  });

  // actions
  const handleCreateRoot = (scope: Scope) => {
    setCreateParentId(null);
    setShowCreateModal(true);
    setSelectedScope(scope);
  };

  const onCreateChild = (nodeId: string, scope: Scope) => {
    setCreateParentId(nodeId);
    setShowCreateModal(true);
    setSelectedScope(scope);
  };

  const onRenameFolder = (nodeId: string, name: string, scope: Scope) => {
    setRenameTarget({ id: nodeId, name, scope });
    setRenameInput(name);
  };

  const onDeleteFolder = (nodeId: string, name: string, scope: Scope) => {
    setDeleteTarget({ id: nodeId, name, scope });
  };

  const persistRoom = (nextFolders: FolderNode[], nextItems?: Record<string, FolderItem[]>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextFolders));
      if (nextItems) localStorage.setItem(itemsKey, JSON.stringify(nextItems));
    } catch {}
  };

  const persistGlobal = (nextFolders: FolderNode[], nextItems?: Record<string, FolderItem[]>) => {
    try {
      localStorage.setItem(globalStorageKey, JSON.stringify(nextFolders));
      if (nextItems) localStorage.setItem(globalItemsKey, JSON.stringify(nextItems));
    } catch {}
  };

  const createFolder = async (name: string, parentId?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const targetParent = parentId || createParentId || 'root';

    if (selectedScope === 'global') {
      const json = await folderGlobalApi({
        action: 'createFolder',
        ownerId: String(currentUserId),
        parentId: targetParent,
        name: trimmed,
      });
      if (json?.success) {
        const next: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItems: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFoldersGlobal(next);
        if (json.itemsMap) setItemsMapGlobal(nextItems);
        persistGlobal(next, nextItems);
      }
    } else {
      const json = await folderRoomApi({
        action: 'createFolder',
        roomId,
        parentId: targetParent,
        name: trimmed,
      });
      if (json?.success) {
        const next: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItems: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFolders(next);
        if (json.itemsMap) setItemsMap(nextItems);
        persistRoom(next, nextItems);
        try {
          socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
        } catch {}
      }
    }
  };

  const saveRename = async () => {
    const name = renameInput.trim();
    if (!name || !renameTarget) return;

    if (renameTarget.scope === 'global') {
      const json = await folderGlobalApi({
        action: 'renameFolder',
        ownerId: String(currentUserId),
        folderId: renameTarget.id,
        name,
      });
      if (json?.success) {
        const next: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItems: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFoldersGlobal(next);
        if (json.itemsMap) setItemsMapGlobal(nextItems);
        persistGlobal(next, nextItems);
      }
    } else {
      const json = await folderRoomApi({ action: 'renameFolder', roomId, folderId: renameTarget.id, name });
      if (json?.success) {
        const next: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItems: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFolders(next);
        if (json.itemsMap) setItemsMap(nextItems);
        persistRoom(next, nextItems);
        try {
          socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
        } catch {}
      }
    }

    setRenameTarget(null);
    setRenameInput('');
  };

  const confirmDeleteFolder = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.scope === 'global') {
      const json = await folderGlobalApi({
        action: 'deleteFolder',
        ownerId: String(currentUserId),
        folderId: deleteTarget.id,
      });
      if (json?.success) {
        const next: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItems: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFoldersGlobal(next);
        setItemsMapGlobal(nextItems);
        persistGlobal(next, nextItems);
      }
    } else {
      const json = await folderRoomApi({ action: 'deleteFolder', roomId, folderId: deleteTarget.id });
      if (json?.success) {
        const next: FolderNode[] = Array.isArray(json.folders) ? json.folders : [];
        const nextItems: Record<string, FolderItem[]> =
          typeof json.itemsMap === 'object' && json.itemsMap ? json.itemsMap : {};
        setFolders(next);
        setItemsMap(nextItems);
        persistRoom(next, nextItems);
        try {
          socketRef.current?.emit('folder_tree_updated', { roomId, folders: next });
          socketRef.current?.emit('folder_item_updated', { roomId, folderId: deleteTarget.id, items: [] });
        } catch {}
      }
    }

    setDeleteTarget(null);
  };

  const removeItemFromFolder = async (folderId: string, messageId: string) => {
    if (!folderId || !messageId) return;

    if (selectedScope === 'global') {
      const json = await folderGlobalApi({
        action: 'deleteItem',
        ownerId: String(currentUserId),
        folderId,
        itemId: messageId,
      });
      if (json?.success) {
        const next: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMapGlobal((p) => ({ ...p, [folderId]: next }));
        try {
          const raw = localStorage.getItem(globalItemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[folderId] = next;
          localStorage.setItem(globalItemsKey, JSON.stringify(map));
        } catch {}
      }
    } else {
      const json = await folderRoomApi({ action: 'deleteItem', roomId, folderId, itemId: messageId });
      if (json?.success) {
        const next: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMap((p) => ({ ...p, [folderId]: next }));
        try {
          const raw = localStorage.getItem(itemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[folderId] = next;
          localStorage.setItem(itemsKey, JSON.stringify(map));
        } catch {}
        try {
          socketRef.current?.emit('folder_item_updated', { roomId, folderId, items: next });
        } catch {}
      }
    }
  };

  const renameItem = async (folderId: string, itemId: string, newName: string) => {
    if (!folderId || !itemId) return;
    const name = newName.trim();
    if (!name) return;

    const map = selectedScope === 'global' ? itemsMapGlobal : itemsMap;
    const arr = map[folderId] || [];
    const it = arr.find((x) => String(x.id) === String(itemId));
    const msg = messages.find((m: Message) => String(m._id) === String(itemId));

    const t = (msg?.type || it?.type || 'text') as 'image' | 'video' | 'file' | 'text';
    const c = msg?.content || it?.content || '';
    const url = msg?.fileUrl || msg?.previewUrl || it?.fileUrl || '';
    const fileName = msg?.fileName || it?.fileName || undefined;

    const action =
      t === 'image' ? 'updateImage' : t === 'video' ? 'updateVideo' : t === 'file' ? 'updateFile' : 'updateText';

    if (selectedScope === 'global') {
      const json = await folderGlobalApi({
        action,
        ownerId: String(currentUserId),
        folderId,
        itemId,
        name,
        url: t === 'text' ? undefined : url,
        fileName,
        content: t === 'text' ? c : undefined,
      });
      if (json?.success) {
        const next: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMapGlobal((p) => ({ ...p, [folderId]: next }));
        try {
          const raw = localStorage.getItem(globalItemsKey);
          const m = raw ? JSON.parse(raw) : {};
          m[folderId] = next;
          localStorage.setItem(globalItemsKey, JSON.stringify(m));
        } catch {}
      }
    } else {
      const json = await folderRoomApi({
        action,
        roomId,
        folderId,
        itemId,
        name,
        url: t === 'text' ? undefined : url,
        fileName,
        content: t === 'text' ? c : undefined,
      });
      if (json?.success) {
        const next: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMap((p) => ({ ...p, [folderId]: next }));
        try {
          const raw = localStorage.getItem(itemsKey);
          const m = raw ? JSON.parse(raw) : {};
          m[folderId] = next;
          localStorage.setItem(itemsKey, JSON.stringify(m));
        } catch {}
        try {
          socketRef.current?.emit('folder_item_updated', { roomId, folderId, items: next });
        } catch {}
      }
    }
  };

  const onAddText = async (contentOverride?: string, nameOverride?: string) => {
    const content = (contentOverride ?? textInput).trim();
    if (!content || !selectedFolderId) return;

    if (selectedScope === 'global') {
      const json = await folderGlobalApi({
        action: 'updateText',
        ownerId: String(currentUserId),
        folderId: selectedFolderId,
        name: (nameOverride ?? nameInput.trim()) || undefined,
        content,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMapGlobal((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(globalItemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(globalItemsKey, JSON.stringify(map));
        } catch {}
      }
    } else {
      const json = await folderRoomApi({
        action: 'updateText',
        roomId,
        folderId: selectedFolderId,
        name: (nameOverride ?? nameInput.trim()) || undefined,
        content,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMap((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(itemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(itemsKey, JSON.stringify(map));
        } catch {}
        try {
          socketRef.current?.emit('folder_item_updated', { roomId, folderId: selectedFolderId, items: arr });
        } catch {}
      }
    }

    if (!contentOverride) setTextInput('');
    if (!nameOverride) setNameInput('');
  };

  const onAddLink = async (urlOverride?: string, nameOverride?: string) => {
    const url = (urlOverride ?? linkInput).trim();
    if (!url || !selectedFolderId) return;

    // same as text update in your backend (kept)
    if (selectedScope === 'global') {
      const json = await folderGlobalApi({
        action: 'updateText',
        ownerId: String(currentUserId),
        folderId: selectedFolderId,
        name: (nameOverride ?? nameInput.trim()) || undefined,
        content: url,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMapGlobal((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(globalItemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(globalItemsKey, JSON.stringify(map));
        } catch {}
      }
    } else {
      const json = await folderRoomApi({
        action: 'updateText',
        roomId,
        folderId: selectedFolderId,
        name: (nameOverride ?? nameInput.trim()) || undefined,
        content: url,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMap((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(itemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(itemsKey, JSON.stringify(map));
        } catch {}
        try {
          socketRef.current?.emit('folder_item_updated', { roomId, folderId: selectedFolderId, items: arr });
        } catch {}
      }
    }

    if (!urlOverride) setLinkInput('');
    if (!nameOverride) setNameInput('');
  };

  const uploadOne = async (file: File, kind: 'media' | 'file', nameOverride?: string) => {
    if (!selectedFolderId) return;

    const isVideo = file.type.startsWith('video/');
    const uploadId = `fd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    upload.startTracking(uploadId);

    const form = new FormData();
    form.append('file', file);
    form.append('roomId', roomId);
    form.append('sender', String(currentUserId));
    form.append('receiver', '');
    form.append('type', kind === 'media' ? (isVideo ? 'video' : 'image') : isVideo ? 'video' : 'file');
    form.append('folderName', `Chat_${roomId}`);

    const resUp = await fetch(`/api/upload?uploadId=${uploadId}`, { method: 'POST', body: form });
    const jsonUp = await resUp.json();

    if (!jsonUp?.success || !jsonUp?.data) return;

    const payload = jsonUp.data as { roomId: string; type: string; fileUrl: string; fileName?: string };
    const action = isVideo ? 'updateVideo' : kind === 'media' ? 'updateImage' : 'updateFile';

    if (selectedScope === 'global') {
      const json = await folderGlobalApi({
        action,
        ownerId: String(currentUserId),
        folderId: selectedFolderId,
        name: (nameOverride ?? nameInput.trim()) || undefined,
        url: payload.fileUrl,
        fileName: payload.fileName,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMapGlobal((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(globalItemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(globalItemsKey, JSON.stringify(map));
        } catch {}
      }
    } else {
      const json = await folderRoomApi({
        action,
        roomId,
        folderId: selectedFolderId,
        name: (nameOverride ?? nameInput.trim()) || undefined,
        url: payload.fileUrl,
        fileName: payload.fileName,
      });
      if (json?.success) {
        const arr: FolderItem[] = Array.isArray(json.items) ? json.items : [];
        setItemsMap((p) => ({ ...p, [selectedFolderId]: arr }));
        try {
          const raw = localStorage.getItem(itemsKey);
          const map = raw ? JSON.parse(raw) : {};
          map[selectedFolderId] = arr;
          localStorage.setItem(itemsKey, JSON.stringify(map));
        } catch {}
        try {
          socketRef.current?.emit('folder_item_updated', { roomId, folderId: selectedFolderId, items: arr });
        } catch {}
      }
    }
    setNameInput('');
  };

  const onSelectMediaFiles = async (files: FileList, nameOverride?: string) => {
    const arr = Array.from(files || []);
    for (const f of arr) {
      try {
        await uploadOne(f, 'media', nameOverride);
      } catch {}
    }
  };

  const onSelectAnyFiles = async (files: FileList, nameOverride?: string) => {
    const arr = Array.from(files || []);
    for (const f of arr) {
      try {
        await uploadOne(f, 'file', nameOverride);
      } catch {}
    }
  };

  // selection helpers
  const onToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const applySelection = () => {
    if (!selectedFolderId) return;
    const selectedArr = currentItems.filter((it) => selectedIds.has(String(it.id)));

    selectedArr.forEach((it) => {
      const msg = messages.find((m: Message) => String(m._id) === String(it.id));

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
        const kind = (it.type || 'text') as 'image' | 'video' | 'file' | 'text';
        if (kind === 'image' || kind === 'video' || kind === 'file') {
          onAttachFromFolder?.({ url, type: kind, fileName: it.fileName });
        } else {
          onInsertToInput?.(url);
        }
      }
    });

    clearSelection();
  };

  return {
    // state
    folders,
    setFolders,
    itemsMap,
    setItemsMap,
    foldersGlobal,
    setFoldersGlobal,
    itemsMapGlobal,
    setItemsMapGlobal,
    expanded,
    setExpanded,
    selectedFolderId,
    setSelectedFolderId,
    selectedScope,
    setSelectedScope,
    selectedIds,
    setSelectedIds,

    // ui state
    compact,
    activeTab,
    setActiveTab,
    activeMenuId,
    setActiveMenuId,
    openFolderMenuId,
    setOpenFolderMenuId,

    // modals
    showCreateModal,
    setShowCreateModal,
    createParentId,
    setCreateParentId,

    renameTarget,
    setRenameTarget,
    renameInput,
    setRenameInput,

    deleteTarget,
    setDeleteTarget,

    // inputs
    textInput,
    setTextInput,
    linkInput,
    setLinkInput,
    nameInput,
    setNameInput,
    searchInput,
    setSearchInput,

    // derived
    selectedChildren,
    breadcrumbNodes,
    currentItems,
    getItemCountById,

    // handlers
    toggleNode,
    handleCreateRoot,
    onSelectFolder,
    onCreateChild,
    onRenameFolder,
    onDeleteFolder,

    createFolder,
    saveRename,
    confirmDeleteFolder,

    removeItemFromFolder,
    renameItem,
    onAddText,
    onAddLink,
    onSelectMediaFiles,
    onSelectAnyFiles,

    onToggleSelect,
    clearSelection,
    applySelection,

    // upload
    uploadingCount: upload.uploadingCount,
    overallPercent: upload.overallPercent,

    // pass through
    messages,
    onJumpToMessage,
    onInsertToInput,
    onAttachFromFolder,
  };
}
