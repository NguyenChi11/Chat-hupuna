'use client';

import React from 'react';

import type { Message } from '@/types/Message';
import type { User } from '@/types/User';

interface ReplyBannerProps {
  replyingTo: Message | null;
  getSenderName: (sender: User | string) => string;
  onCancel: () => void;
}

export default function ReplyBanner({ replyingTo, getSenderName, onCancel }: ReplyBannerProps) {
  if (!replyingTo) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 p-3 bg-blue-50 border-t border-blue-200 flex justify-between items-center text-sm text-gray-700">
      <div className="border-l-2 border-blue-600 pl-2">
        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          Trả lời {getSenderName(replyingTo.sender)}
        </div>
        <p className="truncate text-xs text-gray-700">
          {replyingTo.isRecalled ? 'đã thu hồi tin nhắn' : replyingTo.content || `[${replyingTo.type}]`}
        </p>
      </div>
      <button onClick={onCancel} className="cursor-pointer text-red-500 hover:text-red-700 p-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
