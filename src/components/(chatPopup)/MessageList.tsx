'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Message } from '@/types/Message';
import type { User } from '@/types/User';
import { isVideoFile, getProxyUrl } from '@/utils/utils';

// Icons
import { HiOutlineDocumentText, HiPlay, HiEllipsisVertical, HiOutlineClock } from 'react-icons/hi2';
import ReminderDetailModal from './components/ReminderDetailModal';
import PollDetailModal from './components/PollDetailModal';

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
  onJumpToMessage: (id: string) => void;
  getSenderInfo: (sender: User | string) => SenderInfo;
  renderMessageContent: (content: string, mentionedUserIds?: string[], isMe?: boolean) => React.ReactNode;
  onOpenMedia: (url: string, type: 'image' | 'video') => void;
  editingMessageId: string | null;
  setEditingMessageId?: (id: string | null) => void;
  editContent?: string;
  setEditContent?: (content: string) => void;
  onSaveEdit?: (id: string, content: string) => void;
  onRefresh?: () => Promise<void>
  onPinMessage?: (msg: Message) => void;
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
  onJumpToMessage,
  getSenderInfo,
  renderMessageContent,
  onOpenMedia,
  editingMessageId,
  setEditingMessageId,
  editContent,
  setEditContent,
  onSaveEdit,
  onRefresh,
  onPinMessage
}: MessageListProps) {
  const [timeVisibleId, setTimeVisibleId] = useState<string | null>(null);
  const [expandedOriginalId, setExpandedOriginalId] = useState<string | null>(null);
  const [activeMoreId, setActiveMoreId] = useState<string | null>(null);
  const [detailMsg, setDetailMsg] = useState<Message | null>(null);
  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  };

  return (
    <>
      {Array.from(messagesGrouped.entries()).map(([dateKey, msgs]) => (
        <React.Fragment key={dateKey}>
          {/* Date row */}
          <div className="flex justify-center my-4 sticky top-1 z-10">
            <span className="px-4 py-1 text-xs font-medium text-gray-600 bg-white/90 rounded-full shadow">
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
            const isRecalled = msg.isRecalled;
            const isVideo = msg.type === 'video' || (msg.fileUrl && isVideoFile(msg.fileUrl));

            // Group detection
            const prevMsg = index > 0 ? msgs[index - 1] : null;
            let isGrouped = false;
            if (prevMsg && prevMsg.type !== 'notify') {
              const prevSender = getSenderInfo(prevMsg.sender);
              const now = new Date(msg.timestamp).getTime();
              const prev = new Date(prevMsg.timestamp).getTime();
              if (prevSender._id === senderInfo._id && (now - prev) / 60000 < 5) {
                isGrouped = true;
              }
            }

            // Notify message
            if (msg.type === 'notify') {
              const related = msg.replyToMessageId ? messages.find((m) => m._id === msg.replyToMessageId) : null;
              let display = msg.content || '';
              if (isMe && !display.trim().toLowerCase().startsWith('bạn')) {
                display = `Bạn ${display}`;
              }
              const pillNode = (
                <div key={`pill-${msg._id}`} id={`msg-${msg._id}`} className="flex justify-center my-3">
                  <div className={`px-4 py-1.5 rounded-full max-w-[80vw] sm:max-w-[28rem] overflow-hidden ${highlightedMsgId === msg._id ? 'bg-yellow-50' : 'bg-gray-100'}`}>
                    <p className="text-xs text-gray-500 truncate">{display}</p>
                  </div>
                </div>
              );
              const contentLower = (msg.content || '').toLowerCase();
              const isCreate = contentLower.includes('đã tạo lịch hẹn');
              const isDue = contentLower.includes('đến giờ lịch hẹn');
              const isEdit = contentLower.includes('đã chỉnh sửa') || contentLower.includes('chỉnh sửa');
              const isDelete = contentLower.includes('đã xóa') || contentLower.includes('xóa');
              if (isDue && related?.type === 'reminder') {
                const at = (related as Message & { reminderAt?: number }).reminderAt || related.timestamp;
                const cardNode = (
                  <div key={`card-${msg._id}`} className="flex justify-center my-2">
                    <div className="w-full max-w-[22rem] p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 min-w-0 text-red-500">
                        <HiOutlineClock className="w-5 h-5" />
                        <span className="font-semibold truncate">{related.content || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <HiOutlineClock className="w-4 h-4" />
                        <span className="text-sm">{new Date(at).toLocaleString('vi-VN')}</span>
                      </div>
                      {(related as Message & { reminderNote?: string }).reminderNote ? (
                        <p className="text-sm text-gray-700 truncate">{(related as Message & { reminderNote?: string }).reminderNote as string}</p>
                      ) : null}
                      <div className="pt-1">
                        <button onClick={() => setDetailMsg(related)} className="w-full cursor-pointer px-4 py-2 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 font-semibold text-sm">
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <>
                    {pillNode}
                    {cardNode}
                  </>
                );
              }
              if (related?.type === 'reminder' && (isCreate || isEdit || isDelete)) {
                return (
                  <>
                    {pillNode}
                    <div className="flex justify-center -mt-2">
                      <button onClick={() => setDetailMsg(related)} className="text-xs text-blue-600 hover:underline">
                        Xem thêm
                      </button>
                    </div>
                  </>
                );
              }
              if (related?.type === 'poll') {
                return (
                  <>
                    {pillNode}
                    <div className="flex justify-center -mt-2">
                      <button onClick={() => setDetailMsg(related)} className="text-xs text-blue-600 hover:underline">
                        Xem
                      </button>
                    </div>
                  </>
                );
              }
              return pillNode;
            }

            if (msg.type === 'reminder') {
              let display = msg.content;
              if (isMe && display?.startsWith(currentUser.name || '')) {
                display = 'Bạn' + display.substring((currentUser.name || '').length);
              }
              return (
                <div key={msg._id} id={`msg-${msg._id}`} className="flex justify-center my-3">
                  <div className={`px-4 py-1.5 rounded-full ${highlightedMsgId === msg._id ? 'bg-yellow-50' : 'bg-gray-100'}`}>
                     <div className="w-full max-w-[22rem] p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2">
                       <div className="flex items-center gap-2 min-w-0 text-red-500">
                         <HiOutlineClock className="w-5 h-5" />
                         <span className="font-semibold truncate">{msg.content || ''}</span>
                       </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <HiOutlineClock className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date((msg as Message & { reminderAt?: number }).reminderAt || msg.timestamp).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {(msg as Message & { reminderNote?: string }).reminderNote ? (
                          <p className="text-sm text-gray-700 truncate">
                            {(msg as Message & { reminderNote?: string }).reminderNote as string}
                          </p>
                        ) : null}
                        <div className="pt-1">
                          <button onClick={() => setDetailMsg(msg)} className="w-full cursor-pointer px-4 py-2 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 font-semibold text-sm">
                            Xem chi tiết
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              );
            }

            if (msg.type === 'poll') {
              const myId = String(currentUser._id);
              const options = Array.isArray(msg.pollOptions) ? (msg.pollOptions as string[]) : [];
              const votes = (msg.pollVotes || {}) as Record<string, string[]>;
              const locked = !!msg.isPollLocked;
              return (
                <div key={msg._id} id={`msg-${msg._id}`} className="flex justify-center my-3">
                  <div className={`w-full max-w-[22rem] p-4 rounded-2xl border shadow-sm ${highlightedMsgId === msg._id ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`} onClick={() => setDetailMsg(msg)}>
                    <div className='flex items-center justify-between'>
                      <div className="flex items-center gap-2 min-w-0">
                       
                        <p className="text-base font-semibold text-gray-900 break-words truncate">{msg.content || msg.pollQuestion || 'Bình chọn'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* {typeof msg.isPinned === 'boolean' && onPinMessage && ( */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinMessage?.(msg);
                            }}
                            className="px-2 py-1 text-xs font-semibold rounded-lg 
                             border-blue-200 text-blue-600 hover:bg-blue-50 hover:cursor-pointer"
                             
                          >
                            {msg.isPinned ? 'Bỏ ghim' : 'Ghim'}
                          </button>
                        {/* )} */}
                      </div>
                      
                    </div>
                    {locked && (
                        <p className="text-xs text-gray-500 mt-2">Kết thúc lúc {new Date(msg.pollLockedAt || msg.editedAt || msg.timestamp).toLocaleString('vi-VN')}</p>
                      )}
                    <p className="text-xs text-gray-500 mt-1">Chọn nhiều phương án</p>
                    <button onClick={() => setDetailMsg(msg)} className="text-xs text-blue-600 hover:underline mt-1">
                      {(() => {
                        const userIds = new Set<string>();
                        let totalVotes = 0;
                        (msg.pollOptions || []).forEach((opt) => {
                          const arr = Array.isArray(votes[opt]) ? (votes[opt] as string[]) : [];
                          totalVotes += arr.length;
                          arr.forEach((id) => userIds.add(String(id)));
                        });
                        return `${userIds.size} người bình chọn, ${totalVotes} lượt bình chọn`;
                      })()}
                    </button>
                    <div className="mt-3 space-y-2">
                      {options.map((opt, idx) => {
                        const arr = Array.isArray(votes[opt]) ? (votes[opt] as string[]) : [];
                        const count = arr.length;
                        const voted = arr.includes(myId);
                        return (
                          <button
                            key={`${String(msg._id)}-${idx}`}
                            onClick={(e) => { e.stopPropagation(); setDetailMsg(msg); }}
                            className={`w-full cursor-pointer px-4 py-3 rounded-xl border text-left transition-colors ${
                              voted ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{opt}</span>
                              <span className="text-sm">{count}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2">
                      <button onClick={() => setDetailMsg(msg)} className="w-full cursor-pointer px-4 py-2 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 font-semibold text-sm">
                        {locked ? 'Xem lựa chọn' : 'Đổi lựa chọn'}
                      </button>
                    </div>
                    
                    {/* Chỉ cho phép bình chọn trong modal: bỏ thêm lựa chọn inline */}
                  </div>
                </div>
              );
            }
                         
            const avatarChar = senderInfo.name?.charAt(0).toUpperCase() || '?';
            const senderName = allUsersMap.get(senderInfo._id) || senderInfo.name;

            return (
              <div
                key={msg._id}
                id={`msg-${msg._id}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
                className={`
                  w-full px-3 sm:max-w-[22rem]
                  flex gap-2 group relative
                  ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'}
                  ${isGrouped ? 'mt-1' : 'mt-4'}
                  ${highlightedMsgId === msg._id ? 'bg-yellow-50 rounded-xl' : ''}
                `}
              >
                {/* Avatar */}
                {!isMe && (
                  <div className={`${isGrouped ? 'opacity-0' : ''} flex-shrink-0`}>
                    {senderInfo.avatar ? (
                      <Image
                        src={getProxyUrl(senderInfo.avatar)}
                        width={38}
                        height={38}
                        alt={senderInfo.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                        {avatarChar}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                  {isEdited && !isRecalled && (
                    <span
                      className="text-[10px] px-1 text-blue-500 hover:underline hover:cursor-pointer"
                      onClick={() => setExpandedOriginalId((prev) => (prev === msg._id ? null : msg._id))}
                    >
                      {expandedOriginalId === msg._id ? <p>Ẩn chỉnh sửa</p> : <p>Đã chỉnh sửa</p>}
                    </span>
                  )}
                  {/* Reply preview */}
                  {repliedToMsg && (
                    <div
                      onClick={() => onJumpToMessage(repliedToMsg._id)}
                      className="max-w-[70vw] sm:max-w-[18rem] px-3 py-2 mb-1 text-xs bg-gray-100 border-l-4 border-blue-500 rounded-xl cursor-pointer"
                    >
                      <p className="font-semibold text-blue-600">{msg.replyToMessageName || senderName}</p>
                      <p className="truncate text-gray-600">
                        {repliedToMsg.isRecalled ? 'Tin nhắn đã bị thu hồi' : repliedToMsg.content || '[Tệp]'}
                      </p>
                    </div>
                  )}

                  {/* MAIN BUBBLE */}
                  <div
                    className={`
                      px-4 py-2 rounded-3xl shadow-md max-w-[70vw] sm:max-w-[20rem] break-words
                      ${isMe ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}
                      ${!isGrouped && isMe ? 'rounded-tr-md' : ''}
                      ${!isGrouped && !isMe ? 'rounded-tl-md' : ''}
                      ${isRecalled ? '!bg-gray-200 !text-gray-500 italic' : ''}
                      ${isVideo || msg.type === 'sticker' ? '!p-0 !shadow-none bg-transparent' : ''}
                      ${msg.type === 'image' ? '!p-0' : ''}
                      ${msg.type === 'file' ? '!px-2 !py-2' : ''}
                    relative
                    `}
                    onClick={() => {
                      setTimeVisibleId((prev) => (prev === msg._id ? null : msg._id));
                      setActiveMoreId(msg._id);
                    }}
                  >
                    {!isRecalled && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onContextMenu(e, msg);
                        }}
                        className={`
                          absolute top-1/2 -translate-y-1/2 z-10
                          cursor-pointer p-1.5 bg-white/90 rounded-4xl shadow hover:bg-blue-50
                          ${isMe ? 'right-full mr-2' : 'left-full ml-2'}
                          ${activeMoreId === msg._id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                          sm:pointer-events-auto sm:opacity-0 sm:group-hover:opacity-100
                        `}
                        aria-label="Mở menu"
                        title="Thêm"
                      >
                        <HiEllipsisVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    {/* Group sender name */}
                    {!isMe && isGroup && !isGrouped && !isRecalled && (
                      <p className="text-blue-600 text-xs font-bold mb-1">{senderName}</p>
                    )}

                    {/* TEXT */}
                    {msg.type === 'text' && !isRecalled && !isEditing && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {renderMessageContent(msg.content || '', msg.mentions, isMe)}
                      </div>
                    )}

                    {msg.type === 'text' && !isRecalled && isEditing && (
                      <div className="text-sm leading-relaxed">
                        <textarea
                          value={typeof editContent === 'string' ? editContent : msg.content || ''}
                          onChange={(e) => setEditContent?.(e.target.value)}
                          className={`w-full p-2 rounded-xl border ${
                            isMe ? 'bg-white text-gray-800' : 'bg-gray-50 text-gray-800'
                          }`}
                          rows={3}
                        />
                        <div className={`mt-2 flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <button
                            onClick={() => {
                              setEditingMessageId?.(null);
                              setEditContent?.('');
                            }}
                            className="px-3 py-1.5 cursor-pointer rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 hover:cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => {
                              const content = typeof editContent === 'string' ? editContent : msg.content || '';
                              onSaveEdit?.(msg._id, content);
                            }}
                            className="px-3 py-1.5 cursor-pointer rounded-lg bg-blue-500 text-white hover:bg-blue-600 hover:cursor-pointer"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    )}

                    {/* IMAGE – FIX SIZE MOBILE */}
                    {msg.type === 'image' && msg.fileUrl && (
                      <div
                        className="relative rounded-2xl overflow-hidden cursor-pointer shadow-md max-w-[70vw] sm:max-w-[18rem]"
                        onClick={() => !isUploading && onOpenMedia(getProxyUrl(msg.fileUrl), 'image')}
                      >
                        <Image
                          src={getProxyUrl(msg.fileUrl)}
                          alt="Ảnh"
                          width={600}
                          height={600}
                          className="w-full h-auto object-cover"
                        />

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/70 text-white flex items-center justify-center text-sm font-semibold">
                            {Math.round(uploadProgress)}%
                          </div>
                        )}
                      </div>
                    )}

                    {/* VIDEO – FIX SIZE MOBILE */}
                    {isVideo && msg.fileUrl && (
                      <div
                        className="relative rounded-2xl overflow-hidden cursor-pointer shadow-lg max-w-[70vw] sm:max-w-[18rem] aspect-video bg-black"
                        onClick={() => !isUploading && onOpenMedia(getProxyUrl(msg.fileUrl!), 'video')}
                      >
                        <video
                          src={getProxyUrl(msg.fileUrl)}
                          className="w-full h-full object-cover"
                          playsInline
                          preload="metadata"
                        />

                        {/* play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-100">
                          <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center shadow">
                            <HiPlay className="w-7 h-7 text-blue-600 ml-1" />
                          </div>
                        </div>

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                            {Math.round(uploadProgress)}%
                          </div>
                        )}
                      </div>
                    )}

                    {/* FILE – FIX SIZE MOBILE */}
                    {msg.type === 'file' && msg.fileUrl && !isVideo && (
                      <a
                        href={getProxyUrl(msg.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-2xl max-w-[70vw] sm:max-w-[18rem] shadow-sm hover:bg-gray-50"
                      >
                        <div className="p-2 bg-blue-600 rounded-xl">
                          <HiOutlineDocumentText className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {msg.fileName || 'Tệp đính kèm'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">Nhấn để tải xuống</p>
                        </div>
                      </a>
                    )}

                    {isRecalled && <p className="text-sm italic opacity-70">Tin nhắn đã bị thu hồi</p>}

                    {/* ✅ Hiển thị nội dung gốc nếu đã chỉnh sửa */}
                    {isEdited && !isRecalled && msg.originalContent && (
                      <div className=" border-gray-300 ">
                        {expandedOriginalId === msg._id && (
                          <div className="text-xs border-t-[1px] border-t-gray-300  text-gray-500 space-y-1 flex items-center justify-between">
                            <p className={`p-1 m-1 whitespace-pre-wrap pt-2 pb-1 rounded ${isMe ? 'bg-white' : ''}`}>
                              {msg.originalContent}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✅ Hiển thị nội dung gốc nếu đã chỉnh sửa */}

                  {timeVisibleId === msg._id && (
                    <span className={`text-xs mt-1  text-gray-500`}>{formatTimestamp(msg.timestamp)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <ReminderDetailModal
       isOpen={!!detailMsg}
        message={detailMsg}
         onClose={() => setDetailMsg(null)}
      />
      <PollDetailModal 
        isOpen={!!detailMsg && detailMsg.type === 'poll'}
         message={detailMsg && detailMsg.type === 'poll' ? detailMsg : null}
        onClose={() => setDetailMsg(null)}
         onRefresh={onRefresh}
      />
    </>
  );
}
