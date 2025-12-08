import React from 'react';
import Image from 'next/image';
import IconBB from '@/public/icons/bb.svg';
import IconGroup from '@/public/icons/group.svg';
import IconUser from '@/public/icons/user.svg';
import IconFR from '@/public/icons/friend.svg';
import IconGR from '@/public/icons/group1.svg';
import IconGR1 from '@/public/icons/group.svg';

interface SidebarProps {
  selectedMenu: string;
  onMenuClick: (menu: string) => void;
}

export default function Sidebar({ selectedMenu, onMenuClick }: SidebarProps) {
  const menuItems = [
    {
      name: 'friends',
      label: 'Danh sách bạn bè',
      icon: <Image src={IconFR.src} alt="Arrow" width={20} height={20} className="w-5 h-5 object-contain" />,
    },
    {
      name: 'groups',
      label: 'Danh sách nhóm và cộng đồng',
      icon: <Image src={IconGR.src} alt="Arrow" width={20} height={20} className="w-5 h-5 object-contain" />,
    },
    {
      name: 'requests',
      label: 'Lời mời kết bạn',
      icon: <Image src={IconUser.src} alt="Arrow" width={20} height={20} className="w-5 h-5 object-contain" />,
    },
    {
      name: 'requestsgroup',
      label: 'Lời mời nhóm và cộng đồng',
      icon: <Image src={IconGR1.src} alt="Arrow" width={20} height={20} className="w-5 h-5 object-contain" />,
    },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header Sidebar */}
      <div className="p-4 border-b-[1px] border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Tìm kiếm"
            className="px-3 py-2 text-sm w-48 rounded-full text-black bg-gray-100 focus:outline-none"
          />
          <div className="flex items-center gap-4">
            <button className="cursor-pointer w-6 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <Image src={IconBB.src} alt="Avatar" width={32} height={32} className="w-8 h-8 object-contain" />
            </button>
            <button className="cursor-pointer w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
              <Image src={IconGroup.src} alt="Avatar" width={32} height={32} className="w-8 h-8 object-contain" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => onMenuClick(item.name)}
            className={`w-full cursor-pointer text-left flex items-center p-3 transition-colors ${selectedMenu === item.name ? 'bg-blue-100 text-blue-600' : 'text-gray-800 hover:bg-gray-100'}`}
          >
            {item.icon}
            <span className="ml-3 font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
