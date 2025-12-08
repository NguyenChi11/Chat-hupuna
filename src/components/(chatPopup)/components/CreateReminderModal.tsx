import React, { useState } from 'react';
import { HiX } from 'react-icons/hi';
import { HiCalendarDays, HiCheck } from 'react-icons/hi2';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: { content: string; dateTime: string; note?: string; repeat?: 'none' | 'daily' | 'weekly' | 'monthly' }) => Promise<void> | void;
  createLoading: boolean;
}

export default function CreateReminderModal({ isOpen, onClose, onCreate, createLoading }: CreateReminderModalProps) { 
  const [content, setContent] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const canSubmit = content.trim().length > 0 && dateTime.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <button
            onClick={onClose}
            className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200"
          >
            <HiX className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <HiCalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold">Tạo lịch hẹn</h3>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              placeholder="Nhập nội dung lịch hẹn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian *</label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            placeholder="Nội dung ghi chú"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn kiểu lặp lại (vd: Lặp lại hàng tuần)</label>
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly')}
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
          >
            <option value="none">Không lặp lại</option>
            <option value="daily">Hàng ngày</option>
            <option value="weekly">Hàng tuần</option>
            <option value="monthly">Hàng tháng</option>
          </select>
        </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all duration-200 active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={() => onCreate({ content, dateTime, note, repeat })}
            disabled={createLoading}
            className={`flex-1 cursor-pointer py-3.5 font-bold text-white rounded-2xl shadow-lg transition-all duration-300 active:scale-95 flex items-center justify-center gap-2
              ${canSubmit ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {createLoading ? (
                  <div className="cursor-not-allowed flex items-center gap-2">
                    <HiCheck className="w-5 h-5" />
                    Đang tạo...
                  </div>
            ) : (
              <div className="flex items-center gap-2">
                <HiCheck className="w-5 h-5 " />
                Tạo lịch hẹn
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
