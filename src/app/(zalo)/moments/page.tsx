'use client';

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { formatTimeAgo } from '@/utils/dateUtils';
import { HiPhoto, HiHandThumbUp, HiChatBubbleLeftRight, HiArrowUpTray, HiEllipsisHorizontal } from 'react-icons/hi2';
import { useCurrentUser } from '@/hooks/(profile)/useCurrentUser';
import { getProxyUrl } from '@/utils/utils';
const DEFAULT_AVATAR = 'https://cdn.jsdelivr.net/gh/encharm/Font-Awesome-SVG-PNG/black/png/64/user.png';
const toMegaStream = (url: string) =>
  url.startsWith('https://mega.nz/') ? `/api/mega-stream?url=${encodeURIComponent(url)}` : url;

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

function PostComposer({
  onPost,
  author,
}: {
  onPost: (
    p: Omit<FeedPost, 'id' | 'likes' | 'comments' | 'createdAt'> & {
      images?: string[];
      videos?: string[];
      files?: string[];
    },
  ) => void;
  author: { id: string; name: string; avatar?: string } | null;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const mediaRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);
  const canPost = text.trim().length > 0 || images.length > 0 || videos.length > 0 || files.length > 0;

  const handlePickMedia = () => {
    mediaRef.current?.click();
  };

  const handleMediaFiles = (fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const arr = Array.from(fl).slice(0, 4);
    const imgUrls: string[] = [];
    const vidUrls: string[] = [];
    arr.forEach((f) => {
      const url = URL.createObjectURL(f);
      if (f.type.startsWith('image/')) imgUrls.push(url);
      else if (f.type.startsWith('video/')) vidUrls.push(url);
    });
    setImages((prev) => [...prev, ...imgUrls].slice(0, 4));
    setVideos((prev) => [...prev, ...vidUrls].slice(0, 4));
  };

  const handleDocFiles = (fl: FileList | null) => {
    if (!fl || fl.length === 0) return;
    const arr = Array.from(fl).slice(0, 4);
    const urls = arr.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...urls].slice(0, 4));
  };

  const handleSubmit = () => {
    if (!canPost) return;
    const a = author ?? { id: 'me', name: 'Bạn', avatar: DEFAULT_AVATAR };
    onPost({ author: a, content: text.trim(), images, videos, files });
    setText('');
    setImages([]);
    setVideos([]);
    setFiles([]);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
          <Image src={author?.avatar || DEFAULT_AVATAR} alt="avatar" width={40} height={40} unoptimized />
          {author?.avatar ? (
            <Image
              src={getProxyUrl(author.avatar)}
              alt=""
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
              {author?.name?.charAt(0).toUpperCase() || 'B'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bạn đang nghĩ gì?"
            className="w-full resize-none bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            rows={3}
          />
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden">
                  <img src={src} alt="preview" className="object-cover w-full h-40" />
                </div>
              ))}
            </div>
          )}
          {videos.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {videos.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden">
                  <video src={src} controls className="object-cover w-full h-40" />
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-700"
                >
                  Tệp đính kèm {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center gap-3">
        <input
          ref={mediaRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleMediaFiles(e.target.files)}
        />
        <input ref={docRef} type="file" multiple className="hidden" onChange={(e) => handleDocFiles(e.target.files)} />
        <button
          onClick={handlePickMedia}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          <HiPhoto className="w-5 h-5 text-indigo-600" />
          Ảnh/video
        </button>
        <button
          onClick={() => docRef.current?.click()}
          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          Tập tin
        </button>
        <div className="ml-auto" />
        <button
          onClick={handleSubmit}
          disabled={!canPost}
          className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2 rounded-2xl font-semibold ${canPost ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500'}`}
        >
          Đăng
        </button>
      </div>
    </div>
  );
}

function ImageGrid({ images }: { images?: string[] }) {
  const imgs = images?.slice(0, 4) || [];
  if (imgs.length === 0) return null;
  if (imgs.length === 1) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <img src={imgs[0]} alt="post-image" className="w-full h-auto object-cover" />
      </div>
    );
  }
  if (imgs.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {imgs.map((src, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <img src={src} alt="post-image" className="w-full h-64 object-cover" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl overflow-hidden">
        <img src={imgs[0]} alt="post-image" className="w-full h-64 object-cover" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <img src={imgs[1]} alt="post-image" className="w-full h-64 object-cover" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <img src={imgs[2]} alt="post-image" className="w-full h-64 object-cover" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <img src={imgs[3]} alt="post-image" className="w-full h-64 object-cover" />
      </div>
    </div>
  );
}

function VideoGrid({ videos }: { videos?: string[] }) {
  const vids = videos?.slice(0, 4) || [];
  if (vids.length === 0) return null;
  if (vids.length === 1) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <video src={vids[0]} controls className="w-full h-auto object-cover" />
      </div>
    );
  }
  if (vids.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {vids.map((src, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <video src={src} controls className="w-full h-64 object-cover" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl overflow-hidden">
        <video src={vids[0]} controls className="w-full h-64 object-cover" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <video src={vids[1]} controls className="w-full h-64 object-cover" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <video src={vids[2]} controls className="w-full h-64 object-cover" />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <video src={vids[3]} controls className="w-full h-64 object-cover" />
      </div>
    </div>
  );
}

function PostCard({ post, onLike }: { post: FeedPost; onLike: (id: string) => void }) {
  const timeStr = useMemo(() => formatTimeAgo(post.createdAt), [post.createdAt]);
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100">
          <Image src={post.author.avatar || DEFAULT_AVATAR} alt={post.author.name} width={44} height={44} unoptimized />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{post.author.name}</p>
              <p className="text-xs text-gray-500">{timeStr}</p>
            </div>
            <button className="cursor-pointer p-2 rounded-full hover:bg-gray-100">
              <HiEllipsisHorizontal className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {post.content && <p className="text-sm text-gray-800 mt-2 whitespace-pre-line">{post.content}</p>}
          {post.images && post.images.length > 0 && (
            <div className="mt-3">
              <ImageGrid images={post.images} />
            </div>
          )}
          {post.videos && post.videos.length > 0 && (
            <div className="mt-3">
              <VideoGrid videos={post.videos} />
            </div>
          )}
          {post.files && post.files.length > 0 && (
            <div className="mt-3 space-y-2">
              {post.files.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-700"
                >
                  Tệp đính kèm {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="inline-flex items-center gap-1">
            <HiHandThumbUp className="w-4 h-4 text-indigo-600" />
            <span>{post.likes}</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <span>{post.comments} bình luận</span>
          </div>
        </div>
      </div>
      <div className="px-2 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onLike(post.id)}
            className="cursor-pointer flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
          >
            <HiHandThumbUp className="w-5 h-5" /> Thích
          </button>
          <button className="cursor-pointer flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold">
            <HiChatBubbleLeftRight className="w-5 h-5" /> Bình luận
          </button>
          <button className="cursor-pointer flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold">
            <HiArrowUpTray className="w-5 h-5" /> Chia sẻ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MomentsPage() {
  const { currentUser, currentId } = useCurrentUser();
  const authorInfo = currentUser
    ? {
        id: String(currentUser['_id'] || currentUser['username'] || ''),
        name: String(currentUser['name'] || ''),
        avatar: (currentUser['avatar'] as string) || undefined,
      }
    : null;
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(20);

  const handleCreatePost = async (
    payload: Omit<FeedPost, 'id' | 'likes' | 'comments' | 'createdAt'> & {
      images?: string[];
      videos?: string[];
      files?: string[];
    },
  ) => {
    const body = {
      action: 'create',
      data: {
        authorId: payload.author.id,
        authorName: payload.author.name,
        authorAvatar: payload.author.avatar,
        content: payload.content,
        images: payload.images || [],
        videos: payload.videos || [],
        files: payload.files || [],
        visibility: 'public',
      },
    };
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json && json._id) {
        const newPost: FeedPost = {
          id: String(json._id),
          author: payload.author,
          content: payload.content,
          images: payload.images,
          videos: payload.videos,
          files: payload.files,
          createdAt: Date.now(),
          likes: 0,
          comments: 0,
          liked: false,
        };
        setPosts((prev) => [newPost, ...prev]);
      }
    } catch {}
  };

  const handleLike = async (id: string) => {
    const target = posts.find((p) => p.id === id);
    const like = !target?.liked;
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleLike', postId: id, userId: currentId, data: { like } }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes + (like ? 1 : -1)), liked: like } : p)),
      );
    } catch {}
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const mapPostDoc = useCallback(
    (d: Record<string, unknown>): FeedPost => {
      const likedBy = Array.isArray(d['likedBy']) ? (d['likedBy'] as unknown[]).map(String) : [];
      const createdAt = typeof d['createdAt'] === 'number' ? (d['createdAt'] as number) : Date.now();
      const authorId = String(d['authorId'] || '');
      const authorName = String((d['authorName'] as string) || authorId);
      const authorAvatarRaw = (d['authorAvatar'] as string) || undefined;
      const authorAvatar = authorAvatarRaw ? toMegaStream(authorAvatarRaw) : undefined;
      return {
        id: String(d['_id'] || ''),
        author: { id: authorId, name: authorName, avatar: authorAvatar },
        content: String((d['content'] as string) || ''),
        images: Array.isArray(d['images']) ? (d['images'] as string[]).map((u) => toMegaStream(String(u))) : undefined,
        videos: Array.isArray(d['videos']) ? (d['videos'] as string[]).map((u) => toMegaStream(String(u))) : undefined,
        files: Array.isArray(d['files']) ? (d['files'] as string[]).map((u) => toMegaStream(String(u))) : undefined,
        createdAt,
        likes: likedBy.length,
        comments: typeof d['commentsCount'] === 'number' ? (d['commentsCount'] as number) : 0,
        liked: likedBy.includes(currentId),
      };
    },
    [currentId],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/posts?skip=${skip}&limit=${limit}`);
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
      const mapped = arr.map(mapPostDoc);
      setPosts((prev) => [...prev, ...mapped]);
      setSkip((prev) => prev + mapped.length);
      if (mapped.length < limit) setHasMore(false);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, skip, limit, currentId, mapPostDoc]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 220;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (nearBottom) loadMore();
  }, [loadMore]);

  useEffect(() => {
    const init = async () => {
      setLoadingMore(true);
      try {
        const res = await fetch(`/api/posts?skip=0&limit=${limit}`);
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
        const mapped = arr.map(mapPostDoc);
        setPosts(mapped);
        setSkip(mapped.length);
        setHasMore(mapped.length >= limit);
      } catch {
        setHasMore(false);
      } finally {
        setLoadingMore(false);
      }
    };
    void init();
  }, [limit, currentId, mapPostDoc]);

  return (
    <div className="h-full min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto  bg-gradient-to-br from-slate-50 via-white to-indigo-50"
      >
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">
          <PostComposer onPost={handleCreatePost} author={authorInfo} />
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onLike={handleLike} />
          ))}

          {loadingMore && (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <div className="w-5 h-5 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
              Đang tải thêm...
            </div>
          )}

          {!hasMore && <div className="py-6 text-center text-gray-400">Đã hết bài viết</div>}
        </div>
      </div>
    </div>
  );
}
