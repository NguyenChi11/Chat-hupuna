'use client';

import React, { useRef } from 'react';
import IconEdit from '@/public/icons/edit.svg';
import IconClock from '@/public/icons/clock.svg';
import IconNotification from '@/public/icons/notification.svg';
import IconPin from '@/public/icons/pin.svg';
import IconGroup from '@/public/icons/group.svg';
import IconGroup1 from '@/public/icons/group1.svg';
import IconWR from '@/public/icons/warning.svg';
import ArrowRightICon from '@/public/icons/arrow-right-icon.svg';
import ModalMembers from '../../../components/base/ModalMembers';
import { ChatItem, GroupConversation, MemberInfo } from '../../../types/Group';
import { User } from '../../../types/User';
import { Message } from '../../../types/Message';
import { getProxyUrl } from '../../../utils/utils';
import Image from 'next/image';
import { useChatInfoPopup } from '@/hooks/useChatInfoPopup';

interface ChatInfoPopupProps {
  currentUser: User;
  allUsers: User[];
  chatName?: string;
  onClose: () => void;
  onShowCreateGroup: () => void;
  selectedChat: ChatItem;
  isGroup: boolean;
  onMembersAdded: (users: User[]) => void;
  messages: Message[];
  members?: MemberInfo[];
  // 🔥 Thêm prop này để thực hiện chức năng "Nhảy tới tin nhắn"
  onJumpToMessage: (messageId: string) => void;
  onMemberRemoved?: (memberId: string, memberName: string) => void;
  onRoleChange?: (memberId: string, memberName: string, newRole: 'ADMIN' | 'MEMBER') => void;
  onChatAction: (roomId: string, actionType: 'pin' | 'hide', isChecked: boolean, isGroup: boolean) => void;
  reLoad?: () => void;
}

