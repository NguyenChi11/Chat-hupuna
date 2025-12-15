export type Scope = 'room' | 'global';

export type FolderItem = {
  id: string;
  content?: string;
  type?: 'image' | 'video' | 'file' | 'text';
  fileUrl?: string;
  fileName?: string;
  name?: string;
  keywords?: string[];
};

export type FolderNode = {
  id: string;
  name: string;
  parentId?: string;
  children: FolderNode[];
};
