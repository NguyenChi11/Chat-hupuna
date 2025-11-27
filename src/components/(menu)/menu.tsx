'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { cookieBase } from '../../utils/cookie';
import { getProxyUrl } from '../../utils/utils';
import { User } from '../../types/User';

import PopupProfile from '../base/PopupProfile';
import ZaloContactCard from './help';
import ZaloCloudPopup from './icloud';

// React Icons - Modern & Clean
import {
  HiHome,
  HiUserGroup,
  HiCloud,
  HiBriefcase,
  HiCog,
  HiQuestionMarkCircle,
  HiOutlineTranslate,
  HiLogout,
  HiUserCircle,
  HiChevronRight,
  HiChevronDown,
  HiLightningBolt,
  HiCollection,
  HiChatAlt2,
  HiStar,
  HiClock,
} from 'react-icons/hi';
import { MdCloudUpload } from 'react-icons/md';
import { MenuItem } from '@/components/ui/MenuItem';
import { NavButton } from '@/components/ui/NavButton';
import { LangItem, SupportItem } from '@/components/ui/LangItem';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function SidebarMenu() {
  const router = useRouter();

  // Single source of truth cho menu mở
  const [openMenu, setOpenMenu] = useState<{
    avatar: boolean;
    business: boolean;
    cloud: boolean;
    submenu: 'lang' | 'support' | null;
  }>({
    avatar: false,
    business: false,
    cloud: false,
    submenu: null,
  });

  const [activeItem, setActiveItem] = useState<string>('home');
  const [showContactCard, setShowContactCard] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [userInfo, setUserInfo] = useState<User | null>(null);

  const avatarRef = useRef<HTMLDivElement>(null);
  const businessRef = useRef<HTMLDivElement>(null);

  // Load user
  useEffect(() => {
    try {
      const raw = localStorage.getItem('info_user');
      if (raw) setUserInfo(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to parse info_user', e);
    }
  }, []);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setOpenMenu((prev) => ({ ...prev, avatar: false, submenu: null }));
      }
      if (businessRef.current && !businessRef.current.contains(e.target as Node)) {
        setOpenMenu((prev) => ({ ...prev, business: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setOpenMenu((prev) => ({ ...prev, avatar: false }));
  };

  const finalizeLogout = async () => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    cookieBase.remove('session_token');
    cookieBase.remove('remember_login');
    localStorage.removeItem('info_user');
    localStorage.removeItem('remember_login');
    router.push('/');
  };

  const navigate = useCallback(
    (path: string, key: string) => {
      setActiveItem(key);
      router.push(path);
    },
    [router],
  );

  const toggleMenu = (menu: keyof typeof openMenu, value?: boolean) => {
    setOpenMenu((prev) => ({
      ...prev,
      [menu]: value !== undefined ? value : !prev[menu],
      submenu: menu === 'avatar' && value !== true ? null : prev.submenu,
    }));
  };

  return (
    <>
      {/* Sidebar */}
      <div className="h-screen w-16 bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center py-5 text-white relative shadow-2xl">
        {/* Avatar */}
        <div ref={avatarRef} className="mb-8 relative">
          <button
            onClick={() => toggleMenu('avatar')}
            className="group relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/20 hover:ring-yellow-400 transition-all duration-300 shadow-lg"
          >
            {userInfo?.avatar ? (
              <Image
                src={getProxyUrl(userInfo.avatar)}
                width={44}
                height={44}
                alt={userInfo.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold">
                {(userInfo?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Avatar Dropdown */}
          {openMenu.avatar && userInfo && (
            <div className="absolute left-16 top-0 w-72 bg-white text-gray-800 rounded-2xl shadow-2xl  z-50 animate-in fade-in slide-in-from-left-2 duration-200">
              {/* User Header */}
              <div
                className="px-5 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
                onClick={() => {
                  setOpenMenu((prev) => ({ ...prev, avatar: false, submenu: null }));
                  router.push('/profile');
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/30">
                    {userInfo.avatar ? (
                      <Image
                        src={getProxyUrl(userInfo.avatar)}
                        width={48}
                        height={48}
                        alt=""
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/30 backdrop-blur flex items-center justify-center text-2xl font-bold">
                        {(userInfo.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate">{userInfo.name || 'Tài khoản'}</p>
                    <p className="text-sm opacity-90 truncate">@{userInfo.username}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <MenuItem
                  icon={<HiUserCircle />}
                  label="Thông tin tài khoản"
                  onClick={() => {
                    setOpenMenu({ avatar: false, business: false, cloud: false, submenu: null });
                    setShowAccountModal(true);
                  }}
                />

                {/* === NGÔN NGỮ === */}
                <div className="relative">
                  <MenuItem
                    icon={<HiOutlineTranslate />}
                    label="Ngôn ngữ"
                    trailing={
                      openMenu.submenu === 'lang' ? (
                        <HiChevronDown className="text-gray-400" />
                      ) : (
                        <HiChevronRight className="text-gray-400" />
                      )
                    }
                    onClick={() =>
                      setOpenMenu((prev) => ({
                        ...prev,
                        submenu: prev.submenu === 'lang' ? null : 'lang',
                      }))
                    }
                  />
                  {/* Submenu Ngôn ngữ - hiện bên phải */}
                  {openMenu.submenu === 'lang' && (
                    <div
                      className="absolute left-full top-0 ml-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50"
                      // Dừng sự kiện click ngoài để submenu không bị đóng ngay
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LangItem label="Tiếng Việt" flag="VN" active />
                      <LangItem label="English" flag="US" />
                      <LangItem label="中文 (简体)" flag="CN" />
                    </div>
                  )}
                </div>

                {/* === HỖ TRỢ === */}
                <div className="relative">
                  <MenuItem
                    icon={<HiQuestionMarkCircle />}
                    label="Hỗ trợ"
                    trailing={
                      openMenu.submenu === 'support' ? (
                        <HiChevronDown className="text-gray-400" />
                      ) : (
                        <HiChevronRight className="text-gray-400" />
                      )
                    }
                    onClick={() =>
                      setOpenMenu((prev) => ({
                        ...prev,
                        submenu: prev.submenu === 'support' ? null : 'support',
                      }))
                    }
                  />
                  {/* Submenu Hỗ trợ */}
                  {openMenu.submenu === 'support' && (
                    <div
                      className="absolute left-full top-0 ml-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SupportItem
                        label="Thông tin phiên bản"
                        onClick={() => {
                          setShowContactCard(true);
                          setOpenMenu({ avatar: false, business: false, cloud: false, submenu: null });
                        }}
                      />
                      <SupportItem label="Liên hệ hỗ trợ" />
                      <SupportItem label="Gửi file log tới Zalo" />
                      <SupportItem label="Hướng dẫn sử dụng" />
                    </div>
                  )}
                </div>

                {/* Đăng xuất */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <MenuItem
                    icon={<HiLogout className="text-red-600" />}
                    label="Đăng xuất"
                    className="text-red-600 font-medium hover:bg-red-50"
                    onClick={() => {
                      setOpenMenu({ avatar: false, business: false, cloud: false, submenu: null });
                      handleLogout();
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-3">
          <NavButton
            icon={<HiHome />}
            active={activeItem === 'home'}
            onClick={() => navigate('/home', 'home')}
            tooltip="Trang chủ"
          />
          <NavButton
            icon={<HiUserGroup />}
            active={activeItem === 'directory'}
            onClick={() => navigate('/directory', 'directory')}
            tooltip="Danh bạ"
          />
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3">
          {/* Cloud Z */}
          <div className="relative">
            <NavButton
              icon={<MdCloudUpload />}
              active={openMenu.cloud}
              onClick={() => {
                toggleMenu('cloud');
                setActiveItem(openMenu.cloud ? '' : 'upload');
              }}
              tooltip="Cloud Z"
            />
            {openMenu.cloud && (
              <div className="absolute left-16 top-1/2 -translate-y-1/2 z-50">
                <ZaloCloudPopup
                  onClose={() => {
                    toggleMenu('cloud', false);
                    setActiveItem('');
                  }}
                />
              </div>
            )}
          </div>

          <NavButton icon={<HiCloud />} tooltip="iCloud" onClick={() => {}} />

          {/* Business Tools */}
          <div ref={businessRef} className="relative">
            <NavButton
              icon={<HiBriefcase />}
              active={openMenu.business}
              onClick={() => toggleMenu('business')}
              tooltip="zBusiness"
            />
            {openMenu.business && (
              <div className="absolute left-16 bottom-0 w-80 bg-white rounded-2xl shadow-2xl p-6 z-50 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-5">Công cụ zBusiness</h3>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { icon: <HiLightningBolt className="text-yellow-500" />, label: 'Tin nhắn nhanh' },
                    { icon: <HiCollection className="text-gray-400" />, label: 'Danh mục', disabled: true },
                    { icon: <HiChatAlt2 className="text-gray-400" />, label: 'Trả lời tự động', disabled: true },
                    { icon: <HiStar className="text-purple-500" />, label: 'Tin đánh dấu' },
                    { icon: <HiClock className="text-gray-400" />, label: 'Tin đồng thời', disabled: true },
                  ].map((tool, i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center ${tool.disabled ? 'opacity-50' : 'cursor-pointer hover:scale-110 transition-transform'}`}
                    >
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mb-2 shadow-md">
                        {tool.icon}
                      </div>
                      <span className="text-xs text-center text-gray-600">{tool.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <NavButton
            icon={<HiCog />}
            active={activeItem === 'setting'}
            onClick={() => navigate('/setting', 'setting')}
            tooltip="Cài đặt"
          />
        </div>
      </div>

      {/* Modals */}
      {showLogoutConfirm && (
        <ConfirmModal
          title="Xác nhận đăng xuất"
          message="Bạn có chắc chắn muốn thoát tài khoản?"
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={finalizeLogout}
        />
      )}

      {showContactCard && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowContactCard(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ZaloContactCard />
          </div>
        </div>
      )}

      {userInfo && (
        <PopupProfile
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          user={userInfo}
          onAvatarUpdated={(newUrl) => setUserInfo((prev) => (prev ? { ...prev, avatar: newUrl } : null))}
        />
      )}
    </>
  );
}
