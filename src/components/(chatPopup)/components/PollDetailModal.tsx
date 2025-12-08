import React, { useEffect, useMemo, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { HiCheck, HiOutlinePencil } from 'react-icons/hi2';
import type { Message } from '@/types/Message';
import type { GroupConversation } from '@/types/Group';
import type { User } from '@/types/User';
import { updateMessageApi, createMessageApi } from '@/fetch/messages';
import { useChatContext } from '@/context/ChatContext';
import { io } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import { getProxyUrl } from '@/utils/utils';
import Image from 'next/image';

interface PollDetailModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
  onRefresh?: () => void;
}


export default function PollDetailModal({ isOpen, message, onClose, onRefresh }: PollDetailModalProps) {
  const { selectedChat, currentUser, isGroup } = useChatContext();
  const roomId = (() => {
    const me = String(currentUser._id);
    const other = String((selectedChat as unknown as { _id: string })._id);
    return isGroup ? other : [me, other].sort().join('_');
  })();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const myId = String(currentUser._id);
  const votesMap = useMemo(() => (message?.pollVotes || {}) as Record<string, string[]>, [message]);
  const mySelected = useMemo(() => {
    const arr: string[] = [];
    (message?.pollOptions || []).forEach((opt) => {
      const vs = Array.isArray(votesMap[opt]) ? (votesMap[opt] as string[]) : [];
      if (vs.includes(myId)) arr.push(opt);
    });
    return arr;
  }, [votesMap, message, myId]);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [showVoters, setShowVoters] = useState(false);
  const canLock = useMemo(() => {
    if (!message) return false;
    const sender = message.sender as User | string;
    const senderId = typeof sender === 'object' && sender ? String(sender._id) : String(sender);
    return isGroup ? senderId === String(currentUser._id) : false;
  }, [message, isGroup, currentUser._id]);
  const members = useMemo(
    () => (isGroup ? (selectedChat as GroupConversation).members || [] : []),
    [isGroup, selectedChat],
  );
  const memberMap = useMemo(() => {
    const map = new Map<string, { name?: string; avatar?: string }>();
    (members as Array<{ _id?: string; id?: string; name?: string; avatar?: string }>).forEach((m) => {
      const id = String(m._id || m.id || '');
      if (id) map.set(id, { name: m.name, avatar: m.avatar });
    });
    return map;
  }, [members]);

  useEffect(() => {
    if (!message) return;
    const q = String(message.content || message.pollQuestion || '');
    const opts = Array.isArray(message.pollOptions) ? (message.pollOptions as string[]) : [];
    setQuestion(q);
    setOptions(opts);
    setEditing(false);
    setSelected(mySelected);
    setAdding(false);
    setNewOption('');
  }, [message, mySelected]);

  const handleAddOption = () => {
    setAdding(true);
  };

  const handleAddOptionEditing = () => {
    if (message?.isPollLocked) return;
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOptionEditing = (index: number) => {
    if (message?.isPollLocked) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleSave = async () => {
    if (!message) return;
    if (message.isPollLocked) return;
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o);
    if (!question.trim() || cleanOptions.length < 2) return;
    setSaving(true);
    try {
      const now = Date.now();
      const prevVotes = (message.pollVotes || {}) as Record<string, string[]>;
      const nextVotes: Record<string, string[]> = {};
      cleanOptions.forEach((opt) => {
        const arr = Array.isArray(prevVotes[opt]) ? prevVotes[opt] : [];
        nextVotes[opt] = arr;
      });
      await updateMessageApi(String(message._id), {
        content: question.trim(),
        pollQuestion: question.trim(),
        pollOptions: cleanOptions,
        pollVotes: nextVotes,
        editedAt: now,
        timestamp: now,
      });
      const socket = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
      socket.once('connect', async () => {
        socket.emit('join_room', roomId);
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        socket.emit('edit_message', {
          _id: message._id,
          roomId,
          newContent: question.trim(),
          pollQuestion: question.trim(),
          pollOptions: cleanOptions,
          pollVotes: nextVotes,
          editedAt: now,
          timestamp: now,
          originalContent: message.content,
          sender: String(currentUser._id),
          senderName: currentUser.name,
          isGroup,
          members,
          receiver,
        });
        const who = currentUser.name || 'Ai đó';
        const notifyText = `${who} đã chỉnh sửa bình chọn: "${question.trim()}"`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(message._id),
        });
        if (notifyRes?.success) {
          socket.emit('send_message', {
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
            replyToMessageId: String(message._id),
          });
        }
        setTimeout(() => socket.disconnect(), 300);
      });
      if (onRefresh) {
        await onRefresh();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (opt: string) => {
    if (message?.isPollLocked) return;
    setSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  };

  const previewVotesMap = useMemo(() => {
    const out: Record<string, string[]> = {};
    (message?.pollOptions || []).forEach((opt) => {
      const base = Array.isArray(votesMap[opt]) ? [...(votesMap[opt] as string[])] : [];
      const withoutMe = base.filter((u) => u !== myId);
      const nowSelected = selected.includes(opt);
      out[opt] = nowSelected ? [...withoutMe, myId] : withoutMe;
    });
    return out;
  }, [message, votesMap, selected, myId]);

  const handleConfirmVote = async () => {
    if (!message) return;
    if (message.isPollLocked) return;
    const prevVotes = (message.pollVotes || {}) as Record<string, string[]>;
    const nextVotes: Record<string, string[]> = {};
    (message.pollOptions || []).forEach((opt) => {
      const arr = Array.isArray(prevVotes[opt]) ? [...prevVotes[opt]] : [];
      const filtered = arr.filter((u) => u !== myId);
      nextVotes[opt] = filtered;
    });
    selected.forEach((opt) => {
      const arr = Array.isArray(nextVotes[opt]) ? nextVotes[opt] : [];
      if (!arr.includes(myId)) nextVotes[opt] = [...arr, myId];
    });
    setSaving(true);
    try {
      const now = Date.now();
      await updateMessageApi(String(message._id), { pollVotes: nextVotes, editedAt: now, timestamp: now });

      // 🔥 EMIT SOCKET EVENT ĐỂ CẬP NHẬT REALTIME
      const socket = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
      socket.once('connect', async () => {
        socket.emit('join_room', roomId);
        socket.emit('edit_message', {
          _id: message._id,
          roomId,
          pollVotes: nextVotes,
          editedAt: now,
          timestamp: now,
        });

        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const who = currentUser.name || 'Ai đó';
        const opted = selected.join(', ');
        const notifyText = `${who} đã bình chọn:  ${opted} trong bình chọn: "${question}"`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: myId,
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(message._id),
        });

        if (notifyRes?.success) {
          socket.emit('send_message', {
            roomId,
            sender: myId,
            senderName: currentUser.name,
            isGroup,
            receiver,
            members,
            _id: notifyRes._id,
            type: 'notify',
            content: notifyText,
            timestamp: now,
            replyToMessageId: String(message._id),
          });
        }
        setTimeout(() => socket.disconnect(), 300);
      });

      if (onRefresh) {
        await onRefresh();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddOptionConfirm = async () => {
    if (!message) return;
    if (message.isPollLocked) return;
    const text = newOption.trim();
    if (!text) return;
    if (options.map((o) => o.toLowerCase()).includes(text.toLowerCase())) {
      setAdding(false);
      setNewOption('');
      return;
    }
    const nextOptions = [...options, text];
    setSaving(true);
    try {
      const now = Date.now();
      await updateMessageApi(String(message._id), { pollOptions: nextOptions, editedAt: now, timestamp: now });
      const socket = io(resolveSocketUrl(), 
            { transports: ['websocket'], 
              withCredentials: false
             });  
      socket.once('connect', async () => {
        socket.emit('join_room', roomId);
        socket.emit('edit_message', {
          _id: message._id,
          roomId,
          pollOptions: nextOptions,
          editedAt: now,
          timestamp: now,
        });
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const who = currentUser.name || 'Ai đó';
        const notifyText = `${who} đã thêm lựa chọn "${text}" trong bình chọn: "${question}"`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(message._id),
        });
        if (notifyRes?.success) {
          socket.emit('send_message', {
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
            replyToMessageId: String(message._id),
          });
        }
        setTimeout(() => socket.disconnect(), 300);
      });
      if (onRefresh) {
        await onRefresh();
      }
      setOptions(nextOptions);
      setAdding(false);
      setNewOption('');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!message || !canLock) return;
    const next = !message.isPollLocked;
    setSaving(true);
    try {
      const now = Date.now();
      const updateData = next
        ? { isPollLocked: true, pollLockedAt: now, editedAt: now, timestamp: now }
        : { isPollLocked: false, editedAt: now, timestamp: now };
      await updateMessageApi(String(message._id), updateData);
      const socket = io(resolveSocketUrl(), 
            { transports: ['websocket'], 
              withCredentials: false
             });  
      socket.emit('edit_message', { _id: message._id, roomId, ...updateData });
      const name = currentUser.name
      if (next) {
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members2 = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const endStr = new Date(now).toLocaleString('vi-VN');
        const notifyText = `${name} đã khóa bình chọn: "${String(message.content || message.pollQuestion || '')}" (kết thúc lúc ${endStr})`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(message._id),
        });
        if (notifyRes?.success) {
          socket.emit('send_message', {
            roomId,
            sender: String(currentUser._id),
            senderName: currentUser.name,
            isGroup,
            receiver,
            members: members2,
            _id: notifyRes._id,
            type: 'notify',
            content: notifyText,
            timestamp: now,
            replyToMessageId: String(message._id),
          });
        }
      } else {
        const receiver = isGroup ? null : String((selectedChat as User)._id);
        const members2 = isGroup ? (selectedChat as GroupConversation).members || [] : [];
        const notifyText = `${name} đã mở khóa bình chọn: "${String(message.content || message.pollQuestion || '')}"`;
        const notifyRes = await createMessageApi({
          roomId,
          sender: String(currentUser._id),
          type: 'notify',
          content: notifyText,
          timestamp: now,
          replyToMessageId: String(message._id),
        });
        if (notifyRes?.success) {
          socket.emit('send_message', {
            roomId,
            sender: String(currentUser._id),
            senderName: currentUser.name,
            isGroup,
            receiver,
            members: members2,
            _id: notifyRes._id,
            type: 'notify',
            content: notifyText,
            timestamp: now,
            replyToMessageId: String(message._id),
          });
        }
      }
      socket.disconnect();
      if (onRefresh) {
        await onRefresh();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

 

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-[9999]  flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="relative px-3 pt-3 pb-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex-shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30"
          >
            <HiX className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">Chi tiết bình chọn</h3>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {!editing ? (
            <>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{question}</p>
              {message.isPollLocked && (
                <p className="text-xs text-gray-500 mt-1">
                  Kết thúc lúc{' '}
                  {new Date(message.pollLockedAt || message.editedAt || message.timestamp).toLocaleString('vi-VN')}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">Chọn nhiều phương án</p>
              <button onClick={() => setShowVoters((v) => !v)} className="text-xs text-blue-600 hover:underline mt-2">
                {(() => {
                  const userIds = new Set<string>();
                  let totalVotes = 0;
                  (message.pollOptions || []).forEach((opt) => {
                    const arr = Array.isArray(previewVotesMap[opt]) ? (previewVotesMap[opt] as string[]) : [];
                    totalVotes += arr.length;
                    arr.forEach((id) => userIds.add(String(id)));
                  });
                  return `${userIds.size} người bình chọn, ${totalVotes} lượt bình chọn`;
                })()}
              </button>
              <div className="space-y-2 mt-2">
                {options.map((opt, idx) => {
                  const votedCount = Array.isArray(previewVotesMap[opt])
                    ? (previewVotesMap[opt] as string[]).length
                    : 0;
                  const active = selected.includes(opt);
                  const arr = Array.isArray(previewVotesMap[opt]) ? (previewVotesMap[opt] as string[]) : [];
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleSelect(opt)}
                      disabled={message.isPollLocked}
                      className={`w-full cursor-pointer px-4 py-3 rounded-xl border text-left transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                      } ${message.isPollLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{opt}</span>
                        <span className="text-sm">{votedCount}</span>
                      </div>

                      {showVoters && (
                        <div className="flex gap-1">
                          {arr.length === 0 ? (
                            <p>Chưa có ai bình chọn</p>
                          ) : (
                            arr.map((uid) => {
                              const info = memberMap.get(String(uid));
                              return (
                                <div key={uid} className="flex bg-gray-200 rounded-xl p-1 gap-1 w-fit">
                                  {info?.avatar ? (
                                    <Image
                                      width={10}
                                      height={10}
                                      src={getProxyUrl(info.avatar)}
                                      alt={info?.name || String(uid)}
                                      className="rounded-full"
                                    />
                                  ) : (
                                    <div className="avatar-placeholder">
                                      {info?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                  )}
                                  <span className="text-[0.6875rem] text-blue-600">{info?.name || String(uid)}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                {!adding ? (
                  <button
                    onClick={handleAddOption}
                    className="cursor-pointer px-4 py-2 text-indigo-600 border border-indigo-300 rounded-xl hover:bg-indigo-50 font-semibold text-sm"
                    disabled={message.isPollLocked}
                  >
                    Thêm lựa chọn
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOptionConfirm();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-2xl"
                      placeholder="Nhập lựa chọn"
                    />
                    <button
                      onClick={handleAddOptionConfirm}
                      disabled={message.isPollLocked}
                      className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Thêm
                    </button>
                    <button
                      onClick={() => {
                        setAdding(false);
                        setNewOption('');
                      }}
                      className="px-4 py-2 cursor-pointer bg-gray-100 text-gray-700 rounded-2xl"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">Câu hỏi *</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">Tùy chọn *</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleChangeOption(idx, e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <button
                      onClick={() => handleRemoveOptionEditing(idx)}
                      disabled={message.isPollLocked}
                      className="px-3 py-2 cursor-pointer bg-red-50 text-red-600 border border-red-200 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddOptionEditing}
                disabled={message.isPollLocked}
                className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Thêm option
              </button>
            </>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                disabled={saving || message.isPollLocked}
                className="flex-1 cursor-pointer py-3.5 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-flex items-center gap-2">
                  <HiOutlinePencil /> Chỉnh sửa
                </span>
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={saving || message.isPollLocked}
                className="flex-1 cursor-pointer py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <HiCheck className="w-5 h-5" /> {saving ? 'Đang lưu...' : 'Xác nhận'}
                </span>
              </button>
              {canLock && (
                <button
                  onClick={handleToggleLock}
                  disabled={saving}
                  className="flex-1 cursor-pointer py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {message.isPollLocked ? 'Mở khóa' : 'Khóa'}
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditing(false);
                  if (message) {
                    const q = String(message.content || message.pollQuestion || '');
                    const opts = Array.isArray(message.pollOptions) ? (message.pollOptions as string[]) : [];
                    setQuestion(q);
                    setOptions(opts);
                  }
                }}
                disabled={saving}
                className="flex-1 cursor-pointer py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 cursor-pointer py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl"
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
