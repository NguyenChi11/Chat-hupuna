// app\ui\login\login-form.tsx

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/ui/base/toast';
import { LoadingFull } from '@/ui/base/loading-full';
import { confirmAlert } from '@/ui/base/alert';
import { User } from '@/types/User';
import { cookieBase } from '@/utils/cookie';
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

        const { _id, username, name } = result.user;
        // 🔥 CHỈ CẦN LƯU INFO ĐỂ HIỂN THỊ UI
        // Token đã được tự động lưu vào Cookie bởi API
        localStorage.setItem(
          'info_user',
          JSON.stringify({
            _id,
            username,
            name,
            version: APP_VERSION,
          }),
        );

        // Nếu có logic remember_login, bạn có thể giữ lại
        localStorage.setItem('remember_login', JSON.stringify(remember));

        setIsLoading(false);
        router.push('/home');
      } else {
        toast({ type: 'error', message: result.message || 'Đăng nhập thất bại', duration: 3000 });
        setIsLoading(false);
      }
    } catch (error) {
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
    const rememberLogin = cookieBase.get<boolean>('remember_login');
    const savedUser = cookieBase.get<User>('info_user');

    setRemember(rememberLogin ?? false);

    if (rememberLogin && savedUser) {
      setUsername(savedUser.username || '');
    } else {
      cookieBase.remove('info_user');
      setUsername('');
    }
  }, []);

  return (
    <main className="w-full h-full">
      {isLoading && <LoadingFull />}
      <div className="flex justify-center">
        <div className="bg-white absolute z-0 top-0 left-0 w-screen h-screen opacity-70 object-cover"></div>
        <div className="w-110 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-1 rounded-xl shadow-2xl">
          <h1 className="text-2xl font-bold text-center text-blue-600 mt-5">Đăng nhập</h1>
          <div className="">
            <div className="space-y-6">
              <div className="px-6">
                <div className="mt-3">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Tên đăng nhập"
                    className="py-3 w-full text-black focus:outline-none border-b border-[#c2c7ce]"
                  />
                </div>

                <div className="mt-3">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Mật khẩu"
                    className="py-3 w-full text-black   focus:outline-none border-b border-[#c2c7ce]"
                  />
                </div>

                <div className="my-6 flex items-center justify-start">
                  <div className="flex items-center pr-3 border-r border-gray-300">
                    <input
                      id="remember-me"
                      name="remember-me"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      type="checkbox"
                      className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-900">
                      Duy trì đăng nhập
                    </label>
                  </div>
                  <div className="pl-3">
                    <a href="#" className="text-sm text-indigo-600">
                      Quên mật khẩu?
                    </a>
                  </div>
                </div>
              </div>
              <div className="grid grid-flow-col grid-rows-1">
                <div className="col-span-1 flex justify-center items-center">
                  <button
                    onClick={loginManager}
                    disabled={isLoading}
                    className={`p-3 w-full rounded-bl-xl font-bold text-white ${isLoading ? 'bg-blue-300' : 'bg-blue-500'}`}
                  >
                    {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <button
                    type="button"
                    onClick={() => register()}
                    className="p-3 bg-green-500 w-full text-white rounded-br-xl cursor-pointer font-bold"
                  >
                    Đăng ký
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
