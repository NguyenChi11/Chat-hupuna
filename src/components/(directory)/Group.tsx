/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useMemo } from 'react';
import IconGR from '@/public/icons/group1.svg';
import IconArrow from '@/public/icons/arrow.svg';
import IconAR from '@/public/icons/arrow1.svg';
import IconSH from '@/public/icons/search.svg';
import IconDot from '@/public/icons/dot.svg';
import IconTick from '@/public/icons/tick.svg';

const groups = [
  { name: 'Xác xuất thống kê_125215', members: 26, avatar: '/imgs/img1.jpeg' },
  { name: 'Chủ Nghĩa XH', members: 5, avatar: '/imgs/img2.jpg' },
  { name: 'Chấm Công Văn Phòng', members: 60, avatar: '/imgs/img3.jpg' },
  { name: '125215_Lập trình đa phương tiện trên Mobile', members: 24, avatar: '/imgs/img4.jpg' },
  { name: '2025.T02_KTPM_HL_Dot5', members: 9, avatar: '/imgs/img5.jpg' },
  { name: '125215_CSDL', members: 21, avatar: '/imgs/img6.jpeg' },
  { name: 'Đồ án 2 - 125215', members: 9, avatar: '/imgs/img7.jpg' },
  { name: 'Nhà 155 Bùi Xương Trạch', members: 11, avatar: '/imgs/img8.jpg' },
  { name: 'Mùa thu Hà Nội', members: 7, avatar: '/imgs/img9.png' },
  { name: '125215_Thực Tập Doanh Nghiệp_K19', members: 19, avatar: '/imgs/img10.jpg' },
  { name: 'Cựu_SV_IT_UTEHY', members: 697, avatar: '/imgs/img11.jpg' },
];

type SortOption = 'name-asc' | 'name-desc' | 'activity-new' | 'activity-old';

const sortLabels: Record<SortOption, string> = {
  'name-asc': 'Tên (A-Z)',
  'name-desc': 'Tên (Z-A)',
  'activity-new': 'Hoạt động (mới → cũ)',
  'activity-old': 'Hoạt động (cũ → mới)',
};

export default function GroupsList() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('activity-new');
  const [openSort, setOpenSort] = useState(false);

  // Lọc + sắp xếp
  const filteredGroups = useMemo(() => {
    let result = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'activity-new':
        result = [...result].reverse(); // giả định nhóm sau là mới hơn
        break;
      case 'activity-old':
        // giữ nguyên thứ tự cũ
        break;
    }
    return result;
  }, [search, sortBy]);

  return (
    <main className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-800 font-semibold text-lg">
          <img src={IconGR.src} alt="Avatar" className="w-10 h-10 object-contain" />
          <span>Danh sách nhóm và cộng đồng</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col p-4 bg-white shadow-sm overflow-y-auto">
        <h1 className="font-semibold text-gray-900 text-lg mb-4">Nhóm và cộng đồng ({filteredGroups.length})</h1>
        {/* Thanh tìm kiếm + Sort */}
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0 mb-4 relative">
          {/* Tìm kiếm */}
          <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md w-48 md:w-150">
            <img src={IconSH.src} alt="Search" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="focus:outline-none w-full text-sm md:text-base text-gray-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setOpenSort(!openSort)}
              className="flex cursor-pointer items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md text-sm md:text-base"
            >
              <div className="flex items-center space-x-2">
                <img src={IconArrow.src} alt="Arrow" className="w-3 h-3" />
                <span className="text-gray-600 truncate">{sortLabels[sortBy]}</span>
              </div>
              <img src={IconAR.src} alt="Arrow" className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {openSort && (
              <div className="absolute mt-1 right-0 w-full bg-white border border-gray-200 rounded shadow-md z-10">
                {Object.entries(sortLabels).map(([key, label]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setSortBy(key as SortOption);
                      setOpenSort(false);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex text-sm md:text-base ${
                      sortBy === key ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    {sortBy === key && <img src={IconTick.src} alt="Tick" className="w-4 h-4 md:w-5 md:h-5" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Tất cả */}
          <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md flex-1 text-sm md:text-base">
            <span className="text-gray-600">Tất cả</span>
            <img src={IconAR.src} alt="Arrow" className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>

        {/* Danh sách nhóm */}
        {filteredGroups.map((group, index) => (
          <div
            key={index}
            className="flex items-center p-2 md:p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
          >
            <img src={group.avatar} alt={group.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" />
            <div className="ml-3 flex-1 overflow-hidden">
              <span className="font-semibold text-gray-800 text-sm md:text-base truncate block">{group.name}</span>
              <span className="text-gray-500 text-xs md:text-sm">{group.members} thành viên</span>
            </div>
            <button className="cursor-pointer p-1.5 md:p-2 rounded-full hover:bg-gray-200 text-gray-500">
              <img src={IconDot.src} alt="More" className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}