import React, { useState } from 'react';
import ToggleSwitch from '../component/toggleswitch';
import IconName from '@/public/icons/name.svg';
import IconSticker from '@/public/icons/sticker.svg';

// --- 3. Component Chính: SettingsPanel  ---
const UtilitiesPanel = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  return (
    // Bố cục tổng thể và nền
    <div className="p-4 bg-[#f4f5f8] min-h-screen font-sans">
      <div className="max-w-xl mx-auto">
        {/* === PHẦN 1: Gợi ý Sticker === */}
        <h2 className="text-black text-[17px] font-bold mb-2 pl-2 pt-4">Gợi ý Sticker</h2>
        <div className="bg-white rounded-lg shadow-sm px-4 py-1 ">
          <div className="flex justify-between items-center mt-2 mb-2">
            <p className="text-black text-sm sm:text-base">
              Hiện gợi ý Sticker phù hợp với nội dung tin nhắn đang soạn
            </p>
            <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
          </div>
        </div>

        {/* === PHẦN 2: Gợi ý @ === */}
        <h2 className="text-black text-[17px] font-bold mb-2 pl-2 mt-6">Gợi ý @</h2>
        <div className="bg-white rounded-lg shadow-sm h-30 px-4">
          {/* Gợi ý nhắc tên */}
          <div className="flex justify-between items-center mb-3 ">
            {/* Icon + text */}
            <div className="flex items-center gap-2 mt-3">
              <img src={IconName.src} className="w-8 h-8 " alt="Name" />
              <div className="flex flex-col">
                <p className="text-black text-[15px] font-bold">Gợi ý nhắc tên</p>
                <p className="text-black text-[14px]">Gợi ý nhắc tên theo nội dung đang soạn</p>
              </div>
            </div>

            {/* ToggleSwitch bên phải */}
            <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
          </div>

          {/* Tìm sticker */}
          <div className="flex justify-between items-center mb-4">
            {/* Icon + text */}
            <div className="flex items-center gap-2">
              <img src={IconSticker.src} className="w-8 h-8 " alt="Sticker" />
              <div className="flex flex-col">
                <p className="text-black text-[14px] font-bold">Tìm sticker</p>
                <p className="text-black text-[14px]">Gõ từ khóa để tìm Sticker</p>
              </div>
            </div>

            {/* ToggleSwitch bên phải */}
            <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilitiesPanel;
