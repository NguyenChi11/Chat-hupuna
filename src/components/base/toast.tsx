'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import IconSuccess from '@/public/icons/toast/success.svg';
import IconInfo from '@/public/icons/toast/info.svg';
import IconWarning from '@/public/icons/toast/warning.svg';
import IconError from '@/public/icons/toast/error.svg';
import Image from 'next/image';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type Toast = {
  _id?: number;
  type: ToastType;
  message: string;
  duration?: number;
};

type ToastContextType = {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, '_id'>) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let idCounter = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(({ type, message, duration = 3000 }: Omit<Toast, '_id'>) => {
    const _id = idCounter++;
    const newToast = { _id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);

    // Remove toast sau khi kết thúc animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t._id !== _id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <div className="fixed bottom-6 left-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <ToastItem key={toast._id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.showToast;
};

const ToastItem = ({ _id, type, message, duration = 3000 }: Toast) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => setVisible(false), duration - 300);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration]);

  return (
    <div
      key={_id}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 ease-in-out
        ${visible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
        ${type === 'success' ? 'bg-green-500' : ''}
        ${type === 'error' ? 'bg-red-500' : ''}
        ${type === 'info' ? 'bg-blue-500' : ''}
        ${type === 'warning' ? 'bg-yellow-500 text-black' : ''}
      `}
    >
      <div>
        {type === 'success' && <Image src={IconSuccess} alt="success" width={24} height={24} />}
        {type === 'error' && <Image src={IconError} alt="error" width={24} height={24} />}
        {type === 'info' && <Image src={IconInfo} alt="info" width={24} height={24} />}
        {type === 'warning' && <Image src={IconWarning} alt="warning" width={24} height={24} />}
      </div>
      <div>{message}</div>
    </div>
  );
};
