'use client';

import React from 'react';

export default function RenameModal({
  open,
  name,
  onChangeName,
  onCancel,
  onSave,
}: {
  open: boolean;
  name: string;
  onChangeName: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">Đổi tên thư mục</h3>
        <input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          placeholder="Tên mới..."
          autoFocus
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={onSave}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
