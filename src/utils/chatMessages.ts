import type { Message } from '@/types/Message';

export const groupMessagesByDate = (msgs: Message[]) => {
  const groups = new Map<string, Message[]>();
  const seen = new Set<string>();
  msgs.forEach((msg) => {
    const id = String(msg._id);
    if (seen.has(id)) return;
    seen.add(id);
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


