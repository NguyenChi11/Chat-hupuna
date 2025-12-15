import { useEffect, useRef } from 'react';
import io, { type Socket } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import { FolderNode } from '@/types/folderTypes';

export function useFolderSocket({
  roomId,
  onTreeUpdate,
  onItemUpdate,
}: {
  roomId: string;
  onTreeUpdate: (folders: FolderNode[]) => void;
  onItemUpdate: (folderId: string, items: FolderNode[]) => void;
}) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const s = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
    socketRef.current = s;

    s.emit('join_room', roomId);

    s.on('folder_tree_updated', (data: { roomId?: unknown; folders?: FolderNode[] }) => {
      if (String(data?.roomId) !== String(roomId)) return;
      onTreeUpdate(Array.isArray(data?.folders) ? (data.folders as FolderNode[]) : []);
    });

    s.on('folder_item_updated', (data: { roomId?: unknown; folderId?: unknown; items?: FolderNode[] }) => {
      if (String(data?.roomId) !== String(roomId)) return;
      const fid = String(data?.folderId || '');
      onItemUpdate(fid, Array.isArray(data?.items) ? (data.items as FolderNode[]) : []);
    });

    return () => {
      try {
        s.disconnect();
      } catch {}
    };
  }, [roomId, onTreeUpdate, onItemUpdate]);

  return socketRef;
}
