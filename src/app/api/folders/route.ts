import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongoDBCRUD';

const CHAT_FOLDERS_COLLECTION = 'ChatFolders';

type FolderNode = { id: string; name: string; children: FolderNode[] };
type ItemsMap = Record<string, Array<{ id: string; content: string }>>;
type ChatFoldersDoc = {
  _id?: string;
  roomId: string;
  folders: FolderNode[];
  itemsMap: ItemsMap;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '').trim();
    const roomId = String(body.roomId || '').trim();

    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

    const collection = await getCollection<ChatFoldersDoc>(CHAT_FOLDERS_COLLECTION);

    switch (action) {
      case 'read': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const row = await collection.findOne({ roomId });
        if (!row) return NextResponse.json({ success: true, data: { roomId, folders: [], itemsMap: {} } });
        return NextResponse.json({ success: true, data: row });
      }
      case 'saveItem': {
        const folderId = String(body.folderId || '').trim();
        const messageId = String(body.messageId || '').trim();
        const preview = String(body.preview || '').trim();
        if (!roomId || !folderId || !messageId)
          return NextResponse.json({ error: 'Missing roomId, folderId or messageId' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const itemsMap: ItemsMap = existing?.itemsMap || {};
        const arr = Array.isArray(itemsMap[folderId]) ? itemsMap[folderId] : [];
        if (!arr.some((x) => String(x.id) === messageId)) arr.push({ id: messageId, content: preview });
        itemsMap[folderId] = arr;

        if (!existing) {
          await collection.insertOne({ roomId, folders: [], itemsMap });
        } else {
          await collection.updateOne({ roomId }, { $set: { itemsMap } });
        }
        return NextResponse.json({ success: true });
      }
      case 'removeItem': {
        const folderId = String(body.folderId || '').trim();
        const messageId = String(body.messageId || '').trim();
        if (!roomId || !folderId || !messageId)
          return NextResponse.json({ error: 'Missing roomId, folderId or messageId' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const itemsMap: ItemsMap = existing?.itemsMap || {};
        const arr = Array.isArray(itemsMap[folderId]) ? itemsMap[folderId] : [];
        itemsMap[folderId] = arr.filter((x) => String(x.id) !== messageId);

        if (!existing) {
          await collection.insertOne({ roomId, folders: [], itemsMap });
        } else {
          await collection.updateOne({ roomId }, { $set: { itemsMap } });
        }
        return NextResponse.json({ success: true });
      }
      case 'updateTree': {
        const folders: FolderNode[] = Array.isArray(body.folders) ? (body.folders as FolderNode[]) : [];
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const existing = await collection.findOne({ roomId });
        if (!existing) {
          await collection.insertOne({ roomId, folders, itemsMap: {} });
        } else {
          await collection.updateOne({ roomId }, { $set: { folders } });
        }
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

