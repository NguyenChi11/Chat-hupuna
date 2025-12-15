'use client';
import React from 'react';

type Props = {
  open: boolean;
  name: string;
  onChangeName: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function RenameModal({ open, name, onChangeName, onCancel, onSave }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Đổi tên thư mục</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <input
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tên mới"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700">Hủy</button>
            <button onClick={onSave} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Lưu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

