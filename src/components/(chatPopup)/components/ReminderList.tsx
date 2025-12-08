import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { FaRegClock } from 'react-icons/fa6';
import { HiX } from 'react-icons/hi';
import { IoCalendarOutline } from 'react-icons/io5';
import { useChatContext } from '@/context/ChatContext';
import type { GroupConversation } from '@/types/Group';
import { readMessagesApi, createMessageApi, deleteMessageApi } from '@/fetch/messages';
import type { Message } from '@/types/Message';
import type { User } from '@/types/User';
import CreateReminderModal from './CreateReminderModal';
import ReminderDetailModal from './ReminderDetailModal';
import { io } from 'socket.io-client';
import { HiEllipsisVertical } from 'react-icons/hi2';
import { resolveSocketUrl } from '@/utils/utils';

interface ReminderListProps {
  onClose: () => void;
}

export default function ReminderList({ onClose }: ReminderListProps) {
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null); // 🔥 Track ID của menu đang mở
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // 🔥 Refs cho các menu
  const [create, setCreate] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await readMessagesApi(roomId, {
        limit: 200,
        sortOrder: 'desc',
        extraFilters: { type: 'reminder', isRecalled: { $ne: true } },
      });
      const data = Array.isArray(res.data) ? (res.data as Message[]) : [];
      setItems(data);
    } catch (error) {
      console.error('❌ Lỗi khi tải danh sách lịch hẹn:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 🔥 CLOSE MENU KHI CLICK BÊN NGOÀI
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
       const socket = io(resolveSocketUrl(), { 
                transports: ['websocket'], 
                withCredentials: false 
          });
    socket.emit('join_room', roomId);

    socket.on('receive_message', (data: Message) => {
      if (data.roomId !== roomId || data.type !== 'reminder') return;
      setItems((prev) => {
        const map = new Map<string, Message>();
        [...prev, data].forEach((m) => map.set(String(m._id), m));
        return Array.from(map.values()).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      });
    });

    socket.on(
      'message_edited',
      (data: {
        _id: string;
        roomId: string;
        content: string;
        editedAt: number;
        originalContent?: string;
        reminderAt?: number;
        reminderNote?: string;
      }) => {
        if (data.roomId !== roomId) return;
        setItems((prev) =>
          prev.map((m) =>
            String(m._id) === String(data._id)
              ? {
                  ...m,
                  content: data.content,
                  editedAt: data.editedAt,
                  originalContent: data.originalContent || m.originalContent || m.content,
                  reminderAt: data.reminderAt ?? m.reminderAt,
                  reminderNote: data.reminderNote ?? m.reminderNote,
                }
              : m,
          ),
        );
        void load();
      },
    );

    socket.on(
      'edit_message',
      (data: { _id: string; roomId: string; newContent: string; editedAt: number; originalContent?: string }) => {
        if (data.roomId !== roomId) return;
        setItems((prev) =>
          prev.map((m) =>
            String(m._id) === String(data._id)
              ? {
                  ...m,
                  content: data.newContent,
                  editedAt: data.editedAt,
                  originalContent: data.originalContent || m.originalContent || m.content,
                }
              : m,
          ),
        );
        void load();
      },
    );

    socket.on('message_recalled', (data: { _id: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      setItems((prev) => prev.filter((m) => String(m._id) !== String(data._id)));
      void load();
    });

    socket.on('message_deleted', (data: { _id: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      setItems((prev) => prev.filter((m) => String(m._id) !== String(data._id)));
      void load();
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, load]);

  const handleCreate = async ({
    content,
    dateTime,
    note,
    repeat,
  }: {
    content: string;
    dateTime: string;
    note?: string;
    repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  }) => {
    setCreate(true);
    const dt = Date.parse(dateTime);
    if (!content.trim() || Number.isNaN(dt)) {
      alert('Vui lòng nhập đầy đủ thông tin hợp lệ');
      return;
    }

    try {
      const createRes = await createMessageApi({
        roomId,
        sender: String(currentUser._id),
        type: 'reminder',
        content: content.trim(),
        timestamp: Date.now(),
        reminderAt: dt,
        reminderNote: note?.trim() || '',
        reminderFired: false,
        reminderRepeat: repeat || 'none',
      });

      if (createRes?.success) {
           const socket = io(resolveSocketUrl(), { 
                    transports: ['websocket'], 
                    withCredentials: false 
              });
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

        if (typeof createRes._id === 'string') {
          socket.emit('send_message', {
            ...sockBase,
            _id: createRes._id,
            type: 'reminder',
            content: content.trim(),
            timestamp: Date.now(),
            reminderAt: dt,
            reminderNote: note?.trim() || '',
            reminderFired: false,
            reminderRepeat: repeat || 'none',
          });
        }

        const timeStr = new Date(dt).toLocaleString('vi-VN');
        const myName = currentUser.name;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: `${myName} đã tạo lịch hẹn: "${content.trim()}" lúc ${timeStr}`,
          timestamp: Date.now(),
        });

        if (notifyRes?.success && typeof notifyRes._id === 'string') {
          socket.emit('send_message', {
            ...sockBase,
            _id: notifyRes._id,
            type: 'notify',
            content: `${myName} đã tạo lịch hẹn: "${content.trim()}" lúc ${timeStr}`,
            timestamp: Date.now(),
          });
        }
        socket.disconnect();
        await load();

      } else {
        alert('Tạo lịch hẹn thất bại. Vui lòng kiểm tra kết nối máy chủ.');
      }
      setCreate(false);
    } catch (error) {
      console.error('❌ Lỗi khi tạo lịch hẹn:', error);
      alert('Không thể tạo lịch hẹn. Vui lòng thử lại.');
    }

    setShowCreate(false);
  };

  const handleDelete = async (item: Message) => {
    const ok = confirm('Xóa vĩnh viễn lịch hẹn này?');
    if (!ok) return;

    try {
      await deleteMessageApi(String(item._id));
           const socket = io(resolveSocketUrl(), { 
                    transports: ['websocket'], 
                    withCredentials: false 
              });
      socket.emit('message_deleted', { _id: item._id, roomId });
      socket.disconnect();
      setOpenMenuId(null); // 🔥 Đóng menu sau khi xóa
      await load();
    } catch (error) {
      console.error('❌ Lỗi khi xóa lịch hẹn:', error);
      alert('Không thể xóa lịch hẹn. Vui lòng thử lại.');
    }
  };

  const handleEdit = (item: Message) => {
    setDetailMsg(item);
    setOpenMenuId(null); // 🔥 Đóng menu khi mở modal edit
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-5 py-4 flex items-center justify-between shadow-lg">
          <h2 className="text-lg font-semibold">Danh sách lịch hẹn</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-2 cursor-pointer rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
            >
              <FaRegClock />
            </button>
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
              <>
                <div className="flex items-center justify-center">
                  <IoCalendarOutline className="w-[8.125rem] h-[8.125rem] text-blue-300" />
                </div>
                <p className="text-center text-sm text-gray-500">
                  Chưa có lịch hẹn nào được chia sẻ trong cuộc hội thoại này
                </p>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-400 transition-all duration-200 flex items-center gap-2 bg-blue-300 rounded-lg "
                  >
                    <FaRegClock /> Tạo lịch hẹn mới
                  </button>
                </div>
              </>
            ) : (
              items.map((it) => {
                const itemId = String(it._id);
                const at = typeof it.reminderAt === 'number' ? it.reminderAt : it.timestamp;
                const timeStr = new Date(at).toLocaleString('vi-VN');
                const sender = it.sender as User | string;
                const senderName = typeof sender === 'object' && sender ? sender.name || '' : '';
                const repeat =
                  (it as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' }).reminderRepeat ||
                  'none';
                const repeatLabel =
                  repeat === 'daily'
                    ? 'Hàng ngày'
                    : repeat === 'weekly'
                      ? 'Hàng tuần'
                      : repeat === 'monthly'
                        ? 'Hàng tháng'
                        : 'Không lặp lại';
                const isMenuOpen = openMenuId === itemId;

                return (
                  <div
                    key={itemId}
                    className="relative p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 truncate">{it.content || 'Lịch hẹn'}</p>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <FaRegClock className="w-3 h-3" /> {timeStr}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Lặp: {repeatLabel}</p>
                        {it.reminderNote ? (
                          <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg truncate">
                            {String(it.reminderNote)}
                          </p>
                        ) : null}
                        {senderName ? <p className="text-xs text-gray-400 mt-2">Tạo bởi {senderName}</p> : null}
                      </div>

                      {/* 🔥 MENU BUTTON */}
                      <div
                        className="relative"
                        ref={(el) => {
                          if (el) menuRefs.current.set(itemId, el);
                          else menuRefs.current.delete(itemId);
                        }}
                      >
                        <button
                          onClick={() => setOpenMenuId(isMenuOpen ? null : itemId)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          aria-label="Mở menu"
                          title="Thêm"
                        >
                          <HiEllipsisVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        {/* 🔥 DROPDOWN MENU */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                              onClick={() => handleEdit(it)}
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Xem chi tiết
                            </button>
                            <button
                              onClick={() => handleEdit(it)}
                              className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleDelete(it)}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Xóa
                            </button>
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

      <CreateReminderModal 
       isOpen={showCreate}
       onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
         createLoading={create} />

      <ReminderDetailModal
        isOpen={!!detailMsg}
        message={detailMsg}
        onClose={() => setDetailMsg(null)}
        onRefresh={load}
      />
    </>
  );
}
