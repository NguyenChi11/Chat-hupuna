'use client';

import React, { useEffect, useRef, useState } from 'react';
import { HiEllipsisVertical, HiArrowRightOnRectangle, HiXMark, HiChatBubbleLeftRight } from 'react-icons/hi2';

const MenuWidget: React.FC<{ title?: string }> = ({ title = 'Chat' }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        open &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const goHome = () => {
    try {
      window.open('/home', '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = '/home';
    }
    setOpen(false);
  };

  const closeWidget = () => {
    try {
      window.parent?.postMessage('HUPUNA_WIDGET_CLOSE', window.location.origin);
      window.parent?.postMessage({ type: 'HUPUNA_WIDGET_CLOSE' }, window.location.origin);
    } catch {}
    setOpen(false);
  };

  return (
    <>
      {/* Header với gradient xanh dương cực đẹp */}
      <div className="h-14 flex items-center justify-between px-5 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 text-white shadow-lg relative z-20 select-none">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-4">
          <button
            ref={btnRef}
            onClick={() => setOpen(!open)}
            className="p-2.5 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 group"
            aria-label="Mở menu"
          >
            <HiEllipsisVertical className="w-6 h-6 group-hover:rotate-90 transition-transform duration-400" />
          </button>

          <h3 className="text-base font-bold flex items-center gap-2.5">
            <HiChatBubbleLeftRight className="w-6 h-6" />
            {title}
          </h3>
        </div>

        {/* Right: Close button */}
        <button
          onClick={closeWidget}
          className="p-2.5 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 group"
          aria-label="Đóng widget"
        >
          <HiXMark className="w-6 h-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
        </button>

        {/* Dropdown Menu - nổi bật trên nền gradient */}
        <div
          ref={dropdownRef}
          className={`absolute top-full left-5 mt-3 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 origin-top-left ${
            open
              ? 'opacity-100 scale-100 translate-y-0 visible'
              : 'opacity-0 scale-95 -translate-y-3 invisible pointer-events-none'
          }`}
        >
          <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 p-4 text-white">
            <p className="text-sm font-semibold">Hupuna Chat Widget</p>
            <p className="text-xs opacity-90 mt-1">Bạn đang dùng phiên bản nhúng</p>
          </div>

          <div className="p-3">
            <button
              onClick={goHome}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <HiArrowRightOnRectangle className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              <div className="text-left">
                <div>Mở chat đầy đủ</div>
                <div className="text-xs opacity-90">Chuyển đến trang chính Hupuna</div>
              </div>
            </button>
          </div>

          <div className="px-5 pb-4 text-xs text-gray-500 dark:text-gray-400 text-center">Powered by Hupuna</div>
        </div>
      </div>
    </>
  );
};

export default MenuWidget;
