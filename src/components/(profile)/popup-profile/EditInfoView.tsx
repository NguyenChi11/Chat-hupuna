'use client';

import { HiUser, HiCalendar, HiMapPin, HiBriefcase, HiIdentification } from 'react-icons/hi2';
import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Dropdown } from '@/components/ui/Dropdown';
import { HiMail, HiOfficeBuilding, HiPhone, HiStatusOnline } from 'react-icons/hi';

export default function EditInfoView({
  form,
  setForm,
  onSubmit,
  onCancel,
  departmentOptions,
  statusOptions,
  loading,
}: {
  form: Record<string, string | number | boolean | undefined>;
  setForm: (value: Record<string, string | number | boolean | undefined>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  departmentOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  loading: boolean;
}) {
  const [openDept, setOpenDept] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [openGender, setOpenGender] = useState(false);

  const genderOptions = [
    { value: 'Nam', label: 'Nam' },
    { value: 'Nữ', label: 'Nữ' },
    { value: 'Khác', label: 'Khác' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
          <HiUser className="w-10 h-10 text-indigo-600" />
          Cập nhật thông tin cá nhân
        </h3>
        <p className="text-gray-500 mt-2">Thông tin sẽ hiển thị trên hồ sơ và danh bạ</p>
      </div>

      {/* Form Grid */}
      <div className="flex flex-col gap-6">
        {/* Tên hiển thị */}
        <Field icon={<HiUser className="w-6 h-6 text-indigo-600" />} label="Tên hiển thị" required>
          <input
            type="text"
            value={String(form.name ?? '')}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ví dụ: Nguyễn Văn A"
            className="w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-lg font-medium transition-all bg-white"
          />
        </Field>

        {/* Số điện thoại */}
        <Field icon={<HiPhone className="w-6 h-6 text-blue-600" />} label="Số điện thoại">
          <input
            type="tel"
            value={String(form.phone ?? '')}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0123456789"
            className="w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium transition-all bg-white"
          />
        </Field>

        {/* Giới tính - Dùng Dropdown thay select */}
        <Field icon={<HiIdentification className="w-6 h-6 text-purple-600" />} label="Giới tính">
          <Dropdown
            items={genderOptions}
            value={String(form.gender ?? '')}
            placeholder="Chọn giới tính"
            open={openGender}
            onToggle={() => {
              setOpenGender(!openGender);
              setOpenDept(false);
              setOpenStatus(false);
            }}
            onSelect={(v) => {
              setForm({ ...form, gender: v });
              setOpenGender(false);
            }}
            className="h-[4rem] rounded-2xl border-2 border-gray-200 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100"
          />
        </Field>

        {/* Ngày sinh */}
        <Field icon={<HiCalendar className="w-6 h-6 text-emerald-600" />} label="Ngày sinh">
          <input
            type="date"
            value={form.birthday ? String(form.birthday) : ''}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            className="w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 text-lg font-medium transition-all bg-white"
          />
        </Field>

        {/* Email */}
        <Field icon={<HiMail className="w-6 h-6 text-orange-600" />} label="Email">
          <input
            type="email"
            value={String(form.email ?? '')}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-lg font-medium transition-all bg-white"
          />
        </Field>

        {/* Chức vụ */}
        <Field icon={<HiBriefcase className="w-6 h-6 text-teal-600" />} label="Chức vụ">
          <input
            type="text"
            value={String(form.title ?? '')}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ví dụ: Nhân viên kinh doanh"
            className="w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 text-lg font-medium transition-all bg-white"
          />
        </Field>

        {/* Địa chỉ - Full width */}
        <div className="md:col-span-2">
          <Field icon={<HiMapPin className="w-6 h-6 text-rose-600" />} label="Địa chỉ">
            <input
              type="text"
              value={String(form.address ?? '')}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              className="w-full pl-4 pr-5 py-3 rounded-2xl border-2 border-gray-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 text-lg font-medium transition-all bg-white"
            />
          </Field>
        </div>

        {/* Phòng ban */}
        <div className="md:col-span-2">
          <Field icon={<HiOfficeBuilding className="w-6 h-6 text-blue-600" />} label="Phòng ban">
            <Dropdown
              items={departmentOptions}
              value={String(form.department ?? '')}
              placeholder="Chọn phòng ban"
              open={openDept}
              onToggle={() => {
                setOpenDept(!openDept);
                setOpenStatus(false);
                setOpenGender(false);
              }}
              onSelect={(v) => {
                setForm({ ...form, department: v });
                setOpenDept(false);
              }}
              className="h-[4rem] rounded-2xl border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
            />
          </Field>
        </div>

        {/* Trạng thái */}
        <div className="md:col-span-2">
          <Field icon={<HiStatusOnline className="w-6 h-6 text-green-600" />} label="Trạng thái làm việc">
            <Dropdown
              items={statusOptions}
              value={String(form.status ?? '')}
              placeholder="Chọn trạng thái"
              open={openStatus}
              onToggle={() => {
                setOpenStatus(!openStatus);
                setOpenDept(false);
                setOpenGender(false);
              }}
              onSelect={(v) => {
                setForm({ ...form, status: v });
                setOpenStatus(false);
              }}
              className="h-[4rem] rounded-2xl border-2 border-gray-200 focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-100"
            />
          </Field>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 pt-8">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xl shadow-xl hover:shadow-2xl transition-all active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            'Đang lưu...'
          ) : (
            <>
              Lưu thay đổi
              <HiUser className="w-6 h-6" />
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xl transition-all active:scale-98"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  );
}
