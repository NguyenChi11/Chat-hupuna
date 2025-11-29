'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type MeUser = { _id: string; name?: string; username?: string; avatar?: string } | null;

export default function MiniHome() {
  const [me, setMe] = useState<MeUser>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me');
        const json = await res.json();
        if (json && json.success && json.user) setMe(json.user as MeUser);
      } catch {}
      setLoading(false);
    };
    void load();
  }, []);

  const handleIssueSSO = async () => {
    try {
      setIssuing(true);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const callback = `${origin}/mini/sso/callback`;
      const aud = typeof window !== 'undefined' ? window.location.hostname : '';
      const res = await fetch(`/api/sso/issue?redirect=${encodeURIComponent(callback)}&aud=${encodeURIComponent(aud)}`);
      const json = await res.json();
      if (json && json.success && json.url) {
        window.location.href = json.url as string;
      }
    } catch {}
    setIssuing(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    router.refresh();
  };

  const handleRegister = async () => {
    if (!authUsername || !authPassword) return;
    try {
      setAuthLoading(true);
      setAuthMessage('');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: { username: authUsername, password: authPassword, name: authUsername },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAuthMessage('Đăng ký thất bại');
        return;
      }
      await handleLogin();
    } catch {
      setAuthMessage('Có lỗi xảy ra');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authUsername || !authPassword) return;
    try {
      setAuthLoading(true);
      setAuthMessage('');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', data: { username: authUsername, password: authPassword } }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAuthMessage(json.message || 'Đăng nhập thất bại');
        return;
      }
      setMe(json.user as MeUser);
      setAuthMessage('Đăng nhập thành công');
    } catch {
      setAuthMessage('Có lỗi xảy ra');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#f6f9ff]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-[#1b1b1b]">Mini SSO Demo</h1>
        <p className="text-gray-600 mt-1 text-sm">Trang nhỏ để thử đăng nhập bằng SSO</p>

        <div className="mt-6">
          {loading ? (
            <div className="text-gray-500">Đang kiểm tra phiên...</div>
          ) : me ? (
            <div className="space-y-2">
              <div className="text-sm">Đã đăng nhập dưới tài khoản:</div>
              <div className="text-lg font-semibold">{me.name || me.username || me._id}</div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleLogout}
                  className="px-3 cursor-pointer py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700"
                >
                  Đăng xuất
                </button>
                <Link href="/" className="px-3 cursor-pointer py-2 rounded-lg text-sm bg-gray-200 text-gray-800">
                  Về trang chính
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm">Bạn chưa đăng nhập.</div>
              <div className="grid gap-2">
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Tên đăng nhập"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {authMessage ? <div className="text-xs text-gray-600">{authMessage}</div> : null}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRegister}
                  disabled={authLoading}
                  className={`px-3 cursor-pointer py-2 rounded-lg text-sm text-white ${authLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {authLoading ? 'Đang xử lý...' : 'Đăng ký mới'}
                </button>
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className={`px-3 cursor-pointer py-2 rounded-lg text-sm text-white ${authLoading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {authLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
              </div>
              <button
                onClick={handleIssueSSO}
                disabled={issuing}
                className={`px-3 cursor-pointer py-2 rounded-lg text-sm text-white ${issuing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {issuing ? 'Đang lấy link...' : 'Đăng nhập bằng SSO'}
              </button>
              <Link href="/" className="inline-block px-3 py-2 rounded-lg text-sm bg-gray-200 text-gray-800">
                Về trang chính
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
