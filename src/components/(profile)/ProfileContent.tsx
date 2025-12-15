'use client';

import ProfileQR from '@/components/(profile)/PorfileQR';
import ProfileSettings from '@/components/(profile)/ProfileSettings';
import ProfileOverview from '@/components/(profile)/ProfileOverview';
import { ProfileInfo } from '@/components/(profile)/ProfileInfo';

import { HiUser, HiQrCode, HiCog6Tooth, HiInformationCircle } from 'react-icons/hi2';

export default function ProfileContent({
  tab,
  isOwner,
  overviewData,
  handleOverviewData,
}: {
  tab: string;
  isOwner: boolean;
  overviewData: Record<string, unknown>;
  handleOverviewData: (data: Record<string, unknown>) => void;
}) {
  // Icon tiêu đề cho từng tab – đẹp như Zalo
  const getTabHeader = () => {
    const baseClasses = 'flex items-center gap-3 text-xl font-bold text-gray-800 mb-6 pb-3 border-b border-gray-200';

    switch (tab) {
      case 'info':
        return (
          <div className={baseClasses}>
            <HiInformationCircle className="w-8 h-8 text-indigo-600" />
            <span>Thông tin cá nhân</span>
          </div>
        );
      case 'qr':
        return (
          <div className={baseClasses}>
            <HiQrCode className="w-8 h-8 text-green-600" />
            <span>Mã QR của bạn</span>
          </div>
        );
      case 'settings':
        return (
          <div className={baseClasses}>
            <HiCog6Tooth className="w-8 h-8 text-purple-600" />
            <span>Cài đặt</span>
          </div>
        );
      case 'profile':
      default:
        return (
          <div className={baseClasses}>
            <HiUser className="w-8 h-8 text-blue-600" />
            <span>Hồ sơ công khai</span>
          </div>
        );
    }
  };

  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      {/* Tiêu đề + icon đẹp – responsive */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-500">{getTabHeader()}</div>

      {/* Nội dung chính – mượt, có hiệu ứng */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        {/* Thông tin cá nhân (chỉ owner chỉnh sửa được) */}
        {tab === 'info' && (
          <>
            {isOwner ? (
              <ProfileInfo
                isOwner={isOwner}
                onDataChange={(data) => handleOverviewData(data as Record<string, unknown>)}
              />
            ) : (
              <ProfileOverview
                data={
                  overviewData as {
                    phone: string;
                    gender: string;
                    birthday: string;
                    email: string;
                    address: string;
                    department: string;
                    title: string;
                  }
                }
              />
            )}
          </>
        )}

        {/* Mã QR */}
        {tab === 'qr' && (
          <div className="flex justify-center py-12">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <ProfileQR />
            </div>
          </div>
        )}

        {/* Cài đặt – chỉ owner */}
        {tab === 'settings' && isOwner && (
          <div className="bg-gray-50/70 rounded-3xl p-6 border border-gray-200">
            <ProfileSettings />
          </div>
        )}

        {/* Hồ sơ công khai (profile tab) */}
        {tab === 'profile' && (
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-3xl p-6 border border-blue-100">
            <ProfileOverview
              data={
                overviewData as {
                  phone: string;
                  gender: string;
                  birthday: string;
                  email: string;
                  address: string;
                  department: string;
                  title: string;
                }
              }
            />
          </div>
        )}
      </div>

      {/* Empty state nếu không có gì (hiếm khi xảy ra) */}
      {!['info', 'qr', 'settings', 'profile'].includes(tab) && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Chưa có nội dung</p>
        </div>
      )}
    </div>
  );
}
