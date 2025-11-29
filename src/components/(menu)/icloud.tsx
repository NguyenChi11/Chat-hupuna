import React from 'react';
import Zicloud from '@/public/imgs/zCloud.png';
import Image from 'next/image';

interface ZaloCloudPopupProps {
  onClose: () => void; // bắt buộc có hàm onClose
}

const ZaloCloudPopup: React.FC<ZaloCloudPopupProps> = ({ onClose }) => {
  return (
    <div className="relative w-85 ml-1 bg-white rounded-xl overflow-hidden shadow-xl border border-gray-200">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="cursor-pointer absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
        aria-label="Close"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      {/* Top Image Section */}
      <div className="bg-[#f0f7ff] p-4 flex flex-col items-center justify-center relative">
        <Image priority width={100} height={40} src={Zicloud.src} alt="ZCloud" className="w-100 h-40 object-contain" />

        {/* Accent Elements */}
        <span className="absolute top-2 left-1/4 w-2 h-2 bg-red-500 rounded-full rotate-45"></span>
        <span className="absolute top-6 right-1/4 w-2 h-2 bg-yellow-400 rounded-full"></span>
        <span className="absolute bottom-6 left-6 w-3 h-3 bg-blue-400 rounded-lg"></span>
        <span className="absolute bottom-8 right-10 w-2 h-2 bg-green-500 rounded-full"></span>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Bảo toàn dữ liệu Zalo với zCloud</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Khám phá ngay tiện ích lưu trữ an toàn ảnh, video, và tệp quan trọng trên zCloud, đồng thời giải phóng dung
          lượng máy.
        </p>

        <button className="cursor-pointer w-full py-2 bg-[#e8e9ea] text-sm font-semibold text-gray-800 rounded-lg hover:bg-[#dcdde0] transition duration-200">
          Tìm hiểu zCloud ngay
        </button>
      </div>
    </div>
  );
};

export default ZaloCloudPopup;
