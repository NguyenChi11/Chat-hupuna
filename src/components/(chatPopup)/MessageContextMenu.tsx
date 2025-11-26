import React from 'react';
import Image from 'next/image';
import { Message } from '@/types/Message';
import PinIcon from '@/public/icons/pin-icon.svg';
import ICPin from '../svg/ICPin';

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
              <ICPin className="w-5 h-5" stroke="#ff0000" />
              Bỏ ghim tin nhắn
            </p>
          ) : (
            <p className="flex gap-2">
              <ICPin className="w-5 h-5" stroke="#1f1f1f" />
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M7 6V5h6v1h-6zM3 8v10a2 2 0 002 2h10a2 2 0 002-2V8h-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2H3zm12 2v8H5v-8h10z" />
          </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5z"
              clipRule="evenodd"
            />
          </svg>
          Thu hồi
        </MenuItem>
      )}
    </div>
  );
};

export default MessageContextMenu;
