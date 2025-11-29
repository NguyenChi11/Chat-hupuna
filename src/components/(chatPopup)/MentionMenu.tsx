'use client';

import React, { RefObject } from 'react';

import type { User } from '@/types/User';
import type { MemberInfo } from '@/types/Group';
import { getProxyUrl } from '../../utils/utils';
import Image from 'next/image';

interface MentionMenuProps {
  showMentionMenu: boolean;
  mentionSuggestions: (User | MemberInfo)[];
  selectedMentionIndex: number;
  mentionMenuRef: RefObject<HTMLDivElement | null>;
  onSelectMention: (user: User | MemberInfo) => void;
}

export default function MentionMenu({
  showMentionMenu,
  mentionSuggestions,
  selectedMentionIndex,
  mentionMenuRef,
  onSelectMention,
}: MentionMenuProps) {
  if (!showMentionMenu || mentionSuggestions.length === 0) return null;

  return (
    <div
      ref={mentionMenuRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50"
    >
      <div className="p-2 border-b bg-gray-50">
        <p className="text-xs text-gray-600 font-medium">Chọn người để đề cập</p>
      </div>
      {mentionSuggestions.map((user, index) => {
        const member = user as MemberInfo;
        const userId: string = member.id ?? user._id;
        const userName = user.name || 'User';
        const userAvatar = user.avatar;

        return (
          <button
            key={userId}
            onClick={() => onSelectMention(user)}
            className={`w-full flex cursor-pointer items-center gap-3 p-3 hover:bg-blue-50 transition-colors ${
              index === selectedMentionIndex ? 'bg-blue-100' : ''
            }`}
          >
            {userAvatar ? (
              <Image
                width={40}
                height={40}
                src={getProxyUrl(userAvatar)}
                alt={userName}
                className="w-5 h-5 sm:w-10 sm:h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white flex items-center justify-center font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left flex-1">
              <p className="font-medium text-gray-800 text-sm">{userName}</p>
              <p className="text-xs text-gray-500">@{userName.toLowerCase().replace(/\s+/g, '')}</p>
            </div>
            {index === selectedMentionIndex && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-blue-500"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
