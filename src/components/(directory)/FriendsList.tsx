/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useMemo } from 'react';
import IconArrow from '@/public/icons/arrow.svg';
import IconFR from '@/public/icons/friend.svg';
import IconSH from '@/public/icons/search.svg';
import IconAR from '@/public/icons/arrow1.svg';
import IconDot from '@/public/icons/dot.svg';
import IconAR2 from '@/public/icons/arrow2.svg';

// Dữ liệu giả định
const friends = [
  { name: 'An Nga', avatar: '/imgs/img1.jpeg', section: 'A' },
  { name: 'Anh Hùng Angero', avatar: '/imgs/img2.jpg', section: 'A' },
  { name: 'Anh Khánh 312', avatar: '/imgs/img3.jpg', section: 'A' },
  { name: 'Anh Thư', avatar: '/imgs/img4.jpg', section: 'A' },
  { name: 'Arena Van Anh', avatar: '/imgs/img5.jpg', section: 'A' },
  { name: 'Bà Ngật', avatar: '/imgs/img6.jpeg', section: 'B' },
  { name: 'Bà Noiij', avatar: '/imgs/img7.jpg', section: 'B' },
  { name: 'Bác Chung Hà Nội', avatar: '/imgs/img8.jpg', section: 'B' },
  { name: 'Bố', avatar: '/imgs/img9.png', section: 'B' },
  { name: 'Cường Trần', avatar: '/imgs/img10.jpg', section: 'C' },
  { name: 'Chi Nguyễn', avatar: '/imgs/img11.jpg', section: 'C' },
  { name: 'Dũng Hoàng', avatar: '/imgs/img12.jpg', section: 'D' },
  { name: 'Diễm Quỳnh', avatar: '/imgs/img13.jpg', section: 'D' },
  { name: 'Emily Phạm', avatar: '/imgs/img14.jpg', section: 'E' },
  { name: 'Elly Trần', avatar: '/imgs/img15.jpg', section: 'E' },
  { name: 'Phương FPT', avatar: '/imgs/img16.jpg', section: 'F' },
  { name: 'Fiona Lê', avatar: '/imgs/img17.jpg', section: 'F' },
  { name: 'Giang Hồ', avatar: '/imgs/img18.jpg', section: 'G' },
  { name: 'Gia Huy', avatar: '/imgs/img19.jpg', section: 'G' },
  { name: 'Hoàng Anh', avatar: '/imgs/img20.jpg', section: 'H' },
  { name: 'Hồng Nhung', avatar: '/imgs/img21.jpg', section: 'H' },
];

// Các thẻ phân loại
const allTags = [
  'Khách hàng',
  'Công việc',
  'Gia đình',
  'Bạn bè',
  'Trả lời sau',
  'Đồng nghiệp',
  'Vợ',
  'Tin nhắn từ người lạ',
];
const colorClasses = [
  'bg-red-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-yellow-400',
  'bg-green-500',
  'bg-blue-500',
  'bg-pink-400',
  'bg-indigo-500',
];

