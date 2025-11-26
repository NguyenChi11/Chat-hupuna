'use client';

import React, { useRef } from 'react';
import ModalMembers from '../../../components/base/ModalMembers';
import { GroupConversation, MemberInfo, GroupRole } from '../../../types/Group';
import { User } from '../../../types/User';
import { useChatInfoPopup } from '@/hooks/useChatInfoPopup';
import MediaPreviewModal from '@/components/(chatPopup)/MediaPreviewModal';
import ChatInfoHeader from '../../../components/(chatPopup)/components/ChatInfoHeader';
import GroupAvatarSection from '../../../components/(chatPopup)/components/GroupAvatarSection';
import UserAvatarSection from '../../../components/(chatPopup)/components/UserAvatarSection';
import ChatQuickActions from '../../../components/(chatPopup)/components/ChatQuickActions';
import GroupDangerZone from '../../../components/(chatPopup)/components/GroupDangerZone';
import GroupMembersSection from '../../../components/(chatPopup)/components/GroupMembersSection';
import ReminderSection from '../../../components/(chatPopup)/components/ReminderSection';
import MediaSection from '../../../components/(chatPopup)/components/MediaSection';
import FileSection from '../../../components/(chatPopup)/components/FileSection';
import LinkSection from '../../../components/(chatPopup)/components/LinkSection';
import RenameGroupModal from '../../../components/(chatPopup)/components/RenameGroupModal';
import ConfirmGroupActionModal from '../../../components/(chatPopup)/components/ConfirmGroupActionModal';
import { useChatContext } from '@/context/ChatContext';

interface ChatInfoPopupProps {
  onClose: () => void;
  onShowCreateGroup: () => void;
  onMembersAdded: (users: User[]) => void;
  members?: MemberInfo[];
  // 🔥 Thêm prop này để thực hiện chức năng "Nhảy tới tin nhắn"
  onJumpToMessage: (messageId: string) => void;
  onMemberRemoved?: (memberId: string, memberName: string) => void;
  onRoleChange?: (memberId: string, memberName: string, newRole: 'ADMIN' | 'MEMBER') => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroup: boolean) => void;
  reLoad?: () => void;
  onLeftGroup?: () => void;
}

