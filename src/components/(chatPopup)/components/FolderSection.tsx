'use client';
import FolderCreateModal from '@/components/(chatPopup)/components/FolderCreateModal';
import React, { useEffect, useMemo, useState } from 'react';
import {
  HiChevronRight,
  HiFolder,
  HiPlus,
  HiDotsVertical,
  HiFolderOpen,
  HiX,
  HiTrash,
  HiPencil,
  HiChevronDown,
} from 'react-icons/hi';
import { HiFolderPlus } from 'react-icons/hi2';

export interface FolderNode {
  id: string;
  name: string;
  children: FolderNode[];
}

interface FolderSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  roomId: string;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export default function FolderSection({
  isOpen,
  onToggle,
  roomId,
  activeMenuId,
  setActiveMenuId,
  onJumpToMessage,
}: FolderSectionProps) {
  const storageKey = useMemo(() => `chatFolders:${roomId}`, [roomId]);
  const itemsKey = useMemo(() => `chatFolderItems:${roomId}`, [roomId]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, Array<{ id: string; content: string }>>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setFolders(raw ? JSON.parse(raw) : []);
    } catch {
      setFolders([]);
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(folders));
    } catch {}
  }, [folders, storageKey, loaded]);

  useEffect(() => {
    setRenameInput(renameTarget?.name || '');
  }, [renameTarget]);

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
                .filter((x: { id: string; content: string }) => x && typeof x.id === 'string' && x.id)
            : [],
        ]),
      );
      setItemsMap(norm as Record<string, Array<{ id: string; content: string }>>);
    } catch {
      setItemsMap({});
    }
  }, [itemsKey, loaded]);

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
    if (!isOpen && !showListModal) return;
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
    } catch {}
  }, [itemsKey, isOpen, showListModal]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateNode = (nodes: FolderNode[], id: string, updater: (n: FolderNode) => FolderNode | null): FolderNode[] => {
    const loop = (arr: FolderNode[]): FolderNode[] =>
      arr
        .map((n) => {
          if (n.id === id) {
            const res = updater(n);
            return res;
          }
          const children = loop(n.children);
          return { ...n, children };
        })
        .filter(Boolean) as FolderNode[];
    return loop(nodes);
  };

  const removeNode = (nodes: FolderNode[], id: string): FolderNode[] => {
    const loop = (arr: FolderNode[]): FolderNode[] =>
      arr.filter((n) => n.id !== id).map((n) => ({ ...n, children: loop(n.children) }));
    return loop(nodes);
  };

  const renderNode = (node: FolderNode, depth = 0): React.ReactNode => {
    return (
      <div key={node.id} className={depth ? 'pl-2 border-l border-dashed border-gray-300 ml-2' : ''}>
        <div
          className="relative flex items-center justify-between gap-1 p-1 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all duration-200 group"
          onClick={() => toggleNode(node.id)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
              <HiFolder className="w-3 h-3" />
            </div>
            <span className="text-sm font-semibold text-purple-600 truncate">{node.name}</span>
            {(itemsMap[node.id]?.length || 0) > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
                {itemsMap[node.id]?.length || 0}
              </span>
            )}
            <HiChevronRight
              className={`ml-2 w-4 h-4 text-gray-500 transition-transform duration-300 ${expanded[node.id] ? 'rotate-90' : ''}`}
            />
          </div>
          <button
            className={`cursor-pointer p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 z-10 ${activeMenuId === node.id ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === node.id ? null : node.id);
            }}
          >
            <HiDotsVertical className="w-4 h-4 text-gray-700" />
          </button>
          {activeMenuId === node.id && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                }}
              />
              <div className="absolute top-8 right-0 z-30 w-44 bg-white rounded-md shadow-xl border border-gray-200 py-1">
                <button
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    setRenameTarget({ id: node.id, name: node.name });
                  }}
                >
                  Đổi tên
                </button>
                <button
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    setCreateParentId(node.id);
                    setShowCreateModal(true);
                  }}
                >
                  Thêm thư mục con
                </button>
                <button
                  className="cursor-pointer w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                    setDeleteTarget({ id: node.id, name: node.name });
                  }}
                >
                  Xóa thư mục
                </button>
              </div>
            </>
          )}
        </div>
        {expanded[node.id] && node.children?.length > 0 && (
          <div className="mt-2 space-y-2">{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
        {expanded[node.id] && (itemsMap[node.id]?.length || 0) > 0 && (
          <div className="mt-2 space-y-1 ml-6">
            {itemsMap[node.id]!.map((it, idx) => (
              <button
                key={`${node.id}-msg-${it.id ?? idx}`}
                className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800"
                onClick={(e) => {
                  e.stopPropagation();
                  if (it.id) onJumpToMessage?.(it.id);
                }}
              >
                {it.content || 'Tin nhắn'}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const flattenNodes = (nodes: FolderNode[], depth = 0): Array<{ node: FolderNode; depth: number }> => {
    const res: Array<{ node: FolderNode; depth: number }> = [];
    const walk = (arr: FolderNode[], d: number) => {
      for (const n of arr) {
        res.push({ node: n, depth: d });
        if (n.children?.length) walk(n.children, d + 1);
      }
    };
    walk(nodes, depth);
    return res;
  };

  const renderList = (nodes: FolderNode[], depth = 0): React.ReactNode => {
    return (
      <>
        {nodes.map((n) => (
          <div key={n.id} className="py-1" style={{ paddingLeft: depth * 16 }}>
            <div className="flex items-center justify-between gap-2">
              <button
                className="cursor-pointer flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-gray-50"
                onClick={() => toggleNode(n.id)}
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow">
                  <HiFolder className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-900">{n.name}</span>
                {(itemsMap[n.id]?.length || 0) > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
                    {itemsMap[n.id]?.length || 0}
                  </span>
                )}
                {n.children?.length > 0 && (
                  <HiChevronRight
                    className={`ml-1 w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded[n.id] ? 'rotate-90' : ''}`}
                  />
                )}
              </button>
              <div className="flex items-center">
                <div className="relative">
                  {/* Nút Menu đẹp hơn */}
                  <button
                    onClick={() => setOpenDropdown(openDropdown === n.id ? null : n.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:shadow transition-all duration-200 active:scale-95"
                  >
                    <HiChevronDown
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                        openDropdown === n.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu đẹp lung linh */}
                  {openDropdown === n.id && (
                    <>
                      {/* Overlay mờ để click ngoài đóng menu */}
                      <div className="fixed inset-0 z-0" onClick={() => setOpenDropdown(null)} />

                      <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 z-10 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="py-2">
                          {/* Đổi tên */}
                          <button
                            onClick={() => {
                              setRenameTarget({ id: n.id, name: n.name });
                              setOpenDropdown(null);
                            }}
                            className="flex w-full flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <HiPencil className="w-4 h-4 text-gray-500" />
                            <span>Đổi tên thư mục</span>
                          </button>

                          {/* Thêm con */}
                          <button
                            onClick={() => {
                              setCreateParentId(n.id);
                              setShowCreateModal(true);
                              setOpenDropdown(null);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <HiFolderPlus className="w-4 h-4 text-blue-600" />
                            <span>Thêm thư mục con</span>
                          </button>

                          <hr className="my-2 border-gray-200" />

                          {/* Xóa - nổi bật đỏ */}
                          <button
                            onClick={() => {
                              setDeleteTarget({ id: n.id, name: n.name });
                              setOpenDropdown(null);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <HiTrash className="w-4 h-4" />
                            <span>Xóa thư mục</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {n.children?.length > 0 && expanded[n.id] && (
              <div className="mt-1">{renderList(n.children, depth + 1)}</div>
            )}
            {expanded[n.id] && (itemsMap[n.id]?.length || 0) > 0 && (
              <div className="mt-1 space-y-1" style={{ paddingLeft: (depth + 1) * 16 }}>
                {itemsMap[n.id]!.map((it, idx) => (
                  <button
                    key={`${n.id}-msg-${it.id ?? idx}`}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800"
                    onClick={() => {
                      if (it.id) onJumpToMessage?.(it.id);
                    }}
                  >
                    {it.content || 'Tin nhắn'}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 ">
      <div className="flex items-center justify-between">
        {' '}
        {/* Nếu bạn có wrapper, giữ nguyên */}
        <button
          onClick={onToggle}
          className="group flex items-center justify-between w-full gap-3 rounded-xl px-4 py-3 hover:bg-gray-50/80 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <HiFolder className="w-5 h-5" />
            </div>

            <span className="font-semibold text-gray-800">Folder</span>
          </div>

          <HiChevronRight
            className={`ml-auto w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-gray-600 ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            {/* Nút tạo mới */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0"
            >
              <HiPlus className="w-4 h-4" />
            </button>

            {/* Nút xem thêm */}
            <button
              onClick={() => setShowListModal(true)}
              className="rounded-xl border mr-1 border-gray-200 bg-white/80 px-1.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:shadow-md hover:bg-gray-50/90 hover:border-gray-300 transition-all duration-200 backdrop-blur-sm"
            >
              Xem thêm
            </button>
          </div>
          {folders.length > 0 ? (
            <>
              <div className="space-y-3">{folders.slice(0, 3).map((node) => renderNode(node, 0))}</div>
              {folders.length > 3 && (
                <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-dashed border-gray-300">
                  <span className="text-xs text-gray-600">… còn {folders.length - 3} thư mục khác</span>
                  <button
                    onClick={() => setShowListModal(true)}
                    className="cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Xem thêm
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <div className="bg-gray-100 rounded-2xl w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <HiFolder className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium">Chưa có thư mục nào</p>
              <p className="text-xs mt-1">Nhấn &quot;Tạo thư mục&quot; để bắt đầu</p>
            </div>
          )}

          {showCreateModal && (
            <FolderCreateModal
              isOpen={showCreateModal}
              folders={folders}
              defaultParentId={createParentId || undefined}
              lockParent={!!createParentId}
              onClose={() => {
                setShowCreateModal(false);
                setCreateParentId(null);
              }}
              onCreate={(name, parentId) => {
                const trimmed = name.trim();
                if (!trimmed) return;
                const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const pid = parentId || createParentId || undefined;
                if (pid) {
                  setFolders((prev) =>
                    updateNode(prev, pid, (n) => {
                      const exists = n.children.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                      if (exists) return n;
                      return {
                        ...n,
                        children: [...n.children, { id, name: trimmed, children: [] }],
                      };
                    }),
                  );
                } else {
                  setFolders((prev) => {
                    const exists = prev.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
                    if (exists) return prev;
                    return [...prev, { id, name: trimmed, children: [] }];
                  });
                }
                setShowCreateModal(false);
                setCreateParentId(null);
              }}
            />
          )}

          {renameTarget && (
            <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/50 px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Đổi tên thư mục</h3>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <input
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên mới"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setRenameTarget(null)}
                      className="cursor-pointer px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Huỷ
                    </button>
                    <button
                      onClick={() => {
                        const n = renameInput.trim();
                        if (!n || !renameTarget) return;
                        setFolders((prev) => updateNode(prev, renameTarget.id, (x) => ({ ...x, name: n })));
                        setRenameTarget(null);
                      }}
                      className="cursor-pointer px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {deleteTarget && (
            <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/50 px-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Xóa thư mục</h3>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-gray-700">
                    Bạn có chắc muốn xóa <span className="font-semibold">{deleteTarget.name}</span>?
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="cursor-pointer px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Huỷ
                    </button>
                    <button
                      onClick={() => {
                        if (!deleteTarget) return;
                        setFolders((prev) => removeNode(prev, deleteTarget.id));
                        try {
                          const raw = localStorage.getItem(itemsKey);
                          const map = raw
                            ? (JSON.parse(raw) as Record<string, Array<{ id: string; content: string }>>)
                            : {};
                          const findNode = (arr: FolderNode[], id: string): FolderNode | null => {
                            for (const x of arr) {
                              if (x.id === id) return x;
                              const f = findNode(x.children, id);
                              if (f) return f;
                            }
                            return null;
                          };
                          const target = findNode(folders, deleteTarget.id);
                          const collect = (n: FolderNode): string[] => [n.id, ...n.children.flatMap((c) => collect(c))];
                          const ids = target ? collect(target) : [deleteTarget.id];
                          ids.forEach((k) => delete map[k]);
                          localStorage.setItem(itemsKey, JSON.stringify(map));
                          setItemsMap(map);
                        } catch {}
                        setDeleteTarget(null);
                      }}
                      className="cursor-pointer px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showListModal && (
            <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
              <div
                className="w-full max-w-xl transform overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 
    animate-in fade-in zoom-in-95 duration-300"
              >
                {/* Header */}
                <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Danh sách thư mục</h3>
                      <p className="mt-1 text-sm text-gray-600">Chọn hoặc tạo thư mục mới để lưu trữ</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Nút Tạo thư mục */}
                      <button
                        onClick={() => {
                          setCreateParentId(null);
                          setShowCreateModal(true);
                        }}
                        className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                      >
                        <HiPlus className="w-5 h-5" />
                      </button>

                      {/* Nút Đóng */}
                      <button
                        onClick={() => setShowListModal(false)}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200"
                      >
                        <HiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-8 py-6">
                  {folders.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                      <div className="space-y-1.5">{renderList(folders)}</div>
                    </div>
                  ) : (
                    /* Empty State đẹp lung linh */
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner">
                        <HiFolderOpen className="h-12 w-12 text-blue-500" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-800">Chưa có thư mục nào</h4>
                      <p className="mt-2 text-sm text-gray-500">Bắt đầu bằng cách tạo thư mục đầu tiên của bạn</p>
                      <button
                        onClick={() => {
                          setCreateParentId(null);
                          setShowCreateModal(true);
                        }}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-blue-700 transition-colors"
                      >
                        <HiPlus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
