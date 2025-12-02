// components/(profile)/ProfileInfoView.tsx

import InfoRow from '@/components/(profile)/InforRow';

const departments: Record<string, { label: string; color: string }> = {
  '101': { label: 'Kinh doanh', color: 'bg-pink-100 text-pink-700' },
  '102': { label: 'Marketing', color: 'bg-purple-100 text-purple-700' },
  '103': { label: 'Kỹ thuật', color: 'bg-blue-100 text-blue-700' },
  '104': { label: 'Nhân sự', color: 'bg-green-100 text-green-700' },
  '105': { label: 'Tài chính', color: 'bg-yellow-100 text-yellow-700' },
};

export default function ProfileInfoView({
  form,
}: {
  form: {
    name?: string;
    phone?: string;
    gender?: string;
    birthday?: string;
    email?: string;
    address?: string;
    department?: string;
    title?: string;
  };
}) {
  const dept = form.department ? departments[form.department] : undefined;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <InfoRow icon="user" label="Tên hiển thị" value={form.name || 'Chưa đặt'} />
      <InfoRow icon="phone" label="Số điện thoại" value={form.phone || 'Chưa đặt'} />
      <InfoRow icon="user" label="Giới tính" value={form.gender || 'Chưa chọn'} />
      <InfoRow icon="calendar" label="Ngày sinh" value={form.birthday || 'Chưa chọn'} />
      <InfoRow icon="email" label="Email" value={form.email || 'Chưa đặt'} />
      <InfoRow icon="location" label="Địa chỉ" value={form.address || 'Chưa đặt'} />
      <InfoRow
        icon="building"
        label="Phòng ban"
        value={dept?.label || 'Chưa xác định'}
        badge={dept && <span className={`px-3 py-1 rounded-full text-xs font-medium ${dept.color}`}>{dept.label}</span>}
      />
      <InfoRow icon="briefcase" label="Chức vụ" value={form.title || 'Chưa đặt'} />
    </div>
  );
}
