// ui/base/PinnedMessageListModal.tsx

import React from 'react';
import { Message } from '@/types/Message';
import PinIcon from '@/public/icons/pin-icon.svg'; // Dùng lại icon pin

interface Props {
  messages: Message[];
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onGetSenderName: (sender: string) => string; // Định nghĩa prop hàm lấy tên
  onGetContentDisplay: (msg: Message) => string; // Định nghĩa prop hàm lấy nội dung
}

export default function PinnedMessageListModal({
  messages,
  onClose,
  onJumpToMessage,
  onGetSenderName, // Lấy prop hàm
  onGetContentDisplay,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md h-[80vh] flex flex-col relative overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 border-b-[1px] border-b-gray-300 flex justify-between items-center bg-gray-50 sticky top-0">
          <h3 className="font-bold text-lg flex items-center gap-2 text-yellow-700">
            <img src={PinIcon.src} alt="pin" className="w-5 h-5 rotate-45" />
            Danh sách tin nhắn ghim ({messages.length})
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 p-1 rounded-full transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Danh sách tin nhắn ghim */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Chưa có tin nhắn nào được ghim.</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                onClick={() => {
                  onJumpToMessage(msg._id);
                  onClose();
                }} // Nhảy đến tin nhắn và đóng modal
                className="p-3 bg-white hover:bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer transition-colors shadow-sm"
              >
                {/* Tên người gửi */}
                <div className="text-xs text-gray-600 flex items-center justify-between mb-1">
                  <span className="font-bold text-yellow-700">{onGetSenderName(msg.sender)}</span>
                  <span className="text-gray-400">{new Date(msg.timestamp).toLocaleDateString('vi-VN')}</span>
                </div>

                {/* Nội dung tin nhắn */}
                <p className="text-sm line-clamp-2">
                  {msg.isRecalled ? 'Tin nhắn đã bị thu hồi' : onGetContentDisplay(msg)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer (Tùy chọn) */}
        <div className="p-3 border-t-[1px] border-t-gray-300 text-center sticky bottom-0 bg-white">
          <span className="text-blue-600 text-sm cursor-pointer hover:underline"></span>
        </div>
      </div>
    </div>
  );
}
