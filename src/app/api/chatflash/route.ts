import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongoDBCRUD';

const CHAT_FLASH_COLLECTION = 'ChatFlash';

type Folder = { id: string; name: string };
type KVItem = { key: string; value: string };
type ItemsMap = Record<string, KVItem[]>;
type ChatFlashDoc = {
  _id?: string;
  roomId: string;
  folders: Folder[];
  itemsMap: ItemsMap;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '').trim();
    const roomId = String(body.roomId || '').trim();

    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

    const collection = await getCollection<ChatFlashDoc>(CHAT_FLASH_COLLECTION);

    switch (action) {
      case 'read': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const row = await collection.findOne({ roomId });
        if (!row) return NextResponse.json({ success: true, data: { roomId, folders: [], itemsMap: {} } });
        return NextResponse.json({ success: true, data: row });
      }
      case 'createFolder': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const name = String(body.name || '').trim();
        if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const nextFolders = [...(existing?.folders || []), { id, name }];
        const nextItemsMap: ItemsMap = existing?.itemsMap || {};

        if (!existing) {
          await collection.insertOne({ roomId, folders: nextFolders, itemsMap: nextItemsMap });
        } else {
          await collection.updateOne({ roomId }, { $set: { folders: nextFolders } });
        }
        return NextResponse.json({ success: true, folder: { id, name } });
      }
      case 'renameFolder': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const folderId = String(body.folderId || '').trim();
        const name = String(body.name || '').trim();
        if (!folderId || !name) return NextResponse.json({ error: 'Missing folderId or name' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const folders = (existing?.folders || []).map((f) => (f.id === folderId ? { ...f, name } : f));

        if (!existing) {
          await collection.insertOne({ roomId, folders, itemsMap: {} });
        } else {
          await collection.updateOne({ roomId }, { $set: { folders } });
        }
        return NextResponse.json({ success: true });
      }
      case 'deleteFolder': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const folderId = String(body.folderId || '').trim();
        if (!folderId) return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const folders = (existing?.folders || []).filter((f) => f.id !== folderId);
        const itemsMap: ItemsMap = existing?.itemsMap || {};
        if (itemsMap[folderId]) delete itemsMap[folderId];

        if (!existing) {
          await collection.insertOne({ roomId, folders, itemsMap });
        } else {
          await collection.updateOne({ roomId }, { $set: { folders, itemsMap } });
        }
        return NextResponse.json({ success: true });
      }
      case 'listKV': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const folderId = String(body.folderId || '').trim();
        if (!folderId) return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const arr = existing?.itemsMap?.[folderId] || [];
        return NextResponse.json({ success: true, items: arr });
      }
      case 'upsertKV': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const folderId = String(body.folderId || '').trim();
        const key = String(body.key || '').trim();
        const value = String(body.value || '').trim();
        if (!folderId || !key) return NextResponse.json({ error: 'Missing folderId or key' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const itemsMap: ItemsMap = existing?.itemsMap || {};
        const arr = Array.isArray(itemsMap[folderId]) ? itemsMap[folderId] : [];
        const idx = arr.findIndex((x) => x.key === key);
        if (idx >= 0) arr[idx] = { key, value };
        else arr.push({ key, value });
        itemsMap[folderId] = arr;

        if (!existing) {
          await collection.insertOne({ roomId, folders: [], itemsMap });
        } else {
          await collection.updateOne({ roomId }, { $set: { itemsMap } });
        }
        return NextResponse.json({ success: true });
      }
      case 'deleteKV': {
        if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
        const folderId = String(body.folderId || '').trim();
        const key = String(body.key || '').trim();
        if (!folderId || !key) return NextResponse.json({ error: 'Missing folderId or key' }, { status: 400 });

        const existing = await collection.findOne({ roomId });
        const itemsMap: ItemsMap = existing?.itemsMap || {};
        const arr = Array.isArray(itemsMap[folderId]) ? itemsMap[folderId] : [];
        itemsMap[folderId] = arr.filter((x) => x.key !== key);

        if (!existing) {
          await collection.insertOne({ roomId, folders: [], itemsMap });
        } else {
          await collection.updateOne({ roomId }, { $set: { itemsMap } });
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
