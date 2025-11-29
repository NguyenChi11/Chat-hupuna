import React from 'react';
import { HiX, HiTrash } from 'react-icons/hi';
import { HiOutlineUserMinus } from 'react-icons/hi2';

type ConfirmAction = 'leave' | 'disband' | null;

interface ConfirmGroupActionModalProps {
  confirmAction: ConfirmAction;
  onCancel: () => void;
  onConfirmLeave: () => void;
  onConfirmDisband: () => void;
}

export default function ConfirmGroupActionModal({
  confirmAction,
  onCancel,
  onConfirmLeave,
  onConfirmDisband,
}: ConfirmGroupActionModalProps) {
  if (!confirmAction) return null;

  const isLeave = confirmAction === 'leave';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header với icon + nút đóng */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <button
            onClick={onCancel}
            className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
          >
            <HiX className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm mb-3">
              {isLeave ? <HiOutlineUserMinus className="w-10 h-10" /> : <HiTrash className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-bold">{isLeave ? 'Rời khỏi nhóm?' : 'Giải tán nhóm?'}</h3>
          </div>
        </div>

        {/* Nội dung */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed text-center">
            {isLeave
              ? 'Bạn sẽ không còn nhận được tin nhắn từ nhóm này nữa. Bạn vẫn có thể tham gia lại nếu được mời.'
              : 'Toàn bộ thành viên sẽ bị xóa khỏi nhóm và lịch sử trò chuyện sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.'}
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 active:scale-95"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={isLeave ? onConfirmLeave : onConfirmDisband}
            className={`cursor-pointer px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all duration-200 active:scale-95 flex items-center gap-2
              ${
                isLeave
                  ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-200'
                  : 'bg-red-600 hover:bg-red-700 ring-4 ring-red-300 animate-pulse hover:animate-none'
              }`}
          >
            {isLeave ? (
              <>
                <HiOutlineUserMinus className="w-4 h-4" />
                Rời nhóm
              </>
            ) : (
              <>
                <HiTrash className="w-4 h-4" />
                Giải tán nhóm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
