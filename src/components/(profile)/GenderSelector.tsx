// components/(profile)/GenderSelector.tsx
'use client';

import React, { useState } from 'react';
import { HiCheck, HiChevronDown } from 'react-icons/hi2';

interface GenderSelectorProps {
  value: string;
  onChange: (gender: string) => void;
}

const genders = ['Nam', 'Nữ', 'Khác'] as const;

export default function GenderSelector({ value, onChange }: GenderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = value || 'Chọn giới tính';

  return (
    <div className="relative">
      {/* Nút chính – giống hệt select */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-5 py-2 rounded-2xl bg-white border-2 font-medium text-left
          flex items-center justify-between transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-indigo-100
          ${
            isOpen
              ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-lg'
              : 'border-gray-300 hover:border-indigo-400 hover:shadow-md'
          }
          ${value ? 'text-gray-900' : 'text-gray-500'}
        `}
      >
        <span className="flex items-center gap-3">
          {/* Icon check nếu đã chọn */}
          {value && <HiCheck className="w-5 h-5 text-indigo-600" />}
          {selectedLabel}
        </span>
        <HiChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu – hiện khi mở */}
      {isOpen && (
        <>
          {/* Backdrop mờ */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
            {genders.map((gender) => (
              <button
                key={gender}
                onClick={() => {
                  onChange(gender);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-5 py-3 text-left font-medium transition-all flex items-center justify-between
                  hover:bg-indigo-50 active:bg-indigo-100
                  ${value === gender ? 'bg-indigo-50 text-indigo-700' : 'text-gray-800'}
                `}
              >
                <span>{gender}</span>
                {value === gender && <HiCheck className="w-5 h-5 text-indigo-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
