'use client';

import React from 'react';

import PinnedMessageListModal from '../base/PinnedMessageListModal';

import type { Message } from '@/types/Message';
import type { User } from '@/types/User';
import { HiMapPin } from 'react-icons/hi2';

interface PinnedMessagesSectionProps {
  allPinnedMessages: Message[];
  showPinnedList: boolean;
  onOpenPinnedList: () => void;
  onClosePinnedList: () => void;
  onJumpToMessage: (messageId: string) => void;
  getSenderName: (sender: User | string) => string;
  onUnpinMessage: (msg: Message) => void;
}

export default function PinnedMessagesSection({
  allPinnedMessages,
  showPinnedList,
  onOpenPinnedList,
  onClosePinnedList,
  onJumpToMessage,
  getSenderName,
  onUnpinMessage,
}: PinnedMessagesSectionProps) {
  if (allPinnedMessages.length === 0 && !showPinnedList) return null;

  return (
    <>
      {allPinnedMessages.length > 0 && (
        <button
          onClick={onOpenPinnedList}
          className={`
    group flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-yellow-50 to-amber-50
    border border-yellow-300 rounded-xl shadow-md hover:shadow-xl
    hover:border-yellow-400 transition-all duration-300 active:scale-95
    text-sm font-medium text-yellow-900 select-none cursor-pointer
    m-2 sm:m-3
  `}
          title={`Xem ${allPinnedMessages.length} tin nhắn đã ghim`}
        >
          {/* Icon ghim – chuẩn Zalo, đẹp, sắc nét */}
          <HiMapPin
            className="w-5 h-5 text-yellow-600 rotate-45 drop-shadow-sm 
               group-hover:scale-110 transition-transform duration-200"
          />

          <span className="flex items-center gap-1.5">
            Tin nhắn đã ghim
            {/* Badge số lượng */}
            <span className="min-w-[1.5rem] px-2 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-sm">
              {allPinnedMessages.length}
            </span>
          </span>
        </button>
      )}

      {showPinnedList && (
        <PinnedMessageListModal
          messages={allPinnedMessages}
          onClose={onClosePinnedList}
          onJumpToMessage={onJumpToMessage}
          onGetSenderName={getSenderName}
          onGetContentDisplay={(msg) => {
            if (msg.type === 'poll') return `Bình chọn: ${msg.pollQuestion || msg.content || ''}`;
            if (msg.type === 'reminder') return `Lịch hẹn: ${msg.content || ''}`;
            if (msg.type === 'image') return 'Ảnh';
            if (msg.type === 'file') return `File: ${msg.fileName || 'File'}`;
            if (msg.type === 'sticker') return 'Sticker';
            return msg.content || '[Tin nhắn]';
          }}
          onUnpinMessage={onUnpinMessage}
        />
      )}
    </>
  );
}
