import React, { useState } from 'react';
import ToggleSwitch from '../ui/toggleswitch';
import IconAR2 from '@/public/icons/arrow2.svg';
import RadioItem from '../ui/radioItem';
import Image from 'next/image';

type ExcelDisplayOption = 'Dạng hình' | 'Dạng chữ' | 'Luôn hỏi';

interface LinkItemProps {
  label: string;
  rightContent: string | React.ReactNode;
}

const LinkItem = ({ label, rightContent }: LinkItemProps) => (
  <div className="flex items-center justify-between py-3 cursor-pointer">
    <div className="text-black text-sm sm:text-base">{label}</div>
    <div className="flex items-center text-gray-500">
      <span className="mr-2 text-xs sm:text-sm">{rightContent}</span>
      <svg
        className="w-4 h-4 rtl:rotate-180"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </div>
  </div>
);

const MessageComponent = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [excelDisplayOption, setExcelDisplayOption] = useState<ExcelDisplayOption>('Luôn hỏi');

  return (
    <div className="max-w-lg w-full mx-auto space-y-4 px-3 sm:px-0">
      {/* Tín nhắn nhanh */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-800">Tin nhắn nhanh</h2>
        <p className="text-xs sm:text-sm text-gray-800">
          Tạo, chỉnh sửa và quản lý phím tắt cho những tin nhắn thường sử dụng trong hội thoại
        </p>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-black text-sm sm:text-base">Tin nhắn nhanh</p>
          <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
        </div>
        <div className="flex items-center justify-between py-2 cursor-pointer">
          <span className="text-sm sm:text-base text-black font-medium">Quản lý tin nhắn nhanh</span>
          <span className="text-gray-400 flex-shrink-0">
            <Image width={24} height={24} src={IconAR2.src} className="w-4 h-4 sm:w-5 sm:h-5" alt="Arrow" />
          </span>
        </div>
      </div>

      {/* Thiết lập ẩn trò chuyện */}
      <h2 className="text-base sm:text-lg font-bold text-gray-800">Thiết lập trò chuyện</h2>

      <div className="bg-white shadow-lg rounded-lg p-4">
        <LinkItem label="Mã PIN" rightContent="Đang bật" />
      </div>

      {/* Thư mục Ưu tiên và Khác */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-800">Chia mục Ưu tiên và Khác</h2>
        <p className="text-xs sm:text-sm text-gray-800">
          Tách riêng trò chuyện không ưu tiên và chuyển sang mục Khác để tập trung hơn
        </p>
      </div>
      <div className="bg-white shadow-lg rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-black text-sm sm:text-base">Tin nhắn nhanh</p>
          <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
        </div>
      </div>

      {/* Hiển thị nội dung Excel */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-800">Hiển thị nội dung Excel</h2>
        <p className="text-xs sm:text-sm text-gray-800">Định dạng khi sao chép file Excel sau đó dán vào Zalo</p>
      </div>
      <div className="bg-white shadow-lg rounded-lg p-4 space-y-2">
        <RadioItem
          label="Dạng hình"
          value="Dạng hình"
          selectedValue={excelDisplayOption}
          onChange={setExcelDisplayOption}
        />
        <RadioItem
          label="Dạng chữ"
          value="Dạng chữ"
          selectedValue={excelDisplayOption}
          onChange={setExcelDisplayOption}
        />
        <RadioItem
          label="Luôn hỏi"
          value="Luôn hỏi"
          selectedValue={excelDisplayOption}
          onChange={setExcelDisplayOption}
        />
      </div>

      {/* Cài đặt khác */}
      <h2 className="text-base sm:text-lg font-bold text-gray-800">Cài đặt khác</h2>

      <div className="bg-white shadow-lg rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-black text-sm sm:text-base">Bấm đúp vào vùng cạnh tin nhắn để trả lời</p>
          <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-black text-sm sm:text-base">Bạn sẽ thấy bạn bè bạn đang soạn tin nhắn</p>
          <ToggleSwitch checked={isSoundEnabled} onChange={setIsSoundEnabled} />
        </div>
      </div>
    </div>
  );
};

export default MessageComponent;