export default function ChatInfoPopup({
  messages,
  currentUser,
  allUsers,
  chatName,
  onClose,
  onShowCreateGroup,
  isGroup,
  selectedChat,
  onMembersAdded,
  members,
  onJumpToMessage,
  onMemberRemoved,
  onRoleChange,
  onChatAction,
  reLoad,
}: ChatInfoPopupProps) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [openMember, setOpenMember] = React.useState(false);
  const [groupAvatar, setGroupAvatar] = React.useState<string | undefined>(
    isGroup ? (selectedChat as GroupConversation).avatar : undefined,
  );
  const [groupName, setGroupName] = React.useState<string>(chatName || '');
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [renameInput, setRenameInput] = React.useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [previewMedia, setPreviewMedia] = React.useState<{ url: string; type: 'image' | 'video' } | null>(null);

  React.useEffect(() => {
    setGroupName(chatName || '');
  }, [chatName]);

  const handleChangeGroupAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isGroup) return;

    try {
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

  // 🔥 HELPER: Render Menu Dropdown (Dùng chung cho cả 3 loại)
  const renderMenu = (itemUrl: string, itemId: string, fileName?: string) => {
    if (activeMenuId !== itemId) return null;

    return (
      <>
        {/* Lớp phủ trong suốt để click ra ngoài thì đóng menu */}
        <div
          className="fixed inset-0 z-20 cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            closeMenu();
          }}
        ></div>

        {/* Dropdown Menu */}
        <div className="absolute top-8 right-0 z-30 w-40 bg-white rounded-md shadow-xl border border-gray-200 py-1 animate-in fade-in zoom-in duration-100 origin-top-right">
          {/* Option 1: Nhảy tới tin nhắn */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJumpToMessage(itemId);
              closeMenu();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-gray-500"
            >
              <path
                fillRule="evenodd"
                d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
                clipRule="evenodd"
              />
            </svg>
            Xem tin nhắn
          </button>

          {/* Option 2: Tải xuống */}
          <a
            href={itemUrl}
            download={fileName || 'download'}
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
            }}
            target="_blank"
            rel="noreferrer"
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-gray-500"
            >
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Tải xuống
          </a>
        </div>
      </>
    );
  };

  return (
    // <div className="fixed  inset-0 z-10 flex justify-end ">
    <div
      ref={popupRef}
      className="bg-white shadow-lg w-full sm:w-[350px] flex flex-col h-full overflow-y-auto relative"
    >
      {/* Header */}
      <div className="p-4 border-b-gray-200 border-b-[1px] flex justify-between items-center">
        <h2 className="text-xl font-bold text-black">Thông tin hội thoại</h2>
        {/* Nút đóng (Chỉ hiện trên mobile) */}
        <button onClick={onClose} className="sm:hidden p-2 hover:bg-gray-100 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6 text-gray-500"
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Nội dung popup */}
      <div className="space-y-6 bg-gray-200">
        {/* Tên chat & Chức năng (Giữ nguyên code cũ) */}
        <div className="space-y-6 bg-white w-full mb-2">
          <div className="flex flex-col items-center">
            {/* Avatar nhóm */}
            {isGroup && (
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
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-medium">
                    Đổi ảnh
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  className="hidden"
                  onChange={handleChangeGroupAvatar}
                />
                <p className="mt-2 text-xs text-gray-500">Ảnh đại diện nhóm</p>
              </div>
            )}

            {isGroup && (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-lg font-semibold text-black">{groupName}</p>
                <button
                  type="button"
                  className="bg-gray-200 rounded-full w-6 h-6 flex justify-center items-center cursor-pointer hover:bg-gray-300"
                  onClick={handleRenameGroup}
                  title="Đổi tên nhóm"
                >
                  <Image src={IconEdit} alt="edit" width={20} height={20} className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-around items-start text-center">
            {/* Ghim/Bỏ ghim */}
            <div className="flex flex-col items-center w-20">
              <div
                className={`rounded-full w-8 h-8 flex justify-center items-center cursor-pointer transition-colors ${
                  localIsPinned ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                onClick={() => handleChatActionClick('pin')}
              >
                <Image src={IconPin} alt="pin" width={20} height={20} className={localIsPinned ? 'rotate-45' : ''} />
              </div>
              <p
                className={`mt-2 text-xs text-center ${localIsPinned ? 'text-yellow-700 font-medium' : 'text-gray-700'}`}
              >
                {localIsPinned ? 'Bỏ Ghim' : 'Ghim Hội Thoại'}
              </p>
            </div>

            {/* Ẩn/Hiện trò chuyện */}
            <div className="flex flex-col items-center w-20">
              <div
                className={`rounded-full w-8 h-8 flex justify-center items-center cursor-pointer transition-colors ${
                  localIsHidden ? 'bg-red-100 text-red-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                onClick={() => handleChatActionClick('hide')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 9a3 3 0 00-3 3.75h6A3 3 0 0012 9z" />
                  <path
                    fillRule="evenodd"
                    d="M18.75 3a.75.75 0 00-.75.75v.5a.75.75 0 001.5 0v-.5A.75.75 0 0018.75 3zM12 2.25c-5.11 0-9.352 3.69-10.158 8.442a.75.75 0 000 1.516C2.648 18.06 6.89 21.75 12 21.75c5.11 0 9.352-3.69 10.158-8.442a.75.75 0 000-1.516C21.352 5.94 17.11 2.25 12 2.25zM4.755 12a7.5 7.5 0 0114.49 0 7.5 7.5 0 01-14.49 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className={`mt-2 text-xs text-center ${localIsHidden ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                {localIsHidden ? 'Hiện Trò Chuyện' : 'Ẩn Trò Chuyện'}
              </p>
            </div>

            {/* Tạo nhóm trò chuyện */}
            <div className="flex flex-col items-center w-20">
              <div
                onClick={() => {
                  onShowCreateGroup();
                  onClose();
                }}
                className="text-xs text-gray-700 break-words text-center cursor-pointer flex flex-col items-center w-20"
              >
                <div className="bg-gray-200 rounded-full w-8 h-8 flex justify-center items-center cursor-pointer mb-2">
                  <Image src={IconGroup} alt="group" width={20} height={20} />
                </div>
                Tạo nhóm trò chuyện
              </div>
            </div>
          </div>
        </div>

        {/* Thành viên nhóm (Giữ nguyên) */}
        {isGroup && (
          <div className="bg-white py-2 px-4 mb-2">
            <div className="font-semibold">Thành viên nhóm</div>
            <div className="flex items-center space-x-2">
              <div
                className="truncate hover:bg-gray-100 hover:cursor-pointer rounded-lg p-2"
                onClick={() => setOpenMember(true)}
              >
                <h1 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{groupName}</h1>
                <p className="text-xs text-gray-500 flex gap-2">
                  <Image src={IconGroup1} alt="" width={25} height={25} />
                  {isGroup ? `${(selectedChat as GroupConversation).members.length} thành viên` : 'Đang hoạt động'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Các mục: Danh sách nhắc hẹn, Ảnh/Video, File, Link */}
        <div className="space-y-3 text-gray-600 text-sm bg-white py-2 px-4 mb-2    ">
          <div className="flex items-center gap-2 cursor-pointer">
            <Image src={IconClock} alt="clock" width={20} height={20} className="w-5" />
            <span>Danh sách nhắc hẹn</span>
          </div>
        </div>

        {/* 1️⃣ ẢNH/VIDEO */}
        <div className="space-y-3 font-medium text-sm bg-white py-2 px-4 mb-2 ">
          <div className="space-y-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleItem('Ảnh/Video')}>
              <span>Ảnh/Video</span>
              <Image
                src={ArrowRightICon}
                alt=""
                width={30}
                height={30}
                className={`transition-transform duration-200 ${openItems['Ảnh/Video'] ? 'rotate-90' : ''}`}
              />
            </div>

            {openItems['Ảnh/Video'] && (
              <div className="mt-2 px-2">
                {mediaList && mediaList.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {mediaList.map((item, index) => (
                      <div
                        key={index}
                        // 🔥 Relative để định vị nút menu. KHÔNG overflow-hidden ở đây.
                        className="relative aspect-square cursor-pointer group"
                        onClick={() =>
                          setPreviewMedia({
                            url: getProxyUrl(item.url),
                            type: item.type === 'video' ? 'video' : 'image',
                          })
                        }
                      >
                        {/* Wrapper chứa ảnh/video mới có overflow-hidden */}
                        <div className="w-full h-full rounded-md overflow-hidden bg-gray-100">
                          {item.type === 'video' ? (
                            <>
                              <video
                                src={getProxyUrl(item.url)}
                                className="h-full w-full object-cover pointer-events-none"
                                muted
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-6 h-6 text-white"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </>
                          ) : (
                            <Image
                              src={getProxyUrl(item.url)}
                              alt="Media"
                              width={200}
                              height={200}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>

                        {/* 🔥 Nút "..." cho Ảnh/Video */}
                        <button
                          className={`absolute top-1 right-1 bg-white/80 hover:bg-white p-1 rounded-full shadow-sm transition-opacity z-10
                              ${activeMenuId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                          onClick={(e) => {
                            e.stopPropagation(); // Chặn mở ảnh
                            setActiveMenuId(activeMenuId === item.id ? null : item.id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-4 h-4 text-gray-700"
                          >
                            <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                          </svg>
                        </button>

                        {/* Render Menu */}
                        {renderMenu(item.url, item.id, item.fileName)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 ml-2">Chưa có Ảnh/Video được chia sẻ</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2️⃣ FILE */}
        <div className="space-y-3 font-medium text-sm bg-white py-2 px-4 mb-2 ">
          <div className="space-y-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleItem('File')}>
              <span>File</span>
              <Image
                src={ArrowRightICon}
                alt=""
                width={30}
                height={30}
                className={`transition-transform duration-200 ${openItems['File'] ? 'rotate-90' : ''}`}
              />
            </div>
            {openItems['File'] && (
              <div className="mt-2 px-2">
                {fileList && fileList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {fileList.map((file) => (
                      <div
                        key={file.id}
                        // Chuyển từ thẻ <a> sang <div> để dễ xử lý sự kiện click riêng biệt
                        className="relative flex items-center gap-3 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors group cursor-pointer"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5 text-blue-500"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                          </svg>
                        </div>

                        <div className="flex flex-col overflow-hidden flex-1">
                          <span className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600">
                            {file.fileName}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase">{file.fileName.split('.').pop()}</span>
                        </div>

                        {/* 🔥 Nút "..." cho File */}
                        <button
                          className={`p-1.5 rounded-full hover:bg-white text-gray-500 transition-opacity
                              ${activeMenuId === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === file.id ? null : file.id);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-5 h-5"
                          >
                            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                          </svg>
                        </button>

                        {renderMenu(file.url, file.id, file.fileName)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 ml-2">Chưa có File được chia sẻ</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 font-medium text-sm bg-white py-2 px-4 mb-2 ">
          {/* 3️⃣ LINK */}
          <div className="space-y-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleItem('Link')}>
              <span>Link</span>
              <Image
                src={ArrowRightICon}
                alt=""
                width={30}
                height={30}
                className={`transition-transform duration-200 ${openItems['Link'] ? 'rotate-90' : ''}`}
              />
            </div>
            {openItems['Link'] && (
              <div className="mt-2 px-2">
                {linkList && linkList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {linkList.map((link) => {
                      const href = link.url.startsWith('http') ? link.url : `https://${link.url}`;

                      return (
                        <div
                          key={link.id}
                          className="relative flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors group cursor-pointer"
                          onClick={() => window.open(href, '_blank')}
                        >
                          <div className="bg-gray-200 p-2 rounded-full shrink-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5 text-gray-600"
                            >
                              <path
                                fillRule="evenodd"
                                d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.035 6.037.75.75 0 01-.646 1.353 5.25 5.25 0 01-1.449-8.45l4.5-4.5a5.25 5.25 0 117.424 7.424l-1.757 1.757a.75.75 0 11-1.06-1.06l1.757-1.757a3.75 3.75 0 000-5.304zm-7.389 4.267a.75.75 0 011-.353 5.25 5.25 0 011.449 8.45l-4.5 4.5a5.25 5.25 0 11-7.424-7.424l1.757-1.757a.75.75 0 111.06 1.06l-1.757 1.757a3.75 3.75 0 105.304 5.304l4.5-4.5a3.75 3.75 0 00-1.035-6.037.75.75 0 01-.354-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>

                          <div className="flex flex-col overflow-hidden flex-1">
                            <span className="text-sm font-medium text-blue-600 truncate break-all group-hover:underline">
                              {link.url}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {(() => {
                                try {
                                  return new URL(href).hostname;
                                } catch {
                                  return 'Website';
                                }
                              })()}
                            </span>
                          </div>

                          {/* 🔥 Nút "..." cho Link */}
                          <button
                            className={`p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-opacity
                                ${activeMenuId === link.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                              `}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === link.id ? null : link.id);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                            </svg>
                          </button>

                          {renderMenu(link.url, link.id)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 ml-2">Chưa có Link được chia sẻ</p>
                )}
              </div>
            )}
          </div>
        </div>

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
        <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Đổi tên nhóm</h3>
            <p className="text-xs text-gray-500 mb-3">
              Nhập tên mới cho nhóm chat. Tên nhóm sẽ được cập nhật cho tất cả thành viên.
            </p>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmitRenameGroup();
                }
              }}
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 mb-4"
              placeholder="Nhập tên nhóm mới"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setIsRenameModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={!renameInput.trim()}
                onClick={() => void handleSubmitRenameGroup()}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMedia && (
        <div
          className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full px-4"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="absolute -top-2 right-4 text-white bg-black/60 hover:bg-black rounded-full p-1"
              onClick={() => setPreviewMedia(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="flex items-center justify-center max-h-[80vh]">
              {previewMedia.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewMedia.url}
                  alt="Xem ảnh"
                  className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <video src={previewMedia.url} controls autoPlay className="max-h-[80vh] w-full rounded-lg bg-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
