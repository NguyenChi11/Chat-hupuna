/* eslint-disable @next/next/no-img-element */
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';

import IconTN from '@/public/icons/tinnhan.png';
import IconDM from '@/public/icons/danhmuc.png';
import IconTNTD from '@/public/icons/tntd.png';
import IconSao from '@/public/icons/sao.png';
import IconTB from '@/public/icons/thongbao.png';
import IconAR2 from '@/public/icons/arrow2.svg';

import IconST1 from '@/public/icons/setting1.svg';
import FlagVN from '@/public/icons/vn.svg';
import FlagEN from '@/public/icons/en.svg';
import IconUser from '@/public/icons/user1.svg';
import IconLG from '@/public/icons/language.svg';
import IconHP from '@/public/icons/help.svg';
import MessgeIcon from '@/public/icons/message-icon.svg';
import PhoneBookIcon from '@/public/icons/phonebook.svg';
import CLoudZIcon from '@/public/icons/cloud-icon-z.svg';
import CLoudIcon from '@/public/icons/cloud-icon.svg';
import BagIcon from '@/public/icons/bag-icon.svg';
import SettingsIcon from '@/public/icons/setting-icon.svg';

import AccountInfoModal from '../base/Profile';
import SettingsPanel from '../base/Setting';
import ZaloContactCard from './help';
import ZaloCloudPopup from './icloud';
import { cookieBase } from '@/utils/cookie';
import { User } from '@/types/User';
import Image from 'next/image';