export default function FriendsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // A-Z mặc định
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('Tất cả');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const options = ['Tất cả', 'Phân loại'];

  // Lọc + sắp xếp bạn bè
  const filteredFriends = useMemo(() => {
    let result = friends.filter((friend) => friend.name.toLowerCase().includes(searchTerm.toLowerCase()));
    result = result.sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name, 'vi');
      return b.name.localeCompare(a.name, 'vi');
    });
    return result;
  }, [searchTerm, sortOrder]);

  // Gom nhóm theo section (sau khi lọc + sắp xếp)
  const groupedFriends = useMemo(() => {
    return filteredFriends.reduce(
      (acc, friend) => {
        (acc[friend.section] = acc[friend.section] || []).push(friend);
        return acc;
      },
      {} as { [key: string]: typeof friends },
    );
  }, [filteredFriends]);

  // Component popup phân loại
  const FilterPopup = () => {
    const toggleTag = (tag: string) => {
      setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    };

    return (
      <div
        className="absolute top-0 right-full mr-2 w-64 bg-white shadow-lg border border-gray-200 rounded-lg z-50"
        onClick={(e) => e.stopPropagation()} // ✨ thêm dòng này
      >
        <div className="p-3">
          <p className="text-xs text-gray-500 mb-2">Theo thẻ phân loại</p>
          <ul className="space-y-2 text-sm text-gray-700">
            {allTags.map((tag, i) => (
              <li key={tag} className="flex items-center space-x-2">
                <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} />
                {tag !== 'Tin nhắn từ người lạ' ? (
                  <span className={`w-3 h-3 rounded-sm ${colorClasses[i]}`}></span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.121 17.804A13.937 13.937 0 0112 15c2.485 0 4.779.755 6.879 2.046M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
                <span>{tag}</span>
              </li>
            ))}
          </ul>
          <div className="border-t mt-2 pt-2">
            <button className="cursor-pointer text-blue-500 text-xs hover:underline">Quản lý thẻ phân loại</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white shadow-sm  relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-800 font-semibold text-lg">
          <img src={IconFR.src} alt="Avatar" className="w-10 h-10 object-contain" />
          <span>Danh sách nhóm và cộng đồng</span>
        </div>
      </div>
      <h1 className="font-semibold text-gray-900 text-lg mt-2 p-2">Bạn Bè({filteredFriends.length})</h1>
      {/* Thanh công cụ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0 mb-4 p-2">
        {/* Ô tìm kiếm */}
        <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md w-full sm:flex-1">
          <img src={IconSH.src} alt="search" className="w-5 h-5 object-contain" />
          <input
            type="text"
            placeholder="Tìm kiếm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="focus:outline-none w-full text-gray-800 text-sm md:text-base"
          />
        </div>

        {/* A-Z sort */}
        <div
          className="relative flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md cursor-pointer w-full sm:flex-1 bg-white"
          onClick={() => setShowSortMenu(!showSortMenu)}
        >
          <div className="flex items-center space-x-2">
            <img src={IconArrow.src} alt="sort" className="w-4 h-4 object-contain" />
            <span className="text-gray-600 text-sm md:text-base">
              {sortOrder === 'asc' ? ' Tên (A - Z)' : ' Tên (Z - A)'}
            </span>
          </div>
          <img src={IconAR.src} alt="arrow" className="w-3 h-3 object-contain" />

          {showSortMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-full z-50">
              <div
                className="px-3 py-2 text-sm text-black hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setSortOrder('asc');
                  setShowSortMenu(false);
                }}
              >
                Tên (A - Z)
              </div>
              <div
                className="px-3 py-2 text-sm text-black hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setSortOrder('desc');
                  setShowSortMenu(false);
                }}
              >
                Tên (Z - A)
              </div>
            </div>
          )}
        </div>

        {/* Dropdown Tất cả */}
        <div className="relative w-full sm:flex-1">
          <div
            className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md cursor-pointer bg-white"
            onClick={() => setOpen(!open)}
          >
            <span className="text-black">{selected}</span>
            <img src={IconAR.src} alt="arrow" className="w-3 h-3 ml-2" />
          </div>

          {open && (
            <ul className="absolute mt-1 w-full border border-gray-200 rounded-md bg-white shadow">
              {options.map((o) => (
                <li
                  key={o}
                  className="flex items-center justify-between px-3 py-2 text-black hover:bg-gray-100 cursor-pointer relative"
                  onClick={() => {
                    if (o === 'Phân loại') {
                      setShowFilterPopup((prev) => !prev);
                    } else {
                      setSelected(o);
                      setOpen(false);
                    }
                  }}
                >
                  <span>{o}</span>
                  {o === 'Phân loại' && <img src={IconAR2.src} alt="arrow-right" className="w-3 h-3 ml-2" />}

                  {/* Popup phân loại */}
                  {o === 'Phân loại' && showFilterPopup && <FilterPopup />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Danh sách bạn bè */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(groupedFriends).map((section) => (
          <div key={section} className="mb-5">
            <h2 className="text-gray-400 font-bold text-base md:text-lg mb-2">{section}</h2>
            {groupedFriends[section].map((friend, index) => (
              <div key={index} className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover"
                />
                <span className="ml-3 font-medium text-gray-800 text-sm md:text-base">{friend.name}</span>
                <div className="ml-auto text-gray-500">
                  <img src={IconDot.src} alt="menu" className="w-3 h-3 object-contain" />
                </div>
              </div>
            ))}
          </div>
        ))}

        {filteredFriends.length === 0 && (
          <p className="text-gray-500 text-center mt-6 text-sm md:text-base">Không tìm thấy bạn bè nào</p>
        )}
      </div>
    </div>
  );
}
