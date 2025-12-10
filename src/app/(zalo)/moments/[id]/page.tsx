import PostCard from '@/components/(memonts)/PostCard';
import Link from 'next/link';

function toMegaStream(url: string) {
  return url.startsWith('https://mega.nz/') ? `/api/mega-stream?url=${encodeURIComponent(url)}` : url;
}

type FeedPost = {
  id: string;
  author: { id: string; name: string; avatar?: string };
  content: string;
  images?: string[];
  videos?: string[];
  files?: string[];
  createdAt: number;
  likes: number;
  comments: number;
  liked?: boolean;
};

export default async function MomentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getById', postId: id }),
    cache: 'no-store',
  });
  const d = await res.json();
  const row = d && d.row ? d.row : d;

  let post: FeedPost | null = null;
  if (row && (row._id || row.id)) {
    const src = row;
    post = {
      id: String(src._id ?? src.id),
      author: {
        id: String(src.authorId ?? ''),
        name: String(src.authorName || ''),
        avatar: src.authorAvatar ? toMegaStream(String(src.authorAvatar)) : undefined,
      },
      content: String(src.content || ''),
      images: Array.isArray(src.images) ? src.images.map((x: string) => toMegaStream(x)) : [],
      videos: Array.isArray(src.videos) ? src.videos.map((x: string) => toMegaStream(x)) : [],
      files: Array.isArray(src.files) ? src.files.map((x: string) => toMegaStream(x)) : [],
      createdAt: Number(src.createdAt || Date.now()),
      likes: Array.isArray(src.likedBy) ? src.likedBy.length : 0,
      comments: Number(src.commentsCount || 0),
      liked: false,
    };
  }

  const shareUrl = `/moments/${id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/moments" className="px-3 py-2 rounded-xl bg-gray-100">
            Quay lại
          </Link>
          <Link href={shareUrl} className="text-blue-600">
            {shareUrl}
          </Link>
        </div>
        {!post && <div>Không tìm thấy bài viết</div>}
        {post && <PostCard post={post} onLike={() => {}} />}
      </div>
    </div>
  );
}
