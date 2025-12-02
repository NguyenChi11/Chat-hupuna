import React, { useState } from 'react';
import { HiX } from 'react-icons/hi';
import { HiCheck } from 'react-icons/hi2';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: { question: string; options: string[] }) => Promise<void> | void;
}

export default function CreatePollModal({ isOpen, onClose, onCreate }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions((prev) => [...prev, '']);
  };

  const handleChangeOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleSubmit = async () => {
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o);
    if (!question.trim() || cleanOptions.length < 2) return;
    setSaving(true);
    try {
      await onCreate({ question: question.trim(), options: cleanOptions });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30">
            <HiX className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">Tạo bình chọn</h3>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Câu hỏi *</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white" />
          <label className="block text-sm font-medium text-gray-700 mb-2">Tùy chọn *</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <input key={idx} type="text" value={opt} onChange={(e) => handleChangeOption(idx, e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white" />
            ))}
          </div>
          <button onClick={handleAddOption} className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl">Thêm option</button>
        </div>
        <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 cursor-pointer py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl">Hủy</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 cursor-pointer py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-2xl">
            <span className="inline-flex items-center justify-center gap-2">
              <HiCheck className="w-5 h-5" /> {saving ? 'Đang lưu...' : 'Lưu'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
