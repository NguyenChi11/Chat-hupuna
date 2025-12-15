import { useState } from 'react';
import type { FolderItem, FolderNode, Scope } from '../types/folderTypes';

export function useFolderState() {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, FolderItem[]>>({});

  const [foldersGlobal, setFoldersGlobal] = useState<FolderNode[]>([]);
  const [itemsMapGlobal, setItemsMapGlobal] = useState<Record<string, FolderItem[]>>({});

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<Scope>('room');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return {
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
  };
}
