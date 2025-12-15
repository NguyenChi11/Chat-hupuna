'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { HiFolder, HiFolderOpen, HiChevronDown, HiX, HiCheck } from 'react-icons/hi';

export interface FolderNode {
  id: string;
  name: string;
  children: FolderNode[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderNode[];
  onCreate: (name: string, parentId?: string) => void;
  defaultParentId?: string;
  lockParent?: boolean;
}

export default function FolderCreateModal({ isOpen, onClose, folders, onCreate, defaultParentId, lockParent }: Props) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | ''>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setParentId(defaultParentId || '');
    }
  }, [isOpen, defaultParentId]);

  const options = useMemo(() => {
    const res: { id: string; label: string }[] = [];
    const walk = (arr: FolderNode[], prefix = '') => {
      for (const n of arr) {
        res.push({ id: n.id, label: `${prefix}${n.name}` });
        if (n.children?.length) walk(n.children, `${prefix}├── `);
      }
    };
    walk(folders);
    return res;
  }, [folders]);

  const selectedLabel = parentId ? options.find((o) => o.id === parentId)?.label || '(Thư mục gốc)' : '(Thư mục gốc)';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-7 py-5">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Tạo thư mục mới</h3>
              <p className="mt-1 text-sm text-gray-500">Tổ chức tài liệu của bạn tốt hơn</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-7 py-6 space-y-6">
            {/* Tên thư mục */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tên thư mục</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Hợp đồng 2025, Dự án Alpha, ..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50/70 px-4 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Thư mục cha - Custom Dropdown đẹp */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Thư mục cha <span className="font-normal text-gray-500">(tuỳ chọn)</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  disabled={!!lockParent}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    lockParent
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : 'border-gray-300 bg-gray-50/70 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {parentId ? (
                      <HiFolder className="w-5 h-5 text-blue-500" />
                    ) : (
                      <HiFolderOpen className="w-5 h-5 text-gray-400" />
                    )}
                    <span className={parentId ? 'text-gray-900' : 'text-gray-500'}>{selectedLabel}</span>
                  </div>
                  {!lockParent && (
                    <HiChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && !lockParent && (
                  <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5">
                    <div className="max-h-64 overflow-y-auto py-1">
                      <button
                        onClick={() => {
                          setParentId('');
                          setIsDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <HiFolderOpen className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">(Thư mục gốc)</span>
                      </button>

                      {options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setParentId(option.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                            parentId === option.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <HiFolder className="w-5 h-5 text-blue-500" />
                            <span>{option.label}</span>
                          </div>
                          {parentId === option.id && <HiCheck className="w-5 h-5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={() => {
                  const trimmedName = name.trim();
                  if (!trimmedName) return;
                  onCreate(trimmedName, parentId || undefined);
                  onClose();
                }}
                disabled={!name.trim()}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg transition-all duration-200"
              >
                Tạo thư mục
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
