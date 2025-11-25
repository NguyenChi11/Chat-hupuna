'use client';

import React from 'react';
import SidebarMenu from '../(menu)/menu';

const LayoutBase = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar bên trái */}
      <SidebarMenu />

      {/* Nội dung chính, chiếm hết phần còn lại */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};

export default LayoutBase;
