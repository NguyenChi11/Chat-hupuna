'use client';

import type { Message, MessageCreate } from '@/types/Message';

interface MessagesApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  _id?: string;
  message?: string;
}

export async function createMessageApi(payload: MessageCreate & { roomId: string }): Promise<MessagesApiResponse> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      data: payload,
    }),
  });
  return res.json();
}

export async function readMessagesApi(
  roomId: string,
  options?: { skip?: number; limit?: number; before?: number; sortOrder?: 'asc' | 'desc'; extraFilters?: Record<string, unknown> },
): Promise<MessagesApiResponse<Message[]>> {
  const filters: Record<string, unknown> = { roomId, ...(options?.extraFilters || {}) };
  if (typeof options?.before === 'number') {
    filters.timestamp = { $lt: options.before };
  }
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'read',
      filters,
      skip: options?.skip ?? 0,
      limit: options?.limit ?? 20,
      sort: { field: 'timestamp', order: options?.sortOrder ?? 'desc' },
    }),
  });
  return res.json();
}

export async function readPinnedMessagesApi(roomId: string): Promise<MessagesApiResponse<Message[]>> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'read',
      filters: { roomId, isPinned: true },
      sort: { field: 'timestamp', order: 'desc' },
    }),
  });
  return res.json();
}

export async function togglePinMessageApi(messageId: string, isPinned: boolean): Promise<MessagesApiResponse> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'togglePin',
      messageId,
      data: { isPinned },
    }),
  });
  return res.json();
}

export async function recallMessageApi(roomId: string, messageId: string): Promise<MessagesApiResponse> {
  const res = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'recall',
      messageId,
      roomId,
    }),
  });
  return res.json();
}

export async function markAsReadApi(roomId: string, userId: string): Promise<void> {
  await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'markAsRead',
      roomId,
      userId,
    }),
  });
}
