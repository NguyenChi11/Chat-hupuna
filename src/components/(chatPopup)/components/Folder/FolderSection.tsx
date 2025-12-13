// 'use client';
// import FolderCreateModal from '@/components/(chatPopup)/components/Folder/FolderCreateModal';
// import React, { useEffect, useMemo, useState, useRef } from 'react';
// import {
//   HiChevronRight,
//   HiFolder,
//   HiPlus,
//   HiDotsVertical,
//   HiFolderOpen,
//   HiX,
//   HiTrash,
//   HiPencil,
//   HiChevronDown,
// } from 'react-icons/hi';
// import { HiFolderPlus } from 'react-icons/hi2';
// import ItemDropdownMenu from '@/components/(chatPopup)/components/ItemDropdownMenu';
// import Image from 'next/image';
// import { getProxyUrl, resolveSocketUrl } from '@/utils/utils';
// import io, { type Socket } from 'socket.io-client';
// import { useChatContext } from '@/context/ChatContext';
// import { HiDocumentText, HiLink, HiPlay } from 'react-icons/hi';

// export interface FolderNode {
//   id: string;
//   name: string;
//   children: FolderNode[];
// }

// interface FolderSectionProps {
//   isOpen: boolean;
//   onToggle: () => void;
//   roomId: string;
//   activeMenuId: string | null;
//   setActiveMenuId: (id: string | null) => void;
//   onJumpToMessage?: (messageId: string) => void;
// }

// export default function FolderSection({
//   isOpen,
//   onToggle,
//   roomId,
//   activeMenuId,
//   setActiveMenuId,
//   onJumpToMessage,
// }: FolderSectionProps) {
//   const { messages } = useChatContext();
//   const storageKey = useMemo(() => `chatFolders:${roomId}`, [roomId]);
//   const itemsKey = useMemo(() => `chatFolderItems:${roomId}`, [roomId]);
//   const [folders, setFolders] = useState<FolderNode[]>([]);
//   const [itemsMap, setItemsMap] = useState<
//     Record<
//       string,
//       Array<{
//         id: string;
//         content?: string;
//         type?: 'image' | 'video' | 'file' | 'text';
//         fileUrl?: string;
//         fileName?: string;
//       }>
//     >
//   >({});
//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [showListModal, setShowListModal] = useState(false);
//   const [createParentId, setCreateParentId] = useState<string | null>(null);
//   const [expanded, setExpanded] = useState<Record<string, boolean>>({});
//   const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
//   const [renameInput, setRenameInput] = useState('');
//   const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
//   const [loaded, setLoaded] = useState(false);
//   const [openDropdown, setOpenDropdown] = useState<string | null>(null);
//   const socketRef = useRef<Socket | null>(null);

//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem(storageKey);
//       setFolders(raw ? JSON.parse(raw) : []);
//     } catch {
//       setFolders([]);
//     }
//     setLoaded(true);
//   }, [storageKey]);

//   useEffect(() => {
//     const s = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
//     socketRef.current = s;
//     if (roomId) s.emit('join_room', roomId);
//     s.on(
//       'folder_item_updated',
//       (data: { roomId?: unknown; folderId?: unknown; items?: Array<{ id: string; content: string }> }) => {
//         if (String(data?.roomId) !== String(roomId)) return;
//         const fid = String(data?.folderId || '');
//         const arr = Array.isArray(data?.items) ? data.items : [];
//         setItemsMap((prev) => ({ ...prev, [fid]: arr }));
//         try {
//           const raw = localStorage.getItem(itemsKey);
//           const map = raw ? JSON.parse(raw) : {};
//           map[fid] = arr;
//           localStorage.setItem(itemsKey, JSON.stringify(map));
//         } catch {}
//       },
//     );
//     s.on('folder_tree_updated', (data: { roomId?: unknown; folders?: FolderNode[] }) => {
//       if (String(data?.roomId) !== String(roomId)) return;
//       const next = Array.isArray(data?.folders) ? data.folders : [];
//       setFolders(next);
//       try {
//         localStorage.setItem(storageKey, JSON.stringify(next));
//       } catch {}
//     });
//     return () => {
//       try {
//         s.disconnect();
//       } catch {}
//     };
//   }, [roomId]);

