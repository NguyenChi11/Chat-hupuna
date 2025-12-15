'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Message } from '@/types/Message';
import type { User } from '@/types/User';
import { isVideoFile, getProxyUrl } from '@/utils/utils';

// Icons
import {
  HiOutlineDocumentText,
  HiPlay,
  HiEllipsisVertical,
  HiOutlineClock,
  HiMapPin,
  HiChartBar,
  HiUserPlus,
  HiUserMinus,
  HiShieldCheck,
  HiUserGroup,
} from 'react-icons/hi2';
import { HiPhone, HiVideoCamera, HiArrowDown, HiArrowUp } from 'react-icons/hi2';
import { HiLink, HiOutlineLogout } from 'react-icons/hi';
import ReminderDetailModal from './components/ReminderDetailModal';
import PollDetailModal from './components/PollDetailModal';
import ReactionButton from './components/ReactionButton';
import FolderButton from './components/Folder/FolderButton';
import { ContextMenuState } from './MessageContextMenu';

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
  onReplyMessage?: (msg: Message) => void;
  onJumpToMessage: (id: string) => void;
  getSenderInfo: (sender: User | string) => SenderInfo;
  renderMessageContent: (content: string, mentionedUserIds?: string[], isMe?: boolean) => React.ReactNode;
  onOpenMedia: (url: string, type: 'image' | 'video') => void;
  editingMessageId: string | null;
  setEditingMessageId?: (id: string | null) => void;
  editContent?: string;
  setEditContent?: (content: string) => void;
  onSaveEdit?: (id: string, content: string) => void;
  onRefresh?: () => Promise<void>;
  onPinMessage?: (msg: Message) => void;
  onToggleReaction?: (msg: Message, emoji: string) => void;
  contextMenu: ContextMenuState | null;
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
  onReplyMessage,
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
  onPinMessage,
  onToggleReaction,
}: MessageListProps) {
  const [, setTimeVisibleId] = useState<string | null>(null);
  const [expandedOriginalId, setExpandedOriginalId] = useState<string | null>(null);
  const [activeMoreId, setActiveMoreId] = useState<string | null>(null);
  const [detailMsg, setDetailMsg] = useState<Message | null>(null);
  const [reactionDetail, setReactionDetail] = useState<{ msgId: string; emoji: string } | null>(null);

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
            <span className="px-4 py-1 text-xs font-medium text-gray-600 bg-gray-50/90 rounded-full shadow">
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
            const reactions = (msg.reactions || {}) as Record<string, string[]>;
            const myId = String(currentUser._id);
            const hasReactions = Object.values(reactions).some((arr) => (arr || []).length > 0);

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
              if ((msg as Message & { callType?: 'voice' | 'video' }).callType) {
                const callType =
                  (msg as Message & { callType?: 'voice' | 'video' }).callType === 'video' ? 'video' : 'voice';
                const calleeId = (msg as Message & { calleeId?: string }).calleeId || '';
                const status =
                  (msg as Message & { callStatus?: 'answered' | 'rejected' | 'timeout' }).callStatus || 'answered';
                const dur = Number((msg as Message & { callDurationSec?: number }).callDurationSec || 0);
                const incoming = String(currentUser._id) === String(calleeId);
                const iconType =
                  callType === 'video' ? (
                    status === 'rejected' || status === 'timeout' ? (
                      <HiVideoCamera className="w-4 h-4 text-red-600" />
                    ) : (
                      <HiVideoCamera className="w-4 h-4 text-blue-600" />
                    )
                  ) : status === 'rejected' || status === 'timeout' ? (
                    <HiPhone className="w-4 h-4 text-red-600" />
                  ) : (
                    <HiPhone className="w-4 h-4 text-green-600" />
                  );
                const iconDir = incoming ? (
                  <HiArrowDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <HiArrowUp className="w-4 h-4 text-gray-600" />
                );
                const title = `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} ${incoming ? 'đến' : 'đi'}`;
                const detail =
                  status === 'answered'
                    ? `${Math.floor(dur / 60)} phút ${Math.floor(dur % 60)} giây`
                    : status === 'rejected'
                      ? 'Bị từ chối'
                      : incoming
                        ? 'Nhỡ'
                        : 'Không phản hồi';
                const dt = new Date(msg.timestamp);
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                const sameDate = (a: Date, b: Date) =>
                  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
                const dateLabel = sameDate(dt, today)
                  ? 'Hôm nay'
                  : sameDate(dt, yesterday)
                    ? 'Hôm qua'
                    : dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeLabel = dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={msg._id} id={`msg-${msg._id}`} className="flex justify-center my-3">
                    <div
                      className={`px-4 p-1.5 bg-white rounded-full max-w-[80vw]  sm:max-w-[28rem] overflow-hidden ${highlightedMsgId === msg._id ? 'bg-yellow-50' : 'bg-gray-100'}`}
                    >
                      <div className="flex items-center gap-2">
                        {iconType}
                        {iconDir}
                        <div>
                          <p className="text-xs text-gray-500 truncate">{`${title} – ${detail}`}</p>
                          <p className="text-xs text-gray-500 truncate">{` ${dateLabel} • ${timeLabel}`}</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const t = callType === 'video' ? 'video' : 'voice';
                            const evt = new CustomEvent('startCall', { detail: { type: t } });
                            window.dispatchEvent(evt);
                          }}
                          className="ml-2 px-2 py-1 text-xs font-semibold rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 hover:cursor-pointer"
                        >
                          Gọi lại
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              const related = msg.replyToMessageId ? messages.find((m) => m._id === msg.replyToMessageId) : null;
              const rawDisplay = msg.content || '';
              const rawLower = rawDisplay.trim().toLowerCase();
              const isJoinByLink = rawLower.includes('tham gia nhóm');
              let display = rawDisplay;
              if (!isJoinByLink && isMe) {
                const myName = currentUser.name || '';
                const trimmedLower = display.trim().toLowerCase();
                if (!trimmedLower.startsWith('bạn') && myName && display.startsWith(myName)) {
                  display = 'Bạn' + display.slice(myName.length);
                }
              }
              const contentLower = display.toLowerCase();
              const isCreate = contentLower.includes('đã tạo lịch hẹn');
              const isDue = contentLower.includes('đến giờ lịch hẹn');
              const isEdit = contentLower.includes('đã chỉnh sửa') || contentLower.includes('chỉnh sửa');
              const isDelete = contentLower.includes('đã xóa') || contentLower.includes('xóa');
              const isPoll = related?.type === 'poll' || contentLower.includes('bình chọn');
              const isPin = contentLower.includes('ghim');
              // Group actions
              const isInvite =
                contentLower.includes('đã thêm') || (contentLower.includes('mời') && contentLower.includes('vào nhóm'));
              const isLeave = contentLower.includes('đã rời nhóm');
              const isPromote = contentLower.includes('bổ nhiệm') || contentLower.includes('phó nhóm');
              const isDemote = contentLower.includes('hủy quyền phó nhóm') || contentLower.includes('bãi nhiệm');
              const isKick = contentLower.includes('ra khỏi nhóm') || contentLower.includes('xóa khỏi nhóm');
              const isCreateGroup = contentLower.includes('tạo nhóm');
              const icon = isDue ? (
                <HiOutlineClock className="w-4 h-4 text-red-500" />
              ) : isCreate ? (
                <HiOutlineClock className="w-4 h-4 text-indigo-500" />
              ) : isPoll ? (
                <HiChartBar className="w-4 h-4 text-blue-500" />
              ) : isPin ? (
                <HiMapPin className="w-4 h-4 text-orange-500" />
              ) : isInvite ? (
                <HiUserPlus className="w-4 h-4 text-emerald-600" />
              ) : isLeave ? (
                <HiOutlineLogout className="w-4 h-4 text-red-600" />
              ) : isPromote ? (
                <HiShieldCheck className="w-4 h-4 text-blue-600" />
              ) : isDemote ? (
                <HiUserMinus className="w-4 h-4 text-yellow-600" />
              ) : isKick ? (
                <HiUserMinus className="w-4 h-4 text-red-600" />
              ) : isCreateGroup ? (
                <HiUserGroup className="w-4 h-4 text-purple-600" />
              ) : null;
              const nameLabel = senderInfo.name || '';
              // Hiển thị rõ tên người join bằng link (clickable) — luôn ưu tiên tên thật
              let displayNode: React.ReactNode = <p className="text-xs text-gray-500 truncate">{display}</p>;
              if (isJoinByLink) {
                const actualName = senderInfo._id === currentUser._id ? currentUser.name || nameLabel : nameLabel;
                const needle = 'đã tham gia nhóm';
                const idx = rawLower.indexOf(needle);
                const tail = idx > -1 ? rawDisplay.slice(idx) : 'đã tham gia nhóm qua link mời';
                displayNode = (
                  <span className="text-xs text-gray-500 truncate">
                    <a href={`/profile/${senderInfo._id}`} className="text-blue-600 hover:underline">
                      {actualName || 'Một thành viên'}
                    </a>
                    {` ${tail}`}
                  </span>
                );
              }
              const pillNode = (
                <div key={`pill-${msg._id}`} id={`msg-${msg._id}`} className="flex justify-center my-3">
                  <div
                    className={`px-4 p-1.5 bg-white rounded-full max-w-[80vw]  sm:max-w-[28rem] overflow-hidden ${highlightedMsgId === msg._id ? 'bg-yellow-50' : 'bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      {displayNode}
                    </div>
                  </div>
                </div>
              );
              if (isDue) {
                if (related?.type === 'reminder') {
                  return (
                    <React.Fragment key={`notify-${msg._id}-due`}>
                      {pillNode}
                      <div className="flex justify-center -mt-2 ">
                        <button
                          onClick={() => setDetailMsg(related)}
                          className="text-xs text-blue-600 hover:underline hover:cursor-pointer"
                        >
                          Xem thêm
                        </button>
                      </div>
                    </React.Fragment>
                  );
                }
                const inlineAt = (msg as Message & { reminderAt?: number }).reminderAt;
                const inlineContent =
                  (msg as Message & { reminderContent?: string }).reminderContent || msg.content || '';
                const inlineNote = (msg as Message & { reminderNote?: string }).reminderNote;
                const stub: Message = {
                  _id: (msg.replyToMessageId as unknown as string) || String(msg._id),
                  roomId: String(msg.roomId || ''),
                  sender: msg.sender,
                  content: inlineContent,
                  type: 'reminder',
                  timestamp: Number(msg.timestamp) || Date.now(),
                  reminderAt: typeof inlineAt === 'number' ? inlineAt : undefined,
                  reminderNote: inlineNote,
                  reminderRepeat: (msg as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' })
                    .reminderRepeat,
                } as Message;
                return (
                  <React.Fragment key={`notify-${msg._id}-due-inline`}>
                    {pillNode}
                    <div className="flex justify-center -mt-2">
                      <button
                        onClick={() => setDetailMsg(stub)}
                        className="text-xs text-blue-600 hover:underline hover:cursor-pointer"
                      >
                        Xem thêm
                      </button>
                    </div>
                  </React.Fragment>
                );
              }
              if (related?.type === 'reminder' && (isCreate || isEdit || isDelete)) {
                return (
                  <React.Fragment key={`notify-${msg._id}-reminder`}>
                    {pillNode}
                    <div className="flex justify-center -mt-2">
                      <button
                        onClick={() => setDetailMsg(related)}
                        className="text-xs text-blue-600 hover:underline hover:cursor-pointer"
                      >
                        Xem thêm
                      </button>
                    </div>
                  </React.Fragment>
                );
              }
              if (isCreate || isEdit || isDelete) {
                const inlineAt = (msg as Message & { reminderAt?: number }).reminderAt;
                const inlineContent = (msg as Message & { reminderContent?: string }).reminderContent || '';
                const inlineNote = (msg as Message & { reminderNote?: string }).reminderNote;
                if (typeof inlineAt === 'number' && inlineContent) {
                  const stub: Message = {
                    _id: (msg.replyToMessageId as unknown as string) || String(msg._id),
                    roomId: String(msg.roomId || ''),
                    sender: msg.sender,
                    content: inlineContent,
                    type: 'reminder',
                    timestamp: Number(msg.timestamp) || Date.now(),
                    reminderAt: inlineAt,
                    reminderNote: inlineNote,
                    reminderRepeat: (msg as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' })
                      .reminderRepeat,
                  } as Message;
                  return (
                    <React.Fragment key={`notify-${msg._id}-reminder-inline`}>
                      {pillNode}
                      <div className="flex justify-center -mt-2">
                        <button
                          onClick={() => setDetailMsg(stub)}
                          className="text-xs text-blue-600 hover:underline hover:cursor-pointer"
                        >
                          Xem thêm
                        </button>
                      </div>
                    </React.Fragment>
                  );
                }
              }
              if (related?.type === 'poll') {
                return (
                  <React.Fragment key={`notify-${msg._id}-poll`}>
                    {pillNode}
                    <div className="flex justify-center -mt-2">
                      <button
                        onClick={() => setDetailMsg(related)}
                        className="text-xs text-blue-600 hover:underline hover:cursor-pointer"
                      >
                        Xem
                      </button>
                    </div>
                  </React.Fragment>
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
                  <div
                    className={`px-4 py-1.5 rounded-full ${highlightedMsgId === msg._id ? 'bg-yellow-50' : 'bg-gray-100'}`}
                  >
                    <div className="w-full max-w-[22rem] p-4 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 min-w-0 text-red-500">
                        <HiOutlineClock className="w-5 h-5" />
                        <span className="font-semibold truncate">{msg.content || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <HiOutlineClock className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(
                            (msg as Message & { reminderAt?: number }).reminderAt || msg.timestamp,
                          ).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      {(msg as Message & { reminderNote?: string }).reminderNote ? (
                        <p className="text-sm text-gray-700 truncate">
                          {(msg as Message & { reminderNote?: string }).reminderNote as string}
                        </p>
                      ) : null}
                      <div className="pt-1">
                        <button
                          onClick={() => setDetailMsg(msg)}
                          className="w-full cursor-pointer px-4 py-2 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 font-semibold text-sm"
                        >
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
                  <div
                    className={`w-full max-w-[22rem] p-4 rounded-2xl border shadow-sm ${highlightedMsgId === msg._id ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}
                    onClick={() => setDetailMsg(msg)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-base font-semibold text-gray-900 break-words truncate">
                          {msg.content || msg.pollQuestion || 'Bình chọn'}
                        </p>
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
                      <p className="text-xs text-gray-500 mt-2">
                        Kết thúc lúc{' '}
                        {new Date(msg.pollLockedAt || msg.editedAt || msg.timestamp).toLocaleString('vi-VN')}
                      </p>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailMsg(msg);
                            }}
                            className={`w-full cursor-pointer px-4 py-3 rounded-xl border text-left transition-colors ${
                              voted
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-800'
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
                      <button
                        onClick={() => setDetailMsg(msg)}
                        className="w-full cursor-pointer px-4 py-2 text-blue-600 border border-blue-300 rounded-xl hover:bg-blue-50 font-semibold text-sm"
                      >
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
                  onReplyMessage?.(msg);
                }}
                className={`
                  w-full  sm:max-w-[22rem]
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
                      className="text-[0.625rem] px-1 text-blue-500 hover:underline hover:cursor-pointer"
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
                      px-4 py-2 rounded-lg shadow-md max-w-[50vw] sm:max-w-[20rem] break-words
                      ${isMe ? 'bg-[#E5F1FF] text-white' : 'bg-white text-gray-800 border border-gray-200'}
                      ${!isGrouped && isMe ? 'rounded-tr-md' : ''}
                      ${!isGrouped && !isMe ? 'rounded-tl-md' : ''}
                      ${isRecalled ? '!bg-gray-200 !text-gray-500 italic !px-4 !py-2 sm:!max-w-[18rem]' : ''}
                      ${!isRecalled && (isVideo || msg.type === 'sticker' || msg.type === 'file' || msg.type === 'image') ? '!p-0 !shadow-none bg-transparent' : ''}
                      ${!isRecalled && msg.type === 'image' ? '!p-0' : ''}
                      ${!isRecalled && msg.type === 'file' ? '!px-2 !py-2' : ''}
                    relative ${hasReactions ? 'mb-4' : ''}
                    `}
                    onClick={() => {
                      setTimeVisibleId((prev) => (prev === msg._id ? null : msg._id));
                      setActiveMoreId(msg._id);
                      setReactionDetail(null);
                    }}
                  >
                    {!isRecalled && (
                      <>
                        {/* Button menu ba chấm */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onContextMenu(e, msg);
                          }}
                          className={`
                              absolute top-1/2 -translate-y-1/2 z-10
                              cursor-pointer p-1.5 bg-white/90 rounded-full shadow hover:bg-blue-50
                              ${isMe ? 'right-full mr-2' : 'left-full ml-2'}
                              ${activeMoreId === msg._id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                              sm:pointer-events-auto sm:opacity-0 sm:group-hover:opacity-100
                            `}
                          aria-label="Mở menu"
                          title="Thêm"
                        >
                          <HiEllipsisVertical className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Reaction Button - cách xa button menu */}
                        <ReactionButton
                          isMine={isMe}
                          visible={activeMoreId === msg._id} // Truyền prop visible thay vì dùng className
                          onPick={(emoji) => {
                            onToggleReaction?.(msg, emoji);
                            setActiveMoreId(null); // Đóng sau khi chọn emoji
                          }}
                          className={`
                              ${isMe ? 'right-full mr-10' : 'left-full ml-10'}
                              ${
                                activeMoreId === msg._id
                                  ? 'opacity-100 pointer-events-auto'
                                  : 'opacity-0 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'
                              }
                            `}
                        />
                        <FolderButton
                          roomId={String(msg.roomId)}
                          messageId={String(msg._id)}
                          isMine={isMe}
                          visible={activeMoreId === msg._id}
                          className={`
                            ${isMe ? 'right-full mr-18' : 'left-full ml-18'}
                            ${
                              activeMoreId === msg._id
                                ? 'opacity-100 pointer-events-auto'
                                : 'opacity-0 pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'
                            }
                          `}
                          preview={
                            msg.type === 'text'
                              ? msg.content || ''
                              : msg.type === 'file'
                                ? msg.fileName
                                  ? `[File] ${msg.fileName}`
                                  : '[File]'
                                : msg.type === 'image'
                                  ? '[Ảnh]'
                                  : msg.type === 'video'
                                    ? '[Video]'
                                    : msg.type === 'sticker'
                                      ? '[Sticker]'
                                      : msg.type === 'reminder'
                                        ? msg.content || '[Nhắc nhở]'
                                        : `[${msg.type}]`
                          }
                          content={msg.content}
                          type={msg.type}
                          fileUrl={String(msg.fileUrl || msg.previewUrl || '')}
                          fileName={msg.fileName}
                          onSaved={(folderId) => {
                            setActiveMoreId(null);
                          }}
                        />
                      </>
                    )}
                    {/* {!isRecalled && (
                      
                    )} */}
                    {!isRecalled && (
                      <>
                        {(() => {
                          const items = Object.entries(reactions)
                            .map(([emoji, arr]) => ({
                              emoji,
                              count: (arr || []).length,
                              mine: (arr || []).includes(myId),
                              users: (arr || []).map((id) => allUsersMap.get(String(id)) || 'Người dùng'),
                            }))
                            .filter((x) => x.count > 0)
                            .sort((a, b) => b.count - a.count);

                          if (items.length === 0) return null;

                          return (
                            <div
                              className={`
                                  absolute ${isMe ? 'right-2 -mr-1' : 'left-2 -ml-1'} 
                                  -bottom-4 
                                  flex items-center gap-1
                                `}
                            >
                              <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200">
                                {items.slice(0, 3).map((it, idx) => (
                                  <div
                                    key={`${msg._id}-react-${idx}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReactionDetail(
                                        reactionDetail?.msgId === msg._id && reactionDetail?.emoji === it.emoji
                                          ? null
                                          : { msgId: msg._id, emoji: it.emoji },
                                      );
                                    }}
                                    className={`
                                          flex items-center gap-0.5 py-0.5 rounded-full text-sm cursor-pointer
                                          transition-all duration-200 hover:bg-gray-100 active:scale-95
                                          ${it.mine ? 'bg-blue-50' : 'bg-transparent'}
                                        `}
                                    title={`${it.count} người`}
                                  >
                                    <span className="text-lg leading-none">{it.emoji}</span>
                                    {it.count > 1 && (
                                      <span
                                        className={`text-xs font-medium ${it.mine ? 'text-blue-600' : 'text-gray-600'}`}
                                      >
                                        {it.count}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {items.length > 3 && (
                                  <div className="px-2 text-xs text-gray-500 font-medium">+{items.length - 3}</div>
                                )}
                              </div>

                              {/* Hiệu ứng nổi nhẹ khi hover toàn bộ bubble */}
                              <div className="absolute inset-0 -z-10 bg-white/60 backdrop-blur-sm rounded-full scale-0 group-hover:scale-100 transition-transform duration-300" />
                            </div>
                          );
                        })()}

                        {/* Reaction Detail Popover - Hiển thị danh sách người thả */}
                        {reactionDetail && reactionDetail.msgId === msg._id && (
                          <>
                            {/* Backdrop để đóng popover */}
                            <div className="fixed inset-0 z-30" onClick={() => setReactionDetail(null)} />

                            {/* Popover content */}
                            <div
                              ref={(el) => {
                                if (el && reactionDetail.msgId === msg._id) {
                                  const rect = el.parentElement?.getBoundingClientRect();
                                  if (rect) {
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    const popoverHeight = 250; // Estimate height

                                    // Nếu không đủ chỗ ở dưới và có nhiều chỗ hơn ở trên
                                    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
                                      el.style.bottom = '100%';
                                      el.style.top = 'auto';
                                      el.style.marginBottom = '0.625rem'; // mb-2.5
                                      el.style.marginTop = '0';
                                    } else {
                                      el.style.top = '100%';
                                      el.style.bottom = 'auto';
                                      el.style.marginTop = '0.625rem'; // mt-2.5
                                      el.style.marginBottom = '0';
                                    }
                                  }
                                }
                              }}
                              className={`
                                    absolute ${isMe ? 'right-2' : 'left-2'} 
                                    z-40
                                  `}
                            >
                              {(() => {
                                const users = (reactions[reactionDetail.emoji] || []).map(
                                  (id) => allUsersMap.get(String(id)) || String(id),
                                );

                                return (
                                  <div className="min-w-[11.25rem] max-w-[15rem] px-3 py-2.5 bg-white rounded-xl border border-gray-200 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                      <span className="text-2xl">{reactionDetail.emoji}</span>
                                      <span className="text-sm font-semibold text-gray-700">{users.length} người</span>
                                    </div>
                                    {users.length > 0 ? (
                                      <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {users.map((name, idx) => (
                                          <li
                                            key={`${msg._id}-user-${idx}`}
                                            className="text-sm text-gray-700 py-1 hover:text-blue-600 transition-colors"
                                          >
                                            {name}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="text-sm text-gray-500 py-1">Chưa có ai</div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {/* Group sender name */}
                    {!isMe && isGroup && !isGrouped && !isRecalled && (
                      <p className="text-blue-600 text-xs font-bold mb-1">{senderName}</p>
                    )}

                    {/* TEXT */}
                    {msg.type === 'text' && !isRecalled && !isEditing && (
                      <div className="text-sm leading-relaxed text-black whitespace-pre-wrap">
                        {renderMessageContent(msg.content || '', msg.mentions, isMe)}
                        {(() => {
                          const linkMatch = (msg.content || '').match(/(https?:\/\/|www\.)\S+/i);
                          if (!linkMatch) return null;
                          const raw = linkMatch[0];
                          const href = raw.startsWith('http') ? raw : `https://${raw}`;
                          const hostname = (() => {
                            try {
                              return new URL(href).hostname.replace('www.', '');
                            } catch {
                              return 'Website';
                            }
                          })();
                          return (
                            <div
                              className={`mt-2 rounded-xl border ${isMe ? 'border-white/30' : 'border-gray-200'} bg-white overflow-hidden`}
                            >
                              <button
                                onClick={() => window.open(href, '_blank')}
                                className="w-full text-left p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                              >
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white">
                                  <HiLink className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-purple-600 truncate">{raw}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{hostname}</p>
                                </div>
                              </button>
                            </div>
                          );
                        })()}
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
                    {msg.type === 'image' && msg.fileUrl && !isRecalled && (
                      <div
                        className="relative rounded-[0.25rem] overflow-hidden cursor-pointer shadow-md max-w-[70vw] sm:max-w-[10rem]"
                        onClick={() => !isUploading && onOpenMedia(String(msg.fileUrl), 'image')}
                      >
                        {String(msg.fileUrl).startsWith('blob:') ? (
                          <Image
                            width={600}
                            height={600}
                            src={String(msg.fileUrl)}
                            alt="Ảnh"
                            className="w-full h-auto object-cover"
                          />
                        ) : (
                          <Image
                            src={getProxyUrl(msg.fileUrl)}
                            alt="Ảnh"
                            width={600}
                            height={600}
                            className="w-full h-auto object-cover"
                          />
                        )}

                        {isUploading && (
                          <div className="absolute inset-0 bg-black/70 text-white flex items-center justify-center text-sm font-semibold">
                            {Math.round(uploadProgress)}%
                          </div>
                        )}
                      </div>
                    )}
                    {msg.type === 'image' && !isRecalled && msg.content && (
                      <div className={`mt-2 text-sm leading-relaxed px-2 ${isMe ? 'text-white' : 'text-gray-700'}`}>
                        {renderMessageContent(msg.content || '', msg.mentions, isMe)}
                      </div>
                    )}

                    {/* VIDEO – FIX SIZE MOBILE */}
                    {isVideo && msg.fileUrl && !isRecalled && (
                      <div
                        className="relative rounded-2xl overflow-hidden cursor-pointer shadow-lg max-w-[70vw] sm:max-w-[18rem] aspect-video bg-black"
                        onClick={() => !isUploading && onOpenMedia(String(msg.fileUrl!), 'video')}
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

                    {isVideo && !isRecalled && msg.content && (
                      <div className={`px-2 mt-2 text-sm leading-relaxed ${isMe ? 'text-white' : 'text-gray-700'}`}>
                        {renderMessageContent(msg.content || '', msg.mentions, isMe)}
                      </div>
                    )}

                    {/* FILE – FIX SIZE MOBILE */}
                    {msg.type === 'file' && msg.fileUrl && !isVideo && !isRecalled && (
                      <a
                        href={getProxyUrl(msg.fileUrl)}
                        download={msg.fileName || 'download'}
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
                    {msg.type === 'file' && !isRecalled && msg.content && (
                      <div className={`mt-2 text-sm leading-relaxed px-2 ${isMe ? 'text-white' : 'text-gray-700'}`}>
                        {renderMessageContent(msg.content || '', msg.mentions, isMe)}
                      </div>
                    )}

                    {isRecalled && <p className="text-sm italic opacity-70">đã thu hồi tin nhắn</p>}

                    {/* ✅ Hiển thị nội dung gốc nếu đã chỉnh sửa */}
                    {isEdited && !isRecalled && msg.originalContent && (
                      <div className=" border-gray-300 ">
                        {expandedOriginalId === msg._id && (
                          <div className="text-xs border-t-[1px] border-t-gray-300  text-gray-500 space-y-1 flex items-center justify-between">
                            <p
                              className={`p-1 m-1 whitespace-pre-wrap pt-2 pb-1 rounded w-full ${isMe ? 'bg-white' : ''}`}
                            >
                              {msg.originalContent}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <span className={`text-xs mt-1 ${isMe ? 'text-gray-700' : 'text-gray-500'}  `}>
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <ReminderDetailModal isOpen={!!detailMsg} message={detailMsg} onClose={() => setDetailMsg(null)} />
      <PollDetailModal
        isOpen={!!detailMsg && detailMsg.type === 'poll'}
        message={detailMsg && detailMsg.type === 'poll' ? detailMsg : null}
        onClose={() => setDetailMsg(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}
