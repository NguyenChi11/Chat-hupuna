'use client';

import React from 'react';

import GlobalSearchModal from '../../app/(zalo)/home/GlobalSearchModal';
import CreateGroupModal from '../../app/(zalo)/home/CreateGroupModal';

import { User } from '@/types/User';

// Reuse the same shapes as GlobalSearchModal
interface GlobalSearchMessage {
  _id: string;
  content?: string;
  type: 'text' | 'image' | 'file' | 'sticker';
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
}

interface GlobalSearchContact {
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
  onGroupCreated: () => void;
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
}: HomeOverlaysProps) {
  return (
    <>
      {showGlobalSearchModal && currentUser && (
        <GlobalSearchModal
          searchTerm={globalSearchTerm}
          results={globalSearchResults}
          allUsers={allUsers}
          currentUser={currentUser}
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
        />
      )}
    </>
  );
}
