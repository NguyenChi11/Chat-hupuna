'use client';

import { useCallback, useState } from 'react';
import { Message, MessageCreate, MessageType } from '@/types/Message';
import { ChatItem, GroupConversation } from '@/types/Group';
import { User } from '@/types/User';
import { uploadFileWithProgress, type UploadResponse } from '@/utils/uploadHelper';

interface UseChatUploadParams {
  roomId: string;
  currentUser: User;
  selectedChat: ChatItem;
  isGroup: boolean;
  sendMessageProcess: (msgData: MessageCreate) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onScrollBottom?: () => void;
}

export function useChatUpload({
  roomId,
  currentUser,
  selectedChat,
  isGroup,
  sendMessageProcess,
  setMessages,
  onScrollBottom,
}: UseChatUploadParams) {
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});

  const handleUploadAndSend = useCallback(
    async (file: File, type: MessageType, caption?: string, replyToMessageId?: string, mentions?: string[]) => {
      const sanitizeName = (name: string) => {
        return name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '');
      };

      const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempId = `temp_${Date.now()}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      formData.append('sender', currentUser._id);
      if (!isGroup && '_id' in selectedChat) {
        formData.append('receiver', selectedChat._id);
      }
      formData.append('type', type);
      formData.append('fileName', file.name);

      let folderNameStr = '';
      if (isGroup) {
        folderNameStr = `Group__${sanitizeName((selectedChat as GroupConversation).name)}`;
      } else {
        const myName = sanitizeName(currentUser.name || 'Me');
        const partnerBaseName = '_id' in selectedChat && 'name' in selectedChat ? selectedChat.name || 'User' : 'User';
        const partnerName = sanitizeName(partnerBaseName);
        const names = [myName, partnerName].sort();
        folderNameStr = `${names[0]}__${names[1]}`;
      }
      formData.append('folderName', folderNameStr);

      const tempMsg: Message & { isSending?: boolean } = {
        _id: tempId,
        roomId,
        sender: currentUser._id,
        senderModel: currentUser,
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        type,
        timestamp: Date.now(),
        content: caption,
        isSending: true,
      };

      setMessages((prev) => [...prev, tempMsg]);
      setUploadingFiles((prev) => ({ ...prev, [tempId]: 0 }));
      try {
        onScrollBottom?.();
      } catch {}

      let success = false;
      let lastMessage = '';
      for (let attempt = 0; attempt < 2 && !success; attempt++) {
        try {
          const res = (await uploadFileWithProgress(
            `/api/upload?uploadId=${uploadId}`,
            formData,
            (clientRawPercent) => {
              const displayed = Math.min(clientRawPercent, 95);
              setUploadingFiles((prev) => ({ ...prev, [tempId]: displayed }));
            },
          )) as UploadResponse;

          if (res.success) {
            success = true;
            const finalMsg = res.data;

            setMessages((prev) => prev.filter((m) => m._id !== tempId));

            const socketData: MessageCreate = {
              ...finalMsg,
              _id: res.data._id || Date.now().toString(),
              roomId,
              sender: currentUser._id,
              senderName: currentUser.name,
              isGroup,
              receiver: isGroup ? null : '_id' in selectedChat ? selectedChat._id : '',
              members: isGroup ? (selectedChat as GroupConversation).members : [],
              type,
              timestamp: Date.now(),
              content: caption,
              replyToMessageId,
              mentions,
            } as unknown as MessageCreate;

            await sendMessageProcess(socketData);
          } else {
            lastMessage = res.message || 'Không xác định';
          }
        } catch (e) {
          lastMessage = (e as Error)?.message || 'Không xác định';
        }
      }

      if (!success) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        try {
          alert(`Tải lên thất bại: ${file.name}. Lý do: ${lastMessage}`);
        } catch {}
      }

      setUploadingFiles((prev) => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });
    },
    [roomId, currentUser, isGroup, selectedChat, sendMessageProcess, setMessages, onScrollBottom],
  );

  return {
    uploadingFiles,
    handleUploadAndSend,
  };
}
