'use client';

import { HiMail, HiOfficeBuilding, HiStatusOnline } from 'react-icons/hi';
import {
  HiPencil,
  HiLockClosed,
  HiUser,
  HiPhone,
  HiMapPin,
  HiCalendar,
  HiBriefcase,
  HiIdentification,
  HiLink,
  HiEye,
} from 'react-icons/hi2';

interface Option {
  value: string;
  label: string;
}

interface Props {
  user: {
    department?: string | number;
    status?: string | number;
    phone?: string;
    gender?: string;
    birthday?: string;
    email?: string;
    address?: string;
    title?: string;
  };
  displayName: string;
  displayId: string;
  departmentOptions: Option[];
  statusOptions: Option[];
  profileUrl: string;
  onEdit: () => void;
  onChangePassword: () => void;
  toast: (o: { type: 'success' | 'error'; message: string }) => void;
}

export default function ProfileView({
  user,
  displayName,
  displayId,
  departmentOptions,
  statusOptions,
  profileUrl,
  onEdit,
  onChangePassword,
  toast,
}: Props) {
  return (
    <>
      {/* Container chính - Rộng tối đa 580px, vừa popup đẹp */}
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* Card thông tin - Nhỏ gọn, thanh lịch */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <HiUser className="w-7 h-7" />
              Thông tin cá nhân
            </h3>
          </div>

          <div className="p-5 space-y-4">
            {/* Tên hiển thị */}
            <InfoRow
              icon={<HiUser className="w-5 h-5 text-indigo-600" />}
              label="Tên hiển thị"
              value={displayName}
              bold
            />

            {/* ID */}
            <InfoRow
              icon={<HiIdentification className="w-5 h-5 text-purple-600" />}
              label="ID nội bộ"
              value={displayId}
            />

            {/* Phòng ban */}
            {user.department !== undefined && (
              <InfoRow
                icon={<HiOfficeBuilding className="w-5 h-5 text-blue-600" />}
                label="Phòng ban"
                value={departmentOptions.find((o) => o.value === String(user.department))?.label || '—'}
              />
            )}

            {/* Trạng thái */}
            {user.status !== undefined && (
              <InfoRow
                icon={<HiStatusOnline className="w-5 h-5 text-emerald-600" />}
                label="Trạng thái"
                value={statusOptions.find((o) => o.value === String(user.status))?.label || '—'}
              />
            )}

            <div className="pt-3 border-t border-gray-200 space-y-3">
              <InfoRow icon={<HiPhone className="w-5 h-5 text-gray-600" />} label="Số điện thoại" value={user.phone} />
              <InfoRow
                icon={<HiIdentification className="w-5 h-5 text-gray-600" />}
                label="Giới tính"
                value={user.gender}
              />
              <InfoRow
                icon={<HiCalendar className="w-5 h-5 text-gray-600" />}
                label="Ngày sinh"
                value={user.birthday}
              />
              <InfoRow icon={<HiMail className="w-5 h-5 text-gray-600" />} label="Email" value={user.email} />
              <InfoRow icon={<HiMapPin className="w-5 h-5 text-gray-600" />} label="Địa chỉ" value={user.address} />
              <InfoRow icon={<HiBriefcase className="w-5 h-5 text-gray-600" />} label="Chức vụ" value={user.title} />
            </div>
          </div>
        </div>

        {/* Nút hành động - Nhỏ gọn, vừa popup */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(profileUrl);
                  toast({ type: 'success', message: 'Đã sao chép link hồ sơ' });
                } catch {
                  toast({ type: 'error', message: 'Không thể sao chép' });
                }
              }}
              className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <HiLink className="w-5 h-5" />
              Sao chép link
            </button>

            <button
              onClick={() => window.open(profileUrl, '_blank')}
              className="py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-98 border border-gray-300"
            >
              <HiEye className="w-5 h-5" />
              Xem hồ sơ
            </button>
          </div>

          <button
            onClick={onEdit}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-98 shadow-lg"
          >
            <HiPencil className="w-5 h-5" />
            Cập nhật thông tin
          </button>

          <button
            onClick={onChangePassword}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-98 shadow-lg"
          >
            <HiLockClosed className="w-5 h-5" />
            Đổi mật khẩu
          </button>
        </div>
      </div>
    </>
  );
}

// Component nhỏ gọn, đẹp cho từng dòng thông tin
function InfoRow({
  icon,
  label,
  value,
  bold = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`text-sm ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-800'} mt-0.5`}>
          {value ? String(value) : <span className="text-gray-400">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}
