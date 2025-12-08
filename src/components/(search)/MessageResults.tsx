import Image from 'next/image';
import React from 'react';

interface Message {
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
}

interface User {
  _id: string;
  name: string;
  avatar?: string;
}

interface GroupedMessages {
  roomId: string;
  roomName: string;
  roomAvatar?: string;
  isGroupChat: boolean;
  partnerId?: string;
  messages: Message[];
  latestTimestamp: number;
}

interface HighlightTextProps {
  text: string;
  keyword: string;
}

function HighlightText({ text, keyword }: HighlightTextProps) {
  if (!keyword.trim() || !text) return <>{text}</>;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function getContentPreview(msg: Message) {
  if (msg.type === 'file' && msg.fileName) return msg.fileName;
  if (msg.type === 'image') return '[Hình ảnh]';
  if (msg.type === 'sticker') return '[Sticker]';
  return msg.content || 'Tin nhắn';
}

function MessageIcon({ type }: { type: Message['type'] }) {
  const icons = {
    image: (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    file: (
      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    video: (
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 5a3 3 0 00-3 3v8a3 3 0 003 3h10a3 3 0 003-3V8a3 3 0 00-3-3H4zm15.553 3.106l3.502-1.946A1 1 0 0124 7.06v9.88a1 1 0 01-.945.997l-3.502-1.946A2 2 0 0018 14.24V9.76a2 2 0 001.553-1.654z" />
      </svg>
    ),
    text: (
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    sticker: (
      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    reminder: (
      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z" />
      </svg>
    ),
  };
  return icons[type] || icons.text;
}

interface MessageResultsProps {
  groupedMessages: GroupedMessages[];
  searchTerm: string;
  allUsers: User[];
  onNavigateToMessage: (message: Message) => void;
}

export default function MessageResults({ groupedMessages, searchTerm, onNavigateToMessage }: MessageResultsProps) {
  if (groupedMessages.length === 0) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        <div className="w-1 h-4 bg-green-500 rounded-full" />
        Tin nhắn
        <span className="text-xs text-gray-500 font-normal">({groupedMessages.length} cuộc trò chuyện)</span>
      </h4>
      <div className="space-y-3">
        {groupedMessages.map((group) => (
          <div
            key={group.roomId}
            className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all bg-white shadow-sm"
          >
            <div className="bg-gradient-to-r from-gray-50 to-white p-3 border-b flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {group.roomAvatar ? (
                    <Image
                      width={40}
                      height={40}
                      src={group.roomAvatar}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    group.roomName.charAt(0).toUpperCase()
                  )}
                </div>
                {group.isGroupChat && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center border border-white">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm">{group.roomName}</p>
                <p className="text-xs text-gray-500">
                  {group.isGroupChat ? '📱 Nhóm' : '💬 Chat'} • {group.messages.length} tin nhắn
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {group.messages.slice(0, 3).map((msg) => (
                <div
                  key={msg._id}
                  onClick={() => onNavigateToMessage(msg)}
                  className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <MessageIcon type={msg.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">{msg.senderName}</span>
                        <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        <HighlightText text={getContentPreview(msg)} keyword={searchTerm} />
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {group.messages.length > 3 && (
              <div className="p-2 bg-gray-50 text-center border-t">
                <button
                  onClick={() => onNavigateToMessage(group.messages[0])}
                  className="text-xs cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xem thêm {group.messages.length - 3} tin nhắn
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
