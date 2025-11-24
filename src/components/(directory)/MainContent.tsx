// File: components/MainContent.tsx
import React from 'react';
import FriendsList from './FriendsList'; // Component cho danh sách bạn bè
import FriendRequests from './FriendRequests'; // Component cho lời mời kết bạn
import GroupRequest from './GroupRequest';
import GroupsPage from './Group';

interface MainContentProps {
  selectedMenu: string;
}

export default function MainContent({ selectedMenu }: MainContentProps) {
  let content;

  switch (selectedMenu) {
    case 'friends':
      content = <FriendsList />;
      break;
    case 'groups':
      // Bạn có thể tạo component riêng cho groups
      content = <GroupsPage />;
      break;
    case 'requests':
      content = <FriendRequests />;
      break;
    case 'requestsgroup':
      content = <GroupRequest />;
      break;
    default:
      content = <div className="p-4 text-center text-black">Chào mừng đến với Zalo PC</div>;
  }

  return <main className="flex-1 overflow-auto bg-gray-50">{content}</main>;
}