//   useEffect(() => {
//     if (!loaded) return;
//     try {
//       localStorage.setItem(storageKey, JSON.stringify(folders));
//     } catch {}
//   }, [folders, storageKey, loaded]);

//   useEffect(() => {
//     setRenameInput(renameTarget?.name || '');
//   }, [renameTarget]);

//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem(itemsKey);
//       const parsed = raw ? JSON.parse(raw) : {};
//       const norm = Object.fromEntries(
//         Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
//           k,
//           Array.isArray(v)
//             ? v
//                 .map((it: unknown) =>
//                   typeof it === 'string' ? { id: it, content: '' } : (it as { id: string; content: string }),
//                 )
//                 .filter((x: { id: string; content: string }) => x && typeof x.id === 'string' && x.id)
//             : [],
//         ]),
//       );
//       setItemsMap(norm as Record<string, Array<{ id: string; content: string }>>);
//     } catch {
//       setItemsMap({});
//     }
//   }, [itemsKey, loaded]);

//   useEffect(() => {
//     const handler = (e: Event) => {
//       const anyE = e as unknown as { detail?: { roomId?: string } };
//       const d = anyE.detail;
//       if (!d || d.roomId !== roomId) return;
//       try {
//         const raw = localStorage.getItem(itemsKey);
//         setItemsMap(raw ? JSON.parse(raw) : {});
//       } catch {}
//     };
//     window.addEventListener('chatFolderItemsChanged' as unknown as string, handler);
//     return () => window.removeEventListener('chatFolderItemsChanged' as unknown as string, handler);
//   }, [roomId, itemsKey]);

//   useEffect(() => {
//     if (!isOpen && !showListModal) return;
//     try {
//       const raw = localStorage.getItem(itemsKey);
//       const parsed = raw ? JSON.parse(raw) : {};
//       const norm = Object.fromEntries(
//         Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
//           k,
//           Array.isArray(v)
//             ? v
//                 .map((it: unknown) =>
//                   typeof it === 'string' ? { id: it, content: '' } : (it as { id: string; content: string }),
//                 )
//                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                 .filter((x: any) => x && typeof x.id === 'string' && x.id)
//             : [],
//         ]),
//       );
//       setItemsMap(norm as Record<string, Array<{ id: string; content: string }>>);
//     } catch {}
//   }, [itemsKey, isOpen, showListModal]);

//   const toggleNode = (id: string) => {
//     setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
//   };

//   const updateNode = (nodes: FolderNode[], id: string, updater: (n: FolderNode) => FolderNode | null): FolderNode[] => {
//     const loop = (arr: FolderNode[]): FolderNode[] =>
//       arr
//         .map((n) => {
//           if (n.id === id) {
//             const res = updater(n);
//             return res;
//           }
//           const children = loop(n.children);
//           return { ...n, children };
//         })
//         .filter(Boolean) as FolderNode[];
//     return loop(nodes);
//   };

//   const removeNode = (nodes: FolderNode[], id: string): FolderNode[] => {
//     const loop = (arr: FolderNode[]): FolderNode[] =>
//       arr.filter((n) => n.id !== id).map((n) => ({ ...n, children: loop(n.children) }));
//     return loop(nodes);
//   };

