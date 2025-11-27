import SettingsDesktop from '@/components/(setting)/SettingsDesktop';
import SettingsMobile from '@/components/(setting)/SettingsMobile';
import React from 'react';

const SettingPage = () => {
  return (
    <div>
      <SettingsMobile />
      <SettingsDesktop />
    </div>
  );
};

export default SettingPage;
