// components/ZaloContactCard.jsx

import React from 'react';
import Zalo from '@/public/imgs/bannerzalo.png';
import Image from 'next/image';

const ZaloContactCard = () => {
  return (
    <div className="w-120 h-60 rounded-xl overflow-hidden shadow-2xl bg-white">
      {/* HEADER SECTION (Màu xanh Zalo) */}
      <div className="relative w-120 h-20">
        {/* Ảnh nền */}
        <Image src={Zalo} alt="Zalo Banner" fill className="object-cover " priority />
      </div>
      {/* CONTENT SECTION (Thông tin liên hệ) */}
      <div className="p-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 ">Liên hệ</h2>

        {/* Email Row */}
        <div className="flex items-center mb-4 text-base">
          <span className="text-gray-600 font-medium w-32">Email:</span>
          <a
            href="mailto:feedbackpc@zalo.me"
            className="text-[#0068FF] hover:text-blue-700 hover:underline transition duration-150 break-words"
          >
            feedbackpc@zalo.me
          </a>
        </div>

        {/* Website Row */}
        <div className="flex items-center text-base">
          <span className="text-gray-600 font-medium w-32">Website:</span>
          <a
            href="https://zalo.me/pc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0068FF] hover:text-blue-700 hover:underline transition duration-150 break-words"
          >
            https://zalo.me/pc
          </a>
        </div>
      </div>
    </div>
  );
};

export default ZaloContactCard;
