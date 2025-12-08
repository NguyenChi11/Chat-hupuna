import React, { useEffect, useState } from 'react';
import { HiCheck, HiOutlineTrash, HiOutlinePencil, HiOutlineClock } from 'react-icons/hi2';
import type { Message } from '@/types/Message';
import { useChatContext } from '@/context/ChatContext';
import { updateMessageApi, deleteMessageApi, createMessageApi } from '@/fetch/messages';
import { io } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import type { GroupConversation } from '@/types/Group';
import type { User } from '@/types/User';
import { HiX } from 'react-icons/hi';

interface ReminderDetailModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ReminderDetailModal({ isOpen, message, onClose, onRefresh }: ReminderDetailModalProps) {
  const { selectedChat, currentUser, isGroup } = useChatContext();
  const roomId = (() => {
    const me = String(currentUser._id);
    const other = String((selectedChat as unknown as { _id: string })._id);
    return isGroup ? other : [me, other].sort().join('_');
  })();
  const [content, setContent] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!message) return;
    setContent(String(message.content || ''));
    const at = (message as Message & { reminderAt?: number }).reminderAt || message.timestamp;
    const isoLocal = new Date(at - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDateTime(isoLocal);
    setNote(String((message as Message & { reminderNote?: string }).reminderNote || ''));
    setRepeat(
      (message as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' }).reminderRepeat || 'none',
    );
    setEditing(false);
  }, [message]);

  if (!isOpen || !message) return null;


  const handleSave = async () => {
    const dt = Date.parse(dateTime);
    if (!content.trim() || Number.isNaN(dt)) return;
    setSaving(true);
    try {
      await updateMessageApi(String(message._id), {
        content: content.trim(),
        reminderAt: dt,
        reminderNote: note.trim(),
        reminderFired: false,
        reminderRepeat: repeat,
      });

    const socket = io(resolveSocketUrl(), 
      { transports: ['websocket'], 
        withCredentials: false
       });  
      const receiver = isGroup ? null : String((selectedChat as User)._id);
      const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
      socket.emit('edit_message', {
        _id: message._id,
        roomId,
        sender: String(currentUser._id),
        senderName: currentUser.name,
        isGroup,
        receiver,
        members,
        content: content.trim(),
        newContent: content.trim(),
        editedAt: Date.now(),
        originalContent: message.content,
        reminderAt: dt,
        reminderNote: note.trim(),
        reminderFired: false,
        reminderRepeat: repeat,
      });
      const name = currentUser.name
      const timeStr = new Date(dt).toLocaleString('vi-VN');
      const notifyRes = await createMessageApi({
        roomId,
        sender: String(currentUser._id),
        type: 'notify',
        content: `${name} đã chỉnh sửa lịch hẹn: "${content.trim()}" lúc ${timeStr}`,
        timestamp: Date.now(),
        replyToMessageId: String(message._id),
      });
      if (notifyRes?.success && typeof notifyRes._id === 'string') {
        socket.emit('send_message', {
          _id: notifyRes._id,
          roomId,
          sender: String(currentUser._id),
          senderName: currentUser.name,
          isGroup,
          receiver,
          members,
          type: 'notify',
          content: `${name} đã chỉnh sửa lịch hẹn: "${content.trim()}" lúc ${timeStr}`,
          timestamp: Date.now(),
          replyToMessageId: String(message._id),
        });
      }
      socket.disconnect();
      if (onRefresh) {
        onRefresh();
      }
      onClose();
    } catch (error) {
      console.error('❌ Lỗi khi lưu lịch hẹn:', error);
      alert('Không thể lưu lịch hẹn. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecall = async () => {
    const ok = confirm('Bạn có chắc muốn xóa vĩnh viễn lịch hẹn này?');
    if (!ok) return;

    setSaving(true);
    try {
      await deleteMessageApi(String(message._id));
      const socket = io(resolveSocketUrl(), { 
            transports: ['websocket'], 
            withCredentials: false 
      });
      const receiver = isGroup ? null : String((selectedChat as User)._id);
      const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
      socket.emit('message_deleted', {
        _id: message._id,
        roomId,
        sender: String(currentUser._id),
        senderName: currentUser.name,
        isGroup,
        receiver,
        members,
        type: 'delete',
        timestamp: Date.now(),
      });
      const name = currentUser.name
      const notifyRes = await createMessageApi({
        roomId,
        sender: String(currentUser._id),
        type: 'notify',
        content: `${name} đã xóa lịch hẹn: "${String(message.content || '')}"`,
        timestamp: Date.now(),
        replyToMessageId: String(message._id),
      });
      if (notifyRes?.success && typeof notifyRes._id === 'string') {
        socket.emit('send_message', {
          _id: notifyRes._id,
          roomId,
          sender: String(currentUser._id),
          senderName: currentUser.name,
          isGroup,
          receiver,
          members,
          type: 'notify',
          content: `${name} đã xóa lịch hẹn: "${String(message.content || '')}"`,
          timestamp: Date.now(),
          replyToMessageId: String(message._id),
        });
      }
      socket.disconnect();
      onClose();
    } catch (error) {
      console.error('❌ Lỗi khi xóa lịch hẹn:', error);
      alert('Không thể xóa lịch hẹn. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="relative px-3 pt-3 pb-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <button
            onClick={onClose}
            disabled={saving}
            className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30"
          >
            <HiX className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <HiOutlineClock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Chi tiết lịch hẹn</h3>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!editing ? (
            <>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{content}</p>
              <p className="text-sm text-gray-600">{new Date(Date.parse(dateTime)).toLocaleString('vi-VN')}</p>
              <p className="text-sm text-gray-600">
                Lặp:{' '}
                {(message as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' }).reminderRepeat ===
                'daily'
                  ? 'Hàng ngày'
                  : (message as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' })
                        .reminderRepeat === 'weekly'
                    ? 'Hàng tuần'
                    : (message as Message & { reminderRepeat?: 'none' | 'daily' | 'weekly' | 'monthly' })
                          .reminderRepeat === 'monthly'
                      ? 'Hàng tháng'
                      : 'Không lặp lại'}
              </p>
              {note && <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{note}</p>}
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian *</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-2">Kiểu lặp lại</label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly')}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="none">Không lặp lại</option>
                <option value="daily">Hàng ngày</option>
                <option value="weekly">Hàng tuần</option>
                <option value="monthly">Hàng tháng</option>
              </select>
            </>
          )}
        </div>

        <div className="flex gap-3 px-3 pb-3">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                disabled={saving}
                className="flex-1 cursor-pointer  bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl"
              >
                <span className="inline-flex items-center gap-2">
                  <HiOutlinePencil /> Chỉnh sửa
                </span>
              </button>
              <button
                onClick={handleRecall}
                className="flex-1 cursor-pointer py-3.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl"
              >
                <span className="inline-flex items-center gap-2">
                  <HiOutlineTrash className="w-5 h-5" /> {saving ? 'Đang xóa...' : 'Xóa'}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  // Reset về giá trị ban đầu
                  if (message) {
                    setContent(String(message.content || ''));
                    const at = (message as Message & { reminderAt?: number }).reminderAt || message.timestamp;
                    const isoLocal = new Date(at - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setDateTime(isoLocal);
                    setNote(String((message as Message & { reminderNote?: string }).reminderNote || ''));
                  }
                }}
                disabled={saving}
                className="flex-1 cursor-pointer py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl disabled:opacity-50 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 cursor-pointer py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl disabled:opacity-50 transition-all"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <HiCheck className="w-5 h-5" /> {saving ? 'Đang lưu...' : 'Lưu'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
