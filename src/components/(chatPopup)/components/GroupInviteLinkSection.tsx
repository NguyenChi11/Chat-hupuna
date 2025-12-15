import React, { useState } from 'react';
import { HiLink, HiClipboardCopy, HiRefresh, HiCheck, HiX, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';

interface GroupInviteLinkSectionProps {
  groupId: string;
  inviteCode?: string;
  onGenerateLink: () => Promise<string>;
  onRegenerateLink: () => Promise<string>;
}

interface ModalProps {
  show: boolean;
  type: 'confirm' | 'success' | 'error';
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
}

function Modal({ show, type, message, onClose, onConfirm }: ModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white/30 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-[scale-in_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <div className="flex items-center gap-2">
            {type === 'success' && (
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <HiCheckCircle className="w-5 h-5 text-green-600" />
              </div>
            )}
            {type === 'error' && (
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <HiX className="w-5 h-5 text-red-600" />
              </div>
            )}
            {type === 'confirm' && (
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <HiExclamationCircle className="w-5 h-5 text-yellow-600" />
              </div>
            )}
            <h3 className="text-lg font-semibold">
              {type === 'success' && 'Thành công'}
              {type === 'error' && 'Lỗi'}
              {type === 'confirm' && 'Xác nhận'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors hover:cursor-pointer"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-300 bg-gray-50">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 hover:cursor-pointer bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Xác nhận
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 hover:cursor-pointer text-white rounded hover:bg-blue-700 transition-colors"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function GroupInviteLinkSection({
  inviteCode: initialCode,
  onGenerateLink,
  onRegenerateLink,
}: GroupInviteLinkSectionProps) {
  const [inviteCode, setInviteCode] = useState(initialCode || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [modal, setModal] = useState<{ show: boolean; type: 'confirm' | 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: '',
  });

  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : '';

  const showModal = (type: 'confirm' | 'success' | 'error', message: string) => {
    setModal({ show: true, type, message });
  };

  const closeModal = () => {
    setModal({ show: false, type: 'success', message: '' });
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const code = await onGenerateLink();
      setInviteCode(code);
    } catch (error) {
      console.error('Generate link error:', error);
      showModal('error', 'Tạo link mời thất bại');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateLink = async () => {
    setIsGenerating(true);
    try {
      const code = await onRegenerateLink();
      setInviteCode(code);
      showModal('success', 'Đã tạo link mời mới');
    } catch (error) {
      console.error('Regenerate link error:', error);
      showModal('error', 'Tạo link mới thất bại');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmRegenerate = () => {
    closeModal();
    handleRegenerateLink();
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiLink className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Link mời vào nhóm</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {!inviteCode ? (
            // Chưa có link
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">Tạo link mời để chia sẻ với bạn bè</p>
              <button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="px-4 py-2 hover:cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Đang tạo...' : 'Tạo link mời'}
              </button>
            </div>
          ) : (
            // Đã có link
            <>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 border-none outline-none rounded-lg bg-gray-50 text-sm text-gray-700 select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 hover:bg-gray-100 hover:cursor-pointer rounded-lg transition flex-shrink-0"
                  title="Sao chép link"
                >
                  {isCopied ? (
                    <HiCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <HiClipboardCopy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => showModal('confirm', 'Tạo link mới sẽ vô hiệu hóa link cũ. Bạn có chắc chắn?')}
                  disabled={isGenerating}
                  className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0 hover:cursor-pointer disabled:opacity-50"
                  title="Tạo link mới"
                >
                  <HiRefresh className={`w-5 h-5 text-gray-600 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <p className="text-xs text-gray-500">💡 Mọi người có link này có thể tham gia nhóm</p>
            </>
          )}
        </div>
      </div>

      <Modal
        show={modal.show}
        type={modal.type}
        message={modal.message}
        onClose={closeModal}
        onConfirm={modal.type === 'confirm' ? handleConfirmRegenerate : undefined}
      />
    </>
  );
}
