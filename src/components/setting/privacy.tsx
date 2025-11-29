import React, { useState } from 'react';
import IconAR1 from '@/public/icons/arrow1.svg';
import IconAR2 from '@/public/icons/arrow2.svg';
import ToggleSwitch from '../ui/toggleswitch';
import Dropdown from '../ui/dropdown ';
import CheckboxItem from '../ui/checkboxItem';
import Image from 'next/image';

// --- Main ---

const SettingsPage = () => {
  const [showList, setShowList] = useState(false);

  const blockedUsers = [
    { _id: 1, name: 'Nguyễn Văn A' },
    { _id: 2, name: 'Trần Thị B' },
    { _id: 3, name: 'Lê Văn C' },
  ];

  return (
    <div className="min-h-screen pt-4 sm:pt-5 pb-10">
      <div className="max-w-xl mx-auto space-y-5 px-3 sm:px-4">
        {/* Cá nhân */}
        <h2 className="text-base sm:text-[1.0625rem] font-semibold text-black ml-2 sm:ml-3">Cá nhân</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 sm:py-3 px-3 sm:px-5 gap-2 sm:gap-0">
            <span className="text-sm sm:text-base text-black font-medium">Hiện ngày sinh</span>
            <Dropdown
              options={['Hiện đầy đủ ngày, tháng, năm', 'Chỉ hiện ngày, tháng', 'Không hiển thị']}
              initialValue={'Hiện đầy đủ ngày, tháng, năm'}
            />
          </div>
          <div className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-5">
            <span className="text-sm sm:text-base text-black font-medium">Hiển thị trạng thái truy cập</span>
            <ToggleSwitch checked={true} />
          </div>
        </div>

        {/* Tin nhắn và cuộc gọi */}
        <h2 className="text-base sm:text-[1.0625rem] font-semibold text-black ml-2 sm:ml-3">Tin nhắn và cuộc gọi</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-5">
            <span className="text-sm sm:text-base text-black font-medium">Hiện trạng thái Đã xem</span>
            <ToggleSwitch checked={true} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-2 sm:py-3 px-3 sm:px-5 gap-2 sm:gap-0">
            <div className="flex flex-col">
              <span className="text-sm sm:text-base text-black font-medium">Cho phép nhắn tin</span>
              <span className="text-xs text-gray-500">Ai được nhắn tin cho bạn</span>
            </div>
            <Dropdown options={['Tất cả mọi người', 'Bạn bè', 'Không ai']} initialValue={'Tất cả mọi người'} />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-2 sm:py-3 px-3 sm:px-5 gap-2 sm:gap-0">
            <div className="flex flex-col">
              <span className="text-sm sm:text-base text-black font-medium">Cho phép gọi điện</span>
              <span className="text-xs text-gray-500">Ai được gọi điện cho bạn</span>
            </div>
            <Dropdown
              options={['Bạn bè và người lạ từng liên hệ', 'Tất cả mọi người', 'Bạn bè']}
              initialValue={'Bạn bè và người lạ từng liên hệ'}
            />
          </div>
        </div>

        {/* Chặn tin nhắn */}
        <h2 className="text-base sm:text-[1.0625rem] font-semibold text-black ml-2 sm:ml-3">Chặn tin nhắn</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden ">
          <button
            onClick={() => setShowList(!showList)}
            className="w-full cursor-pointer flex justify-between items-center py-2 sm:py-3 px-3 sm:px-5 hover:bg-gray-50 cursor-pointer"
          >
            <span className="text-sm sm:text-base text-black font-medium ">Danh sách chặn</span>
            <span className="text-gray-400">
              {showList ? (
                <Image alt="arrow" width={20} height={20} src={IconAR1.src} className="w-5 h-5" />
              ) : (
                <Image alt="arrow" width={20} height={20} src={IconAR2.src} className="w-5 h-5" />
              )}
            </span>
          </button>
          {showList && (
            <div className="border-t border-gray-200">
              {blockedUsers.map((user) => (
                <div key={user._id} className="flex justify-between items-center py-2 px-3 sm:px-5 hover:bg-gray-50">
                  <span className="text-gray-700 text-sm sm:text-base">{user.name}</span>
                  <button className="text-red-500 text-xs sm:text-sm hover:underline cursor-pointer">Bỏ chặn</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nguồn tìm kiếm */}
        <h2 className="text-base sm:text-[1.0625rem] font-semibold text-black ml-2 sm:ml-3">Nguồn tìm kiếm</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-5">
            <div className="flex flex-col max-w-sm">
              <span className="text-sm sm:text-base text-black font-medium">Cho phép tìm qua số điện thoại</span>
              <span className="text-xs text-gray-500">+(84) 978099763</span>
            </div>
            <ToggleSwitch checked={true} />
          </div>
        </div>

        {/* Cho phép người lạ kết bạn */}
        <h2 className="text-base sm:text-[1.0625rem] font-semibold text-black ml-2 sm:ml-3">
          Cho phép người lạ kết bạn
        </h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <CheckboxItem _id="qr" label="Mã QR của tôi" />
          <CheckboxItem _id="group" label="Nhóm chung" />
          <CheckboxItem _id="zalo-card" label="Danh thiếp Zalo" />
          <CheckboxItem _id="suggest" label="Gợi ý 'Có thể bạn quen'" />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
