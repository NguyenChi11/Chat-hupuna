import React from 'react';
import { Message } from '@/types/Message';
import ICPin from '../svg/ICPin';
import {
  HiOutlineAcademicCap,
  HiOutlineClipboardCopy,
  HiOutlineDownload,
  HiOutlineTrash,
  HiPencil,
} from 'react-icons/hi';

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
}) => {
  if (!contextMenu || !contextMenu.visible) return null;

  const { x, y, message: msg } = contextMenu;
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
    left: x > window.innerWidth - 200 ? x - 180 : x,
  };

  return (
    <div
      data-context-menu="true"
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 py-1 w-44 text-sm"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
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
            try {
              await navigator.clipboard.writeText(msg.content || '');
            } catch (err) {
              console.error('Copy lỗi:', err);
              alert('Sao chép thất bại!');
            } finally {
              onClose();
            }
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
