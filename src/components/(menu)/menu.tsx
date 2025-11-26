'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';

import IconTN from '@/public/icons/tinnhan.png';
import IconDM from '@/public/icons/danhmuc.png';
import IconTNTD from '@/public/icons/tntd.png';
import IconSao from '@/public/icons/sao.png';
import IconTB from '@/public/icons/thongbao.png';
import IconAR2 from '@/public/icons/arrow2.svg';

import FlagVN from '@/public/icons/vn.svg';
import FlagEN from '@/public/icons/en.svg';
import PhoneBookIcon from '@/public/icons/phonebook.svg';
import CLoudZIcon from '@/public/icons/cloud-icon-z.svg';
import CLoudIcon from '@/public/icons/cloud-icon.svg';
import BagIcon from '@/public/icons/bag-icon.svg';
import SettingsIcon from '@/public/icons/setting-icon.svg';

import PopupProfile from '../base/PopupProfile';
import SettingsPanel from '../base/Setting';
import ZaloContactCard from './help';
import ZaloCloudPopup from './icloud';
import { cookieBase } from '../../utils/cookie';
import { User } from '../../types/User';
import Image from 'next/image';
import { getProxyUrl } from '../../utils/utils';
import Messenger from '@/components/svg/Messenger';
import ICGloabl from '@/components/svg/ICGloabl';
import ICSitting from '@/components/svg/ICSitting';
import ICPerson from '@/components/svg/ICPerson';
import ICQuestion from '@/components/svg/ICQuestion';

