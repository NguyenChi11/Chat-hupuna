'use client';

import React from 'react';
import Image from 'next/image';
import IconGR from '@/public/icons/group.svg';
export default function GroupRequest() {
  return (
    <div className="flex h-screen w-full font-sans bg-gray-50">
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center space-x-2 text-black font-semibold text-lg">
            <Image src={IconGR.src} alt="Arrow" width={40} height={40} className="w-10 h-10 object-contain" />
            <span>Lời mời vào nhóm và cộng đồng</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-24 h-24 text-gray-300 mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75ZM3.75 12h.007v.008H3.75V12ZM3.75 17.25h.007v.008H3.75v-.008Z"
            />
          </svg>
          <p className="text-gray-600 mb-2">Không có lời mời vào nhóm và cộng đồng</p>
          <p className="text-gray-500 text-sm">
            Khi nào tôi nhận được lời mời?
            <a href="#" className="text-blue-500 hover:underline ml-1">
              Tìm hiểu thêm
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
