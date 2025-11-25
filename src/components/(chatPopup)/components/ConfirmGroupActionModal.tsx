import React from 'react';

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
    <div className="fixed inset-0 z-[9600] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {isLeave ? 'Rời nhóm chat' : 'Giải tán nhóm chat'}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          {isLeave
            ? 'Bạn sẽ rời khỏi nhóm này và không nhận được tin nhắn mới. Bạn có chắc chắn muốn tiếp tục?'
            : 'Tất cả thành viên sẽ bị xóa khỏi nhóm và lịch sử chat có thể bị xóa. Hành động này không thể hoàn tác.'}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 cursor-pointer py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            type="button"
            className={`px-3 cursor-pointer py-1.5 text-sm rounded-md text-white hover:opacity-90 ${
              isLeave ? 'bg-red-500' : 'bg-red-600'
            }`}
            onClick={isLeave ? onConfirmLeave : onConfirmDisband}
          >
            {isLeave ? 'Rời nhóm' : 'Giải tán nhóm'}
          </button>
        </div>
      </div>
    </div>
  );
}


