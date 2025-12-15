'use client';

import React, { useMemo, useState } from 'react';
import type { FolderNode } from '@/types/folderTypes';
import { flatten } from '@/utils/folderHelpers';

export default function FolderCreateModal({
  isOpen,
  folders,
  defaultParentId,
  lockParent,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  folders: FolderNode[];
  defaultParentId?: string;
  lockParent?: boolean;
  onClose: () => void;
  onCreate: (name: string, parentId?: string) => void;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>(defaultParentId || 'root');

  const options = useMemo(() => flatten(folders), [folders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">Tạo thư mục</h3>

        <div className="mt-3 space-y-2">
          <label className="block text-xs font-semibold text-gray-700">Tên thư mục</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="Ví dụ: Media, Docs..."
            autoFocus
          />

          <label className="mt-3 block text-xs font-semibold text-gray-700">Thư mục cha</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            disabled={!!lockParent}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-gray-50"
          >
            <option value="root">Gốc</option>
            {options.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) return;
              onCreate(trimmed, parentId === 'root' ? undefined : parentId);
              setName('');
            }}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Tạo
          </button>
        </div>
      </div>
    </div>
  );
}
