'use client';

import React, { useEffect, useState } from 'react';
import SidebarMenu from '../(menu)/menu';
import { useRouter } from 'next/navigation';

const LayoutBase = ({ children }: { children: React.ReactNode }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/users/me');
        const json = await res.json();
        if (mounted) setIsAuthed(!!json?.success);
      } catch {
        if (mounted) setIsAuthed(false);
      } finally {
        if (mounted) setChecked(true);
      }
    };
    void checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex h-screen w-screen">
      {isAuthed ? (
        <SidebarMenu />
      ) : (
        <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col items-center justify-center">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Chào mừng đến Hupuna</h2>
          <p className="text-xs text-gray-600 mb-4 text-center">Vui lòng đăng nhập hoặc đăng ký để sử dụng đầy đủ chức năng.</p>
          <button
            className="w-full mb-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700"
            onClick={() => router.push('/login')}
          >
            Đăng nhập
          </button>
          <button
            className="w-full rounded-lg border border-blue-600 text-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-50"
            onClick={() => router.push('/login')}
          >
            Đăng ký
          </button>
          {!checked && <div className="mt-3 text-[0.6875rem] text-gray-400">Đang kiểm tra phiên đăng nhập...</div>}
        </div>
      )}

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};

export default LayoutBase;