//   const renderNode = (node: FolderNode, depth = 0): React.ReactNode => {
//     return (
//       <div key={node.id} className={depth ? 'pl-2 border-l border-dashed border-gray-300 ml-2' : ''}>
//         <div
//           className="relative flex items-center justify-between gap-1 p-1 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all duration-200 group"
//           onClick={() => toggleNode(node.id)}
//         >
//           <div className="flex items-center gap-3">
//             <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
//               <HiFolder className="w-3 h-3" />
//             </div>
//             <span className="text-sm font-semibold text-purple-600 truncate">{node.name}</span>
//             {(itemsMap[node.id]?.length || 0) > 0 && (
//               <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
//                 {itemsMap[node.id]?.length || 0}
//               </span>
//             )}
//             <HiChevronRight
//               className={`ml-2 w-4 h-4 text-gray-500 transition-transform duration-300 ${expanded[node.id] ? 'rotate-90' : ''}`}
//             />
//           </div>
//           <button
//             className={`cursor-pointer p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 z-10 ${activeMenuId === node.id ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setActiveMenuId(activeMenuId === node.id ? null : node.id);
//             }}
//           >
//             <HiDotsVertical className="w-4 h-4 text-gray-700" />
//           </button>
//           {activeMenuId === node.id && (
//             <>
//               <div
//                 className="fixed inset-0 z-20"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setActiveMenuId(null);
//                 }}
//               />
//               <div className="absolute top-8 right-0 z-30 w-44 bg-white rounded-md shadow-xl border border-gray-200 py-1">
//                 <button
//                   className="cursor-pointer w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setActiveMenuId(null);
//                     setRenameTarget({ id: node.id, name: node.name });
//                   }}
//                 >
//                   Đổi tên
//                 </button>
//                 <button
//                   className="cursor-pointer w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setActiveMenuId(null);
//                     setCreateParentId(node.id);
//                     setShowCreateModal(true);
//                   }}
//                 >
//                   Thêm thư mục con
//                 </button>
//                 <button
//                   className="cursor-pointer w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setActiveMenuId(null);
//                     setDeleteTarget({ id: node.id, name: node.name });
//                   }}
//                 >
//                   Xóa thư mục
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//         {expanded[node.id] && node.children?.length > 0 && (
//           <div className="mt-2 space-y-2">{node.children.map((c) => renderNode(c, depth + 1))}</div>
//         )}
//         {expanded[node.id] && (itemsMap[node.id]?.length || 0) > 0 && (
//           <div className="mt-2 space-y-2 ml-6">
//             {itemsMap[node.id]!.map((it, idx) => renderFolderItem(it, idx, node.id))}
//           </div>
//         )}
//       </div>
//     );
//   };

//   const flattenNodes = (nodes: FolderNode[], depth = 0): Array<{ node: FolderNode; depth: number }> => {
//     const res: Array<{ node: FolderNode; depth: number }> = [];
//     const walk = (arr: FolderNode[], d: number) => {
//       for (const n of arr) {
//         res.push({ node: n, depth: d });
//         if (n.children?.length) walk(n.children, d + 1);
//       }
//     };
//     walk(nodes, depth);
//     return res;
//   };

//   const renderList = (nodes: FolderNode[], depth = 0): React.ReactNode => {
//     return (
//       <>
//         {nodes.map((n) => (
//           <div key={n.id} className="py-1" style={{ paddingLeft: depth * 16 }}>
//             <div className="flex items-center justify-between gap-2">
//               <button
//                 className="cursor-pointer flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-gray-50"
//                 onClick={() => toggleNode(n.id)}
//               >
//                 <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow">
//                   <HiFolder className="w-4 h-4" />
//                 </div>
//                 <span className="text-sm font-medium text-gray-900">{n.name}</span>
//                 {(itemsMap[n.id]?.length || 0) > 0 && (
//                   <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
//                     {itemsMap[n.id]?.length || 0}
//                   </span>
//                 )}
//                 {n.children?.length > 0 && (
//                   <HiChevronRight
//                     className={`ml-1 w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded[n.id] ? 'rotate-90' : ''}`}
//                   />
//                 )}
//               </button>
//               <div className="flex items-center">
//                 <div className="relative">
//                   {/* Nút Menu đẹp hơn */}
//                   <button
//                     onClick={() => setOpenDropdown(openDropdown === n.id ? null : n.id)}
//                     className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 hover:bg-gray-50 hover:shadow transition-all duration-200 active:scale-95"
//                   >
//                     <HiChevronDown
//                       className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
//                         openDropdown === n.id ? 'rotate-180' : ''
//                       }`}
//                     />
//                   </button>

//                   {/* Dropdown Menu đẹp lung linh */}
//                   {openDropdown === n.id && (
//                     <>
//                       {/* Overlay mờ để click ngoài đóng menu */}
//                       <div className="fixed inset-0 z-0" onClick={() => setOpenDropdown(null)} />

