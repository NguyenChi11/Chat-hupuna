// confirmAlert.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ButtonBase } from './button';

import { HiXMark, HiCheckCircle, HiInformationCircle } from 'react-icons/hi2';

interface ConfirmOptions {
  title?: string;
  message: string;
  okText?: string;
  cancelText?: string | null;
  onOk?: () => void;
  onCancel?: () => void;
}

export function confirmAlert(options: ConfirmOptions) {
  const { title = 'Xác nhận', message, okText = 'Đồng ý', cancelText = 'Hủy', onOk, onCancel } = options;

  // Lớp phủ bóng + container (giữ nguyên như cũ)
  const container = document.createElement('div');
  container.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/30';
  document.body.appendChild(container);

  const root = createRoot(container);

  const close = () => {
    root.unmount();
    container.remove();
  };

  const AlertBox = () => (
    <div className="w-full max-w-sm animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
      {/* Card nhỏ xinh – Glassmorphism nhẹ nhàng */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        {/* Header xanh dương nhẹ */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-5 text-white">
          <div className="flex items-center justify-center gap-3">
            <HiInformationCircle className="w-8 h-8" />
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
        </div>

        {/* Nội dung */}
        <div className="p-6 text-center">
          <p className="text-gray-700 text-lg leading-relaxed">{message}</p>
        </div>

        {/* Nút bấm */}
        <div className="flex gap-3 px-6 pb-6">
          {cancelText !== null && (
            <ButtonBase
              onClick={() => {
                close();
                onCancel?.();
              }}
              className="flex-1 py-4 text-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <HiXMark className="w-5 h-5" />
              {cancelText}
            </ButtonBase>
          )}

          <ButtonBase
            onClick={() => {
              close();
              onOk?.();
            }}
            className="flex-1 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <HiCheckCircle className="w-5 h-5" />
            {okText}
          </ButtonBase>
        </div>
      </div>
    </div>
  );

  root.render(<AlertBox />);
}
