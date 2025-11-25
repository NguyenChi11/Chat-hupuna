import React from 'react';

interface RenameGroupModalProps {
  isOpen: boolean;
  renameInput: string;
  onChangeInput: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function RenameGroupModal({
  isOpen,
  renameInput,
  onChangeInput,
  onClose,
  onSubmit,
}: RenameGroupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Đổi tên nhóm</h3>
        <p className="text-xs text-gray-500 mb-3">
          Nhập tên mới cho nhóm chat. Tên nhóm sẽ được cập nhật cho tất cả thành viên.
        </p>
        <input
          type="text"
          value={renameInput}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          autoFocus
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 mb-4"
          placeholder="Nhập tên nhóm mới"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={!renameInput.trim()}
            onClick={onSubmit}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
