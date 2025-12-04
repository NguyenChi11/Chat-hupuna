'use client';

import type { ReactNode } from 'react';
import React from 'react';
import { HiUserCircle, HiInformationCircle, HiCog6Tooth, HiQrCode } from 'react-icons/hi2';

export default function ProfileTabs({
  tabs,
  tab,
  setTab,
  icon,
}: {
  tabs: string[];
  tab: string;
  setTab: (item: string) => void;
  icon?: (tab: string) => ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const labels: Record<string, string> = {
    info: 'Thông tin',
    profile: 'Hồ sơ',
    qr: 'Mã QR',
    settings: 'Cài đặt',
  };

  // Icon mặc định nếu không truyền prop icon
  const defaultIcon = (key: string) => {
    switch (key) {
      case 'profile':
        return <HiUserCircle className="w-5 h-5" />;
      case 'qr':
        return <HiQrCode className="w-5 h-5" />;
      case 'info':
        return <HiInformationCircle className="w-5 h-5" />;
      case 'settings':
        return <HiCog6Tooth className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (!mounted) return null;
  return (
    <div className="flex bg-white border-b border-gray-200/80 sticky top-0 z-10">
      {tabs.map((item) => (
        <button
          key={item}
          onClick={() => setTab(item)}
          className={`
            flex-1 relative py-4 px-3 text-center font-medium text-sm
            transition-all duration-300 group
            ${tab === item ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          {/* Nội dung tab */}
          <div className="flex items-center justify-center gap-2.5 overflow-auto w-full">
            {icon ? icon(item) : defaultIcon(item)}
            <span className="inline text-[0.625rem]">{labels[item] || item}</span>
          </div>

          {/* Thanh gạch dưới mượt mà */}
          <div
            className={`
            absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 
            bg-indigo-600 rounded-full transition-all duration-300
            ${tab === item ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
            group-hover:scale-75 group-hover:opacity-50
          `}
          />

          {/* Hiệu ứng ripple khi active */}
          {tab === item && <div className="absolute inset-0 -z-10 bg-indigo-50/30 rounded-lg animate-ping-once" />}
        </button>
      ))}
    </div>
  );
}
