'use client';

import React, { useState } from 'react';
import Sidebar from '../../../components/(directory)/Sidebar';
import MainContent from '../../../components/(directory)/MainContent';

export default function HomePage() {
  const [selectedMenu, setSelectedMenu] = useState<string>('messages'); // mặc định cho desktop
  const [mobileMenu, setMobileMenu] = useState<string | null>(null); // null = Sidebar

  const handleMenuClick = (menu: string) => {
    setSelectedMenu(menu);
    setMobileMenu(menu); // mobile chuyển sang main
  };

  const handleCloseMain = () => {
    setMobileMenu(null); // quay lại Sidebar (mobile)
  };

  return (
    <div className="h-screen bg-gray-100">
      {/* Desktop layout */}
      <div className="hidden sm:flex h-full bg-white shadow-md">
        <div className="w-80 border-r border-gray-200">
          <Sidebar selectedMenu={selectedMenu} onMenuClick={handleMenuClick} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <MainContent selectedMenu={selectedMenu} />
        </div>
      </div>
      {/* Mobile layout */}
      <div className="block sm:hidden h-full relative">
        {mobileMenu === null ? (
          // Hiện Sidebar full màn
          <div className="w-full h-full bg-white shadow-md">
            <Sidebar selectedMenu={''} onMenuClick={handleMenuClick} />
          </div>
        ) : (
          // Hiện MainContent full màn
          <div className="w-full h-full relative overflow-y-auto">
            {/* Nút X chỉ có ở mobile */}
            <button
              onClick={handleCloseMain}
              className="absolute cursor-pointer top-4 right-4 z-10 px-3 py-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition cursor-pointer"
            >
              ✕
            </button>
            <MainContent selectedMenu={mobileMenu} />
          </div>
        )}
      </div>
    </div>
  );
}
