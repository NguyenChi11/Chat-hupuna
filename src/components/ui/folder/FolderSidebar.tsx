'use client';

import React from 'react';
import { FaFolder } from 'react-icons/fa';
import { HiPlus, HiChevronDown, HiChevronRight, HiDotsVertical } from 'react-icons/hi';
import type { FolderItem, FolderNode, Scope } from '@/types/folderTypes';

function countItems(map: Record<string, FolderItem[]>, id: string) {
  return map[id]?.length || 0;
}

function NodeRow({
  node,
  scope,
  expanded,
  onToggle,
  onSelect,
  itemsMap,
  selectedFolderId,
  onCreateChild,
  onRename,
  onDelete,
  openFolderMenuId,
  setOpenFolderMenuId,
  depth = 0,
}: {
  node: FolderNode;
  scope: Scope;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string | null, scope: Scope) => void;
  itemsMap: Record<string, FolderItem[]>;
  selectedFolderId: string | null;

  onCreateChild: (nodeId: string, scope: Scope) => void;
  onRename: (nodeId: string, name: string, scope: Scope) => void;
  onDelete: (nodeId: string, name: string, scope: Scope) => void;

  openFolderMenuId: string | null;
  setOpenFolderMenuId: (id: string | null) => void;

  depth?: number;
}) {
  const isOpen = !!expanded[node.id];
  const isSelected = String(selectedFolderId || '') === String(node.id);

  return (
    <div className="w-full">
      <div
        className={`cursor-pointer group relative flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-gray-50 ${
          isSelected ? 'bg-indigo-50' : ''
        }`}
        style={{ paddingLeft: 12 + depth * 12 }}
      >
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          aria-label="Toggle"
        >
          {node.children?.length ? (
            isOpen ? (
              <HiChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <HiChevronRight className="h-4 w-4 text-gray-600" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          className="flex flex-1 items-center gap-2 overflow-hidden cursor-pointer"
          onClick={() => onSelect(node.id, scope)}
        >
          <FaFolder className="h-5 w-5 text-gray-500" />
          <span
            className={`truncate text-sm ${isSelected ? 'font-semibold text-indigo-700' : 'font-semibold text-gray-800'}`}
          >
            {node.name}
          </span>
          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
            {countItems(itemsMap, node.id)}
          </span>
        </button>

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setOpenFolderMenuId(openFolderMenuId === node.id ? null : node.id);
          }}
          aria-label="Folder actions"
        >
          <HiDotsVertical className="h-5 w-5 text-gray-600" />
        </button>

        {openFolderMenuId === node.id && (
          <div className="absolute right-2 top-10 z-50 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <button
              className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFolderMenuId(null);
                onCreateChild(node.id, scope);
              }}
            >
              <HiPlus className="h-4 w-4 text-gray-700" />
              <span>Tạo thư mục con</span>
            </button>
            <button
              className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFolderMenuId(null);
                onRename(node.id, node.name, scope);
              }}
            >
              <span className="h-4 w-4 rounded bg-gray-200" />
              <span>Đổi tên</span>
            </button>
            <button
              className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFolderMenuId(null);
                onDelete(node.id, node.name, scope);
              }}
            >
              <span className="h-4 w-4 rounded bg-red-200" />
              <span>Xóa</span>
            </button>
          </div>
        )}
      </div>

      {isOpen && node.children?.length ? (
        <div className="mt-1 space-y-1">
          {node.children.map((c) => (
            <NodeRow
              key={c.id}
              node={c}
              scope={scope}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              itemsMap={itemsMap}
              selectedFolderId={selectedFolderId}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              openFolderMenuId={openFolderMenuId}
              setOpenFolderMenuId={setOpenFolderMenuId}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  onlyGlobal,
}: {
  folders: FolderNode[];
  foldersGlobal: FolderNode[];
  itemsMap: Record<string, FolderItem[]>;
  itemsMapGlobal: Record<string, FolderItem[]>;

  expanded: Record<string, boolean>;
  selectedFolderId: string | null;
  selectedScope: Scope;

  onSelect: (id: string | null, scope: Scope) => void;
  onToggle: (id: string) => void;

  onCreateRoot: (scope: Scope) => void;

  openFolderMenuId: string | null;
  setOpenFolderMenuId: (id: string | null) => void;

  onCreateChild: (nodeId: string, scope: Scope) => void;
  onRename: (nodeId: string, name: string, scope: Scope) => void;
  onDelete: (nodeId: string, name: string, scope: Scope) => void;
  onlyGlobal?: boolean;
}) {
  return (
    <div className="w-full space-y-4">
      {!onlyGlobal && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => onSelect(null, 'room')}
              className={`text-sm font-semibold hover:text-indigo-600 ${
                selectedScope === 'room' ? 'text-indigo-700' : 'text-gray-900'
              }`}
            >
              Phòng hiện tại
            </button>
            <button
              onClick={() => onCreateRoot('room')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <HiPlus className="h-4 w-4" />
              Tạo
            </button>
          </div>
          <div className="space-y-1">
            {folders.map((n) => (
              <NodeRow
                key={n.id}
                node={n}
                scope="room"
                expanded={expanded}
                onToggle={onToggle}
                onSelect={(id) => onSelect(id, 'room')}
                itemsMap={itemsMap}
                selectedFolderId={selectedScope === 'room' ? selectedFolderId : null}
                onCreateChild={onCreateChild}
                onRename={onRename}
                onDelete={onDelete}
                openFolderMenuId={openFolderMenuId}
                setOpenFolderMenuId={setOpenFolderMenuId}
              />
            ))}
            {!folders.length ? <p className="px-2 py-2 text-xs text-gray-500">Chưa có thư mục.</p> : null}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => onSelect(null, 'global')}
            className={`text-sm font-semibold hover:text-indigo-600 ${
              selectedScope === 'global' ? 'text-indigo-700' : 'text-gray-900'
            }`}
          >
            Dùng chung (Global)
          </button>
          <button
            onClick={() => onCreateRoot('global')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
          >
            <HiPlus className="h-4 w-4" />
            Tạo
          </button>
        </div>
        <div className="space-y-1">
          {foldersGlobal.map((n) => (
            <NodeRow
              key={n.id}
              node={n}
              scope="global"
              expanded={expanded}
              onToggle={onToggle}
              onSelect={(id) => onSelect(id, 'global')}
              itemsMap={itemsMapGlobal}
              selectedFolderId={selectedScope === 'global' ? selectedFolderId : null}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              openFolderMenuId={openFolderMenuId}
              setOpenFolderMenuId={setOpenFolderMenuId}
            />
          ))}
          {!foldersGlobal.length ? <p className="px-2 py-2 text-xs text-gray-500">Chưa có thư mục.</p> : null}
        </div>
      </div>
    </div>
  );
}
