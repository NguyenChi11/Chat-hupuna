import React from 'react';

type TabKey = 'all' | 'contacts' | 'messages' | 'files';

interface Tab {
  key: TabKey;
  label: string;
  count: number;
}

interface SearchTabsProps {
  activeTab: TabKey;
  tabs: Tab[];
  onTabChange: (key: TabKey) => void;
  searchTerm: string;
}

export default function SearchTabs({ activeTab, tabs, onTabChange, searchTerm }: SearchTabsProps) {
  return (
    <div className="flex bg-white px-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 px-3 cursor-pointer py-2 text-xs font-medium relative transition-colors ${
            activeTab === tab.key ? 'text-[#0088ff]' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {tab.label}
          {tab.count > 0 && searchTerm && (
            <span
              className={`ml-2 px-2 py-0.5 text-[0.6875rem] rounded-full ${
                activeTab === tab.key ? 'bg-[#e3f2ff] text-[#0088ff]' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          )}
          {activeTab === tab.key && (
            <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#0088ff]" />
          )}
        </button>
      ))}
    </div>
  );
}
