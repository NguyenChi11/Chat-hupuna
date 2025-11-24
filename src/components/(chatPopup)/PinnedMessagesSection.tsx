'use client';

import React from 'react';

import PinnedMessageListModal from '../base/PinnedMessageListModal';

import type { Message } from '@/types/Message';
import type { User } from '@/types/User';

interface PinnedMessagesSectionProps {
  allPinnedMessages: Message[];
  showPinnedList: boolean;
  onOpenPinnedList: () => void;
  onClosePinnedList: () => void;
  onJumpToMessage: (messageId: string) => void;
  getSenderName: (sender: User | string) => string;
}

export default function PinnedMessagesSection({
  allPinnedMessages,
  showPinnedList,
  onOpenPinnedList,
  onClosePinnedList,
  onJumpToMessage,
  getSenderName,
}: PinnedMessagesSectionProps) {
  if (allPinnedMessages.length === 0 && !showPinnedList) return null;

  return (
    <>
      {allPinnedMessages.length > 0 && (
        <button
          onClick={onOpenPinnedList}
          className="flex items-center gap-1 rounded-lg shadow-lg p-2 m-2 bg-white hover:cursor-pointer hover:bg-gray-100"
          title={`Xem ${allPinnedMessages.length} tin nhắn đã ghim`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 rotate-45">
            <path d="M11.25 4.755v7.5A1.75 1.75 0 019.5 14H5.75a.75.75 0 010-1.5h3.75a.25.25 0 00.25-.25v-7a.75.75 0 011.5 0zm-7.75 7.5a.75.75 0 01.75-.75H7.5a.75.75 0 010 1.5H4.25a.75.75 0 01-.75-.75z" />
          </svg>
          Danh sách tin nhắn ghim ({allPinnedMessages.length})
        </button>
      )}

      {showPinnedList && (
        <PinnedMessageListModal
          messages={allPinnedMessages}
          onClose={onClosePinnedList}
          onJumpToMessage={onJumpToMessage}
          onGetSenderName={getSenderName}
          onGetContentDisplay={(msg) => msg.content || msg.fileName || '[Media]'}
        />
      )}
    </>
  );
}