export default function Sidebar() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showBusinessTools, setShowBusinessTools] = useState<boolean>(false);
  const [showSupport, setShowSupport] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showContactCard, setShowContactCard] = useState(false);

  const settingsRef = useRef<HTMLDivElement | null>(null);
  const businessRef = useRef<HTMLDivElement | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Hàm thực hiện hành động cuối cùng
  const finalizeLogout = async () => {
    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error('Logout failed');
    return data.success;
  };

  const checkLogout = async () => {
    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'me' }),
    });
    if (res.status === 401) return true; // đã logout
    return false; // vẫn còn session
  };

  const handleFinalLogout = async () => {
    try {
      await finalizeLogout(); // gọi API xóa cookie
      const loggedOut = await checkLogout(); // kiểm tra session
      if (loggedOut) {
        cookieBase.remove('info_user'); // xóa client cache
        router.push('/login'); // redirect
      } else {
        alert('Đăng xuất không thành công, vui lòng thử lại.');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi đăng xuất.');
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
        setShowSupport(false);
      }
      if (businessRef.current && !businessRef.current.contains(event.target as Node)) {
        setShowBusinessTools(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTrangChu = () => {
    setActive('home');
    router.push('/home');
  };

  const handleDanhBa = () => {
    setActive('phonebook');
    router.push('/phonebook');
  };

  const [userInfo, setUserInfo] = useState<User | null>(null);

  useEffect(() => {
    const user = cookieBase.get<User>('info_user'); // Lấy user từ cookie
    if (user) setUserInfo(user);
  }, []);

  return (
    <>
      <div className="h-screen w-16 bg-blue-600 flex flex-col items-center py-4 text-white relative">
        {/* Avatar */}
        <div className="mb-6">
          <img src="https://i.pravatar.cc/50" alt="Avatar" className="w-10 h-10 rounded-full cursor-pointer" />
        </div>

        {/* Menu trên */}
        <div className="flex flex-col gap-6 flex-1">
          {/* Trang chủ */}
          <button
            className={`rounded-lg cursor-pointer w-[52px] h-[52px] flex items-center justify-center ${active === 'home' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={handleTrangChu}
          >
            <Image src={MessgeIcon} alt="" width={35} height={35} />
          </button>

          {/* Danh bạ */}
          <button
            className={`rounded-lg cursor-pointer w-[52px] h-[52px] flex items-center justify-center ${active === 'phonebook' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={handleDanhBa}
          >
            <Image src={PhoneBookIcon} alt="" width={35} height={35} />
          </button>
        </div>

        {/* Menu dưới */}
        <div className="flex flex-col gap-6">
          {/* Nút cloud zalo */}
          <div className="relative inline-block">
            <button
              className={`rounded-lg cursor-pointer w-[52px] h-[52px] flex items-center justify-center ${active === 'upload' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
              onClick={() => setActive(active === 'upload' ? null : 'upload')}
            >
              <Image src={CLoudZIcon} alt="" width={35} height={35} />
            </button>

            {/* Popup */}
            {active === 'upload' && (
              <div className="absolute top-1/2 left-full ml-2 -translate-y-1/2 z-50">
                <ZaloCloudPopup onClose={() => setActive(null)} />
              </div>
            )}
          </div>

          {/* Nút my cloud */}
          <button
            className={`rounded-lg cursor-pointer w-[52px] h-[52px] flex items-center justify-center ${active === 'cloud' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={() => setActive('cloud')}
          >
            <Image src={CLoudIcon} alt="" width={32} height={32} />
          </button>

          {/* Nút công cụ */}
          <div className="relative" ref={businessRef}>
            <button
              className={`rounded-lg cursor-pointer w-[52px] h-[52px] flex items-center justify-center ${
                active === 'briefcase' ? 'bg-blue-500' : 'hover:bg-blue-500'
              }`}
              onClick={() => {
                setActive('briefcase');
                setShowBusinessTools((prev) => !prev);
              }}
            >
              <Image src={BagIcon} alt="" width={35} height={35} />
            </button>

            {showBusinessTools && (
              <div className="absolute left-14 bottom-0 w-80 bg-white text-black shadow-lg rounded-lg p-4 z-50">
                <h3 className="font-semibold text-gray-700 mb-3">Công cụ zBusiness</h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-10 text-sm">
                  <div className="flex flex-col items-center cursor-pointer">
                    <img src={IconTN.src} alt="Avatar" className="w-10 h-10 mb-1" />
                    <span className="text-center">Tin nhắn nhanh</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer text-gray-400 ml-1">
                    <img src={IconDM.src} alt="Avatar" className="w-13 h-11" />
                    <span>Danh mục sản phẩm</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer mr-8 text-gray-400">
                    <img src={IconTNTD.src} alt="Avatar" className="w-13 h-11" />
                    <span className="text-center">Trả lời tự động</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer">
                    <img src={IconSao.src} alt="Avatar" className="w-13 h-13" />
                    <span>Tin đánh dấu</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer text-gray-400">
                    <img src={IconTB.src} alt="Avatar" className="w-20 h-13" />
                    <span>Tin đồng thời</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nút cài đặt */}
          <div className="relative" ref={settingsRef}>
            <button
              className={`rounded-lg cursor-pointer w-[52px] h-[52px] flex items-center justify-center
                ${active === 'settings' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
              onClick={() => setShowSettings((prev) => !prev)}
            >
              <Image src={SettingsIcon} alt="" width={35} height={35} className="w-12 h-11 cursor-pointer " />
            </button>

            {showSettings && (
              <div className="absolute left-14 bottom-0 w-56 bg-white text-black shadow-xl rounded-lg py-2 z-50 space-y-1">
                {/* Nút Thông tin tài khoản */}
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
                >
                  <img src={IconUser.src} alt="User Icon" className="w-5 h-5" />
                  <span className="text-gray-700 font-medium">Thông tin tài khoản</span>
                </button>

                {userInfo && (
                  <AccountInfoModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    user={userInfo} // Truyền dynamic user
                    iconUpdateUrl="/path/to/icon.svg"
                  />
                )}

                {/* Nút Cài đặt */}
                <button
                  className="w-full flex items-center gap-1 px-2.5 py-2 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
                  onClick={() => {
                    setShowSettings(false);
                    setShowSettingsPanel(true);
                  }}
                >
                  <img src={IconST1.src} alt="Settings Icon" className="w-8 h-8" />
                  <span className="text-gray-700 font-medium">Cài đặt</span>
                </button>

                {/* Nút Ngôn ngữ */}
                <div className="relative">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
                    onClick={() => setShowLang((prev) => !prev)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={IconLG.src} alt="Language Icon" className="w-5 h-5" />
                      <span className="text-gray-700 font-medium">Ngôn ngữ</span>
                    </div>
                    <img src={IconAR2.src} alt="AR2" className="w-5 h-5 cursor-pointer" />
                  </button>

                  {showLang && (
                    <div className="absolute left-full top-0 ml-1 w-40 bg-white text-black shadow-xl rounded-lg py-2 z-50">
                      <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer">
                        <img src={FlagVN.src} alt="VN" className="w-5 h-5 object-cover" />
                        <span>Tiếng Việt</span>
                      </button>
                      <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer">
                        <img src={FlagEN.src} alt="EN" className="w-5 h-5 object-cover" />
                        <span>Tiếng Anh</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Nút Hỗ trợ */}
                <div className="relative">
                  {/* Nút chính */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
                    onClick={() => setShowSupport((prev) => !prev)}
                  >
                    <div className="flex items-center gap-3">
                      <img src={IconHP.src} alt="Support Icon" className="w-5 h-5" />
                      <span className="text-gray-700 font-medium">Hỗ trợ</span>
                    </div>
                    <img src={IconAR2.src} alt="AR2" className="w-5 h-5 cursor-pointer" />
                  </button>

                  {/* Dropdown hỗ trợ */}
                  {showSupport && (
                    <div className="absolute left-full bottom-0 -translate-y-1 w-56 bg-white text-black shadow-xl rounded-lg z-50">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => {
                          setShowContactCard(true); // mở popup
                          setShowSupport(false); // ẩn dropdown
                        }}
                      >
                        Thông tin phiên bản
                      </button>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                        Liên hệ
                      </button>
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                        Gửi file log tới Zalo
                      </button>
                    </div>
                  )}

                  {/* Popup hiển thị ZaloContactCard */}
                  {showContactCard && (
                    <div
                      className="fixed inset-0 flex items-center justify-center z-50"
                      onClick={() => setShowContactCard(false)} // click ra ngoài đóng popup
                    >
                      <ZaloContactCard />
                    </div>
                  )}
                </div>
                {/* Nút Đăng xuất */}
                <button
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 transition-colors rounded-lg cursor-pointer"
                  onClick={() => {
                    // Ẩn dropdown cài đặt trước khi mở modal xác nhận
                    setShowSettings(false);
                    handleLogout();
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Xác nhận Đăng xuất</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn thoát khỏi tài khoản không?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleFinalLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SettingsPanel full-screen overlay */}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm px-3">
          <div
            className="w-full max-w-4xl max-h-[calc(100%-3rem)] bg-gray-100 rounded-lg shadow-lg overflow-hidden
                 transform transition-all duration-300 ease-out
                 scale-95 opacity-0 animate-showModal"
          >
            <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
          </div>
        </div>
      )}
    </>
  );
}
