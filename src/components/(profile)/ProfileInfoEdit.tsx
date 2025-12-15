// components/(profile)/ProfileInfoEdit.tsx

import DepartmentDropdown from '@/components/(profile)/DepartmentDropdown';
import GenderSelector from '@/components/(profile)/GenderSelector';
import InputField from '@/components/(profile)/InputField';
import { HiCheck } from 'react-icons/hi2';

interface Props {
  form: {
    name: string;
    phone: string;
    gender: string;
    birthday: string;
    email: string;
    address: string;
    department: string;
    title: string;
  };
  setForm: (form: Props['form']) => void;
  isSaving: boolean;
  onSave: () => void;
}

export default function ProfileInfoEdit({ form, setForm, isSaving, onSave }: Props) {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <InputField
        icon="user"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
        placeholder="Tên hiển thị"
      />
      <InputField
        icon="phone"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
        placeholder="Số điện thoại"
        type="tel"
      />
      <GenderSelector value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
      <InputField
        icon="calendar"
        value={form.birthday}
        onChange={(v) => setForm({ ...form, birthday: v })}
        type="date"
      />
      <DepartmentDropdown value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
      <InputField
        icon="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
        placeholder="Email"
        type="email"
      />
      <InputField
        icon="location"
        value={form.address}
        onChange={(v) => setForm({ ...form, address: v })}
        placeholder="Địa chỉ"
      />

      <InputField
        icon="briefcase"
        value={form.title}
        onChange={(v) => setForm({ ...form, title: v })}
        placeholder="Chức vụ"
      />

      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full mt-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm cursor-pointer rounded-2xl shadow-2xl transition-all active:scale-98 disabled:opacity-70 flex items-center justify-center gap-3"
      >
        {isSaving ? (
          'Đang lưu...'
        ) : (
          <>
            <HiCheck className="w-6 h-6" />
            Lưu thông tin
          </>
        )}
      </button>
    </div>
  );
}
