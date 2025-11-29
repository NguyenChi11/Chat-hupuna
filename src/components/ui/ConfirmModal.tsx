import React from 'react';
import { HiX, HiLogout } from 'react-icons/hi';
import { HiExclamationTriangle } from 'react-icons/hi2';

export const ConfirmModal: React.FC<{
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string; // Tùy chọn: "Xóa", "Rời nhóm", "Đăng xuất"...
  variant?: 'danger' | 'warning'; // Màu nút xác nhận
}> = ({ title, message, onCancel, onConfirm, confirmText = 'Xác nhận', variant = 'danger' }) => {
  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với icon cảnh báo + nút đóng */}
        <div className="relative px-8 pt-10 pb-6 text-center">
          <button
            onClick={onCancel}
            className="absolute top-4 cursor-pointer right-4 p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
          >
            <HiX className="w-5 h-5 text-gray-600" />
          </button>

          {/* Icon cảnh báo lớn */}
          <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-5">
            {isDanger ? (
              <HiExclamationTriangle className="w-12 h-12 text-red-600" />
            ) : (
              <HiExclamationTriangle className="w-12 h-12 text-yellow-600" />
            )}
          </div>

          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        </div>

        {/* Nội dung */}
        <div className="px-8 pb-8">
          <p className="text-gray-600 text-center text-lg leading-relaxed">{message}</p>
        </div>

        {/* Footer - Nút hành động */}
        <div className="flex gap-4 px-8 pb-8">
          <button
            onClick={onCancel}
            className="flex-1 cursor-pointer py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-lg rounded-2xl transition-all duration-200 active:scale-95 shadow-md"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 cursor-pointer py-4 font-bold text-lg rounded-2xl shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3
              ${
                isDanger
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-300'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-orange-300'
              }`}
          >
            {confirmText === 'Đăng xuất' && <HiLogout className="w-6 h-6" />}
            {confirmText.includes('Xóa') && <HiExclamationTriangle className="w-6 h-6" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
