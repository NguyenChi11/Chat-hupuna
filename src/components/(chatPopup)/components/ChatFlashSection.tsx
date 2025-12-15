import React, { useEffect, useState, useRef } from 'react';
import { HiChevronRight, HiLightningBolt, HiPlus, HiPencil, HiTrash, HiX } from 'react-icons/hi';
import { useChatContext } from '@/context/ChatContext';
import io, { type Socket } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';

interface ChatFlashSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatFlashSection({ isOpen, onToggle }: ChatFlashSectionProps) {
  const { currentUser, selectedChat, isGroup } = useChatContext();
  const getId = (u: unknown): string => {
    const obj = u as { _id?: unknown; id?: unknown };
    if (obj && (obj._id != null || obj.id != null)) return String((obj._id ?? obj.id) as unknown);
    return String(u ?? '');
  };
  const roomId = isGroup ? getId(selectedChat) : [getId(currentUser), getId(selectedChat)].sort().join('_');
  const foldersKey = `chatFlashFolders:${roomId}`;
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [folderName, setFolderName] = useState('');
  const [editingFolderIndex, setEditingFolderIndex] = useState<number | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeFolderName, setActiveFolderName] = useState('');
  const [items, setItems] = useState<Array<{ key: string; value: string }>>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
    socketRef.current = s;
    if (roomId) s.emit('join_room', roomId);
    s.on('chatflash_folder_updated', (data: { roomId?: unknown; folders?: Array<{ id: string; name: string }> }) => {
      if (String(data?.roomId) !== String(roomId)) return;
      const next = Array.isArray(data?.folders) ? data.folders : [];
      setFolders(next);
      try {
        localStorage.setItem(foldersKey, JSON.stringify(next));
      } catch {}
    });
    s.on(
      'chatflash_kv_updated',
      (data: { roomId?: unknown; folderId?: unknown; items?: Array<{ key: string; value: string }> }) => {
        if (String(data?.roomId) !== String(roomId)) return;
        const fid = String(data?.folderId || '');
        const arr = Array.isArray(data?.items) ? data.items : [];
        try {
          localStorage.setItem(`chatFlashKV:${roomId}:${fid}`, JSON.stringify(arr));
        } catch {}
        if (showModal && activeFolderId && String(activeFolderId) === fid) {
          setItems(arr);
        }
      },
    );
    return () => {
      try {
        s.disconnect();
      } catch {}
    };
  }, [roomId, showModal, activeFolderId, foldersKey]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/chatflash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'read', roomId }),
        });
        const data = await res.json();
        const rows = (data?.data?.folders || []) as Array<{ id: string; name: string }>;
        setFolders(rows);
        try {
          localStorage.setItem(foldersKey, JSON.stringify(rows));
        } catch {}
      } catch {
        try {
          const raw = localStorage.getItem(foldersKey);
          setFolders(raw ? JSON.parse(raw) : []);
        } catch {
          setFolders([]);
        }
      }
    };
    if (roomId) load();
  }, [roomId, foldersKey]);

  useEffect(() => {
    try {
      localStorage.setItem(foldersKey, JSON.stringify(folders));
    } catch {}
  }, [folders, foldersKey]);

  useEffect(() => {
    if (!activeFolderId || !showModal || !roomId) return;
    const loadKV = async () => {
      try {
        const res = await fetch('/api/chatflash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listKV', roomId, folderId: activeFolderId }),
        });
        const json = await res.json();
        const arr = (json?.items || []) as Array<{ key: string; value: string }>;
        setItems(arr);
        try {
          localStorage.setItem(`chatFlashKV:${roomId}:${activeFolderId}`, JSON.stringify(arr));
        } catch {}
      } catch {
        try {
          const raw = localStorage.getItem(`chatFlashKV:${roomId}:${activeFolderId}`);
          setItems(raw ? JSON.parse(raw) : []);
        } catch {
          setItems([]);
        }
      }
    };
    loadKV();
  }, [activeFolderId, showModal, roomId]);

  useEffect(() => {
    if (!activeFolderId || !showModal) return;
    try {
      localStorage.setItem(`chatFlashKV:${roomId}:${activeFolderId}`, JSON.stringify(items));
    } catch {}
  }, [items, activeFolderId, showModal, roomId]);

  const handleCreateFolder = async () => {
    const name = folderName.trim();
    if (!name || !roomId) return;
    try {
      const res = await fetch('/api/chatflash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createFolder', roomId, name }),
      });
      const json = await res.json();
      const folder = json?.folder as { id: string; name: string };
      if (folder && folder.id) {
        setFolders((prev) => {
          const next = [...prev, folder];
          try {
            localStorage.setItem(foldersKey, JSON.stringify(next));
          } catch {}
          try {
            socketRef.current?.emit('chatflash_folder_updated', { roomId, folders: next });
          } catch {}
          return next;
        });
        setFolderName('');
      }
    } catch {}
  };

  const handleDeleteFolder = async (index: number) => {
    const id = folders[index]?.id;
    if (!id || !roomId) return;
    try {
      await fetch('/api/chatflash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteFolder', roomId, folderId: id }),
      });
    } catch {}
    setFolders((prev) => {
      const next = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem(foldersKey, JSON.stringify(next));
        localStorage.removeItem(`chatFlashKV:${id}`);
      } catch {}
      try {
        socketRef.current?.emit('chatflash_folder_updated', { roomId, folders: next });
        socketRef.current?.emit('chatflash_kv_updated', { roomId, folderId: id, items: [] });
      } catch {}
      return next;
    });
  };

  const handleStartRenameFolder = (index: number) => {
    setEditingFolderIndex(index);
    setRenameFolderName(folders[index]?.name || '');
  };

  const handleConfirmRenameFolder = async () => {
    if (editingFolderIndex === null || !roomId) return;
    const name = renameFolderName.trim();
    if (!name) return;
    const id = folders[editingFolderIndex]?.id;
    if (!id) return;
    try {
      await fetch('/api/chatflash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renameFolder', roomId, folderId: id, name }),
      });
    } catch {}
    setFolders((prev) => {
      const next = prev.map((f, i) => (i === editingFolderIndex ? { ...f, name } : f));
      try {
        localStorage.setItem(foldersKey, JSON.stringify(next));
      } catch {}
      try {
        socketRef.current?.emit('chatflash_folder_updated', { roomId, folders: next });
      } catch {}
      return next;
    });
    setEditingFolderIndex(null);
    setRenameFolderName('');
  };

  const openFolderModal = (index: number) => {
    const f = folders[index];
    if (!f) return;
    setActiveFolderId(f.id);
    setActiveFolderName(f.name);
    try {
      localStorage.setItem(`chatFlashActiveFolder:${roomId}`, JSON.stringify({ id: f.id, name: f.name }));
    } catch {}
    setShowModal(true);
  };

  const handleAdd = async () => {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k || !roomId || !activeFolderId) return;
    try {
      await fetch('/api/chatflash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsertKV', roomId, folderId: activeFolderId, key: k, value: v }),
      });
    } catch {}
    setItems((prev) => {
      const next = [...prev, { key: k, value: v }];
      try {
        localStorage.setItem(`chatFlashKV:${roomId}:${activeFolderId}`, JSON.stringify(next));
      } catch {}
      try {
        socketRef.current?.emit('chatflash_kv_updated', { roomId, folderId: activeFolderId, items: next });
      } catch {}
      return next;
    });
    setNewKey('');
    setNewValue('');
  };

  const handleDelete = async (index: number) => {
    const k = items[index]?.key;
    if (!k || !roomId || !activeFolderId) return;
    try {
      await fetch('/api/chatflash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteKV', roomId, folderId: activeFolderId, key: k }),
      });
    } catch {}
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem(`chatFlashKV:${roomId}:${activeFolderId}`, JSON.stringify(next));
      } catch {}
      try {
        socketRef.current?.emit('chatflash_kv_updated', { roomId, folderId: activeFolderId, items: next });
      } catch {}
      return next;
    });
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingKey(items[index]?.key || '');
    setEditingValue(items[index]?.value || '');
  };

  const confirmEdit = async () => {
    if (editingIndex === null || !roomId || !activeFolderId) return;
    const k = editingKey.trim();
    const v = editingValue.trim();
    if (!k) return;
    try {
      await fetch('/api/chatflash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsertKV', roomId, folderId: activeFolderId, key: k, value: v }),
      });
    } catch {}
    setItems((prev) => {
      const next = prev.map((it, i) => (i === editingIndex ? { key: k, value: v } : it));
      try {
        localStorage.setItem(`chatFlashKV:${roomId}:${activeFolderId}`, JSON.stringify(next));
      } catch {}
      try {
        socketRef.current?.emit('chatflash_kv_updated', { roomId, folderId: activeFolderId, items: next });
      } catch {}
      return next;
    });
    setEditingIndex(null);
    setEditingKey('');
    setEditingValue('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-md">
            <HiLightningBolt className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-900">Chat nhanh</span>
        </div>
        <HiChevronRight
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''} group-hover:text-gray-700`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="py-5">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên thư mục"
              />
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                Tạo
              </button>
            </div>

            {folders.length > 0 && (
              <div className="space-y-2">
                {folders.map((folder, idx) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    {editingFolderIndex === idx ? (
                      <input
                        value={renameFolderName}
                        onChange={(e) => setRenameFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRenameFolder();
                        }}
                        className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <button className="flex-1 text-left text-sm" onClick={() => openFolderModal(idx)}>
                        {folder.name}
                      </button>
                    )}

                    <div className="flex items-center gap-3">
                      {editingFolderIndex === idx ? (
                        <button
                          onClick={handleConfirmRenameFolder}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Lưu
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartRenameFolder(idx)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteFolder(idx)} className="text-red-500 hover:text-red-700">
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#f3f6fb] border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0088ff] text-white flex items-center justify-center">
                  <HiLightningBolt className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold">{activeFolderName || 'Quản lý Key/Value'}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full cursor-pointer hover:bg-white/20 transition"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <HiPlus className="w-5 h-5 text-blue-600" /> Thêm Key/Value
                </label>
                <div className="flex items-center gap-2 sm:flex-row flex-col w-full justify-end">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Key"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition sm:w-auto w-full "
                  >
                    Thêm
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                {items.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">Chưa có item nào</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div
                        key={`${it.key}-${idx}`}
                        className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        {editingIndex === idx ? (
                          <>
                            <input
                              value={editingKey}
                              onChange={(e) => setEditingKey(e.target.value)}
                              placeholder="Key"
                              className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              placeholder="Value"
                              className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={confirmEdit} className="text-blue-600 hover:text-blue-800 text-sm">
                              Lưu
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 text-sm">
                              <span className="font-semibold text-gray-800">{it.key}</span>
                              <span className="text-gray-500">: {it.value}</span>
                            </div>
                            <button onClick={() => startEdit(idx)} className="text-gray-600 hover:text-gray-800">
                              <HiPencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(idx)} className="text-red-600 hover:text-red-800">
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
