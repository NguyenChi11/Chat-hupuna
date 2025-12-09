import React, { useState, useCallback } from 'react';
import { HiLink, HiClipboardCopy, HiRefresh, HiCheck } from 'react-icons/hi';

interface GroupInviteLinkSectionProps {
  groupId: string;
  inviteCode?: string;
  onGenerateLink: () => Promise<string>;
  onRegenerateLink: () => Promise<string>;
}

export default function GroupInviteLinkSection({
  groupId,
  inviteCode: initialCode,
  onGenerateLink,
  onRegenerateLink,
}: GroupInviteLinkSectionProps) {
  const [inviteCode, setInviteCode] = useState(initialCode || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const inviteLink = inviteCode 
    ? `${window.location.origin}/invite/${inviteCode}` 
    : '';

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const code = await onGenerateLink();
      setInviteCode(code);
    } catch (error) {
      console.error('Generate link error:', error);
      alert('Tạo link mời thất bại');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!confirm('Tạo link mới sẽ vô hiệu hóa link cũ. Bạn có chắc chắn?')) return;
    
    setIsGenerating(true);
    try {
      const code = await onRegenerateLink();
      setInviteCode(code);
      alert('Đã tạo link mời mới');
    } catch (error) {
      console.error('Regenerate link error:', error);
      alert('Tạo link mới thất bại');
    } finally {
      setIsGenerating(false);
    }
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
            <p className="text-sm text-gray-600 mb-4">
              Tạo link mời để chia sẻ với bạn bè
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
                title="Sao chép link"
              >
                {isCopied ? (
                  <HiCheck className="w-5 h-5 text-green-600" />
                ) : (
                  <HiClipboardCopy className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={handleRegenerateLink}
                disabled={isGenerating}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                title="Tạo link mới"
              >
                <HiRefresh className={`w-5 h-5 text-gray-600 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              💡 Mọi người có link này có thể tham gia nhóm
            </p>
          </>
        )}
      </div>
    </div>
  );
}
