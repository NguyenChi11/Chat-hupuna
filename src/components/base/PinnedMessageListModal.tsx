// ui/base/PinnedMessageListModal.tsx

import React from 'react';
import { Message } from '../../types/Message';

// React Icons – chuẩn Zalo, đẹp, nhẹ
import { HiMapPin, HiXMark } from 'react-icons/hi2';
import { HiLink } from 'react-icons/hi';

interface Props {
  messages: Message[];
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onGetSenderName: (sender: string | Message['sender']) => string;
  onGetContentDisplay: (msg: Message) => string | React.ReactNode;
  onUnpinMessage: (msg: Message) => void;
}

export default function PinnedMessageListModal({
  messages,
  onClose,
  onJumpToMessage,
  onGetSenderName,
  onGetContentDisplay,
  onUnpinMessage,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[82vh] max-h-[40rem] sm:max-h-[50rem] mx-4 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50 sticky top-0 z-10">
          <h3 className="flex items-center gap-2.5 text-lg font-bold text-yellow-800">
            <HiMapPin className="w-6 h-6 text-yellow-600 rotate-45" />
            Tin nhắn đã ghim
            <span className="ml-2 px-2.5 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full">
              {messages.length}
            </span>
          </h3>

          <button
            onClick={onClose}
            className="p-2 cursor-pointer rounded-full hover:bg-white/80 transition-all hover:scale-110"
            title="Đóng"
          >
            <HiXMark className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Danh sách tin nhắn */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <HiMapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-base">Chưa có tin nhắn nào được ghim</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                onClick={() => {
                  onJumpToMessage(msg._id);
                  onClose();
                }}
                className="relative group p-4 bg-gradient-to-r from-yellow-50 to-white rounded-xl border border-yellow-200 hover:border-yellow-400 hover:shadow-md cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-yellow-800 text-sm">{onGetSenderName(msg.sender)}</span>
                    <span
                      className={`text-[0.6875rem] px-2 py-0.5 rounded-md font-semibold ${
                        msg.type === 'poll'
                          ? 'bg-yellow-100 text-yellow-800'
                          : msg.type === 'reminder'
                            ? 'bg-blue-100 text-blue-800'
                            : msg.type === 'image'
                              ? 'bg-pink-100 text-pink-800'
                              : msg.type === 'file'
                                ? 'bg-gray-100 text-gray-800'
                                : msg.type === 'sticker'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {msg.type === 'poll'
                        ? 'Bình chọn'
                        : msg.type === 'reminder'
                          ? 'Lịch hẹn'
                          : msg.type === 'image'
                            ? 'Ảnh'
                            : msg.type === 'file'
                              ? 'File'
                              : msg.type === 'sticker'
                                ? 'Sticker'
                                : 'Tin nhắn'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(msg.timestamp).toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinMessage(msg);
                      }}
                      className="px-2 py-1 text-[0.74rem] rounded-lg border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer whitespace-nowrap"
                    >
                      Bỏ ghim
                    </button>
                  </div>
                </div>

                {/* Nội dung */}
                <div className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                  {msg.isRecalled ? (
                    <span className="italic text-gray-400">đã thu hồi tin nhắn</span>
                  ) : (
                    onGetContentDisplay(msg)
                  )}
                </div>

                {/* Link preview cho tin nhắn text */}
                {msg.type === 'text' &&
                  !msg.isRecalled &&
                  (() => {
                    const linkMatch = (msg.content || '').match(/(https?:\/\/|www\.)\S+/i);
                    if (!linkMatch) return null;
                    const raw = linkMatch[0];
                    const href = raw.startsWith('http') ? raw : `https://${raw}`;
                    const hostname = (() => {
                      try {
                        return new URL(href).hostname.replace('www.', '');
                      } catch {
                        return 'Website';
                      }
                    })();
                    return (
                      <div className="mt-2 rounded-xl shadow-xl bg-white overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(href, '_blank');
                          }}
                          className="w-full text-left p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                        >
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-500 text-white">
                            <HiLink className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-purple-600 truncate">{raw}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{hostname}</p>
                          </div>
                        </button>
                      </div>
                    );
                  })()}
                

                {/* Hiệu ứng nhấn */}
                <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))
          )}
        </div>

        {/* Footer nhẹ (có thể để trống hoặc thêm ghi chú) */}
        <div className="p-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
          Nhấn vào tin nhắn để nhảy đến vị trí gốc
        </div>
      </div>
    </div>
  );
}
