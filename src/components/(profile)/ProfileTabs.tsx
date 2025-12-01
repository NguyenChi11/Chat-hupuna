'use client';

export default function ProfileTabs({
  tabs,
  tab,
  setTab,
}: {
  tabs: string[];
  tab: string;
  setTab: (item: string) => void;
}) {
  const labels: Record<string, string> = {
    info: 'Thông tin',
    profile: 'Hồ sơ',
    qr: 'Mã QR',
    settings: 'Cài đặt',
  };

  return (
    <div className="flex bg-white border-b border-gray-200">
      {tabs.map((item) => (
        <button
          key={item}
          onClick={() => setTab(item)}
          className={`flex-1 py-5 text-center font-semibold text-base transition-all relative
            ${tab === item ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {labels[item] || item}
          {tab === item && <span className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-lg" />}
        </button>
      ))}
    </div>
  );
}
