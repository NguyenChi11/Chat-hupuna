'use client';

import ProfileQR from '@/components/(profile)/PorfileQR';
import { ProfileInfo } from '@/components/(profile)/ProfileInfo';
import ProfileSettings from '@/components/(profile)/ProfileSettings';
import Image from 'next/image';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getProxyUrl } from '@/utils/utils';
import ProfileOverview from '@/components/(profile)/ProfileOverview';

export default function ProfileByIdPage() {
  const params = useParams();
  const viewingId = typeof params?.['user'] === 'string' ? params['user'] : '';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'info' | 'qr' | 'settings' | 'profile'>('info');
  const [overviewData, setOverviewData] = useState({
    phone: '',
    gender: '',
    birthday: '',
    email: '',
    address: '',
    department: '',
    title: '',
  });
  const [displayName, setDisplayName] = useState('');
  const [displayDept, setDisplayDept] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [background, setBackground] = useState<string | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const handleOverviewData = useCallback(
    (v: {
      phone: string;
      gender: string;
      birthday: string;
      email: string;
      address: string;
      department: string;
      title: string;
    }) => setOverviewData(v),
    [],
  );

  const currentUser = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('info_user') : null;
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, []);

  const currentId = useMemo(
    () => String((currentUser?.['username'] as string) || currentUser?.['_id'] || ''),
    [currentUser],
  );
  const isOwner = currentId && viewingId && currentId === viewingId;

  useEffect(() => {
    const fillFrom = (u: Record<string, unknown> | null) => {
      if (!u) return;
      setDisplayName(String(u['name'] || ''));
      setDisplayDept(String(u['department'] || ''));
      setDisplayTitle(String(u['title'] || ''));
      setAvatar(typeof u['avatar'] === 'string' ? (u['avatar'] as string) : undefined);
      setBackground(typeof u['background'] === 'string' ? (u['background'] as string) : undefined);
      const ov = {
        phone: String(u['phone'] || ''),
        gender: String(u['gender'] || ''),
        birthday: String(u['birthday'] || ''),
        email: String(u['email'] || ''),
        address: String(u['address'] || ''),
        department: String(u['department'] || ''),
        title: String(u['title'] || ''),
      };
      setOverviewData(ov);
    };

    if (isOwner) {
      fillFrom(currentUser as Record<string, unknown> | null);
      setTab('info');
      return;
    }

    const fetchViewingUser = async () => {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getById', _id: viewingId }),
        });
        const json = await res.json();
        const dataArr = Array.isArray(json?.data) ? (json.data as Array<Record<string, unknown>>) : undefined;
        const userRow = (json?.row as Record<string, unknown> | undefined) || dataArr?.[0];
        const userObj = (userRow ||
          (json?.user as Record<string, unknown> | undefined) ||
          (json as Record<string, unknown>)) as Record<string, unknown> | null;
        if (userObj) fillFrom(userObj);
      } catch {}
    };
    if (viewingId) void fetchViewingUser();
  }, [isOwner, currentUser, viewingId, searchParams, router, currentId]);

  const handleUpload = async (file: File, kind: 'avatar' | 'background') => {
    if (!isOwner || !currentId) return;
    if (!file.type.startsWith('image/')) return;
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) return;
    try {
      if (kind === 'avatar') setIsUploadingAvatar(true);
      else setIsUploadingBackground(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', kind);
      formData.append('sender', currentId);
      formData.append('receiver', '');
      formData.append('type', 'image');
      formData.append('folderName', kind === 'avatar' ? 'Avatars' : 'Backgrounds');
      const uploadRes = await fetch(`/api/upload?uploadId=${kind}_${currentId}`, { method: 'POST', body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success || !uploadJson.link) return;
      const newUrl = uploadJson.link as string;
      const updateRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field:
            currentUser && typeof currentUser['username'] === 'string' && currentUser['username'] ? 'username' : '_id',
          value: currentId,
          data: { [kind]: newUrl },
        }),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok || updateJson.error) return;
      if (kind === 'avatar') setAvatar(newUrl);
      else setBackground(newUrl);
      try {
        const raw = localStorage.getItem('info_user');
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          localStorage.setItem('info_user', JSON.stringify({ ...parsed, [kind]: newUrl }));
        }
      } catch {}
    } finally {
      if (kind === 'avatar') setIsUploadingAvatar(false);
      else setIsUploadingBackground(false);
    }
  };

  const tabs = isOwner ? ['info', 'profile', 'qr', 'settings'] : ['info', 'qr'];

  return (
    <div className="w-full h-screen bg-[#F3F4F6] flex justify-center px-3 py-6 overflow-hidden">
      <div className="w-full max-w-[700px] bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
        <div className="relative h-48 md:h-56 shrink-0 bg-gradient-to-br from-[#1B92FF] to-[#147BCE]">
          {background && (
            <Image src={getProxyUrl(background)} alt="background" fill className="object-cover" sizes="100vw" />
          )}
          {isOwner && (
            <label className="absolute right-3 top-3 px-3 py-2 bg-white/80 rounded-lg shadow cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f, 'background');
                  e.currentTarget.value = '';
                }}
                disabled={isUploadingBackground}
              />
              {isUploadingBackground ? 'Đang tải...' : 'Đổi ảnh nền'}
            </label>
          )}
          <div className="absolute bottom-[-3rem] left-1/2 -translate-x-1/2">
            <label className="group cursor-pointer relative block">
              <div className="w-[110px] h-[110px] rounded-full overflow-hidden border-4 border-white shadow-lg">
                {avatar ? (
                  <Image
                    src={getProxyUrl(avatar)}
                    alt="avatar"
                    width={110}
                    height={110}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              {isOwner && (
                <>
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-white transition-opacity ${
                      isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <span className="px-2 py-1 rounded bg-black/50 text-xs">
                      {isUploadingAvatar ? 'Đang tải...' : 'Đổi ảnh'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f, 'avatar');
                      e.currentTarget.value = '';
                    }}
                    disabled={isUploadingAvatar}
                  />
                </>
              )}
            </label>
          </div>
        </div>

        <div className="mt-16 text-center shrink-0">
          <h2 className="text-2xl font-semibold text-gray-900">{displayName || 'Hồ sơ'}</h2>
          {(() => {
            const departmentOptions = [
              { value: '101', label: 'Kinh doanh' },
              { value: '102', label: 'Marketing' },
              { value: '103', label: 'Kỹ thuật' },
              { value: '104', label: 'Nhân sự' },
              { value: '105', label: 'Tài chính' },
            ];
            const deptLabel = departmentOptions.find((o) => o.value === String(displayDept))?.label || displayDept;
            return displayDept ? (
              <p className="text-gray-500 mt-1 text-sm md:text-base">Phòng ban: {deptLabel}</p>
            ) : null;
          })()}
          {displayTitle && <p className="text-gray-400 mt-1 text-xs md:text-sm">Chức vụ: {displayTitle}</p>}
        </div>

        <div className="flex mt-6 border-b shrink-0">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item as 'info' | 'qr' | 'settings' | 'profile')}
              className={`flex-1 py-3 text-center capitalize md:text-lg ${
                tab === item ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : 'text-gray-500'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="p-5 md:p-8 overflow-y-auto flex-1">
          {tab === 'info' &&
            (isOwner ? (
              <ProfileInfo isOwner={isOwner} onDataChange={handleOverviewData} />
            ) : (
              <ProfileOverview data={overviewData} />
            ))}
          {tab === 'qr' && <ProfileQR />}
          {tab === 'settings' && isOwner && <ProfileSettings />}
          {tab === 'profile' && <ProfileOverview data={overviewData} />}
        </div>
      </div>
    </div>
  );
}
