import { NextRequest, NextResponse } from 'next/server';
import { addRow, getAllRows, getRowByIdOrCode, updateByField, deleteById, getCollection } from '@/lib/mongoDBCRUD';
import { ObjectId, Document } from 'mongodb';

const POSTS_COLLECTION_NAME = 'Posts';

export interface PostDoc {
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

export interface PostCommentDoc {
  _id?: string | ObjectId;
  postId: string;
  userId: string;
  username?: string;
  avatar?: string;
  content: string;
  createdAt: number;
  parentId?: string;
  reactions?: Record<string, string[]>;
}

/* -------------------------------------------------------------------------- */
/*                               POST HANDLERS                                */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const body = await req.json();
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
  } = body;

  try {
    switch (action) {
      /* ------------------------------- CREATE POST ------------------------------- */
      case 'create': {
        const payload = data as Partial<PostDoc>;

        if (!payload?.authorId || !payload?.content) {
          return NextResponse.json({ error: 'Missing authorId or content' }, { status: 400 });
        }

        const newData: PostDoc = {
          authorId: String(payload.authorId),
          authorName: payload.authorName ? String(payload.authorName) : undefined,
          authorAvatar: payload.authorAvatar ? String(payload.authorAvatar) : undefined,
          content: String(payload.content || ''),
          images: Array.isArray(payload.images) ? payload.images.map(String) : [],
          videos: Array.isArray(payload.videos) ? payload.videos.map(String) : [],
          files: Array.isArray(payload.files) ? payload.files.map(String) : [],
          createdAt: Date.now(),
          likedBy: [],
          commentsCount: 0,
          visibility: payload.visibility || 'public',
        };

        const newId = await addRow(collectionName, newData as PostDoc & Record<string, unknown>);
        return NextResponse.json({ success: true, _id: newId });
      }

      /* ------------------------------- READ POSTS ------------------------------- */
      case 'read': {
        const result = await getAllRows<PostDoc & Record<string, unknown>>(collectionName, {
          filters: filters || {},
          skip: typeof skip === 'number' ? skip : 0,
          limit: typeof limit === 'number' ? limit : 20,
          sort: sort || { field: 'createdAt', order: 'desc' },
        });

        return NextResponse.json({ success: true, ...result });
      }

      /* ------------------------------ GET BY ID ------------------------------ */
      case 'getById': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        if (!idStr) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

        const row = await getRowByIdOrCode<PostDoc & Record<string, unknown>>(collectionName, { _id: idStr });
        return NextResponse.json(row);
      }

      /* ------------------------------- UPDATE POST ------------------------------- */
      case 'update': {
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
        }

        const key = String(field) as keyof PostDoc;
        const val = typeof value === 'string' || typeof value === 'number' ? value : String(value);

        const ok = await updateByField<PostDoc & Record<string, unknown>>(
          collectionName,
          key,
          val,
          data as Partial<PostDoc>,
        );
        return NextResponse.json({ success: ok });
      }

      /* ------------------------------ DELETE POST ------------------------------ */
      case 'delete': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        if (!idStr) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

        const ok = await deleteById(collectionName, idStr);
        return NextResponse.json({ success: ok });
      }

      /* ----------------------------- TOGGLE LIKE ----------------------------- */
      case 'toggleLike': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        const uid = typeof userId === 'string' ? userId : String(data?.userId || '');
        const like = !!(data && (data.like === true || data.like === 'true'));

        if (!idStr || !uid) {
          return NextResponse.json({ error: 'Missing postId or userId' }, { status: 400 });
        }

        const collection = await getCollection<PostDoc & Record<string, unknown>>(collectionName);

        const updatePipeline: Document[] = like
          ? [
              {
                $set: {
                  likedBy: {
                    $cond: [
                      { $in: [uid, { $ifNull: ['$likedBy', []] }] },
                      { $ifNull: ['$likedBy', []] },
                      { $concatArrays: [{ $ifNull: ['$likedBy', []] }, [uid]] },
                    ],
                  },
                },
              },
            ]
          : [
              {
                $set: {
                  likedBy: {
                    $filter: {
                      input: { $ifNull: ['$likedBy', []] },
                      cond: { $ne: ['$$this', uid] },
                    },
                  },
                },
              },
            ];

        const filter = ObjectId.isValid(idStr) ? { _id: new ObjectId(idStr) } : { _id: idStr };

        const result = await collection.updateOne(filter, updatePipeline);

        return NextResponse.json({ success: result.modifiedCount > 0 });
      }

      case 'addComment': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        const payload = data as Partial<PostCommentDoc>;
        if (!idStr || !payload?.userId || !payload?.content) {
          return NextResponse.json({ error: 'Missing postId, userId or content' }, { status: 400 });
        }

        const newData: PostCommentDoc = {
          postId: String(idStr),
          userId: String(payload.userId),
          username: payload.username ? String(payload.username) : undefined,
          avatar: payload.avatar ? String(payload.avatar) : undefined,
          content: String(payload.content || ''),
          createdAt: Date.now(),
          parentId: payload.parentId ? String(payload.parentId) : undefined,
          reactions: {},
        };

        const newId = await addRow<PostCommentDoc & Record<string, unknown>>(
          'PostComments',
          newData as PostCommentDoc & Record<string, unknown>,
        );

        const posts = await getCollection<PostDoc & Record<string, unknown>>(collectionName);
        const filter = ObjectId.isValid(idStr) ? { _id: new ObjectId(idStr) } : { _id: idStr };
        const pipeline: Document[] = [
          {
            $set: {
              commentsCount: { $add: [{ $ifNull: ['$commentsCount', 0] }, 1] },
            },
          },
        ];
        await posts.updateOne(filter, pipeline);

        return NextResponse.json({ success: true, _id: newId });
      }

      case 'readComments': {
        const idStr = typeof postId === 'string' ? postId : String(value || '');
        const skipNum = typeof skip === 'number' ? skip : 0;
        const limitNum = typeof limit === 'number' ? limit : 50;
        if (!idStr) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

        const result = await getAllRows<PostCommentDoc & Record<string, unknown>>('PostComments', {
          filters: { postId: String(idStr) },
          skip: skipNum,
          limit: limitNum,
          sort: sort || { field: 'createdAt', order: 'asc' },
        });
        return NextResponse.json({ success: true, ...result });
      }

      case 'toggleCommentReaction': {
        const commentId = typeof body.commentId === 'string' ? body.commentId : String(body.commentId || '');
        const uid = typeof userId === 'string' ? userId : String(body?.userId || body?.data?.userId || '');
        const emoji = String(body?.emoji || body?.data?.emoji || '');
        const like = !!(body && (body.like === true || body.like === 'true' || body?.data?.like === true));

        if (!commentId || !uid || !emoji) {
          return NextResponse.json({ error: 'Missing commentId, userId or emoji' }, { status: 400 });
        }

        const comments = await getCollection<PostCommentDoc & Record<string, unknown>>('PostComments');
        const filter = ObjectId.isValid(commentId) ? { _id: new ObjectId(commentId) } : { _id: commentId };
        const doc = await comments.findOne(filter);
        const existing: Record<string, string[]> = (doc?.reactions as Record<string, string[]>) || {};

        const arr = Array.isArray(existing[emoji]) ? existing[emoji] : [];
        const set = new Set(arr);
        if (like) set.add(uid);
        else set.delete(uid);
        const next = { ...existing, [emoji]: Array.from(set) };
        await comments.updateOne(filter, { $set: { reactions: next } });
        return NextResponse.json({ success: true, reactions: next });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('POST /posts error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                                GET HANDLER                                 */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  const skip = Number(url.searchParams.get('skip') || 0);
  const limit = Number(url.searchParams.get('limit') || 20);

  const authorId = url.searchParams.get('authorId') || undefined;
  const visibility = url.searchParams.get('visibility') || undefined;
  const likedBy = url.searchParams.get('likedBy') || undefined;

  const beforeStr = url.searchParams.get('before') || undefined;
  const afterStr = url.searchParams.get('after') || undefined;

  const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;

  const filters: Record<string, unknown> = {};

  if (authorId) filters.authorId = authorId;
  if (visibility) filters.visibility = visibility;

  if (likedBy) {
    filters.likedBy = { $in: [likedBy] };
  }

  const range: Record<string, number> = {};

  if (beforeStr && !isNaN(Number(beforeStr))) range.$lt = Number(beforeStr);
  if (afterStr && !isNaN(Number(afterStr))) range.$gt = Number(afterStr);

  if (Object.keys(range).length) {
    filters.createdAt = range;
  }

  const result = await getAllRows<PostDoc & Record<string, unknown>>(POSTS_COLLECTION_NAME, {
    filters,
    skip,
    limit,
    sort: { field: 'createdAt', order: 'desc' },
    search: search || undefined,
  });

  return NextResponse.json({ success: true, ...result });
}
