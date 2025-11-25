import type { Message } from '@/types/Message';

export const groupMessagesByDate = (msgs: Message[]) => {
  const groups = new Map<string, Message[]>();
  msgs.forEach((msg) => {
    const dateKey = new Date(msg.timestamp).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(msg);
  });
  return groups;
};


