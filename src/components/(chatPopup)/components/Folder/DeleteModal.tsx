'use client';
import React from 'react';

type Props = {
  open: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteModal({ open, name, onCancel, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Xóa thư mục</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm">Bạn có chắc muốn xóa {name}?</p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700">Hủy</button>
            <button onClick={onConfirm} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Xóa</button>
          </div>
        </div>
      </div>
    </div>
  );
}

