'use client';

import { HiLockClosed, HiEye, HiEyeSlash } from 'react-icons/hi2';
import { useState } from 'react';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordViewProps {
  form: ChangePasswordForm;
  setForm: React.Dispatch<React.SetStateAction<ChangePasswordForm>>;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function ChangePasswordView({ form, setForm, onSubmit, onCancel, loading }: ChangePasswordViewProps) {
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const toggleShow = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="space-y-8 max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-3xl font-black text-gray-900">Đổi mật khẩu</h3>
        <p className="text-gray-500 mt-2">Nhập mật khẩu mới để bảo vệ tài khoản của bạn</p>
      </div>

      <div className="space-y-7">
        <Field label="Mật khẩu hiện tại">
          <div className="relative">
            <input
              type={showPassword.current ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium transition-all bg-white"
            />
            <HiLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <button
              type="button"
              onClick={() => toggleShow('current')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {showPassword.current ? (
                <HiEyeSlash className="w-5 h-5 text-gray-500" />
              ) : (
                <HiEye className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </Field>

        <Field label="Mật khẩu mới">
          <div className="relative">
            <input
              type={showPassword.new ? 'text' : 'password'}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Tạo mật khẩu mạnh"
              className="w-full pl-12 pr-12 py-5 rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 text-lg font-medium transition-all bg-white"
            />
            <HiLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <button
              type="button"
              onClick={() => toggleShow('new')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {showPassword.new ? (
                <HiEyeSlash className="w-5 h-5 text-gray-500" />
              ) : (
                <HiEye className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </Field>

        <Field label="Xác nhận mật khẩu">
          <div className="relative">
            <input
              type={showPassword.confirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full pl-12 pr-12 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium transition-all bg-white"
            />
            <HiLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <button
              type="button"
              onClick={() => toggleShow('confirm')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {showPassword.confirm ? (
                <HiEyeSlash className="w-5 h-5 text-gray-500" />
              ) : (
                <HiEye className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </Field>
      </div>

      <div className="flex gap-4 pt-6">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            'Đang đổi...'
          ) : (
            <>
              Đổi mật khẩu
              <HiLockClosed className="w-6 h-6" />
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          className="flex-1 py-5 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xl transition-all active:scale-98"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  );
}

// Giữ nguyên hoàn toàn cấu trúc Field
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <HiLockClosed className="w-5 h-5 text-blue-500" />
        {label}
      </p>
      {children}
    </div>
  );
}