//                       <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 z-10 animate-in slide-in-from-top-2 fade-in duration-200">
//                         <div className="py-2">
//                           {/* Đổi tên */}
//                           <button
//                             onClick={() => {
//                               setRenameTarget({ id: n.id, name: n.name });
//                               setOpenDropdown(null);
//                             }}
//                             className="flex w-full flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
//                           >
//                             <HiPencil className="w-4 h-4 text-gray-500" />
//                             <span>Đổi tên thư mục</span>
//                           </button>

//                           {/* Thêm con */}
//                           <button
//                             onClick={() => {
//                               setCreateParentId(n.id);
//                               setShowCreateModal(true);
//                               setOpenDropdown(null);
//                             }}
//                             className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
//                           >
//                             <HiFolderPlus className="w-4 h-4 text-blue-600" />
//                             <span>Thêm thư mục con</span>
//                           </button>

//                           <hr className="my-2 border-gray-200" />

//                           {/* Xóa - nổi bật đỏ */}
//                           <button
//                             onClick={() => {
//                               setDeleteTarget({ id: n.id, name: n.name });
//                               setOpenDropdown(null);
//                             }}
//                             className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
//                           >
//                             <HiTrash className="w-4 h-4" />
//                             <span>Xóa thư mục</span>
//                           </button>
//                         </div>
//                       </div>
//                     </>
//                   )}
//                 </div>
//               </div>
//             </div>
//             {n.children?.length > 0 && expanded[n.id] && (
//               <div className="mt-1">{renderList(n.children, depth + 1)}</div>
//             )}
//             {expanded[n.id] && (itemsMap[n.id]?.length || 0) > 0 && (
//               <div className="mt-1 space-y-2" style={{ paddingLeft: (depth + 1) * 16 }}>
//                 {itemsMap[n.id]!.map((it, idx) => renderFolderItem(it, idx, n.id))}
//               </div>
//             )}
//           </div>
//         ))}
//       </>
//     );
//   };

//   const renderFolderItem = (
//     it: {
//       id: string;
//       content?: string;
//       type?: 'image' | 'video' | 'file' | 'text';
//       fileUrl?: string;
//       fileName?: string;
//     },
//     idx: number,
//     folderId: string,
//   ): React.ReactNode => {
//     const msg = messages.find((m) => String(m._id) === String(it.id));
//     if (!msg) {
//       const openMenuId = String(it.id || idx);
//       const kind = it.type;
//       const url = String(it.fileUrl || it.content || '');
//       if (kind === 'image' || kind === 'video') {
//         return (
//           <div
//             key={`media-${it.id ?? idx}`}
//             className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 w-36 h-36"
//             onClick={() => url && window.open(url, '_blank')}
//           >
//             {kind === 'video' ? (
//               <video src={getProxyUrl(url)} className="w-36 h-36 object-cover pointer-events-none" preload="metadata" />
//             ) : String(url).startsWith('blob:') ? (
//               <img src={String(url)} alt="Media" className="w-36 h-36 object-cover" />
//             ) : (
//               <Image width={200} height={200} src={getProxyUrl(url)} alt="Media" className="w-36 h-36 object-cover" />
//             )}
//             <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
//               {kind === 'video' && <HiPlay className="w-10 h-10 text-white drop-shadow-lg" />}
//             </div>
//             <ItemDropdownMenu
//               itemUrl={url}
//               itemId={openMenuId}
//               fileName={it.fileName}
//               activeMenuId={activeMenuId}
//               onClose={() => setActiveMenuId(null)}
//               onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//               onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//             />
//           </div>
//         );
//       }
//       if (kind === 'file') {
//         return (
//           <div
//             key={`file-${it.id ?? idx}`}
//             className="relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-blue-300"
//             onClick={() => url && window.open(url, '_blank')}
//           >
//             <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
//               <HiDocumentText className="w-4 h-4" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
//                 {it.fileName || 'Tệp đính kèm'}
//               </p>
//               {it.fileName && (
//                 <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
//                   .{String(it.fileName).split('.').pop()}
//                 </p>
//               )}
//             </div>
//             <ItemDropdownMenu
//               itemUrl={url}
//               itemId={openMenuId}
//               fileName={it.fileName}
//               activeMenuId={activeMenuId}
//               onClose={() => setActiveMenuId(null)}
//               onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//               onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//             />
//           </div>
//         );
//       }
//       const linkMatch = (it.content || '').match(/(https?:\/\/|www\.)\S+/i);
//       if (kind === 'text' && linkMatch) {
//         const raw = linkMatch[0];
//         const href = raw.startsWith('http') ? raw : `https://${raw}`;
//         let hostname = 'Website';
//         try {
//           hostname = new URL(href).hostname.replace('www.', '');
//         } catch {}
//         return (
//           <div
//             key={`link-${it.id ?? idx}`}
//             className="relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-purple-300"
//             onClick={() => window.open(href, '_blank')}
//           >
//             <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
//               <HiLink className="w-4 h-4" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-sm font-semibold text-purple-600 truncate group-hover:underline transition-all">
//                 {raw}
//               </p>
//               <p className="text-xs text-gray-500 mt-1 font-medium">{hostname}</p>
//             </div>
//             <ItemDropdownMenu
//               itemUrl={href}
//               itemId={openMenuId}
//               activeMenuId={activeMenuId}
//               onClose={() => setActiveMenuId(null)}
//               onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//               onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//             />
//           </div>
//         );
//       }
//       return (
//         <div
//           key={`fallback-${it.id ?? idx}`}
//           className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800"
//           onClick={() => {
//             if (it.id) onJumpToMessage?.(String(it.id));
//           }}
//         >
//           <div className="flex-1 min-w-0">
//             <p className="truncate">{it.content || 'Tin nhắn'}</p>
//           </div>
//           <ItemDropdownMenu
//             itemUrl={String(it.content || '')}
//             itemId={openMenuId}
//             activeMenuId={activeMenuId}
//             onClose={() => setActiveMenuId(null)}
//             onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//             onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//           />
//         </div>
//       );
//     }