export default function SidebarMenu() {
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

  const finalizeLogout = async () => {
    try {
      // Gọi API logout để xoá cookie HttpOnly `session_token` trên server
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Xóa session trên cookie (JWT) phía client (nếu có lưu thêm bản non-HttpOnly)
    cookieBase.remove('session_token');
    cookieBase.remove('remember_login');

    // Xóa thông tin user & cài đặt remember_login ở localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('info_user');
      localStorage.removeItem('remember_login');
    }

    router.push('/');
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
    setActive('directory');
    router.push('/directory');
  };

  const [userInfo, setUserInfo] = useState<User | null>(null);

  useEffect(() => {
    // Lấy thông tin user từ localStorage (đã được lưu sau khi login)
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem('info_user');
      if (!raw) return;

      const parsed = JSON.parse(raw) as User;
      if (parsed && parsed._id) {
        setUserInfo(parsed);
      }
    } catch (e) {
      console.error('Không đọc được info_user từ localStorage', e);
    }
  }, []);

  return (
    <>
      <div className="h-screen w-16 bg-blue-600 flex flex-col items-center py-4 text-white relative">
        {/* Avatar (kiểu Zalo: click để mở menu tài khoản) */}
        <div className="mb-6 relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="cursor-pointer w-10 h-10 rounded-full overflow-hidden border-2 border-white/60 hover:border-yellow-300 transition-colors bg-white/10 flex items-center justify-center"
          >
            {userInfo?.avatar ? (
              // Avatar thật từ thông tin user (qua proxy để load đúng ảnh từ Mega)
              <Image
                src={getProxyUrl(userInfo.avatar)}
                width={40}
                height={40}
                alt={userInfo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              // Fallback: ký tự đầu tên giống Zalo
              <span className="text-sm font-semibold">{(userInfo?.name || 'U').charAt(0).toUpperCase()}</span>
            )}
          </button>

          {/* Menu tài khoản bật khi click avatar */}
          {showSettings && (
            <div className="absolute left-14 top-0 w-64 bg-white text-black shadow-2xl rounded-xl py-2 z-50">
              {/* Header nhỏ trong menu: tên + email/số điện thoại nếu có */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                  {userInfo?.avatar ? (
                    <Image
                      src={getProxyUrl(userInfo.avatar)}
                      width={40}
                      height={40}
                      alt={userInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (userInfo?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userInfo?.name || 'Tài khoản Hupuna'}</p>
                  <p className="text-xs text-gray-500 truncate">{userInfo?.username}</p>
                </div>
              </div>

              {/* Nút Thông tin tài khoản */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ICPerson className="w-5 h-5" stroke="#000000" />
                <span className="text-sm text-gray-800">Thông tin tài khoản</span>
              </button>

              {/* Nút Cài đặt */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setShowSettingsPanel(true)}
              >
                <ICSitting className="w-5 h-5" stroke="#000000" />
                <span className="text-sm text-gray-800">Cài đặt</span>
              </button>

              {/* Ngôn ngữ */}
              <div className="relative">
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setShowLang((prev) => !prev)}
                >
                  <div className="flex items-center gap-3">
                    <ICGloabl className="w-5 h-5" stroke="#000000" />
                    <span className="text-sm text-gray-800">Ngôn ngữ</span>
                  </div>
                  <Image src={IconAR2} width={20} height={20} alt="AR2" className="w-4 h-4" />
                </button>

                {showLang && (
                  <div className="absolute left-full top-0 ml-1 w-40 bg-white text-black shadow-xl rounded-lg py-2 z-50">
                    <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                      <Image src={FlagVN} width={20} height={20} alt="VN" className="w-5 h-5 object-cover" />
                      <span className="text-sm">Tiếng Việt</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer">
                      <Image src={FlagEN} width={20} height={20} alt="EN" className="w-5 h-5 object-cover" />
                      <span className="text-sm">Tiếng Anh</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hỗ trợ */}
              <div className="relative">
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setShowSupport((prev) => !prev)}
                >
                  <div className="flex items-center gap-3">
                    <ICQuestion className="w-5 h-5" stroke="#000000" />
                    <span className="text-sm text-gray-800">Hỗ trợ</span>
                  </div>
                  <Image src={IconAR2} width={20} height={20} alt="AR2" className="w-4 h-4" />
                </button>

                {showSupport && (
                  <div className="absolute left-full top-0 ml-1 w-56 bg-white text-black shadow-xl rounded-lg z-50">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer text-sm"
                      onClick={() => {
                        setShowContactCard(true); // mở popup
                        setShowSupport(false); // ẩn dropdown
                      }}
                    >
                      Thông tin phiên bản
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer text-sm">
                      Liên hệ
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors cursor-pointer text-sm">
                      Gửi file log tới Zalo
                    </button>
                  </div>
                )}

                {/* Popup hiển thị ZaloContactCard */}
                {showContactCard && (
                  <div
                    className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowContactCard(false)} // click ra ngoài đóng popup
                  >
                    <ZaloContactCard />
                  </div>
                )}
              </div>

              {/* Đăng xuất */}
              <button
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => {
                  setShowSettings(false);
                  handleLogout();
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>

        {/* Menu trên */}
        <div className="flex flex-col gap-2 flex-1 ">
          <button
            className={`p-2 rounded-lg cursor-pointer w-10 h-10 ${active === 'home' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={handleTrangChu}
          >
            <Messenger className="w-6 h-6 text-white" />
          </button>
          <button
            className={`p-2 rounded-lg cursor-pointer w-10 h-10 ${active === 'directory' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={handleDanhBa}
          >
            <Image src={PhoneBookIcon} alt="" width={35} height={35} className="w-6 h-6" />
          </button>
        </div>

        {/* Menu dưới */}
        <div className="flex flex-col gap-4">
          <div className="relative inline-block">
            <button
              className={`p-2 rounded-lg cursor-pointer w-10 h-10 ${active === 'upload' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
              onClick={() => setActive(active === 'upload' ? null : 'upload')}
            >
              <Image src={CLoudZIcon} alt="" width={35} height={35} className="w-6 h-6" />
            </button>

            {/* Popup */}
            {active === 'upload' && (
              <div className="absolute top-1/2 left-full ml-2 -translate-y-1/2 z-50">
                <ZaloCloudPopup onClose={() => setActive(null)} />
              </div>
            )}
          </div>

          <button
            className={`p-2 rounded-lg cursor-pointer w-10 h-10 ${active === 'cloud' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={() => setActive('cloud')}
          >
            <Image src={CLoudIcon} alt="" width={32} height={32} className="w-6 h-6" />
          </button>

          {/* Nút briefcase */}
          <div className="relative" ref={businessRef}>
            <button
              className={`p-2 rounded-lg cursor-pointer w-10 h-10 ${
                active === 'briefcase' ? 'bg-blue-500' : 'hover:bg-blue-500'
              }`}
              onClick={() => {
                setActive('briefcase');
                setShowBusinessTools((prev) => !prev);
              }}
            >
              <Image src={BagIcon} alt="" width={35} height={35} className="w-6 h-6" />
            </button>

            {showBusinessTools && (
              <div className="absolute left-14 bottom-0 w-80 bg-white text-black shadow-lg rounded-lg p-4 z-50">
                <h3 className="font-semibold text-gray-700 mb-3">Công cụ zBusiness</h3>
                <div className="grid grid-cols-3 gap-x-4 gap-y-10 text-sm">
                  <div className="flex flex-col items-center cursor-pointer">
                    <Image src={IconTN} width={40} height={40} alt="Avatar" className="w-10 h-10 mb-1" />
                    <span className="text-center">Tin nhắn nhanh</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer text-gray-400 ml-1">
                    <Image src={IconDM} width={40} height={40} alt="Avatar" className="w-13 h-11" />
                    <span>Danh mục sản phẩm</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer mr-8 text-gray-400">
                    <Image src={IconTNTD} width={40} height={40} alt="Avatar" className="w-13 h-11" />
                    <span className="text-center">Trả lời tự động</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer">
                    <Image src={IconSao} width={40} height={40} alt="Avatar" className="w-13 h-13" />
                    <span>Tin đánh dấu</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer text-gray-400">
                    <Image src={IconTB} width={40} height={40} alt="Avatar" className="w-20 h-13" />
                    <span>Tin đồng thời</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nút cài đặt (đơn giản, không còn dropdown – mọi thứ đã chuyển lên avatar) */}
          <button
            className={`p-2 rounded-lg cursor-pointer w-10 h-10 ${active === 'settings' ? 'bg-blue-500' : 'hover:bg-blue-500'}`}
            onClick={() => setShowSettingsPanel(true)}
            title="Cài đặt"
          >
            <Image src={SettingsIcon} alt="" width={32} height={32} className="w-6 h-6 cursor-pointer" />
          </button>
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
                onClick={() => {
                  finalizeLogout(); // Thực hiện hành động
                  setShowLogoutConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup xem thông tin tài khoản (Profile) */}
      {userInfo && (
        <PopupProfile
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          user={userInfo}
          onAvatarUpdated={(newUrl) =>
            setUserInfo((prev) =>
              prev
                ? {
                    ...prev,
                    avatar: newUrl,
                  }
                : prev,
            )
          }
        />
      )}
      {/* SettingsPanel popup kiểu Zalo */}
      {showSettingsPanel && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSettingsPanel(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl px-3 md:px-0">
            <SettingsPanel onClose={() => setShowSettingsPanel(false)} />
          </div>
        </div>
      )}
    </>
  );
}