export default function ChatInfoPopup({
  onClose,
  onShowCreateGroup,
  onMembersAdded,
  members,
  onJumpToMessage,
  onMemberRemoved,
  onRoleChange,
  onChatAction,
  reLoad,
  onLeftGroup,
}: ChatInfoPopupProps) {
  const { messages, currentUser, allUsers, chatName, isGroup, selectedChat } = useChatContext();
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [openMember, setOpenMember] = React.useState(false);
  const [groupAvatar, setGroupAvatar] = React.useState<string | undefined>(
    isGroup ? (selectedChat as GroupConversation).avatar : undefined,
  );
  const [isGroupAvatarUploading, setIsGroupAvatarUploading] = React.useState(false);
  const [groupName, setGroupName] = React.useState<string>(chatName || '');
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [renameInput, setRenameInput] = React.useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [previewMedia, setPreviewMedia] = React.useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<'leave' | 'disband' | null>(null);

  React.useEffect(() => {
    setGroupName(chatName || '');
  }, [chatName]);

  const handleChangeGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isGroup) return;

    try {
      setIsGroupAvatarUploading(true);
      const groupId = (selectedChat as GroupConversation)._id;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', String(groupId));
      formData.append('sender', String(currentUser._id));
      formData.append('receiver', '');
      formData.append('type', 'image');
      formData.append('folderName', `GroupAvatar_${groupId}`);

      const uploadRes = await fetch(`/api/upload?uploadId=group-avatar-${groupId}-${Date.now()}`, {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok || !uploadJson?.success || !uploadJson?.link) {
        alert('Tải lên ảnh nhóm thất bại, vui lòng thử lại.');
        return;
      }

      const avatarUrl: string = uploadJson.link;

      const updateRes = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateAvatar',
          conversationId: groupId,
          data: { avatar: avatarUrl },
        }),
      });

      if (!updateRes.ok) {
        alert('Cập nhật ảnh nhóm thất bại, vui lòng thử lại.');
        return;
      }

      setGroupAvatar(avatarUrl);
      // Gọi reload để các nơi khác (Sidebar, ChatHeader, ...) cập nhật avatar mới
      if (reLoad) {
        reLoad();
      }
    } catch (error) {
      console.error('Update group avatar error:', error);
      alert('Có lỗi xảy ra khi cập nhật ảnh nhóm.');
    } finally {
      setIsGroupAvatarUploading(false);
    }
  };

  const {
    localIsPinned,
    localIsHidden,
    openItems,
    activeMenuId,
    setActiveMenuId,
    handleChatActionClick,
    toggleItem,
    closeMenu,
    mediaList,
    fileList,
    linkList,
  } = useChatInfoPopup({
    selectedChat,
    isGroup,
    messages,
    onChatAction,
  });

  // Xác định vai trò của currentUser trong nhóm (OWNER / ADMIN / MEMBER)
  const myId = String(currentUser._id || (currentUser as unknown as { id?: string })?.id || '');
  const myMemberInfo = (members || []).find((m) => {
    const memberId = String((m._id ?? (m as unknown as { id?: string })?.id) || '');
    return memberId === myId;
  });
  const myRole: GroupRole = myMemberInfo?.role || 'MEMBER';

  // Bất kỳ thành viên nhóm nào cũng có thể rời nhóm (kể cả Nhóm trưởng)
  const canLeaveGroup = isGroup;
  // Chỉ Nhóm trưởng mới được phép giải tán nhóm
  const canDisbandGroup = isGroup && myRole === 'OWNER';

  const handleRenameGroup = () => {
    if (!isGroup) return;
    const currentName = groupName || chatName || '';
    setRenameInput(currentName);
    setIsRenameModalOpen(true);
  };

  const handleSubmitRenameGroup = async () => {
    if (!isGroup) return;

    const currentName = (groupName || chatName || '').trim();
    const newName = renameInput.trim();

    if (!newName || newName === currentName) {
      setIsRenameModalOpen(false);
      return;
    }

    try {
      const groupId = (selectedChat as GroupConversation)._id;
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'renameGroup',
          conversationId: groupId,
          data: { name: newName },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        alert('Đổi tên nhóm thất bại, vui lòng thử lại.');
        return;
      }

      setGroupName(newName);
      setIsRenameModalOpen(false);

      if (reLoad) {
        reLoad();
      }
    } catch (error) {
      console.error('Rename group error:', error);
      alert('Có lỗi xảy ra khi đổi tên nhóm.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!isGroup || !canLeaveGroup) return;

    const groupId = (selectedChat as GroupConversation)._id;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leaveGroup',
          conversationId: groupId,
          _id: currentUser._id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        alert(json?.error || 'Rời nhóm thất bại, vui lòng thử lại.');
        return;
      }

      if (reLoad) {
        reLoad();
      }

      if (onLeftGroup) {
        onLeftGroup();
      }

      onClose();
    } catch (error) {
      console.error('Leave group error:', error);
      alert('Có lỗi xảy ra khi rời nhóm.');
    }
  };

  const handleDisbandGroup = async () => {
    if (!isGroup || !canDisbandGroup) return;

    const groupId = (selectedChat as GroupConversation)._id;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disbandGroup',
          conversationId: groupId,
          _id: currentUser._id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        alert(json?.error || 'Giải tán nhóm thất bại, vui lòng thử lại.');
        return;
      }

      // Đóng popup trước
      onClose();

      // Chuyển về trang home (xóa selectedChat)
      if (onLeftGroup) {
        onLeftGroup();
      }

      // Reload dữ liệu để cập nhật danh sách nhóm (nhóm đã giải tán sẽ không còn trong danh sách)
      if (reLoad) {
        reLoad();
      }
    } catch (error) {
      console.error('Disband group error:', error);
      alert('Có lỗi xảy ra khi giải tán nhóm.');
    }
  };

  return (
    <div
      ref={popupRef}
      className="bg-white shadow-lg w-full sm:w-[21.875rem] flex flex-col h-full overflow-y-auto relative"
    >
      <ChatInfoHeader onClose={onClose} />

      {/* Nội dung popup */}
      <div className="space-y-6 bg-gray-200">
        {/* Tên chat & Chức năng */}
        <div className="space-y-6 bg-white w-full mb-2">
          {isGroup ? (
            <GroupAvatarSection
              isGroup={isGroup}
              groupAvatar={groupAvatar}
              groupName={groupName}
              chatName={chatName}
              isGroupAvatarUploading={isGroupAvatarUploading}
              avatarInputRef={avatarInputRef}
              onChangeGroupAvatar={handleChangeGroupAvatar}
              onRenameGroup={handleRenameGroup}
            />
          ) : (
            <UserAvatarSection
              userName={(selectedChat as User).name || (selectedChat as User).username || 'Người dùng'}
              userAvatar={(selectedChat as User).avatar}
            />
          )}

          <ChatQuickActions
            localIsPinned={localIsPinned}
            localIsHidden={localIsHidden}
            onPinToggle={() => handleChatActionClick('pin')}
            onHideToggle={() => handleChatActionClick('hide')}
            onCreateGroup={() => {
              onShowCreateGroup();
              onClose();
            }}
          />

          <GroupDangerZone
            isGroup={isGroup}
            canLeaveGroup={canLeaveGroup}
            canDisbandGroup={canDisbandGroup}
            onLeaveClick={() => setConfirmAction('leave')}
            onDisbandClick={() => setConfirmAction('disband')}
          />
        </div>

        <GroupMembersSection
          isGroup={isGroup}
          groupName={groupName}
          membersCount={isGroup ? (selectedChat as GroupConversation).members.length : 0}
          onOpenMembers={() => setOpenMember(true)}
        />

        <ReminderSection />

        <MediaSection
          isOpen={openItems['Ảnh/Video']}
          onToggle={() => toggleItem('Ảnh/Video')}
          mediaList={mediaList}
          setPreviewMedia={setPreviewMedia}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onJumpToMessage={onJumpToMessage}
          closeMenu={closeMenu}
        />

        <FileSection
          isOpen={openItems['File']}
          onToggle={() => toggleItem('File')}
          fileList={fileList}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onJumpToMessage={onJumpToMessage}
          closeMenu={closeMenu}
        />

        <LinkSection
          isOpen={openItems['Link']}
          onToggle={() => toggleItem('Link')}
          linkList={linkList}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          onJumpToMessage={onJumpToMessage}
          closeMenu={closeMenu}
        />

        {/* (Phần Ẩn/Hiện trò chuyện đã đưa lên khu "Chức năng" phía trên cùng) */}
      </div>

      {/*</div>*/}

      {openMember && isGroup && (
        <ModalMembers
          allUsers={allUsers}
          currentUser={currentUser}
          isOpen={openMember}
          onClose={() => setOpenMember(false)}
          members={members || []}
          groupName={chatName}
          onMembersAdded={onMembersAdded}
          conversationId={selectedChat._id}
          onMemberRemoved={onMemberRemoved}
          onRoleChange={onRoleChange}
        />
      )}

      {isRenameModalOpen && isGroup && (
        <RenameGroupModal
          isOpen={isRenameModalOpen}
          renameInput={renameInput}
          onChangeInput={setRenameInput}
          onClose={() => setIsRenameModalOpen(false)}
          onSubmit={() => void handleSubmitRenameGroup()}
        />
      )}

      {confirmAction && isGroup && (
        <ConfirmGroupActionModal
          confirmAction={confirmAction}
          onCancel={() => setConfirmAction(null)}
          onConfirmLeave={() => void handleLeaveGroup()}
          onConfirmDisband={() => void handleDisbandGroup()}
        />
      )}

      <MediaPreviewModal
        media={previewMedia}
        chatName={chatName}
        isGroup={isGroup}
        onClose={() => setPreviewMedia(null)}
      />

      {/* Popup loading khi cập nhật ảnh nhóm */}
      {isGroupAvatarUploading && (
        <div className="fixed inset-0 z-[9700] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700">Đang cập nhật ảnh nhóm...</span>
          </div>
        </div>
      )}
    </div>
  );
}
