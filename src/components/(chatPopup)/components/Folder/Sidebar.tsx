'use client';
import React from 'react';
import { HiChevronRight, HiFolder, HiPlus, HiTrash, HiPencil, HiDotsVertical } from 'react-icons/hi';
import { FolderNode } from './types';

type Scope = 'room' | 'global';

type Props = {
  folders: FolderNode[];
  foldersGlobal: FolderNode[];
  itemsMap: Record<
    string,
    Array<{
      id: string;
      content?: string;
      type?: 'image' | 'video' | 'file' | 'text';
      fileUrl?: string;
      fileName?: string;
    }>
  >;
  itemsMapGlobal: Record<
    string,
    Array<{
      id: string;
      content?: string;
      type?: 'image' | 'video' | 'file' | 'text';
      fileUrl?: string;
      fileName?: string;
    }>
  >;
  expanded: Record<string, boolean>;
  selectedFolderId: string | null;
  selectedScope: Scope;
  onSelect: (id: string, scope: Scope) => void;
  onToggle: (id: string) => void;
  onCreateRoot: (scope: Scope) => void;
  openFolderMenuId: string | null;
  setOpenFolderMenuId: (id: string | null) => void;
  onCreateChild: (nodeId: string, scope: Scope) => void;
  onRename: (nodeId: string, name: string, scope: Scope) => void;
  onDelete: (nodeId: string, name: string, scope: Scope) => void;
};

export default function FolderSidebar({
  folders,
  foldersGlobal,
  itemsMap,
  itemsMapGlobal,
  expanded,
  selectedFolderId,
  selectedScope,
  onSelect,
  onToggle,
  onCreateRoot,
  openFolderMenuId,
  setOpenFolderMenuId,
  onCreateChild,
  onRename,
  onDelete,
}: Props) {
  const getItemCount = (nodeId: string, scope: Scope): number => {
    const map = scope === 'room' ? itemsMap : itemsMapGlobal;
    return map[nodeId]?.length || 0;
  };

  const renderSidebarNode = (node: FolderNode, depth = 0, scope: Scope): React.ReactNode => {
    const isSelected = selectedFolderId === node.id && selectedScope === scope;
    const isExpanded = expanded[node.id];
    const hasChildren = node.children?.length > 0;
    const itemCount = getItemCount(node.id, scope);

    return (
      <div key={node.id} className="group/select relative">
        {/* Folder Row */}
        <div
          className={`flex items-center rounded-lg transition-all duration-200 my-0.5 ${
            isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'
          }`}
        >
          {/* Indent */}
          <div style={{ width: `${depth * 20}px` }} className="flex-shrink-0" />

          {/* Main Clickable Area */}
          <button onClick={() => onSelect(node.id, scope)} className="flex flex-1 items-center gap-3 py-2 pr-2 min-w-0">
            {/* Expand/Collapse Chevron */}
            {hasChildren ? (
              <HiChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
              />
            ) : (
              <div className="w-4 h-4" />
            )}

            {/* Folder Icon */}
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <HiFolder className="w-5 h-5" />
            </div>

            {/* Folder Name */}
            <span className="text-sm font-medium text-gray-800 truncate">{node.name}</span>

            {/* Item Count Badge */}
            {itemCount > 0 && (
              <span className="ml-auto mr-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                {itemCount}
              </span>
            )}
          </button>

          {/* More Actions Button (visible on hover or when menu open) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenFolderMenuId(openFolderMenuId === node.id ? null : node.id);
            }}
            className={`mr-2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all opacity-0 group-hover/select:opacity-100 ${
              openFolderMenuId === node.id ? 'opacity-100 bg-gray-200 text-gray-700' : ''
            }`}
            aria-label="Mở menu thư mục"
          >
            <HiDotsVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Context Menu */}
        {openFolderMenuId === node.id && (
          <div
            className="absolute top-full left-10 z-50 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ marginLeft: `${depth * 20}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onCreateChild(node.id, scope);
                setOpenFolderMenuId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <HiPlus className="w-4 h-4 text-gray-500" />
              Thêm thư mục con
            </button>
            <button
              onClick={() => {
                onRename(node.id, node.name, scope);
                setOpenFolderMenuId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <HiPencil className="w-4 h-4 text-gray-500" />
              Đổi tên thư mục
            </button>
            <hr className="my-2 border-gray-200" />
            <button
              onClick={() => {
                onDelete(node.id, node.name, scope);
                setOpenFolderMenuId(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <HiTrash className="w-4 h-4" />
              Xóa thư mục
            </button>
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="mt-1">{node.children.map((child) => renderSidebarNode(child, depth + 1, scope))}</div>
        )}
      </div>
    );
  };

  const FolderSection = ({ title, scope, folderList }: { title: string; scope: Scope; folderList: FolderNode[] }) => (
    <div className="flex flex-col  min-h-0 h-[17rem]">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        <button
          onClick={() => onCreateRoot(scope)}
          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow"
          aria-label={`Tạo thư mục mới - ${title}`}
        >
          <HiPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 -mx-4 ">
        {folderList.length > 0 ? (
          <div className="space-y-1 pb-4 h-[10vh]">{folderList.map((node) => renderSidebarNode(node, 0, scope))}</div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-12">Chưa có thư mục nào</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 py-6">
      {/* Global Folders */}
      <FolderSection title="Thư mục chung" scope="global" folderList={foldersGlobal} />

      {/* Divider */}
      <div className="mx-6 my-5 border-t border-gray-300" />

      {/* Room Folders */}
      <FolderSection title="Chỉ trong phòng này" scope="room" folderList={folders} />
    </div>
  );
}
