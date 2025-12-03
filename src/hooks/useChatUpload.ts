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
}

export function useChatUpload({
  roomId,
  currentUser,
  selectedChat,
  isGroup,
  sendMessageProcess,
  setMessages,
}: UseChatUploadParams) {
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});

  const handleUploadAndSend = useCallback(
    async (file: File, type: MessageType) => {
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
        isSending: true,
      };

      setMessages((prev) => [...prev, tempMsg]);
      setUploadingFiles((prev) => ({ ...prev, [tempId]: 0 }));

      const sseUrl = `/api/upload/progress?id=${uploadId}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const serverRawPercent = data.percent;

          if (serverRawPercent < 0 || data.done === true) {
            eventSource.close();
            return;
          }
          if (serverRawPercent >= 0) {
            setUploadingFiles((prev) => {
              const current = prev[tempId] || 0;
              return { ...prev, [tempId]: Math.max(current, serverRawPercent) };
            });

            if (serverRawPercent >= 100) {
              eventSource.close();
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      try {
        const res = (await uploadFileWithProgress(`/api/upload?uploadId=${uploadId}`, formData, (clientRawPercent) => {
          const displayed = Math.min(clientRawPercent, 95);
          setUploadingFiles((prev) => ({ ...prev, [tempId]: displayed }));
        })) as UploadResponse;

        if (res.success) {
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
          } as unknown as MessageCreate;

          await sendMessageProcess(socketData);
        } else {
          const notify: MessageCreate = {
            roomId,
            sender: currentUser._id,
            content: `Tải lên thất bại: ${file.name}. Lý do: ${res.message || 'Không xác định'}`,
            type: 'notify',
            timestamp: Date.now(),
          };
          await sendMessageProcess(notify);
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
      } catch {
        const notify: MessageCreate = {
          roomId,
          sender: currentUser._id,
          content: `Tải lên thất bại: ${file.name}. Vui lòng thử lại`,
          type: 'notify',
          timestamp: Date.now(),
        };
        await sendMessageProcess(notify);
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      } finally {
        eventSource.close();
        setUploadingFiles((prev) => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }
    },
    [roomId, currentUser, isGroup, selectedChat, sendMessageProcess, setMessages],
  );

  return {
    uploadingFiles,
    handleUploadAndSend,
  };
}
