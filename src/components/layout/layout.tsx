'use client';

import React, { useEffect, useState } from 'react';
import SidebarMenu from '../(menu)/menu';
import { useRouter, usePathname } from 'next/navigation';
import { HiChatBubbleLeftRight, HiUserGroup, HiPhoto, HiUserCircle, HiCog6Tooth } from 'react-icons/hi2';

const LayoutBase = ({ children }: { children: React.ReactNode }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const [hideMobileFooter, setHideMobileFooter] = useState<boolean>(false);

  const router = useRouter();
  const pathname = usePathname();

  // Kiểm tra đăng nhập (giữ nguyên logic cũ)
  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        let res = await fetch('/api/users/me');
        let json = await res.json();
        if (!res.ok || !json?.success) {
          try {
            const r = await fetch('/api/auth/refresh', { method: 'GET' });
            if (r.ok) {
              res = await fetch('/api/users/me');
              json = await res.json();
            }
          } catch {}
        }
        if (mounted) setIsAuthed(!!json?.success);
      } catch {
        if (mounted) setIsAuthed(false);
      } finally {
        if (mounted) setChecked(true);
      }
    };
    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  // Lắng nghe event ẩn/hiện mobile footer (giữ nguyên)
  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<{ hidden?: boolean }>;
      setHideMobileFooter(!!evt.detail?.hidden);
    };
    window.addEventListener('mobile-footer', handler);
    return () => window.removeEventListener('mobile-footer', handler);
  }, []);

  // Xác định tab đang active
  const isActive = (paths: string[]) => {
    return paths.some(
      (p) =>
        pathname === p ||
        pathname?.startsWith(p + '/') ||
        (p === '/home' && (pathname === '/' || pathname?.startsWith('/chat'))),
    );
  };

  const mobileTabs = [
    {
      key: 'home',
      label: 'Tin nhắn',
      paths: ['/home', '/chat', '/'],
      icon: <HiChatBubbleLeftRight className="w-6 h-6" />,
    },
    { key: 'directory', label: 'Danh bạ', paths: ['/directory'], icon: <HiUserGroup className="w-6 h-6" /> },
    { key: 'moments', label: 'Tường', paths: ['/moments', '/timeline'], icon: <HiPhoto className="w-6 h-6" /> },
    { key: 'profile', label: 'Cá nhân', paths: ['/profile', '/me'], icon: <HiUserCircle className="w-6 h-6" /> },
    { key: 'setting', label: 'Cài đặt', paths: ['/setting'], icon: <HiCog6Tooth className="w-6 h-6" /> },
  ];

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      {/* Sidebar Desktop */}
      {isAuthed && (
        <div className="hidden md:block">
          <SidebarMenu />
        </div>
      )}

      {/* Khi chưa đăng nhập */}
      {!isAuthed && checked && (
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <HiUserCircle className="w-14 h-14 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Chào mừng đến Hupuna</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">Vui lòng đăng nhập để trải nghiệm đầy đủ tính năng</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => router.push('/login?mode=register')}
                className="w-full py-3.5 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 active:scale-95 transition-all"
              >
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nội dung chính */}
      <main className={`flex-1 overflow-hidden ${isAuthed && !hideMobileFooter ? 'pb-16 md:pb-0' : ''}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation - 5 tab đẹp như Zalo (không dùng motion) */}
      {isAuthed && !hideMobileFooter && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          {/* Hiệu ứng mờ nhẹ trên footer */}
          <div className="absolute inset-x-0 -top-4 h-8 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

          <div className="bg-white/95 backdrop-blur-2xl border-t border-gray-200 shadow-2xl">
            <div className="flex relative">
              {mobileTabs.map((tab) => {
                const active = isActive(tab.paths);

                return (
                  <button
                    key={tab.key}
                    onClick={() => router.push(tab.paths[0])}
                    className="flex-1 py-3 flex flex-col items-center gap-1 relative transition-all duration-200"
                  >
                    {/* Icon + Label */}
                    <div
                      className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-blue-600 scale-110' : 'text-gray-500'}`}
                    >
                      {tab.icon}
                      <span className="text-xs font-medium">{tab.label}</span>
                    </div>

                    {/* Thanh active dưới dạng đường cong đẹp (CSS thuần) */}
                    {active && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-600 rounded-full shadow-md"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutBase;
