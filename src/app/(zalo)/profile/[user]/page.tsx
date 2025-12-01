'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useViewingUser } from '@/hooks/(profile)/useViewingUser';
import { useUploadImage } from '@/hooks/(profile)/useUploadImage';
import { useCurrentUser } from '@/hooks/(profile)/useCurrentUser';
import ProfileHeader from '@/components/(profile)/ProfileHeader';
import ProfileTabs from '@/components/(profile)/ProfileTabs';
import ProfileContent from '@/components/(profile)/ProfileContent';

export default function ProfileByIdPage() {
  const params = useParams();
  const viewingId = typeof params?.['user'] === 'string' ? params['user'] : '';

  const { currentUser, currentId } = useCurrentUser();
  const isOwner = Boolean(
    viewingId &&
      (viewingId === String(currentUser?.['_id'] || '') ||
        viewingId === String((currentUser?.['username'] as string) || '')),
  );

  const {
    overviewData,
    setOverviewData,
    displayName,
    displayDept,
    displayTitle,
    avatar,
    background,
    setAvatar,
    setBackground,
  } = useViewingUser(viewingId, !!isOwner, currentUser);

  const { handleUpload, isUploadingAvatar, isUploadingBackground } = useUploadImage(
    currentId,
    !!isOwner,
    setAvatar,
    setBackground,
  );

  const [tabLeft, setTabLeft] = useState<'profile' | 'qr'>('profile');
  const [tabRight, setTabRight] = useState<'info' | 'settings' | 'qr'>('info');
  const [tabMobile, setTabMobile] = useState<'profile' | 'qr' | 'info' | 'settings'>('profile');
  const tabsLeft = isOwner ? ['profile', 'qr'] : [];
  const tabsRight = isOwner ? ['info', 'settings'] : ['info', 'qr'];
  const tabsMobile = isOwner ? ['profile', 'qr', 'info', 'settings'] : ['profile', 'qr'];

  const departmentLabel = useMemo(() => {
    const opts = [
      { value: '101', label: 'Kinh doanh' },
      { value: '102', label: 'Marketing' },
      { value: '103', label: 'Kỹ thuật' },
      { value: '104', label: 'Nhân sự' },
      { value: '105', label: 'Tài chính' },
    ];
    const val = String(displayDept || overviewData.department || '');
    return opts.find((o) => o.value === val)?.label || val || 'Chưa xác định';
  }, [displayDept, overviewData.department]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {/* Mobile layout: one combined navigation with 4 tabs (owner) or 3 tabs (non-owner) */}
      <div className="md:hidden w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] mb-[2rem] sm:mb-0 md:h-[95dvh] md:max-h-[56.25rem]">
        <div>
          <ProfileHeader
            isOwner={!!isOwner}
            background={background ?? null}
            avatar={avatar ?? null}
            handleUpload={handleUpload}
            isUploadingAvatar={isUploadingAvatar}
            isUploadingBackground={isUploadingBackground}
          />
        </div>

        <div className="px-8 pt-20 pb-6 text-center bg-white border-b border-gray-100">
          <h2 className="text-3xl font-black text-gray-900">{displayName || 'Hồ sơ'}</h2>
          {departmentLabel && <p className="text-lg font-medium text-indigo-600 mt-2">{departmentLabel}</p>}
          {displayTitle && <p className="text-sm text-gray-500 mt-1">{displayTitle}</p>}
        </div>

        <ProfileTabs
          tabs={tabsMobile}
          tab={tabMobile}
          setTab={(item: string) => setTabMobile(item as 'profile' | 'qr' | 'info' | 'settings')}
        />

        <div className="flex-1 h-[24rem] overflow-auto bg-gray-50/50 ">
          <ProfileContent
            tab={tabMobile}
            isOwner={!!isOwner}
            overviewData={overviewData}
            handleOverviewData={(data) =>
              setOverviewData(
                data as {
                  phone: string;
                  gender: string;
                  birthday: string;
                  email: string;
                  address: string;
                  department: string;
                  title: string;
                },
              )
            }
          />
        </div>
      </div>

      {/* Desktop/tablet layout: split into two columns */}
      <div className="hidden md:flex md:flex-row w-full  bg-white rounded-3xl shadow-2xl overflow-hidden h-[95dvh] max-h-[56.25rem]">
        <div className="md:w-1/2">
          <ProfileHeader
            isOwner={!!isOwner}
            background={background ?? null}
            avatar={avatar ?? null}
            handleUpload={handleUpload}
            isUploadingAvatar={isUploadingAvatar}
            isUploadingBackground={isUploadingBackground}
          />

          {/* Info Section (only owner) */}
          {isOwner && (
            <div className="px-8 pt-20 pb-6 text-center bg-white border-b border-gray-100">
              <h2 className="text-3xl font-black text-gray-900">{displayName || 'Hồ sơ'}</h2>
              {departmentLabel && <p className="text-lg font-medium text-indigo-600 mt-2">{departmentLabel}</p>}
              {displayTitle && <p className="text-sm text-gray-500 mt-1">{displayTitle}</p>}
            </div>
          )}

          {/* Tabs for Hồ sơ & QR (only owner) */}
          {isOwner && (
            <ProfileTabs
              tabs={tabsLeft}
              tab={tabLeft}
              setTab={(item: string) => setTabLeft(item as 'qr' | 'profile')}
            />
          )}

          {/* Content: show only Hồ sơ & QR here (only owner) */}
          {isOwner && (
            <div className="flex-1 h-[24rem] overflow-auto bg-gray-50/50">
              {(tabLeft === 'profile' || tabLeft === 'qr') && (
                <ProfileContent
                  tab={tabLeft}
                  isOwner={!!isOwner}
                  overviewData={overviewData}
                  handleOverviewData={(data) =>
                    setOverviewData(
                      data as {
                        phone: string;
                        gender: string;
                        birthday: string;
                        email: string;
                        address: string;
                        department: string;
                        title: string;
                      },
                    )
                  }
                />
              )}
            </div>
          )}
        </div>
        <div className="md:w-1/2">
          <ProfileTabs
            tabs={tabsRight}
            tab={tabRight}
            setTab={(item: string) => setTabRight(item as 'info' | 'settings' | 'qr')}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            {(tabRight === 'info' || tabRight === 'settings' || tabRight === 'qr') && (
              <ProfileContent
                tab={tabRight}
                isOwner={!!isOwner}
                overviewData={overviewData}
                handleOverviewData={(data) =>
                  setOverviewData(
                    data as {
                      phone: string;
                      gender: string;
                      birthday: string;
                      email: string;
                      address: string;
                      department: string;
                      title: string;
                    },
                  )
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
