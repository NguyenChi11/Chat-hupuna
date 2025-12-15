'use client';

export type ChatFlashTopic = { id: string; name: string };

export type ChatFlashItem = {
  id: string;
  content?: string;
  type?: 'image' | 'video' | 'file' | 'text';
  fileUrl?: string;
  fileName?: string;
};
