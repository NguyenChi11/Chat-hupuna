'use client';

import React from 'react';
import Image from 'next/image';
import type { Message } from '@/types/Message';
import type { User } from '@/types/User';
import { isVideoFile, getProxyUrl } from '@/utils/utils';
import ReplyIcon from '@/public/icons/reply-icon.svg';

interface SenderInfo {
  _id: string;
  name: string;
  avatar: string | null;
}

interface MessageListProps {
  messagesGrouped: Map<string, Message[]>;
  messages: Message[];
  currentUser: User;
  allUsersMap: Map<string, string>;
  uploadingFiles: Record<string, number>;
  highlightedMsgId: string | null;
  isGroup: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReply: (msg: Message) => void;
  onJumpToMessage: (id: string) => void;
  getSenderInfo: (sender: User | string) => SenderInfo;
  renderMessageContent: (content: string, mentionedUserIds?: string[], isMe?: boolean) => React.ReactNode;
}

export default function MessageList({
  messagesGrouped,
  messages,
  currentUser,
  allUsersMap,
  uploadingFiles,
  highlightedMsgId,
  isGroup,
  onContextMenu,
  onReply,
  onJumpToMessage,
  getSenderInfo,
  renderMessageContent,
}: MessageListProps) {
  return (
    <>
      {Array.from(messagesGrouped.entries()).map(([dateKey, msgs]) => (
        <React.Fragment key={dateKey}>
          {/* Thanh hiển thị Ngày (Sticky ở trên) */}
          <div className="flex justify-center my-3 sticky top-0 z-10">
            <span className="text-xs text-gray-600 bg-gray-200/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
              {dateKey}
            </span>
          </div>

          {msgs.map((msg, index) => {
            const senderInfo = getSenderInfo(msg.sender);
            const isMe = senderInfo._id === currentUser._id;

            const repliedToMsg = msg.replyToMessageId ? messages.find((m) => m._id === msg.replyToMessageId) : null;

            const uploadProgress = uploadingFiles[msg._id];
            const isUploading = uploadProgress !== undefined;

            if (msg.type === 'notify') {
              let contentDisplay = msg.content;

              if (isMe && contentDisplay) {
                const myName = currentUser.name || '';

                if (contentDisplay.startsWith(myName)) {
                  contentDisplay = 'Bạn' + contentDisplay.substring(myName.length);
                }
              }

              return (
                <div key={index} className="flex justify-center my-3">
                  <div className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">{contentDisplay}</p>
                  </div>
                </div>
              );
            }

            const prevMsg = index > 0 ? messages[index - 1] : null;
            let isGrouped = false;

            if (prevMsg && prevMsg.type !== 'notify') {
              const prevSenderInfo = getSenderInfo(prevMsg.sender);
              const currentTimestamp = new Date(msg.timestamp).getTime();
              const prevTimestamp = new Date(prevMsg.timestamp).getTime();
              if (prevSenderInfo._id === senderInfo._id && (currentTimestamp - prevTimestamp) / (1000 * 60) < 5) {
                isGrouped = true;
              }
            }

            const avatarChar = senderInfo.name ? senderInfo.name.charAt(0).toUpperCase() : '?';
            const senderName = allUsersMap.get(msg.sender) || senderInfo.name;

            const isRecalled = msg.isRecalled === true;

            return (
              <div
                key={msg._id || index}
                id={`msg-${msg._id}`}
                onContextMenu={(e) => onContextMenu(e, msg)}
                className={`max-w-[80%] sm:max-w-xs break-words flex gap-2 group 
                  ${isMe ? 'self-end' : 'self-start'}
                  ${isGrouped ? 'mt-1' : 'mt-4'}
                  transition-all duration-1000 ease-out
                  ${
                    highlightedMsgId === msg._id ? 'bg-yellow-100 ring-8 ring-yellow-100 rounded-lg z-10 scale-105' : ''
                  }
                `}
              >
                {isMe && !isRecalled && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onReply(msg);
                    }}
                    className="invisible group-hover:visible self-center p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Phản hồi"
                  >
                    <Image src={ReplyIcon} alt="" width={20} height={20} />
                  </button>
                )}

                {!isRecalled && !isMe && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onReply(msg);
                    }}
                    className={`invisible group-hover:visible self-center p-1 text-gray-400 hover:text-blue-500 transition-colors ${isMe ? 'order-1' : 'order-3'}`}
                    title="Phản hồi"
                  >
                    <Image src={ReplyIcon} alt="" width={20} height={20} />
                  </button>
                )}

                {!isMe && (
                  <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : 'visible'}`}>
                    {senderInfo.avatar ? (
                      <Image
                        src={getProxyUrl(senderInfo.avatar)}
                        alt={senderInfo.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {avatarChar}
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Tin nhắn được reply */}
                  {repliedToMsg && (
                    <div
                      className={`w-full text-xs text-gray-500 border-l-2 border-blue-500 pl-2 mb-1 pt-1 pb-0.5 cursor-pointer hover:opacity-90 rounded-sm bg-gray-50 ${isMe ? 'text-right' : 'text-left'}`}
                      onClick={() => onJumpToMessage(repliedToMsg._id)}
                    >
                      <p className="font-semibold">
                        {msg.replyToMessageName || allUsersMap.get(String(repliedToMsg.sender)) || 'Người dùng'}
                      </p>
                      <p className="truncate">
                        {repliedToMsg.isRecalled
                          ? 'Tin nhắn đã bị thu hồi'
                          : repliedToMsg.content || `[${repliedToMsg.type}]`}
                      </p>
                    </div>
                  )}

                  <div
                    className={`p-2 rounded-lg shadow-sm max-w-xs w-fit /
                        ${isMe ? 'bg-blue-100 text-black ml-auto' : 'bg-white text-black mr-auto'} // ⬅️ LƯU Ý: Đã có 'ml-auto' hoặc 'mr-auto' trong container bên ngoài (Nếu isMe)
                        ${(msg.type === 'sticker' && !isRecalled) || isVideoFile(msg.fileUrl) ? '!bg-transparent !shadow-none !p-0' : ''}
                        ${!isGrouped ? (isMe ? 'rounded-br-none' : 'rounded-bl-none') : ''}
                        ${isRecalled ? '!bg-gray-200 !text-gray-500 italic border border-gray-300' : ''}
                    `}
                  >
                    {isGroup && !isMe && !isGrouped && !isRecalled && (
                      <p className="text-gray-500 text-[10px] pb-1 font-medium">{senderName}</p>
                    )}

                    {isRecalled ? (
                      <p className="text-sm text-gray-500">Tin nhắn đã bị thu hồi</p>
                    ) : (
                      <>
                        {msg.type === 'text' && (
                          <div>{renderMessageContent(msg.content || '', msg.mentions, isMe)}</div>
                        )}

                        {msg.type === 'sticker' && msg.fileUrl && (
                          <Image
                            src={msg.fileUrl}
                            alt="Sticker"
                            width={128}
                            height={128}
                            className="w-32 h-32 object-contain hover:scale-105 transition-transform"
                          />
                        )}

                        {msg.type === 'image' && msg.fileUrl && (
                          <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded border border-gray-200 relative overflow-hidden">
                            <Image
                              src={isUploading ? msg.fileUrl : getProxyUrl(msg.fileUrl)}
                              alt="Ảnh gửi"
                              width={400}
                              height={300}
                              className={`bg-blue-500 transition-all duration-200 rounded-lg max-w-full cursor-pointer ${isUploading ? 'opacity-50' : 'hover:opacity-90'}`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error';
                              }}
                            />

                            {isUploading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                                  {Math.round(uploadProgress)}%
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.type === 'file' && msg.fileUrl && (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center space-x-3 bg-gray-50 p-2 rounded border border-gray-200 hover:bg-gray-100"
                          >
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full text-blue-500">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-5 h-5"
                              >
                                <path d="M8 2a2 2 0 00-2 2v3h2V4h4v12H8v-3H6v3a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2H8z" />
                                <path d="M5 9l-3 3 3 3v-2h4v-2H5V9z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">
                                {msg.fileName || 'Tập tin đính kèm'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">{msg.fileUrl}</p>
                            </div>
                          </a>
                        )}

                        {isVideoFile(msg.fileUrl) && (
                          <video controls className="max-w-full rounded-lg">
                            <source src={msg.fileUrl} />
                            Trình duyệt của bạn không hỗ trợ video.
                          </video>
                        )}
                      </>
                    )}
                    <p className={`text-[10px] text-gray-500 mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                      {/* Kiểm tra và định dạng thời gian */}
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}
