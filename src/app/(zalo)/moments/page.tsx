'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/(profile)/useCurrentUser';
import PostComposer from '@/components/(memonts)/PostComposer';
import PostCard from '@/components/(memonts)/PostCard';

function toMegaStream(url: string) {
  return url.startsWith('https://mega.nz/') ? `/api/mega-stream?url=${encodeURIComponent(url)}` : url;
}

/* ------------------------------ TYPES ------------------------------ */
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

/* uploads handled inside PostComposer */

/* ------------------------------ MAIN PAGE ------------------------------ */
export default function MomentsPage() {
  const { currentUser, currentId } = useCurrentUser();

  const authorInfo = currentUser
    ? {
        id: String(currentUser._id || currentUser.username),
        name: String(currentUser.name),
        avatar:
          typeof (currentUser as Record<string, unknown>).avatar === 'string'
            ? toMegaStream(String((currentUser as Record<string, unknown>).avatar))
            : undefined,
      }
    : null;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  /* ------------------------------ CREATE POST ------------------------------ */
  const handleCreatePost = async (payload: Omit<FeedPost, 'id' | 'likes' | 'comments' | 'createdAt'>) => {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });

    const json = await res.json();

    if (json?._id) {
      setPosts((prev) => [
        {
          id: json._id,
          author: payload.author,
          content: payload.content,
          images: payload.images,
          videos: payload.videos,
          files: payload.files,
          createdAt: Date.now(),
          likes: 0,
          comments: 0,
          liked: false,
        },
        ...prev,
      ]);
    }
  };

  /* ------------------------------ LIKE POST ------------------------------ */
  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    const like = !post?.liked;

    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggleLike',
        postId,
        userId: currentId,
        data: { like },
      }),
    });

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, liked: like, likes: p.likes + (like ? 1 : -1) } : p)),
    );
  };

  /* ----------------------------- MAP DB DOC ----------------------------- */
  const mapPostDoc = useCallback(
    (d: {
      _id: string;
      authorId: string;
      authorName?: string;
      authorAvatar?: string;
      content?: string;
      images?: string[];
      videos?: string[];
      files?: string[];
      createdAt?: number;
      likedBy?: string[];
      commentsCount?: number;
    }): FeedPost => ({
      id: String(d._id),
      author: {
        id: String(d.authorId),
        name: d.authorName || '',
        avatar: d.authorAvatar ? toMegaStream(d.authorAvatar) : undefined,
      },
      content: d.content || '',
      images: d.images?.map(toMegaStream) || [],
      videos: d.videos?.map(toMegaStream) || [],
      files: d.files?.map(toMegaStream) || [],
      createdAt: d.createdAt || Date.now(),
      likes: d.likedBy?.length || 0,
      comments: d.commentsCount || 0,
      liked: d.likedBy?.includes(currentId),
    }),
    [currentId],
  );

  /* ------------------------------ LOAD MORE ------------------------------ */
  const loadPosts = async () => {
    const res = await fetch(`/api/posts?skip=${skip}&limit=${limit}`);
    const json = await res.json();

    const arr = Array.isArray(json.data) ? json.data.map(mapPostDoc) : [];

    setPosts((prev) => [...prev, ...arr]);
    setSkip((prev) => prev + arr.length);
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-32">
        <PostComposer
          onPost={handleCreatePost}
          author={
            authorInfo ? { ...authorInfo, avatar: authorInfo.avatar ? String(authorInfo.avatar) : undefined } : null
          }
        />
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onLike={handleLike} />
        ))}
      </div>
    </div>
  );
}