//     const openMenuId = String(msg._id);
//     const fileUrl = String(msg.fileUrl || msg.previewUrl || '');

//     if (msg.type === 'image' || msg.type === 'video') {
//       return (
//         <div
//           key={`media-${msg._id}`}
//           className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-gray-100 w-36 h-36"
//           onClick={() => onJumpToMessage?.(String(msg._id))}
//         >
//           {msg.type === 'video' ? (
//             <video
//               src={getProxyUrl(fileUrl)}
//               className="w-36 h-36 object-cover pointer-events-none"
//               preload="metadata"
//             />
//           ) : (
//             <Image width={200} height={200} src={getProxyUrl(fileUrl)} alt="Media" className="w-36 h-36 object-cover" />
//           )}
//           <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
//             {msg.type === 'video' && <HiPlay className="w-10 h-10 text-white drop-shadow-lg" />}
//           </div>
//           <button
//             className={`cursor-pointer absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 z-10 ${activeMenuId === openMenuId ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setActiveMenuId(activeMenuId === openMenuId ? null : openMenuId);
//             }}
//           >
//             <HiDotsVertical className="w-4 h-4 text-gray-700" />
//           </button>
//           <ItemDropdownMenu
//             itemUrl={fileUrl}
//             itemId={openMenuId}
//             fileName={msg.fileName}
//             activeMenuId={activeMenuId}
//             onClose={() => setActiveMenuId(null)}
//             onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//             onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//           />
//         </div>
//       );
//     }

//     if (msg.type === 'file') {
//       return (
//         <div
//           key={`file-${msg._id}`}
//           className="relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-blue-300"
//           onClick={() => onJumpToMessage?.(String(msg._id))}
//         >
//           <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg">
//             <HiDocumentText className="w-4 h-4" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
//               {msg.fileName || 'Tệp đính kèm'}
//             </p>
//             {msg.fileName && (
//               <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
//                 .{String(msg.fileName).split('.').pop()}
//               </p>
//             )}
//           </div>
//           <button
//             className={`cursor-pointer p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 z-10 ${activeMenuId === openMenuId ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
//             onClick={(e) => {
//               e.stopPropagation();
//               setActiveMenuId(activeMenuId === openMenuId ? null : openMenuId);
//             }}
//           >
//             <HiDotsVertical className="w-4 h-4 text-gray-700" />
//           </button>
//           <ItemDropdownMenu
//             itemUrl={fileUrl}
//             itemId={openMenuId}
//             fileName={msg.fileName}
//             activeMenuId={activeMenuId}
//             onClose={() => setActiveMenuId(null)}
//             onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//             onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//           />
//         </div>
//       );
//     }

