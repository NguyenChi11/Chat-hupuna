import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { HiEllipsisVertical, HiLockClosed, HiLockOpen } from 'react-icons/hi2';
import { useChatContext } from '@/context/ChatContext';
import type { Message } from '@/types/Message';
import type { GroupConversation } from '@/types/Group';
import type { User } from '@/types/User';
import { readMessagesApi, createMessageApi, updateMessageApi } from '@/fetch/messages';
import { io } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import CreatePollModal from './CreatePollModal';
import PollDetailModal from './PollDetailModal';

interface PollListProps {
  onClose: () => void;
  onRefresh?: () => void;
}

export default function PollList({ onClose, onRefresh }: PollListProps) {
  // ✅ BỎ DÒNG NÀY - Không cần nữa
  // const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL as string | undefined;
  
  const { selectedChat, currentUser, isGroup } = useChatContext();
  const roomId = useMemo(() => {
    const me = String(currentUser._id);
    const other = String((selectedChat as unknown as { _id: string })._id);
    return isGroup ? other : [me, other].sort().join('_');
  }, [isGroup, selectedChat, currentUser]);
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detailMsg, setDetailMsg] = useState<Message | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await readMessagesApi(roomId, {
        limit: 200,
        sortOrder: 'desc',
        extraFilters: { type: 'poll', isRecalled: { $ne: true } },
      });
      const data = Array.isArray(res.data) ? (res.data as Message[]) : [];
      setItems(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openMenuId) return;
      const menuElement = menuRefs.current.get(openMenuId);
      if (menuElement && !menuElement.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    socketRef.current?.disconnect();
    
    // ✅ DÙNG resolveSocketUrl() thống nhất
    socketRef.current = io(resolveSocketUrl(), { 
      transports: ['websocket'], 
      withCredentials: false 
    });
    
    socketRef.current.emit('join_room', roomId);
    socketRef.current.on('receive_message', (data: Message) => {
      if (String(data.roomId) !== String(roomId) || data.type !== 'poll') return;
      setItems((prev) => {
        const map = new Map<string, Message>();
        [...prev, data].forEach((m) => map.set(String(m._id), m));
        return Array.from(map.values()).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      });
    });
    socketRef.current.on(
      'message_edited',
      (data: {
        _id: string;
        roomId: string;
        content?: string;
        editedAt?: number;
        pollQuestion?: string;
        pollOptions?: string[];
        pollVotes?: Record<string, string[]>;
        isPollLocked?: boolean;
        pollLockedAt?: number;
        timestamp?: number;
        isPinned?: boolean;
      }) => {
        if (String(data.roomId) !== String(roomId)) return;
        setItems((prev) => {
          const updated = prev.map((m) =>
            String(m._id) === String(data._id)
              ? {
                  ...m,
                  content: data.content ?? m.content,
                  editedAt: data.editedAt ?? m.editedAt,
                  pollQuestion: data.pollQuestion ?? m.pollQuestion,
                  pollOptions: data.pollOptions ?? m.pollOptions,
                  pollVotes: data.pollVotes ?? m.pollVotes,
                  isPollLocked: data.isPollLocked ?? m.isPollLocked,
                  pollLockedAt: data.pollLockedAt ?? m.pollLockedAt,
                  timestamp: data.timestamp ?? m.timestamp,
                  isPinned: typeof data.isPinned === 'boolean' ? data.isPinned : m.isPinned,
                }
              : m,
          );
          return updated.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        });
      },
    );
    socketRef.current.on('edit_message', (data: { _id: string; roomId: string; newContent: string; editedAt: number }) => {
      if (String(data.roomId) !== String(roomId)) return;
      setItems((prev) =>
        prev.map((m) =>
          String(m._id) === String(data._id)
            ? {
                ...m,
                content: data.newContent,
                editedAt: data.editedAt,
                originalContent: m.originalContent || m.content,
              }
            : m,
        ),
      );
    });
    socketRef.current.on('message_deleted', (data: { _id: string; roomId: string }) => {
      if (String(data.roomId) !== String(roomId)) return;
      setItems((prev) => prev.filter((m) => String(m._id) !== String(data._id)));
    });
    socketRef.current.on('message_pinned', (data: { _id: string; roomId: string; isPinned: boolean }) => {
      if (String(data.roomId) !== String(roomId)) return;
      setItems((prev) =>
        prev.map((m) => (String(m._id) === String(data._id) ? { ...m, isPinned: !!data.isPinned } : m)),
      );
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, load]); // ✅ BỎ SOCKET_URL khỏi dependencies

  const handleCreate = async ({ question, options }: { question: string; options: string[] }) => {
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o);
    if (!question.trim() || cleanOptions.length < 2) return;
    try {
      const createRes = await createMessageApi({
        roomId,
        sender: String(currentUser._id),
        type: 'poll',
        content: question.trim(),
        timestamp: Date.now(),
        pollQuestion: question.trim(),
        pollOptions: cleanOptions,
        pollVotes: {},
        isPollLocked: false,
      });
      if (createRes?.success) {
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const sockBase = {
          roomId,
          sender: String(currentUser._id),
          senderName: currentUser.name,
          isGroup,
          receiver,
          members,
        };
        const name = currentUser.name
        if (typeof createRes._id === 'string') {
          socketRef.current?.emit('send_message', {
            ...sockBase,
            _id: createRes._id,
            type: 'poll',
            content: question.trim(),
            timestamp: Date.now(),
            pollQuestion: question.trim(),
            pollOptions: cleanOptions,
            pollVotes: {},
            isPollLocked: false,
          });
          const notify = await createMessageApi({
            roomId,
            sender: String(currentUser._id),
            type: 'notify',
            content: `${name} tạo cuộc bình chọn mới: "${question.trim()}"`,
            timestamp: Date.now(),
            replyToMessageId: createRes._id,
          });
          if (notify?.success) {
            socketRef.current?.emit('send_message', {
              ...sockBase,
              _id: notify._id,
              type: 'notify',
              content: `${name} tạo cuộc bình chọn mới: "${question.trim()}"`,
              timestamp: Date.now(),
              replyToMessageId: createRes._id,
            });
          }
        }
      }
    } catch {}
    setShowCreate(false);
  };

  const canLock = (item: Message) => {
    const sender = item.sender as User | string;
    const senderId = typeof sender === 'object' && sender ? String(sender._id) : String(sender);
    const isCreator = senderId === String(currentUser._id);
    return isGroup ? isCreator : false;
  };

  const handleToggleLock = async (item: Message) => {
    if (!canLock(item)) return;
    const next = !item.isPollLocked;
    try {
      const now = Date.now();
      const name = currentUser.name
      const updateData = next
        ? { isPollLocked: true, pollLockedAt: now, editedAt: now, timestamp: now }
        : { isPollLocked: false, editedAt: now, timestamp: now };
      await updateMessageApi(String(item._id), updateData);
      socketRef.current?.emit('edit_message', { _id: item._id, roomId, ...updateData });
      if (next) {
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const endStr = new Date(now).toLocaleString('vi-VN');
        const notifyText = `${name} đã khóa bình chọn: "${String(item.content || item.pollQuestion || '')}" (kết thúc lúc ${endStr})`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(item._id),
        });
        if (notifyRes?.success) {
          socketRef.current?.emit('send_message', {
            roomId,
            sender: String(currentUser._id),
            senderName: currentUser.name,
            isGroup,
            receiver,
            members,
            _id: notifyRes._id,
            type: 'notify',
            content: notifyText,
            timestamp: now,
            replyToMessageId: String(item._id),
          });
        }
      } else {
        
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const notifyText = `${name} đã mở khóa bình chọn: "${String(item.content || item.pollQuestion || '')}"`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(item._id),
        });
        if (notifyRes?.success) {
          socketRef.current?.emit('send_message', {
            roomId,
            sender: String(currentUser._id),
            senderName: currentUser.name,
            isGroup,
            receiver,
            members,
            _id: notifyRes._id,
            type: 'notify',
            content: notifyText,
            timestamp: now,
            replyToMessageId: String(item._id),
          });
        }
      }

      if (onRefresh) {
        await onRefresh();
      }
    } catch {}
  };

  const handleTogglePin = async (item: Message) => {
    const next = !item.isPinned;
    setItems((prev) => prev.map((m) => (String(m._id) === String(item._id) ? { ...m, isPinned: next } : m)));
    try {
      const now = Date.now();
      await updateMessageApi(String(item._id), { isPinned: next, editedAt: now });
      socketRef.current?.emit('edit_message', { _id: item._id, roomId, isPinned: next, editedAt: now });
      await updateMessageApi(String(item._id), { isPinned: next });
      socketRef.current?.emit('pin_message', { _id: item._id, roomId, isPinned: next });

      const receiver = isGroup ? null : String((selectedChat as User)._id);
      const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
      const who = currentUser.name || 'Ai đó';
      const action = next ? 'đã ghim' : 'đã bỏ ghim';
      const notifyText = `${who} ${action} một bình chọn: "${String(item.content || item.pollQuestion || '')}"`;
      const notifyRes = await createMessageApi({
        roomId,
        sender: String(currentUser._id),
        type: 'notify',
        content: notifyText,
        timestamp: now,
        replyToMessageId: String(item._id),
      });
      if (notifyRes?.success) {
        socketRef.current?.emit('send_message', {
          roomId,
          sender: String(currentUser._id),
          senderName: currentUser.name,
          isGroup,
          receiver,
          members,
          _id: notifyRes._id,
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(item._id),
        });
      }
    } catch {
      setItems((prev) => prev.map((m) => (String(m._id) === String(item._id) ? { ...m, isPinned: !next } : m)));
    }
  };

  const handleEdit = (item: Message) => {
    setDetailMsg(item);
    setOpenMenuId(null);
  };

  const getVotesCount = (item: Message, option: string) => {
    const v = item.pollVotes || {};
    const arr = (v[option] || []) as string[];
    return arr.length;
  };

  const didIVote = (item: Message, option: string) => {
    const myId = String(currentUser._id);
    const v = item.pollVotes || {};
    const arr = (v[option] || []) as string[];
    return arr.includes(myId);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between shadow-lg">
          <h2 className="text-lg font-semibold">Danh sách bình chọn</h2>
          <div className="flex items-center gap-2">
            {isGroup && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-3 py-2 cursor-pointer rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-200"
              >
                Tạo
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 cursor-pointer rounded-full hover:bg-white/20 transition-all duration-200"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          <div className="space-y-5 p-5 pb-24">
            {loading ? (
              <div className="text-center text-gray-500 py-10">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-2">Đang tải...</p>
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-gray-500">Chưa có bình chọn nào</p>
            ) : (
              items.map((it) => {
                const itemId = String(it._id);
                const sender = it.sender as User | string;
                const senderName = typeof sender === 'object' && sender ? sender.name || '' : '';
                const isMenuOpen = openMenuId === itemId;
                const locked = !!it.isPollLocked;
                return (
                  <div
                    key={itemId}
                    className={`relative p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white border border-gray-100`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-base font-semibold text-gray-900 break-words truncate">
                              {it.content || it.pollQuestion || 'Bình chọn'}
                            </p>
                          </div>
                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePin(it)}
                              className="px-2 py-1 text-[0.74rem] rounded-lg
                               border border-yellow-300 text-yellow-700 hover:bg-yellow-100 cursor-pointer"
                            >
                              {it.isPinned ? 'Bỏ ghim' : 'Ghim'}
                            </button>
                            <button
                              onClick={() => setOpenMenuId(isMenuOpen ? null : itemId)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              aria-label="Mở menu"
                              title="Thêm"
                            >
                              <HiEllipsisVertical className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(it.pollOptions || []).map((opt, idx) => {
                            const count = getVotesCount(it, opt);
                            const voted = didIVote(it, opt);
                            return (
                              <button
                                key={`${itemId}-${idx}`}
                                onClick={() => handleEdit(it)}
                                disabled={false}
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

                        {locked && (
                          <p className="text-xs text-gray-500 mt-2">
                            Kết thúc lúc{' '}
                            {new Date(it.pollLockedAt || it.editedAt || it.timestamp).toLocaleString('vi-VN')}
                          </p>
                        )}
                        {senderName ? <p className="text-xs text-gray-400 mt-2">Tạo bởi {senderName}</p> : null}
                      </div>
                      <div
                        className="relative flex items-center gap-2"
                        ref={(el) => {
                          if (el) menuRefs.current.set(itemId, el);
                          else menuRefs.current.delete(itemId);
                        }}
                      >
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => handleEdit(it)}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Xem chi tiết
                            </button>
                            <button
                              onClick={() => handleEdit(it)}
                              className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 cursor-pointer"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleTogglePin(it)}
                              className="w-full px-4 py-2.5 text-left text-sm text-yellow-600 hover:bg-yellow-50 cursor-pointer"
                            >
                              {it.isPinned ? 'Bỏ ghim' : 'Ghim'}
                            </button>
                            {canLock(it) && (
                              <button
                                onClick={() => handleToggleLock(it)}
                                className="w-full px-4 py-2.5 text-left text-sm text-indigo-600 hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
                              >
                                {locked ? <HiLockClosed className="w-4 h-4" /> : <HiLockOpen className="w-4 h-4" />}
                                {locked ? 'Mở khóa' : 'Khóa'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <CreatePollModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      <PollDetailModal isOpen={!!detailMsg} message={detailMsg} onClose={() => setDetailMsg(null)} />
    </>
  );
}
