import { NextRequest, NextResponse } from 'next/server';
import { addRow, getAllRows, getRowByIdOrCode, updateByField, deleteById, getCollection } from '@/lib/mongoDBCRUD';
import { ObjectId } from 'mongodb';

const POSTS_COLLECTION_NAME = 'Posts';

export interface PostDoc {
  [key: string]: unknown;
  _id?: string | ObjectId;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  videos?: string[];
  files?: string[];
  createdAt: number;
  likedBy?: string[];
  commentsCount?: number;
  visibility?: 'public' | 'friends' | 'private';
}

export async function POST(req: NextRequest) {
  const {
    action,
    collectionName = POSTS_COLLECTION_NAME,
    data,
    filters,
    field,
    value,
    skip,
    limit,
    sort,
    postId,
    userId,
  } = await req.json();

  try {
    switch (action) {
      case 'create': {
        const payload = data as Partial<PostDoc> | undefined;
        if (!payload || !payload.authorId || !payload.content) {
          return NextResponse.json({ error: 'Missing authorId or content' }, { status: 400 });
        }
        const newData: PostDoc = {
          authorId: String(payload.authorId),
          authorName: payload.authorName ? String(payload.authorName) : undefined,
          authorAvatar: payload.authorAvatar ? String(payload.authorAvatar) : undefined,
          content: String(payload.content || ''),
          images: Array.isArray(payload.images) ? payload.images.map(String) : undefined,
          videos: Array.isArray(payload.videos) ? payload.videos.map(String) : undefined,
          files: Array.isArray(payload.files) ? payload.files.map(String) : undefined,
          createdAt: Date.now(),
          likedBy: [],
          commentsCount: 0,
          visibility: payload.visibility || 'public',
        };
        const newId = await addRow<PostDoc>(collectionName, newData);
        return NextResponse.json({ success: true, _id: newId });
      }

      case 'read': {
        const result = await getAllRows<PostDoc>(collectionName, {
          filters: filters || {},
          skip: typeof skip === 'number' ? skip : 0,
          limit: typeof limit === 'number' ? limit : 20,
          sort: sort || { field: 'createdAt', order: 'desc' },
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'getById': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        if (!idStr) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
        const row = await getRowByIdOrCode<PostDoc>(collectionName, { _id: idStr });
        return NextResponse.json(row);
      }

      case 'update': {
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
        }
        const key = String(field) as keyof PostDoc;
        const val: string | number =
          typeof value === 'string' || typeof value === 'number' ? (value as string | number) : String(value);
        const ok = await updateByField<PostDoc>(collectionName, key, val, data as Partial<PostDoc>);
        return NextResponse.json({ success: ok });
      }

      case 'delete': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        if (!idStr) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
        const ok = await deleteById(collectionName, idStr);
        return NextResponse.json({ success: ok });
      }

      case 'toggleLike': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        const uid = typeof userId === 'string' ? userId : String((data && data.userId) || '');
        const like = !!(data && (data.like === true || data.like === 'true'));
        if (!idStr || !uid) return NextResponse.json({ error: 'Missing postId or userId' }, { status: 400 });
        const collection = await getCollection<PostDoc>(collectionName);
        const updateDoc = like ? { $addToSet: { likedBy: uid } } : { $pull: { likedBy: uid } };
        const filter = ObjectId.isValid(idStr) ? { _id: new ObjectId(idStr) } : { _id: idStr };
        const result = await collection.updateOne(
          filter,
          updateDoc as unknown as Parameters<typeof collection.updateOne>[1],
        );
        return NextResponse.json({ success: result.modifiedCount > 0 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const skip = Number(url.searchParams.get('skip') || 0);
  const limit = Number(url.searchParams.get('limit') || 20);
  const authorId = url.searchParams.get('authorId') || undefined;
  const visibility = url.searchParams.get('visibility') || undefined;
  const beforeStr = url.searchParams.get('before') || undefined;
  const afterStr = url.searchParams.get('after') || undefined;
  const likedBy = url.searchParams.get('likedBy') || undefined;
  const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;

  const filters: Record<string, unknown> = {};
  if (authorId) filters.authorId = authorId;
  if (visibility) filters.visibility = visibility;
  if (likedBy) filters.likedBy = { $in: [likedBy] };
  const range: Record<string, number> = {};
  if (beforeStr && !Number.isNaN(Number(beforeStr))) range.$lt = Number(beforeStr);
  if (afterStr && !Number.isNaN(Number(afterStr))) range.$gt = Number(afterStr);
  if (Object.keys(range).length) filters.createdAt = range;

  const result = await getAllRows<PostDoc>(POSTS_COLLECTION_NAME, {
    filters,
    skip,
    limit,
    sort: { field: 'createdAt', order: 'desc' },
    search: search || undefined,
  });
  return NextResponse.json({ success: true, ...result });
}
