'use client';

import ProfileQR from '@/components/(profile)/PorfileQR';
import ProfileSettings from '@/components/(profile)/ProfileSettings';
import ProfileOverview from '@/components/(profile)/ProfileOverview';
import { ProfileInfo } from '@/components/(profile)/ProfileInfo';

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
  return (
    <div className="p-6 md:p-8">
      {tab === 'info' &&
        (isOwner ? (
          <ProfileInfo isOwner={isOwner} onDataChange={(data) => handleOverviewData(data as Record<string, unknown>)} />
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
        ))}

      {tab === 'qr' && <ProfileQR />}
      {tab === 'settings' && isOwner && <ProfileSettings />}
      {tab === 'profile' && (
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
    </div>
  );
}