//     if (msg.type === 'text') {
//       const linkMatch = (msg.content || '').match(/(https?:\/\/|www\.)\S+/i);
//       if (linkMatch) {
//         const raw = linkMatch[0];
//         const href = raw.startsWith('http') ? raw : `https://${raw}`;
//         let hostname = 'Website';
//         try {
//           hostname = new URL(href).hostname.replace('www.', '');
//         } catch {}
//         return (
//           <div
//             key={`link-${msg._id}`}
//             className="relative flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 group cursor-pointer border border-gray-200 hover:border-purple-300"
//             onClick={() => window.open(href, '_blank')}
//           >
//             <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow-lg">
//               <HiLink className="w-4 h-4" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-sm font-semibold text-purple-600 truncate group-hover:underline transition-all">
//                 {raw}
//               </p>
//               <p className="text-xs text-gray-500 mt-1 font-medium">{hostname}</p>
//             </div>
//             <button
//               className={`cursor-pointer p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 z-10 ${activeMenuId === openMenuId ? 'opacity-100 ring-2 ring-purple-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setActiveMenuId(activeMenuId === openMenuId ? null : openMenuId);
//               }}
//             >
//               <HiDotsVertical className="w-4 h-4 text-gray-700" />
//             </button>
//             <ItemDropdownMenu
//               itemUrl={href}
//               itemId={openMenuId}
//               activeMenuId={activeMenuId}
//               onClose={() => setActiveMenuId(null)}
//               onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//               onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//             />
//           </div>
//         );
//       }
//     }

//     const openMenuIdText = String(msg._id);
//     return (
//       <div
//         key={`text-${msg._id}`}
//         className="relative flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm text-gray-800"
//         onClick={() => onJumpToMessage?.(String(msg._id))}
//       >
//         <div className="flex-1 min-w-0">
//           <p className="truncate">{String(msg.content || it.content || 'Tin nhắn')}</p>
//         </div>
//         <button
//           className={`cursor-pointer p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all duration-200 z-10 ${activeMenuId === openMenuIdText ? 'opacity-100 ring-2 ring-blue-500' : 'opacity-0 group-hover:opacity-100'} hover:bg-white hover:scale-110`}
//           onClick={(e) => {
//             e.stopPropagation();
//             setActiveMenuId(activeMenuId === openMenuIdText ? null : openMenuIdText);
//           }}
//         >
//           <HiDotsVertical className="w-4 h-4 text-gray-700" />
//         </button>
//         <ItemDropdownMenu
//           itemUrl=""
//           itemId={openMenuIdText}
//           activeMenuId={activeMenuId}
//           onClose={() => setActiveMenuId(null)}
//           onJumpToMessage={(mid) => onJumpToMessage?.(mid)}
//           onRemoveFromFolder={(mid) => removeItemFromFolder(folderId, mid)}
//         />
//       </div>
//     );
//   };

//   const removeItemFromFolder = (folderId: string, messageId: string) => {
//     try {
//       const raw = localStorage.getItem(itemsKey);
//       const map = raw ? (JSON.parse(raw) as Record<string, Array<{ id: string; content: string }>>) : {};
//       const arr = Array.isArray(map[folderId]) ? map[folderId] : [];
//       const next = arr.filter((x) => String(x.id) !== String(messageId));
//       map[folderId] = next;
//       localStorage.setItem(itemsKey, JSON.stringify(map));
//       setItemsMap((prev) => ({ ...prev, [folderId]: next }));
//       try {
//         const ev = new CustomEvent('chatFolderItemsChanged', {
//           detail: { roomId, folderId, messageId, action: 'remove' },
//         });
//         window.dispatchEvent(ev);
//       } catch {}
//       try {
//         socketRef.current?.emit('folder_item_updated', { roomId, folderId, items: next });
//       } catch {}
//       try {
//         fetch('/api/folders', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ action: 'removeItem', roomId, folderId, messageId }),
//         }).catch(() => {});
//       } catch {}
//     } catch {}
//   };
// }
