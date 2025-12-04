// components/(profile)/DepartmentDropdown.tsx
'use client';

import React, { useState } from 'react';
import { HiBuildingOffice2, HiChevronDown, HiCheck } from 'react-icons/hi2';

interface Department {
  value: string;
  label: string;
  color: string;
}

const departments: Department[] = [
  { value: '101', label: 'Kinh doanh', color: 'bg-pink-500 text-white' },
  { value: '102', label: 'Marketing', color: 'bg-purple-500 text-white' },
  { value: '103', label: 'Kỹ thuật', color: 'bg-blue-500 text-white' },
  { value: '104', label: 'Nhân sự', color: 'bg-green-500 text-white' },
  { value: '105', label: 'Tài chính', color: 'bg-yellow-500 text-black' },
];

interface DepartmentDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DepartmentDropdown({ value, onChange }: DepartmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = departments.find((d) => d.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-2 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all 
                   flex items-center justify-between text-left font-medium text-sm border-2 border-transparent 
                   focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
      >
        <div className="flex items-center gap-3">
          <HiBuildingOffice2 className="w-4 h-4 text-gray-600" />
          <span className={selected ? 'text-gray-900' : 'text-gray-500'}>{selected?.label || 'Chọn phòng ban'}</span>
        </div>
        <HiChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
            {departments.map((dept) => (
              <button
                key={dept.value}
                onClick={() => {
                  onChange(dept.value);
                  setIsOpen(false);
                }}
                className="w-full px-5 py-3 hover:bg-gray-50 transition-all flex items-center justify-between text-left"
              >
                <span className="font-medium">{dept.label}</span>
                {value === dept.value && <HiCheck className="w-5 h-5 text-indigo-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
