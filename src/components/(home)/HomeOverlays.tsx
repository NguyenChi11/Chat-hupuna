'use client';

import React from 'react';

import GlobalSearchModal from '../../app/(zalo)/home/GlobalSearchModal';
import CreateGroupModal from '../../app/(zalo)/home/CreateGroupModal';

import { User } from '@/types/User';
import type { GroupConversation } from '@/types/Group';

// Reuse the same shapes as GlobalSearchModal
export interface GlobalSearchMessage {
  _id: string;
  content?: string;
  type: 'text' | 'image' | 'file' | 'sticker' | 'video' | 'reminder';
  fileName?: string;
  timestamp: number;
  sender: string;
  senderName: string;
  roomId: string;
  roomName: string;
  isGroupChat: boolean;
  partnerId?: string;
  partnerName?: string;
  fileUrl?: string;
  receiver?: string;
  displayRoomName?: string;
}

export interface GlobalSearchContact {
  _id: string;
  name: string;
  avatar?: string;
  isGroup?: boolean;
}

interface HomeOverlaysProps {
  currentUser: User | null;
  allUsers: User[];
  showGlobalSearchModal: boolean;
  globalSearchTerm: string;
  globalSearchResults: { contacts: GlobalSearchContact[]; messages: GlobalSearchMessage[] };
  onCloseGlobalSearch: () => void;
  onSearch: (term: string) => void | Promise<void>;
  onNavigateToMessage: (message: GlobalSearchMessage) => void;
  onSelectContact: (contact: GlobalSearchContact) => void;
  showCreateGroupModal: boolean;
  onCloseCreateGroup: () => void;
  /**
   * Callback khi tạo nhóm mới / thêm thành viên.
   * - Với tạo nhóm: nhận group mới để component cha có thể chọn mở chat.
   */
  onGroupCreated: (group?: GroupConversation) => void;
  // Hàm reload dữ liệu bên ngoài (thường là fetchAllData)
  reLoad?: () => void;
}

export default function HomeOverlays({
  currentUser,
  allUsers,
  showGlobalSearchModal,
  globalSearchTerm,
  globalSearchResults,
  onCloseGlobalSearch,
  onSearch,
  onNavigateToMessage,
  onSelectContact,
  showCreateGroupModal,
  onCloseCreateGroup,
  onGroupCreated,
  reLoad,
}: HomeOverlaysProps) {
  return (
    <>
      {showGlobalSearchModal && currentUser && (
        <GlobalSearchModal
          searchTerm={globalSearchTerm}
          results={globalSearchResults}
          allUsers={allUsers}
          onClose={onCloseGlobalSearch}
          onSearch={onSearch}
          onNavigateToMessage={onNavigateToMessage}
          onSelectContact={onSelectContact}
        />
      )}

      {showCreateGroupModal && currentUser && (
        <CreateGroupModal
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={onCloseCreateGroup}
          onGroupCreated={onGroupCreated}
          reLoad={reLoad}
        />
      )}
    </>
  );
}
