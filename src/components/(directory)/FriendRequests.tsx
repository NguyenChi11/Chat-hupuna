/* eslint-disable @next/next/no-img-element */
// File: components/FriendRequests.tsx
'use client';

import React from 'react';
import IconUser from '@/public/icons/user.svg';

// Dữ liệu giả định
const receivedRequests = [
  { name: 'P T Cương', time: '22/08', message: 'Xin chào! Kết bạn với mình nhé!', avatar: '/imgs/img1.jpeg' },
];

const sentRequests = [
  { name: 'Thanh Tâm Nguyễn', time: '02/08', avatar: '/imgs/img2.jpg' },
  { name: 'Sơn Keo Trại', time: '28/07', avatar: '/imgs/img3.jpg' },
  { name: 'Trịnh Xuân Yến', time: '21/07', avatar: '/imgs/img4.jpg' },
];

export default function FriendRequests() {
  return (
    <div className="flex-1 flex flex-col p-4 bg-white shadow-sm overflow-y-auto">
      <h1 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
        <img src={IconUser.src} alt="user" className="w-10 h-10  object-cover" />
        Lời mời kết bạn
      </h1>
      <div className="mb-4">
        <h2 className="text-gray-700 font-semibold mb-2">Lời mời đã nhận ({receivedRequests.length})</h2>
        {receivedRequests.map((request, index) => (
          <div key={index} className="p-4 bg-gray-100 rounded-lg flex items-start space-x-4">
            <img src={request.avatar} alt={request.name} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{request.name}</h3>
                <span className="text-sm text-gray-500">{request.time}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{request.message}</p>
              <div className="flex space-x-2 mt-3">
                <button className="cursor-pointer px-4 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                  Từ chối
                </button>
                <button className="cursor-pointer px-4 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                  Đồng ý
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-gray-700 font-semibold mb-2">Lời mời đã gửi ({sentRequests.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sentRequests.map((request, index) => (
            <div key={index} className="p-4 bg-gray-100 rounded-lg flex flex-col items-center text-center">
              <img src={request.avatar} alt={request.name} className="w-16 h-16 rounded-full object-cover mb-2" />
              <h3 className="font-medium text-gray-800 text-base">{request.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{request.time}</p>
              <button className="cursor-pointer px-4 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                Thu hồi lời mời
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-auto">
        <button className="cursor-pointer text-blue-500 text-sm font-semibold hover:underline">Xem thêm</button>
      </div>

      <div className="mt-6">
        <h2 className="text-gray-700 font-semibold">Gợi ý kết bạn (46)</h2>
        {/* ... Bạn có thể thêm nội dung gợi ý kết bạn ở đây ... */}
      </div>
    </div>
  );
}
