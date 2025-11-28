// app\ui\login\login-form.tsx

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '../base/toast';
import { LoadingFull } from '../base/loading-full';
import { confirmAlert } from '../base/alert';
import { User } from '../../types/User';
import { APP_VERSION } from '@/version';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter(); // 👈 thêm dòng này

  async function login(username: string, password: string) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          data: { username, password },
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast({ type: 'success', message: 'Đăng nhập thành công!', duration: 3000 });

        const { _id, username, name, avatar, role, department, status } = result.user as User;

        // 🔥 CHỈ CẦN LƯU INFO ĐỂ HIỂN THỊ UI
        // Token (session_token) đã được lưu vào Cookie HttpOnly bởi API
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'info_user',
            JSON.stringify({
              _id,
              username,
              name,
              avatar,
              role,
              department,
              status,
              version: APP_VERSION,
            }),
          );

          // Nếu có logic remember_login, lưu ở localStorage cho đơn giản
          localStorage.setItem('remember_login', JSON.stringify(remember));
        }

        setIsLoading(false);
        router.push('/home');
      } else {
        toast({ type: 'error', message: result.message || 'Đăng nhập thất bại', duration: 3000 });
        setIsLoading(false);
      }
    } catch {
      toast({ type: 'error', message: 'Lỗi kết nối server', duration: 3000 });
      setIsLoading(false);
    }
  }

  async function loginManager() {
    if (username.trim().length >= 5 && password.trim().length >= 5) {
      login(username.trim(), password.trim());
    } else {
      toast({
        type: 'error',
        message: 'Tài khoản hoặc mật khẩu không hợp lệ!',
        duration: 3000,
      });
    }
  }

  function register() {
    confirmAlert({
      title: 'Thông báo',
      message: 'Chưa có chức năng đăng ký. Liên hệ admin để tạo tài khoản!',
      okText: 'Ok',
      cancelText: null,
      onOk: () => {},
      onCancel: () => {
        return;
      },
    });
  }

  useEffect(() => {
    const message = searchParams.get('version');
    if (message === 'update') {
      // Sử dụng confirmAlert thay vì alert
      confirmAlert({
        title: 'Thông báo cập nhật',
        message: 'Ứng dụng đã được cập nhật. Vui lòng đăng nhập lại.',
        okText: 'Đã hiểu',
        cancelText: null,
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rememberRaw = localStorage.getItem('remember_login');
      const rememberLogin = rememberRaw ? (JSON.parse(rememberRaw) as boolean) : false;
      setRemember(rememberLogin ?? false);

      const savedUserRaw = localStorage.getItem('info_user');

      if (rememberLogin && savedUserRaw) {
        const savedUser = JSON.parse(savedUserRaw) as User;
        setUsername(savedUser.username || '');
      } else {
        localStorage.removeItem('info_user');
        setUsername('');
      }
    } catch (e) {
      console.error('Không đọc được thông tin đăng nhập từ localStorage', e);
      setUsername('');
      setRemember(false);
    }
  }, []);

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0068ff] via-[#1a8dff] to-[#5bbaff]">
      {isLoading && <LoadingFull />}

      {/* Background hiệu ứng mờ giống Hupuna */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Logo + version */}
        <div className="mb-8 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white">
              <span className="text-xl font-extrabold text-[#0068ff]">H</span>
            </div>
            <span className="text-2xl font-semibold leading-none flex items-center">Hupuna</span>
          </div>
          <span className="hidden text-sm opacity-80 sm:inline">Phiên bản {APP_VERSION}</span>
        </div>

        {/* Card login chính */}
        <div className="grid gap-8 rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur-md sm:p-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Bên trái: giới thiệu giống Hupuna Web */}
          <div className="flex flex-col justify-center space-y-5 border-b border-blue-50 pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
            <h1 className="text-3xl font-semibold text-[#1a1a1a] sm:text-4xl">
              Nhắn gửi <span className="text-[#0068ff]">yêu thương</span>, kết nối{' '}
              <span className="text-[#0068ff]">mọi người</span>
            </h1>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0068ff]" />
                <span>Trò chuyện nhóm, gửi file, hình ảnh siêu nhanh.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00c8ff]" />
                <span>Đồng bộ tin nhắn trên nhiều thiết bị.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                <span>Bảo mật thông tin, an tâm khi sử dụng.</span>
              </li>
            </ul>
          </div>

          {/* Bên phải: form đăng nhập */}
          <div className="flex flex-col justify-center">
            <h2 className="mb-2 text-center text-xl font-semibold text-gray-900 sm:text-2xl">Đăng nhập tài khoản</h2>
            <p className="mb-6 text-center text-xs text-gray-500 sm:text-sm">
              Sử dụng tài khoản nội bộ để đăng nhập hệ thống chat Hupuna.
            </p>

            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isLoading) {
                  void loginManager();
                }
              }}
            >
              <div>
                <label htmlFor="username" className="text-xs font-medium text-gray-700 sm:text-sm">
                  Tên đăng nhập
                </label>
                <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-all focus-within:border-[#0068ff] focus-within:bg-white focus-within:shadow-md">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Nhập tên đăng nhập của bạn"
                    className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-medium text-gray-700 sm:text-sm">
                  Mật khẩu
                </label>
                <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-all focus-within:border-[#0068ff] focus-within:bg-white focus-within:shadow-md">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input
                    id="remember-me"
                    name="remember-me"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    type="checkbox"
                    className="h-3 w-3 rounded border-gray-300 text-[#0068ff] focus:ring-[#0068ff]"
                  />
                  <span>Duy trì đăng nhập</span>
                </label>

                <button
                  type="button"
                  className="text-xs cursor-pointer font-medium text-[#0068ff] hover:underline sm:text-sm"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`inline-flex cursor-pointer items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all ${
                    isLoading ? 'cursor-not-allowed bg-[#9cc5ff]' : 'bg-[#0068ff] hover:bg-[#0053d6] hover:shadow-lg'
                  } sm:col-span-2`}
                >
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>

                <button
                  type="button"
                  onClick={() => register()}
                  className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-[#00c8ff] px-4 py-2.5 text-sm font-semibold text-[#00a6e5] transition-all hover:bg-[#e0f7ff] sm:col-span-2"
                >
                  Đăng ký tài khoản mới
                </button>
              </div>
            </form>

            <p className="mt-5 text-center text-[11px] text-gray-400 sm:text-xs">
              Bằng việc đăng nhập, bạn đồng ý với{' '}
              <span className="cursor-pointer text-[#0068ff] hover:underline">Điều khoản sử dụng</span> và{' '}
              <span className="cursor-pointer text-[#0068ff] hover:underline">Chính sách bảo mật</span>.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/80 sm:text-xs">
          © {new Date().getFullYear()} Hupuna. All rights reserved.
        </p>
      </div>
    </main>
  );
}
