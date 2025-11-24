import React, { useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import ImgSang from '@/public/imgs/sang.png';
import ImgToi from '@/public/imgs/toi.png';
import ImgHeThong from '@/public/imgs/hethong.png';
import ToggleSwitch from '../component/toggleswitch';

interface ThemeOptionProps {
  name: string;
  value: 'light' | 'dark' | 'system';
  currentTheme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  image: StaticImageData | string;
}

const InterfaceSettings = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [useAvatarBg, setUseAvatarBg] = useState(false);

  return (
    <>
      {/* --- Khung Cài đặt giao diện --- */}
      <div className="flex items-center gap-x-2 ml-15 sm:ml-15  mb-5">
        <h2 className="text-[18px] font-bold text-gray-800 ">Cài đặt giao diện</h2>
        <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 rounded-full">Beta</span>
      </div>
      <div className="p-4 sm:p-6 w-full sm:max-w-lg lg:w-[600px] xl:w-[700px] mx-auto bg-white rounded-xl shadow-lg mb-6">
        {/* --- Cài đặt giao diện --- */}
        <div className="p-4  flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 sm:gap-4">
          <ThemeOption name="Sáng" value="light" currentTheme={theme} setTheme={setTheme} image={ImgSang} />

          <ThemeOption name="Tối" value="dark" currentTheme={theme} setTheme={setTheme} image={ImgToi} />

          <ThemeOption name="Hệ Thống" value="system" currentTheme={theme} setTheme={setTheme} image={ImgHeThong} />
        </div>
      </div>

      {/* --- Khung Hình nền chat --- */}
      <h2 className="text-[18px] font-bold text-gray-800 ml-15 mb-4">Hình nền chat</h2>

      <div className="p-4 sm:p-6 w-full sm:max-w-lg lg:w-[600px] xl:w-[700px] mx-auto bg-white rounded-xl shadow-lg">
        <div className="flex justify-between items-center">
          <p className="text-gray-700">Sử dụng Avatar làm hình nền</p>
          <ToggleSwitch checked={useAvatarBg} onChange={setUseAvatarBg} />
        </div>
      </div>
    </>
  );
};

// Component con cho từng lựa chọn Theme
const ThemeOption = ({ name, value, currentTheme, setTheme, image }: ThemeOptionProps) => {
  const isSelected = currentTheme === value;

  return (
    <div className="flex flex-col items-center cursor-pointer" onClick={() => setTheme(value)}>
      {/* Hiển thị ảnh thay cho box */}
      <div
        className={`w-24 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
          isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
        }`}
      >
        <Image src={image} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Radio Button & Tên */}
      <div className="flex items-center mt-3 ">
        <input
          type="radio"
          name="theme"
          value={value}
          checked={isSelected}
          onChange={() => setTheme(value)}
          className="form-radio h-4 w-4 text-blue-600 border-gray-300 cursor-pointer"
        />
        <label className={`ml-2 text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>{name}</label>
      </div>
    </div>
  );
};

export default InterfaceSettings;
