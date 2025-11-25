import React, { ChangeEvent, RefObject } from 'react';
import Image from 'next/image';
import IconEdit from '@/public/icons/edit.svg';
import { getProxyUrl } from '@/utils/utils';

interface GroupAvatarSectionProps {
  isGroup: boolean;
  groupAvatar?: string;
  groupName: string;
  chatName?: string;
  isGroupAvatarUploading: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onChangeGroupAvatar: (e: ChangeEvent<HTMLInputElement>) => void;
  onRenameGroup: () => void;
}

export default function GroupAvatarSection({
  isGroup,
  groupAvatar,
  groupName,
  chatName,
  isGroupAvatarUploading,
  avatarInputRef,
  onChangeGroupAvatar,
  onRenameGroup,
}: GroupAvatarSectionProps) {
  if (!isGroup) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Avatar nhóm */}
      <div className="mt-4 flex flex-col items-center">
        <div
          className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold cursor-pointer group"
          onClick={() => avatarInputRef.current?.click()}
          title="Nhấn để thay đổi ảnh nhóm"
        >
          {groupAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getProxyUrl(groupAvatar)}
              alt={chatName || 'Group avatar'}
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{(groupName || 'G').charAt(0).toUpperCase()}</span>
          )}
          <div
            className={`absolute inset-0 flex items-center justify-center text-xs font-medium text-white transition-opacity
                    ${isGroupAvatarUploading ? 'bg-black/50 opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}
          >
            {isGroupAvatarUploading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                <span>Đang cập nhật...</span>
              </div>
            ) : (
              'Đổi ảnh'
            )}
          </div>
        </div>
        <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={onChangeGroupAvatar} />
        <p className="mt-2 text-xs text-gray-500">Ảnh đại diện nhóm</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <p className="text-lg font-semibold text-black">{groupName}</p>
        <button
          type="button"
          className="bg-gray-200 rounded-full w-6 h-6 flex justify-center items-center cursor-pointer hover:bg-gray-300"
          onClick={onRenameGroup}
          title="Đổi tên nhóm"
        >
          <Image src={IconEdit} alt="edit" width={20} height={20} className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
