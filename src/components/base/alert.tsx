// confirmAlert.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ButtonBase } from './button';

interface ConfirmOptions {
  title?: string;
  message: string;
  okText?: string;
  cancelText?: string | null;
  onOk?: () => void;
  onCancel?: () => void;
}

export function confirmAlert(options: ConfirmOptions) {
  const { title = 'Xác nhận', message, okText = 'OK', cancelText = 'Hủy', onOk, onCancel } = options;

  // tạo container gắn vào body
  const container = document.createElement('div');
  container.className = 'fixed inset-0 flex items-center justify-center bg-black/30 bg-opacity-40 z-[9999]';
  document.body.appendChild(container);

  const root = createRoot(container);

  function close() {
    root.unmount();
    container.remove();
  }

  const AlertBox = () => (
    <div className="bg-gray-900 rounded-lg shadow-lg w-[420px] p-5 border border-gray-900">
      <h3 className="text-lg font-semibold mb-3 text-white">{title}</h3>
      <p className="text-white mb-5">{message}</p>
      <div className="flex justify-end gap-3">
        {cancelText !== null && (
          <ButtonBase
            className="bg-gray-200 hover:bg-gray-300"
            onClick={() => {
              close();
              onCancel?.();
            }}
          >
            {cancelText}
          </ButtonBase>
        )}
        <ButtonBase
          className="bg-blue-500 text-white hover:bg-blue-700"
          onClick={() => {
            close();
            onOk?.();
          }}
        >
          {okText}
        </ButtonBase>
      </div>
    </div>
  );

  root.render(<AlertBox />);
}
