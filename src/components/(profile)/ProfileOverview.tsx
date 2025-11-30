'use client';

import InfoRow from '@/components/(profile)/InforRow';

export default function ProfileOverview({
  data,
}: {
  data: {
    phone: string;
    gender: string;
    birthday: string;
    email: string;
    address: string;
    department: string;
    title: string;
  };
}) {
  const departmentOptions = [
    { value: '101', label: 'Kinh doanh' },
    { value: '102', label: 'Marketing' },
    { value: '103', label: 'Kỹ thuật' },
    { value: '104', label: 'Nhân sự' },
    { value: '105', label: 'Tài chính' },
  ];
  const deptLabel = departmentOptions.find((o) => o.value === String(data.department))?.label || data.department || '';
  return (
    <div className="space-y-4">
      <InfoRow label="Số điện thoại" value={data.phone || ''} />
      <InfoRow label="Giới tính" value={data.gender || ''} />
      <InfoRow label="Ngày sinh" value={data.birthday || ''} />
      <InfoRow label="Email" value={data.email || ''} />
      <InfoRow label="Địa chỉ" value={data.address || ''} />
      <InfoRow label="Phòng ban" value={deptLabel} />
      <InfoRow label="Chức vụ" value={data.title || ''} />
    </div>
  );
}
