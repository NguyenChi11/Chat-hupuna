'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '../base/toast';
import { LoadingFull } from '../base/loading-full';
import { confirmAlert } from '../base/alert';
import { User } from '../../types/User';
import { APP_VERSION } from '@/version';

import { HiUser, HiLockClosed, HiSparkles, HiShieldCheck, HiArrowRight, HiCheckCircle } from 'react-icons/hi2';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

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

        const userObj = result.user as User;

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'info_user',
            JSON.stringify({
              ...userObj,
              version: APP_VERSION,
            }),
          );
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
        message: 'Tài khoản hoặc mật khẩu không hợp lệ!',
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
    });
  }

  useEffect(() => {
    const message = searchParams.get('version');
    if (message === 'update') {
      confirmAlert({
        title: 'Cập nhật ứng dụng',
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
      setRemember(rememberLogin);

      const savedUserRaw = localStorage.getItem('info_user');
      if (rememberLogin && savedUserRaw) {
        const savedUser = JSON.parse(savedUserRaw) as User;
        setUsername(savedUser.username || '');
      } else {
        localStorage.removeItem('info_user');
        setUsername('');
      }
    } catch {
      setUsername('');
      setRemember(false);
    }
  }, []);

  return (
    <main className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 px-4 py-10">
      {isLoading && <LoadingFull />}

      {/* Background Lights */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] w-72 h-72 md:w-96 md:h-96 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute right-[-10%] bottom-[-10%] w-72 h-72 md:w-96 md:h-96 bg-cyan-300/40 rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute left-1/2 top-1/2 w-60 h-60 md:w-72 md:h-72 -translate-x-1/2 -translate-y-1/2 bg-blue-300/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-3 items-center">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-3xl shadow-xl border border-white/40">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-3 rounded-2xl shadow-lg">
                <span className="text-4xl sm:text-5xl font-black text-white">H</span>
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white drop-shadow-lg">Hupuna</h1>
              <p className="text-white/90 text-sm sm:text-base font-medium">Kết nối mọi người</p>
            </div>
          </div>

          <p className="text-white/70 mt-2 text-xs sm:text-sm">Phiên bản {APP_VERSION}</p>
        </div>

        {/* Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
          {/* Left Side */}
          <div className="hidden lg:flex flex-col justify-center p-10 xl:p-12 text-white bg-gradient-to-br from-blue-600/80 to-cyan-500/80 space-y-10">
            <h2 className="text-4xl xl:text-5xl font-black leading-tight">
              Nhắn gửi <span className="text-cyan-200">yêu thương</span>,<br />
              kết nối <span className="text-cyan-200">mọi người</span>
            </h2>

            <div className="space-y-6">
              {[
                { icon: HiSparkles, text: 'Gửi tin nhắn, file, ảnh video cực nhanh', color: 'cyan' },
                { icon: HiShieldCheck, text: 'Bảo mật tuyệt đối với mã hóa đầu cuối', color: 'emerald' },
                { icon: HiCheckCircle, text: 'Đồng bộ liền mạch trên mọi thiết bị', color: 'blue' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <item.icon className={`w-7 h-7 text-${item.color}-300`} />
                  </div>
                  <p className="text-base font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="p-6 sm:p-10 bg-white">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">Chào mừng trở lại!</h2>
              <p className="text-center text-gray-600 text-sm sm:text-base mt-1 mb-6">Đăng nhập để tiếp tục</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isLoading) void loginManager();
                }}
                className="space-y-6"
              >
                {/* Username */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                    <HiUser className="w-5 h-5 text-blue-600" />
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                    placeholder="Nhập tên đăng nhập"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                    <HiLockClosed className="w-5 h-5 text-blue-600" />
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </div>

                {/* Remember */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Duy trì đăng nhập</span>
                  </label>

                  <button type="button" className="cursor-pointer text-blue-600 text-sm hover:underline">
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full  cursor-pointer py-3 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-white font-bold text-lg shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Đăng nhập ngay
                  <HiArrowRight className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={register}
                  className="w-full cursor-pointer py-3 rounded-xl border border-blue-500 text-blue-600 font-bold hover:bg-blue-50"
                >
                  Tạo tài khoản mới
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-500">
                Khi đăng nhập, bạn đồng ý với{' '}
                <span className="text-blue-600 cursor-pointer hover:underline">Điều khoản sử dụng</span> và{' '}
                <span className="text-blue-600 cursor-pointer hover:underline">Chính sách bảo mật</span>.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-white/70 text-sm">
          © {new Date().getFullYear()} Hupuna — Chat cùng Hupuna
        </p>
      </div>
    </main>
  );
}
