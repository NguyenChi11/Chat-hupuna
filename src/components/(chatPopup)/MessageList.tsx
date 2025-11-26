'use client';

import React, { useState } from 'react';
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
  onOpenMedia: (url: string, type: 'image' | 'video') => void;
  editingMessageId: string | null;
  setEditingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  editContent: string;
  setEditContent: React.Dispatch<React.SetStateAction<string>>;
  onSaveEdit: (messageId: string, newContent: string) => Promise<void>;
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
  onOpenMedia,
  editingMessageId,
  setEditingMessageId,
  editContent,
  setEditContent,
  onSaveEdit,
}: MessageListProps) {
  const [expandedOriginalId, setExpandedOriginalId] = useState<string | null>(null);

  return (
    <>
      {Array.from(messagesGrouped.entries()).map(([dateKey, msgs]) => (
        <React.Fragment key={dateKey}>
          {/* Thanh hiển thị Ngày (Sticky ở trên) */}
          <div className="flex justify-center my-3 sticky top-0 z-10">
            <span className="text-[0.625rem] sm:text-xs text-gray-600 bg-gray-200/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
              {dateKey}
            </span>
          </div>

          {msgs.map((msg, index) => {
            const senderInfo = getSenderInfo(msg.sender);
            const isMe = senderInfo._id === currentUser._id;

            const repliedToMsg = msg.replyToMessageId ? messages.find((m) => m._id === msg.replyToMessageId) : null;

            const uploadProgress = uploadingFiles[msg._id];
            const isUploading = uploadProgress !== undefined;
            const isEditing = msg._id === editingMessageId;
            const isEdited = msg.editedAt && !isEditing;

            if (msg.type === 'notify') {
              let contentDisplay = msg.content;

              if (isMe && contentDisplay) {
                const myName = currentUser.name || '';

                if (contentDisplay.startsWith(myName)) {
                  contentDisplay = 'Bạn' + contentDisplay.substring(myName.length);
                }
              }

              return (
                <div key={msg._id || index} className="flex justify-center my-3">
                  <div className="bg-gray-100 px-3 py-1 rounded-full shadow-sm">
                    <p className="text-xs text-gray-500 sm:font-medium text-[0.625rem]">{contentDisplay}</p>
                  </div>
                </div>
              );
            }

            // Dùng msgs (tin nhắn trong ngày hiện tại) để kiểm tra nhóm
            const prevMsgInGroup = index > 0 ? msgs[index - 1] : null;
            let isGrouped = false;

            if (prevMsgInGroup && prevMsgInGroup.type !== 'notify') {
              const prevSenderInfo = getSenderInfo(prevMsgInGroup.sender);
              const currentTimestamp = new Date(msg.timestamp).getTime();
              const prevTimestamp = new Date(prevMsgInGroup.timestamp).getTime();

              if (prevSenderInfo._id === senderInfo._id && (currentTimestamp - prevTimestamp) / (1000 * 60) < 5) {
                isGrouped = true;
              }
            }

            const avatarChar = senderInfo.name ? senderInfo.name.charAt(0).toUpperCase() : '?';
            const senderName = allUsersMap.get(senderInfo._id) || senderInfo.name;

            const isRecalled = msg.isRecalled === true;
            const isVideo = msg.type === 'video' || (msg.fileUrl && isVideoFile(msg.fileUrl));

            return (
              <div
                key={msg._id || index}
                id={`msg-${msg._id}`}
                onContextMenu={(e) => onContextMenu(e, msg)}
                className={`max-w-[80%] sm:max-w-xs break-words flex gap-2 group 
                  ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'} 
                  ${isGrouped ? 'mt-1' : 'mt-4'}
                  transition-all duration-1000 ease-out
                  ${
                    highlightedMsgId === msg._id ? 'bg-yellow-100 ring-8 ring-yellow-100 rounded-lg z-10 scale-105' : ''
                  }
                `}
              >
                {/* Nút Reply - Cần order-1 khi là isMe để nằm bên trái nội dung */}
                {!isRecalled && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onReply(msg);
                    }}
                    // order-3 khi là người khác (ở cuối), order-1 khi là tôi (ở cuối, nhưng bị flex-row-reverse đảo)
                    className={`invisible group-hover:visible self-center p-1 text-gray-400 flex items-center justify-center hover:text-blue-500 transition-colors 
                      ${isMe ? 'order-1' : 'order-3'}
                    `}
                    title="Phản hồi"
                  >
                    <Image src={ReplyIcon} alt="" width={20} height={20} />
                  </button>
                )}
                {/* Avatar */}
                {!isMe && (
                  <div className={`flex-shrink-0 ${isGrouped ? 'invisible' : 'visible'}`}>
                    {senderInfo.avatar ? (
                      <Image
                        src={getProxyUrl(senderInfo.avatar)}
                        alt={senderInfo.name}
                        width={40}
                        height={40}
                        className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {avatarChar}
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                  {/* Tin nhắn được reply */}
                  {repliedToMsg && (
                    <div
                      className={`w-full max-w-[12rem] sm:max-w-xs text-xs text-gray-500 border-l-2 border-blue-500 pl-2 mb-1 pt-1 pb-0.5 cursor-pointer hover:opacity-90 rounded-sm bg-gray-50 ${isMe ? 'text-right' : 'text-left'}`}
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
                    // Đã loại bỏ ký tự '/' thừa và dọn dẹp các lớp căn lề dư thừa
                    className={`p-2 rounded-lg shadow-sm w-fit max-w-[12rem] sm:max-w-xs 
                        ${isMe ? 'bg-blue-100 text-black' : 'bg-white text-black'} 
                        ${(msg.type === 'sticker' && !isRecalled) || isVideo ? '!bg-transparent !shadow-none !p-0' : ''}
                        ${!isGrouped ? (isMe ? 'rounded-br-none' : 'rounded-bl-none') : ''}
                        ${isRecalled ? '!bg-gray-200 !text-gray-500 italic border border-gray-300' : ''}
                        ${msg.type === 'text' ? 'text-[0.625rem] sm:text-[1.125rem]' : ''}
                      `}
                  >
                    {isGroup && !isMe && !isGrouped && !isRecalled && (
                      <p className="text-gray-500 text-[0.625rem] pb-1 font-medium">{senderName}</p>
                    )}

                    {/* Nội dung tin nhắn */}
                    {isRecalled ? (
                      <p className="text-[0.75rem] sm:text-sm text-gray-500">Tin nhắn đã bị thu hồi</p>
                    ) : (
                      <>
                        {/* Chế độ chỉnh sửa */}
                        {isEditing && msg.type === 'text' ? (
                          <div className="space-y-2">
                            <textarea
                              autoFocus
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 border rounded text-sm resize-none text-gray-500 outline-none bg-white"
                              rows={4}
                              cols={50}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  void onSaveEdit(msg._id, editContent);
                                }
                                if (e.key === 'Escape') {
                                  setEditingMessageId(null);
                                }
                              }}
                            />
                            <div className="flex gap-2 text-xs justify-end">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => void onSaveEdit(msg._id, editContent)}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
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
                                className="w-20 h-20 object-contain hover:scale-105 transition-transform"
                              />
                            )}

                            {msg.type === 'image' && msg.fileUrl && (
                              <div
                                className="flex items-center space-x-2 bg-gray-50 p-2 rounded border border-gray-200 relative overflow-hidden cursor-zoom-in"
                                onClick={() => {
                                  if (isUploading) return;
                                  const url = getProxyUrl(msg.fileUrl as string);
                                  onOpenMedia(url, 'image');
                                }}
                              >
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

                            {msg.type === 'file' && msg.fileUrl && !isVideo && (
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center w-full sm:w-auto space-x-1 sm:space-x-3 bg-gray-50 p-2 rounded border border-gray-200 hover:bg-gray-100"
                              >
                                <div className="w-5 h-5 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-100 rounded-full text-blue-500">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-4 h-4 sm:w-5 sm:h -5"
                                  >
                                    <path d="M8 2a2 2 0 00-2 2v3h2V4h4v12H8v-3H6v3a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2H8z" />
                                    <path d="M5 9l-3 3 3 3v-2h4v-2H5V9z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:font-medium text-[0.5rem] text-gray-800 truncate">
                                    {msg.fileName || 'Tập tin đính kèm'}
                                  </p>
                                  <p className="text-[0.625rem] sm:text-[0.875rem] text-gray-500 truncate">
                                    {msg.fileUrl}
                                  </p>
                                </div>
                              </a>
                            )}

                            {isVideo && msg.fileUrl && (
                              <div
                                className="relative sm:w-[16rem] sm:h-[9rem] w-[9rem] h-[5.625rem] max-w-full cursor-zoom-in rounded-lg bg-black overflow-hidden"
                                style={{ paddingTop: '56.25%' }} // 16:9 aspect ratio
                              >
                                <video
                                  src={isUploading ? (msg.fileUrl as string) : getProxyUrl(msg.fileUrl as string)}
                                  controls={!isUploading}
                                  preload="none"
                                  className={`absolute inset-0 w-full h-full object-contain ${isUploading ? 'opacity-60' : ''}`}
                                />

                                {isUploading && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white text-xs font-semibold">
                                    <div className="mb-1">Đang tải video...</div>
                                    <div>{Math.round(uploadProgress)}%</div>
                                  </div>
                                )}

                                {!isUploading && (
                                  <button
                                    type="button"
                                    className="absolute inset-0 bg-transparent"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const url = getProxyUrl(msg.fileUrl as string);
                                      onOpenMedia(url, 'video');
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* ✅ Hiển thị nội dung gốc nếu đã chỉnh sửa */}
                    {isEdited && msg.originalContent && (
                      <div className="  border-t border-gray-300 ">
                        {expandedOriginalId === msg._id && (
                          <div className="text-xs text-gray-500 space-y-1 flex items-center justify-between">
                            <p className="whitespace-pre-wrap bg-blue-100 pt-2 pb-1 rounded">{msg.originalContent}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Thời gian và trạng thái đã chỉnh sửa */}
                    <div className={`flex items-center gap-2 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {/* Hiển thị "Đã chỉnh sửa" với nút xem nội dung gốc */}
                      {isEdited && (
                        <span
                          className="text-[10px] text-blue-500 hover:underline hover:cursor-pointer"
                          onClick={() => setExpandedOriginalId((prev) => (prev === msg._id ? null : msg._id))}
                        >
                          {expandedOriginalId === msg._id ? <p>Ẩn chỉnh sửa</p> : <p>Đã chỉnh sửa</p>}
                        </span>
                      )}

                      <p className="text-[10px] text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>{' '}
                  {/* Đóng div message content */}
                </div>{' '}
                {/* Đóng div flex-col wrapper */}
              </div> /* Đóng div message wrapper */
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}
