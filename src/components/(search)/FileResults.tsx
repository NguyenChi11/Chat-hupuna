import { getProxyUrl } from '@/utils/utils';
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

interface GroupedFiles {
  roomId: string;
  roomName: string;
  roomAvatar?: string;
  isGroupChat: boolean;
  files: Message[];
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

interface FileResultsProps {
  groupedFiles: GroupedFiles[];
  searchTerm: string;
  onNavigateToMessage: (message: Message) => void;
}

export default function FileResults({ groupedFiles, searchTerm, onNavigateToMessage }: FileResultsProps) {
  if (groupedFiles.length === 0) return null;

  return (
    <section>
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        <div className="w-1 h-4 bg-orange-500 rounded-full" />
        File
        <span className="text-xs text-gray-500 font-normal">
          ({groupedFiles.reduce((sum, g) => sum + g.files.length, 0)} file)
        </span>
      </h4>
      <div className="space-y-3">
        {groupedFiles.map((group) => (
          <div
            key={group.roomId}
            className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-300 transition-all bg-white shadow-sm"
          >
            <div className="bg-gradient-to-r from-orange-50 to-white p-3 border-b flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold overflow-hidden">
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
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border border-white">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm">{group.roomName}</p>
                <p className="text-xs text-gray-500">
                  {group.isGroupChat ? '📱 Nhóm' : '💬 Chat'} • {group.files.length} file
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {group.files.slice(0, 3).map((file) => (
                <div
                  key={file._id}
                  onClick={() => onNavigateToMessage(file)}
                  className="p-3 hover:bg-orange-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {file.type === 'image' ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={getProxyUrl(file.fileUrl)}
                            width={48}
                            height={48}
                            alt={file.fileName || 'File'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate text-sm">
                        <HighlightText text={file.fileName || 'File'} keyword={searchTerm} />
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{file.senderName}</span>
                        <span>•</span>
                        <span>{formatTime(file.timestamp)}</span>
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {group.files.length > 3 && (
              <div className="p-2 bg-orange-50 text-center border-t">
                <button
                  onClick={() => onNavigateToMessage(group.files[0])}
                  className="text-xs cursor-pointer text-orange-600 hover:text-orange-700 font-medium"
                >
                  Xem thêm {group.files.length - 3} file
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
