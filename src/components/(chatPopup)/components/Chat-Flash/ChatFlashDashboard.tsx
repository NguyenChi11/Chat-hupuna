'use client';
import React from 'react';
import { useChatContext } from '@/context/ChatContext';
import { ChatFlashItem, ChatFlashTopic } from './types';
import TopicToolbar from './TopicToolbar';
import TopicList from './TopicList';
import { HiLightningBolt, HiPlus, HiTrash, HiPencil } from 'react-icons/hi';

type Scope = 'room' | 'global';

type Props = {
  roomId: string;
  onClose?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onInsertToInput?: (text: string) => void;
  onAttachFromTopic?: (att: { url: string; type: 'image' | 'video' | 'file'; fileName?: string }) => void;
};

export default function ChatFlashDashboard({
  roomId,
  onClose,
  onJumpToMessage,
  onInsertToInput,
  onAttachFromTopic,
}: Props) {
  const { messages, currentUser } = useChatContext();
  const [selectedScope, setSelectedScope] = React.useState<Scope>('room');
  const [topics, setTopics] = React.useState<ChatFlashTopic[]>([]);
  const [topicsGlobal, setTopicsGlobal] = React.useState<ChatFlashTopic[]>([]);
  const [itemsMap, setItemsMap] = React.useState<Record<string, ChatFlashItem[]>>({});
  const [itemsMapGlobal, setItemsMapGlobal] = React.useState<Record<string, ChatFlashItem[]>>({});
  const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [newTopicName, setNewTopicName] = React.useState('');
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [linkInput, setLinkInput] = React.useState('');
  const [textInput, setTextInput] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const userId = String(currentUser?._id || '');
  const storageKey = React.useMemo(() => `chatFlashTopics:${roomId}`, [roomId]);
  const itemsKey = React.useMemo(() => `chatFlashTopicItems:${roomId}`, [roomId]);
  const globalStorageKey = React.useMemo(() => `chatFlashTopics:__global__:${userId}`, [userId]);
  const globalItemsKey = React.useMemo(() => `chatFlashTopicItems:__global__:${userId}`, [userId]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setTopics(raw ? JSON.parse(raw) : []);
    } catch {
      setTopics([]);
    }
    try {
      const rawG = localStorage.getItem(globalStorageKey);
      setTopicsGlobal(rawG ? JSON.parse(rawG) : []);
    } catch {
      setTopicsGlobal([]);
    }
    try {
      const rawItems = localStorage.getItem(itemsKey);
      setItemsMap(rawItems ? JSON.parse(rawItems) : {});
    } catch {
      setItemsMap({});
    }
    try {
      const rawItemsG = localStorage.getItem(globalItemsKey);
      setItemsMapGlobal(rawItemsG ? JSON.parse(rawItemsG) : {});
    } catch {
      setItemsMapGlobal({});
    }
  }, [storageKey, itemsKey, globalStorageKey, globalItemsKey]);

  const currentTopics = selectedScope === 'global' ? topicsGlobal : topics;
  const currentItemsMap = selectedScope === 'global' ? itemsMapGlobal : itemsMap;

  const onSelectTopic = (id: string | null) => {
    setSelectedTopicId(id);
  };

  const onCreateTopic = (scope: Scope) => {
    const name = newTopicName.trim();
    if (!name) return;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (scope === 'global') {
      const next = [...topicsGlobal, { id, name }];
      setTopicsGlobal(next);
      try {
        localStorage.setItem(globalStorageKey, JSON.stringify(next));
      } catch {}
    } else {
      const next = [...topics, { id, name }];
      setTopics(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
    setNewTopicName('');
    setSelectedTopicId(id);
  };

  const onRenameTopic = (nodeId: string, name: string, scope: Scope) => {
    if (scope === 'global') {
      const next = topicsGlobal.map((n) => (n.id === nodeId ? { ...n, name } : n));
      setTopicsGlobal(next);
      try {
        localStorage.setItem(globalStorageKey, JSON.stringify(next));
      } catch {}
    } else {
      const next = topics.map((n) => (n.id === nodeId ? { ...n, name } : n));
      setTopics(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    }
    if (selectedTopicId === nodeId) setSelectedTopicId(nodeId);
  };

  const onDeleteTopic = (nodeId: string, scope: Scope) => {
    if (scope === 'global') {
      const next = topicsGlobal.filter((n) => n.id !== nodeId);
      setTopicsGlobal(next);
      try {
        localStorage.setItem(globalStorageKey, JSON.stringify(next));
        const map = { ...(itemsMapGlobal || {}) };
        delete map[nodeId];
        localStorage.setItem(globalItemsKey, JSON.stringify(map));
        setItemsMapGlobal(map);
      } catch {}
    } else {
      const next = topics.filter((n) => n.id !== nodeId);
      setTopics(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        const map = { ...(itemsMap || {}) };
        delete map[nodeId];
        localStorage.setItem(itemsKey, JSON.stringify(map));
        setItemsMap(map);
      } catch {}
    }
    if (selectedTopicId === nodeId) setSelectedTopicId(null);
  };

  const onAddLink = (link?: string) => {
    const url = (link ?? linkInput).trim();
    if (!selectedTopicId || !url) return;
    const item: ChatFlashItem = { id: `${Date.now()}`, type: 'text', content: url };
    const map = selectedScope === 'global' ? { ...(itemsMapGlobal || {}) } : { ...(itemsMap || {}) };
    const arr = Array.isArray(map[selectedTopicId]) ? map[selectedTopicId] : [];
    arr.push(item);
    map[selectedTopicId] = arr;
    if (selectedScope === 'global') {
      setItemsMapGlobal(map);
      try {
        localStorage.setItem(globalItemsKey, JSON.stringify(map));
      } catch {}
    } else {
      setItemsMap(map);
      try {
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    }
    setLinkInput('');
  };

  const onAddText = (text?: string) => {
    const val = (text ?? textInput).trim();
    if (!selectedTopicId || !val) return;
    const item: ChatFlashItem = { id: `${Date.now()}`, type: 'text', content: val };
    const map = selectedScope === 'global' ? { ...(itemsMapGlobal || {}) } : { ...(itemsMap || {}) };
    const arr = Array.isArray(map[selectedTopicId]) ? map[selectedTopicId] : [];
    arr.push(item);
    map[selectedTopicId] = arr;
    if (selectedScope === 'global') {
      setItemsMapGlobal(map);
      try {
        localStorage.setItem(globalItemsKey, JSON.stringify(map));
      } catch {}
    } else {
      setItemsMap(map);
      try {
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    }
    setTextInput('');
  };

  const onSelectMediaFiles = (files: File[]) => {
    if (!selectedTopicId || files.length === 0) return;
    const map = selectedScope === 'global' ? { ...(itemsMapGlobal || {}) } : { ...(itemsMap || {}) };
    const arr = Array.isArray(map[selectedTopicId]) ? map[selectedTopicId] : [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const isVideo = /\.mp4|\.mov|\.webm|\.mkv$/i.test(f.name);
      const item: ChatFlashItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: isVideo ? 'video' : 'image',
        fileUrl: url,
        fileName: f.name,
      };
      arr.push(item);
    }
    map[selectedTopicId] = arr;
    if (selectedScope === 'global') {
      setItemsMapGlobal(map);
      try {
        localStorage.setItem(globalItemsKey, JSON.stringify(map));
      } catch {}
    } else {
      setItemsMap(map);
      try {
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    }
  };

  const onSelectAnyFiles = (files: File[]) => {
    if (!selectedTopicId || files.length === 0) return;
    const map = selectedScope === 'global' ? { ...(itemsMapGlobal || {}) } : { ...(itemsMap || {}) };
    const arr = Array.isArray(map[selectedTopicId]) ? map[selectedTopicId] : [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const item: ChatFlashItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'file',
        fileUrl: url,
        fileName: f.name,
      };
      arr.push(item);
    }
    map[selectedTopicId] = arr;
    if (selectedScope === 'global') {
      setItemsMapGlobal(map);
      try {
        localStorage.setItem(globalItemsKey, JSON.stringify(map));
      } catch {}
    } else {
      setItemsMap(map);
      try {
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    }
  };

  const removeItemFromTopic = (topicId: string, messageId: string) => {
    const map = selectedScope === 'global' ? { ...(itemsMapGlobal || {}) } : { ...(itemsMap || {}) };
    const arr = Array.isArray(map[topicId]) ? map[topicId] : [];
    const next = arr.filter((it) => String(it.id) !== String(messageId));
    map[topicId] = next;
    if (selectedScope === 'global') {
      setItemsMapGlobal(map);
      try {
        localStorage.setItem(globalItemsKey, JSON.stringify(map));
      } catch {}
    } else {
      setItemsMap(map);
      try {
        localStorage.setItem(itemsKey, JSON.stringify(map));
      } catch {}
    }
  };

  const onToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const applySelection = () => setSelectedIds(new Set());

  const getItemCount = (nodeId: string): number => {
    const map = selectedScope === 'global' ? itemsMapGlobal : itemsMap;
    return map[nodeId]?.length || 0;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 h-full flex flex-col bg-gray-50 border-r border-gray-200 py-4">
          <div className="px-4 mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chủ đề</h3>
            <div className="flex items-center gap-1">
              <button
                className={`px-2 py-1 rounded-lg text-xs border ${selectedScope === 'global' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setSelectedScope('global')}
              >
                Dùng nhiều đoạn chat
              </button>
              <button
                className={`px-2 py-1 rounded-lg text-xs border ${selectedScope === 'room' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setSelectedScope('room')}
              >
                Đoạn chat hiện tại
              </button>
            </div>
          </div>
          <div className="px-4 mb-3">
            <div className="flex items-center gap-2">
              <input
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Tên chủ đề"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => onCreateTopic(selectedScope)}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow"
                aria-label="Tạo chủ đề"
              >
                <HiPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 -mx-4">
            {currentTopics.length > 0 ? (
              <div className="space-y-1 pb-4">
                {currentTopics.map((node) => (
                  <div key={node.id} className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white shadow">
                      <HiLightningBolt className="w-4 h-4" />
                    </div>
                    <button
                      onClick={() => onSelectTopic(node.id)}
                      className={`text-sm font-medium truncate ${selectedTopicId === node.id ? 'text-blue-600' : 'text-gray-900'}`}
                    >
                      {node.name}
                    </button>
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200">
                      {getItemCount(node.id)}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-200 transition"
                      onClick={() => {
                        setRenameTarget({ id: node.id, name: node.name });
                        setRenameInput(node.name);
                      }}
                    >
                      <HiPencil className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-gray-200 transition"
                      onClick={() => setDeleteTarget({ id: node.id, name: node.name })}
                    >
                      <HiTrash className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-12">Chưa có chủ đề nào</p>
            )}
          </div>
        </div>
        <div className="col-span-8">
          <div className="mb-2 mt-2 flex items-center flex-wrap gap-2 text-sm">
            <button
              onClick={() => onSelectTopic(null)}
              className="cursor-pointer px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Gốc
            </button>
            {selectedTopicId && (
              <>
                <span className="text-gray-400">›</span>
                <button
                  onClick={() => onSelectTopic(selectedTopicId)}
                  className="cursor-pointer px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700"
                >
                  {currentTopics.find((n) => n.id === selectedTopicId)?.name || 'Chủ đề'}
                </button>
              </>
            )}
          </div>
          <TopicToolbar
            selectedTopicId={selectedTopicId}
            linkInput={linkInput}
            onLinkInputChange={setLinkInput}
            onAddLink={() => onAddLink()}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onAddText={() => onAddText()}
            onSelectMediaFiles={onSelectMediaFiles}
            onSelectAnyFiles={onSelectAnyFiles}
          />
          <div className="px-2 py-2">
            <TopicList
              selectedTopicId={selectedTopicId}
              items={selectedTopicId ? currentItemsMap[selectedTopicId] || [] : []}
              messages={messages}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onJumpToMessage={onJumpToMessage}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              removeItemFromTopic={removeItemFromTopic}
              onRenameItem={() => {}}
            />
          </div>
        </div>
      </div>
      {renameTarget && (
        <div className="fixed inset-0 z-[1000] bg-black/40" onClick={() => setRenameTarget(null)}>
          <div
            className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-800">Đổi tên chủ đề</div>
            <div className="px-4 py-4">
              <input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm" onClick={() => setRenameTarget(null)}>
                Hủy
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
                onClick={() => {
                  if (!renameTarget) return;
                  onRenameTopic(renameTarget.id, renameInput.trim(), selectedScope);
                  setRenameTarget(null);
                  setRenameInput('');
                }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1000] bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div
            className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-800">Xóa chủ đề</div>
            <div className="px-4 py-4 text-sm text-gray-700">Bạn có chắc muốn xóa {deleteTarget?.name}?</div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm"
                onClick={() => {
                  if (!deleteTarget) return;
                  onDeleteTopic(deleteTarget.id, selectedScope);
                  setDeleteTarget(null);
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
