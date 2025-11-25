'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Message } from '@/types/Message';
import { isVideoFile } from '@/utils/utils';

const MESSAGE_SOUND_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3';

interface UseChatNotificationsOptions {
  chatName?: string;
}

export function useChatNotifications({ chatName }: UseChatNotificationsOptions) {
  const messageAudioRef = useRef<HTMLAudioElement | null>(null);

  const playMessageSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!messageAudioRef.current) {
        messageAudioRef.current = new Audio(MESSAGE_SOUND_URL);
      }
      const audio = messageAudioRef.current;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // ignore autoplay errors
      });
    } catch {
      // ignore
    }
  }, []);

  const showMessageNotification = useCallback(
    (msg: Message) => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;

      // Nếu chưa xin quyền, xin ngay lúc nhận tin nhắn
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(chatName || 'Tin nhắn mới', {
              body:
                msg.content ||
                (msg.type === 'image'
                  ? 'Đã gửi cho bạn một ảnh.'
                  : msg.type === 'video' || isVideoFile(msg.fileName)
                    ? 'Đã gửi cho bạn một video.'
                    : msg.type === 'file'
                      ? 'Đã gửi cho bạn một file.'
                      : 'Bạn có tin nhắn mới.'),
            });
          }
        });
        return;
      }

      if (Notification.permission !== 'granted') return;

      const body =
        msg.content ||
        (msg.type === 'image'
          ? 'Đã gửi cho bạn một ảnh.'
          : msg.type === 'video' || isVideoFile(msg.fileName)
            ? 'Đã gửi cho bạn một video.'
            : msg.type === 'file'
              ? 'Đã gửi cho bạn một file.'
              : 'Bạn có tin nhắn mới.');

      new Notification(chatName || 'Tin nhắn mới', {
        body,
      });
    },
    [chatName],
  );

  // Xin quyền thông báo 1 lần khi mở cửa sổ chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // ignore
      });
    }
  }, []);

  // Khởi tạo audio sau lần click đầu tiên (để tránh bị chặn autoplay)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initAudio = () => {
      if (!messageAudioRef.current) {
        messageAudioRef.current = new Audio(MESSAGE_SOUND_URL);
      }
      window.removeEventListener('click', initAudio);
    };

    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  return {
    playMessageSound,
    showMessageNotification,
  };
}


