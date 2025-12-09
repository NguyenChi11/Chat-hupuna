import React from 'react';
import { Message } from '@/types/Message';
import {
  HiOutlineAcademicCap,
  HiOutlineClipboardCopy,
  HiOutlineDownload,
  HiOutlineShare,
  HiOutlineTrash,
  HiPencil,
} from 'react-icons/hi';
import { RiReplyLine } from 'react-icons/ri';

const getId = (u: Message['sender'] | string | undefined | null): string => {
  if (!u) return '';
  if (typeof u === 'string') return u;
  if (typeof u === 'object' && u !== null && '_id' in u && (u as { _id?: unknown })._id != null)
    return String((u as { _id: unknown })._id);
  if (typeof u === 'object' && u !== null && 'id' in u && (u as { id?: unknown }).id != null)
    return String((u as unknown as { id: unknown }).id);
  return '';
};

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  message: Message;
  placement?: 'above' | 'below';
}

interface MenuItemProps {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLElement | HTMLAnchorElement>) => void;
  isRed?: boolean;
  isAnchor?: boolean;
  href?: string;
  download?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  children,
  onClick,
  isRed = false,
  isAnchor = false,
  href = '#',
  download = '',
}) => {
  const className = `w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-3 ${isRed ? 'text-red-500' : 'text-gray-700'}`;

  if (isAnchor) {
    return (
      <a href={href} download={download} onClick={onClick} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className} type="button">
      {children}
    </button>
  );
};

interface MessageContextMenuProps {
  contextMenu: ContextMenuState | null;
  currentUserId: string;
  onClose: () => void;
  onPinMessage: (msg: Message) => void;
  onRecallMessage: (messageId: string) => void;
  setEditingMessageId?: (id: string | null) => void;
  setEditContent?: (content: string) => void;
  closeContextMenu?: () => void;
  onReplyMessage?: (msg: Message) => void;
  onShareMessage: (message: Message) => void; 
}

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  contextMenu,
  currentUserId,
  onClose,
  onPinMessage,
  onRecallMessage,
  setEditingMessageId,
  setEditContent,
  closeContextMenu,
  onReplyMessage,
  onShareMessage,
}) => {
  if (!contextMenu || !contextMenu.visible) return null;

  const { x, y, message: msg, placement } = contextMenu;
  const isMe = getId(msg.sender) === currentUserId;
  const isText = msg.type === 'text';
  const isRecalled = msg.isRecalled;
  const canCopy = isText && !isRecalled;
  const canDownload = (msg.type === 'image' || msg.type === 'file' || msg.type === 'sticker') && msg.fileUrl;
  const canRecall = isMe && !isRecalled;
  const isCurrentlyPinned = msg.isPinned === true;
  const canEdit = isMe && isText && !isRecalled;
  const style = {
    top: y,
    left: x,
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && (window as unknown as { isSecureContext?: boolean }).isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return true;
    } catch {}
    try {
      const ta2 = document.createElement('input');
      ta2.value = text;
      ta2.style.position = 'fixed';
      ta2.style.top = '0';
      ta2.style.left = '0';
      ta2.style.opacity = '0';
      document.body.appendChild(ta2);
      ta2.focus();
      ta2.select();
      const ok2 = document.execCommand('copy');
      document.body.removeChild(ta2);
      if (ok2) return true;
    } catch {}
    return false;
  };

  const animClass =
    placement === 'above'
      ? 'animate-in fade-in slide-in-from-bottom-2 duration-200'
      : 'animate-in fade-in slide-in-from-top-2 duration-200';

  return (
    <div
      data-context-menu="true"
      className={`fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 py-1 w-44 text-sm ${animClass}`}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!isRecalled && (
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onShareMessage(msg);
            onClose();
          }}
        >
          <span className="flex gap-2">
            <HiOutlineShare className="w-5 h-5" />
            Chia sẻ tin nhắn
          </span>
        </MenuItem>
      )}
      {!isRecalled && (
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onPinMessage(msg);
            onClose();
          }}
        >
          {isCurrentlyPinned ? (
            <p className="text-red-500 flex gap-2">
              <HiOutlineAcademicCap className="w-5 h-5" />
              Bỏ ghim tin nhắn
            </p>
          ) : (
            <p className="flex gap-2">
              <HiOutlineAcademicCap className="w-5 h-5" />
              Ghim tin nhắn
            </p>
          )}
        </MenuItem>
      )}

      {!isRecalled && onReplyMessage && (
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onReplyMessage(msg);
            onClose();
          }}
        >
          <span className="flex gap-2">
            <RiReplyLine className="w-5 h-5" />
            Phản hồi tin nhắn
          </span>
        </MenuItem>
      )}

      {canEdit && (
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (setEditingMessageId && setEditContent && closeContextMenu) {
              setEditingMessageId(msg._id);
              setEditContent(msg.content || '');
              closeContextMenu();
            }
          }}
        >
          <HiPencil className="w-5 h-5" />
          Chỉnh sửa
        </MenuItem>
      )}

      {canCopy && (
        <MenuItem
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            const ok = await copyTextToClipboard(msg.content || '');
            if (!ok) {
              alert('Sao chép thất bại!');
            }
            onClose();
          }}
        >
          <HiOutlineClipboardCopy className="w-5 h-5" />
          Copy
        </MenuItem>
      )}

      {canDownload && (
        <MenuItem
          isAnchor={true}
          href={msg.fileUrl}
          download={msg.fileName || 'file_chat'}
          onClick={(e) => {
            e.stopPropagation();
            setTimeout(() => onClose(), 100);
          }}
        >
          <HiOutlineDownload className="w-5 h-5" />
          Tải xuống
        </MenuItem>
      )}

      {canRecall && (
        <MenuItem
          isRed={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRecallMessage(msg._id);
            onClose();
          }}
        >
          <HiOutlineTrash className="w-5 h-5" />
          Thu hồi
        </MenuItem>
      )}
    </div>
  );
};

export default MessageContextMenu;
