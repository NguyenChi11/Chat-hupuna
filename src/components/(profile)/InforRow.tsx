// components/(profile)/InfoRow.tsx
import React from 'react';
import { HiUser, HiPhone, HiCalendar, HiEnvelope, HiMapPin, HiBuildingOffice2, HiBriefcase } from 'react-icons/hi2';

const iconMap: Record<string, React.ReactNode> = {
  user: <HiUser className="w-6 h-6 text-gray-500" />,
  phone: <HiPhone className="w-6 h-6 text-gray-500" />,
  calendar: <HiCalendar className="w-6 h-6 text-gray-500" />,
  email: <HiEnvelope className="w-6 h-6 text-gray-500" />,
  location: <HiMapPin className="w-6 h-6 text-gray-500" />,
  building: <HiBuildingOffice2 className="w-6 h-6 text-gray-500" />,
  briefcase: <HiBriefcase className="w-6 h-6 text-gray-500" />,
};

interface InfoRowProps {
  icon?: keyof typeof iconMap;
  label: string;
  value: string;
  badge?: React.ReactNode;
}

export default function InfoRow({ icon, label, value, badge }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {icon ? iconMap[icon] : null}
        <span className="text-gray-600 font-medium text-base">{label}</span>
      </div>
      <div className="text-right">
        <p className="font-semibold text-gray-900 text-base">{value}</p>
        {badge && <div className="mt-1.5">{badge}</div>}
      </div>
    </div>
  );
}
