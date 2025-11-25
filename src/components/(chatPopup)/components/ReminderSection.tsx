import React from 'react';
import Image from 'next/image';
import IconClock from '@/public/icons/clock.svg';

export default function ReminderSection() {
  return (
    <div className="space-y-3 text-gray-600 text-sm bg-white py-2 px-4 mb-2">
      <div className="flex items-center gap-2 cursor-pointer">
        <Image src={IconClock} alt="clock" width={20} height={20} className="w-5" />
        <span>Danh sách nhắc hẹn</span>
      </div>
    </div>
  );
}


