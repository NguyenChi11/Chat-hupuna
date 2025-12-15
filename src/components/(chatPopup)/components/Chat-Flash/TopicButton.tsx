'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiLightningBolt } from 'react-icons/hi';
import { useChatContext } from '@/context/ChatContext';
import { ChatFlashItem, ChatFlashTopic } from './types';

type Props = {
  roomId: string;
  messageId: string;
  isMine: boolean;
  visible?: boolean;
  className?: string;
  onSaved?: (topicId: string) => void;
  preview: string;
  content?: string;
  type?: 'image' | 'video' | 'file' | 'text' | string;
  fileUrl?: string;
  fileName?: string;
};

type Scope = 'room' | 'global';

export default function TopicButton({
  roomId,
  messageId,
  isMine,
  visible,
  className = '',
  onSaved,
  preview,
  content,
  type,
  fileUrl,
  fileName,
}: Props) {
  const { currentUser } = useChatContext();
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<ChatFlashTopic[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, ChatFlashItem[]>>({});
  const [topicsGlobal, setTopicsGlobal] = useState<ChatFlashTopic[]>([]);
  const [itemsMapGlobal, setItemsMapGlobal] = useState<Record<string, ChatFlashItem[]>>({});
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [placeBelow, setPlaceBelow] = useState(false);
  const [scope, setScope] = useState<Scope>('room');
  const [nameInput, setNameInput] = useState('');
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  const storageKey = useMemo(() => `chatFlashTopics:${roomId}`, [roomId]);
  const itemsKey = useMemo(() => `chatFlashTopicItems:${roomId}`, [roomId]);
  const globalStorageKey = useMemo(
    () => `chatFlashTopics:__global__:${String(currentUser?._id || '')}`,
    [currentUser?._id],
  );
  const globalItemsKey = useMemo(
    () => `chatFlashTopicItems:__global__:${String(currentUser?._id || '')}`,
    [currentUser?._id],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setTopics(raw ? (JSON.parse(raw) as ChatFlashTopic[]) : []);
    } catch {
      setTopics([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(globalStorageKey);
      setTopicsGlobal(raw ? (JSON.parse(raw) as ChatFlashTopic[]) : []);
    } catch {
      setTopicsGlobal([]);
    }
  }, [globalStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(itemsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setItemsMap(parsed as Record<string, ChatFlashItem[]>);
    } catch {
      setItemsMap({});
    }
  }, [itemsKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(globalItemsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setItemsMapGlobal(parsed as Record<string, ChatFlashItem[]>);
    } catch {
      setItemsMapGlobal({});
    }
  }, [globalItemsKey]);

  useEffect(() => {
    const fn = () => {
      if (!open) return;
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const ph = popupRef.current?.getBoundingClientRect().height || 220;
      setPlaceBelow(below >= ph + 8 || below >= above);
    };
    fn();
    window.addEventListener('resize', fn);
    window.addEventListener('scroll', fn, true);
    return () => {
      window.removeEventListener('resize', fn);
      window.removeEventListener('scroll', fn, true);
    };
  }, [open]);

  const sideCls = isMine ? 'right-full mr-3' : 'left-full ml-3';
  const pickerSideCls = isMine ? 'left-1/2 -translate-x-1/2' : 'left-1/2 -translate-x-3/4';

  const handleSave = async (topicId: string, name?: string) => {
    try {
      const kind = String(type || '').toLowerCase();
      const item: ChatFlashItem = { id: messageId };
      if (kind === 'image') {
        item.type = 'image';
        item.fileUrl = fileUrl;
        item.fileName = fileName;
      } else if (kind === 'video') {
        item.type = 'video';
        item.fileUrl = fileUrl;
        item.fileName = fileName;
      } else if (kind === 'file') {
        item.type = 'file';
        item.fileUrl = fileUrl;
        item.fileName = fileName;
      } else {
        item.type = 'text';
        item.content = content ?? preview ?? '';
      }
      if (scope === 'global') {
        const map = { ...(itemsMapGlobal || {}) };
        const arr = Array.isArray(map[topicId]) ? map[topicId] : [];
        const idx = arr.findIndex((x) => String(x.id) === String(messageId));
        if (idx >= 0) arr[idx] = item;
        else arr.push(item);
        map[topicId] = arr;
        setItemsMapGlobal(map);
        try {
          localStorage.setItem(globalItemsKey, JSON.stringify(map));
        } catch {}
      } else {
        const map = { ...(itemsMap || {}) };
        const arr = Array.isArray(map[topicId]) ? map[topicId] : [];
        const idx = arr.findIndex((x) => String(x.id) === String(messageId));
        if (idx >= 0) arr[idx] = item;
        else arr.push(item);
        map[topicId] = arr;
        setItemsMap(map);
        try {
          localStorage.setItem(itemsKey, JSON.stringify(map));
          const ev = new CustomEvent('chatFlashTopicItemsChanged', {
            detail: { roomId, topicId, messageId },
          });
          window.dispatchEvent(ev as unknown as Event);
        } catch {}
      }
      onSaved?.(topicId);
      setOpen(false);
      setPendingTopicId(null);
      setNameInput('');
    } catch {
      setOpen(false);
      setPendingTopicId(null);
      setNameInput('');
    }
  };

  const createTopic = (scopeToUse: Scope) => {
    const name = newTopicName.trim();
    if (!name) return;
    const targetKey = scopeToUse === 'global' ? globalStorageKey : storageKey;
    const list = scopeToUse === 'global' ? topicsGlobal : topics;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next = [...list, { id, name }];
    try {
      localStorage.setItem(targetKey, JSON.stringify(next));
    } catch {}
    if (scopeToUse === 'global') setTopicsGlobal(next);
    else setTopics(next);
    setNewTopicName('');
  };

  return (
    <div
      className={`
        absolute top-1/2 -translate-y-1/2 z-20 ${sideCls}
        ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        transition-opacity duration-150 ${className}
      `}
    >
      <div ref={anchorRef} className="relative inline-flex mr-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="w-8 h-8 hover:cursor-pointer rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-all"
          aria-label="Lưu vào chủ đề"
          title="Lưu vào chủ đề"
        >
          <HiLightningBolt className="w-4 h-4 text-gray-700" />
        </button>
        <div
          ref={popupRef}
          className={`absolute ${pickerSideCls} z-50 ${placeBelow ? 'top-full mt-2 origin-top' : 'bottom-full mb-2 origin-bottom'} min-w-[14rem] bg-white rounded-2xl shadow-xl border border-gray-200 transition-all ${open ? 'opacity-100 visible pointer-events-auto scale-100' : 'opacity-0 invisible pointer-events-none scale-95'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-1 py-1">
            <div className="text-xs text-gray-500 pb-2 flex items-center gap-2">
              <button
                className={`px-2 py-1 rounded-lg text-xs border ${scope === 'global' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setScope('global')}
              >
                Dùng nhiều đoạn chat
              </button>
              <button
                className={`px-2 py-1 rounded-lg text-xs border ${scope === 'room' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setScope('room')}
              >
                Đoạn chat hiện tại
              </button>
            </div>
            {(scope === 'global' ? topicsGlobal.length : topics.length) > 0 ? (
              <div className="max-h-[16rem] overflow-y-auto custom-scrollbar">
                {(scope === 'global' ? topicsGlobal : topics).map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setPendingTopicId(topic.id);
                      const suggested = (type === 'file' ? fileName || '' : '') || content || '' || preview || '' || '';
                      setNameInput(String(suggested).slice(0, 100));
                    }}
                    className="w-full text-left px-1 py-1.5 rounded-lg hover:bg-gray-50 text-sm text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow">
                        <HiLightningBolt className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{topic.name}</span>
                      {((scope === 'global' ? itemsMapGlobal[topic.id] : itemsMap[topic.id])?.length || 0) > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
                          {(scope === 'global' ? itemsMapGlobal[topic.id] : itemsMap[topic.id])?.length || 0}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 px-2 py-2">Chưa có chủ đề</div>
            )}
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="text-xs text-gray-600 mb-1">Tạo chủ đề</div>
              <div className="flex items-center gap-2">
                <input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Tên chủ đề"
                  className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                  onClick={() => createTopic(scope)}
                >
                  Tạo
                </button>
              </div>
            </div>
            {pendingTopicId && (
              <div className="mt-2 border-t border-gray-200 pt-2">
                <div className="text-xs text-gray-600 mb-1">Đặt tên nội dung</div>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Nhập tên hiển thị"
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-400"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                    onClick={() => {
                      if (!pendingTopicId) return;
                      const name = nameInput.trim();
                      handleSave(pendingTopicId, name || undefined);
                    }}
                  >
                    Xác nhận
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 border border-gray-200"
                    onClick={() => {
                      setPendingTopicId(null);
                      setNameInput('');
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
