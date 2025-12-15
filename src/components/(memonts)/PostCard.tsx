'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { formatTimeAgo } from '@/utils/dateUtils';
import { HiHandThumbUp, HiChatBubbleLeftRight, HiArrowUpTray, HiEllipsisVertical } from 'react-icons/hi2';
import ImageGrid from './ImageGrid';
import VideoGrid from './VideoGrid';
import { useCurrentUser } from '@/hooks/(profile)/useCurrentUser';
import ReactionButton from '@/components/(chatPopup)/components/ReactionButton';
import { uploadFileWithProgress } from '@/utils/uploadHelper';

function toMegaStream(url: string) {
  return url.startsWith('https://mega.nz/') ? `/api/mega-stream?url=${encodeURIComponent(url)}` : url;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function uploadFileMega(file: File): Promise<string | null> {
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const form = new FormData();
  form.append('file', file);
  form.append('roomId', 'moments-feed');
  form.append('sender', 'system');
  form.append('type', 'file');
  form.append('folderName', 'moments-feed');
  const res = await fetch(`/api/upload?uploadId=${uploadId}`, { method: 'POST', body: form });
  const json = await res.json();
  return json?.success ? json.link : null;
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

type PostComment = {
  id: string;
  userId: string;
  username?: string;
  avatar?: string;
  content: string;
  createdAt: number;
  parentId?: string;
  reactions?: Record<string, string[]>;
};

export default function PostCard({ post, onLike }: { post: FeedPost; onLike: (id: string) => void }) {
  const time = useMemo(() => formatTimeAgo(post.createdAt), [post.createdAt]);
  const shareLink = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/moments/${post.id}` : `/moments/${post.id}`),
    [post.id],
  );

  const { currentUser, currentId } = useCurrentUser();
  const isOwner = useMemo(() => String(post.author.id) === String(currentId), [post.author.id, currentId]);
  const [deleted, setDeleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>(post.content || '');
  const [contentOverride, setContentOverride] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentsCount, setCommentsCount] = useState<number>(post.comments);
  const [showMenu, setShowMenu] = useState(false);
  const [menuTab, setMenuTab] = useState<'post' | 'media'>('post');
  const [imagesOverride, setImagesOverride] = useState<string[]>(post.images || []);
  const [videosOverride, setVideosOverride] = useState<string[]>(post.videos || []);
  const [filesOverride, setFilesOverride] = useState<string[]>(post.files || []);
  const mediaAddRef = useRef<HTMLInputElement | null>(null);
  const docAddRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');

  useEffect(() => {
    setCommentsCount(post.comments);
  }, [post.comments]);

  useEffect(() => {
    setImagesOverride(post.images || []);
    setVideosOverride(post.videos || []);
    setFilesOverride(post.files || []);
  }, [post.images, post.videos, post.files]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'readComments', postId: post.id, limit: 50 }),
        cache: 'no-store',
      });
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? (json.data as Record<string, unknown>[]) : [];
      const list: PostComment[] = arr.map((c: Record<string, unknown>) => ({
        id: String((c['_id'] as string) ?? (c['id'] as string) ?? ''),
        userId: String((c['userId'] as string) || ''),
        username: c['username'] ? String(c['username'] as string) : undefined,
        avatar: c['avatar'] ? String(c['avatar'] as string) : undefined,
        content: String((c['content'] as string) || ''),
        createdAt: Number((c['createdAt'] as number) || Date.now()),
        parentId: c['parentId'] ? String(c['parentId'] as string) : undefined,
        reactions: (c['reactions'] as Record<string, string[]>) || {},
      }));
      setComments(list);
    } catch {}
    setLoadingComments(false);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Chia sẻ bài viết', url: shareLink });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareLink);
        alert('Đã sao chép liên kết bài viết');
      }
    } catch {}
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      await loadComments();
    }
  };

  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);

  const handleSubmitComment = async () => {
    const content = newComment.trim();
    if (!content || !currentId) return;
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addComment',
          postId: post.id,
          data: {
            userId: currentId,
            username: currentUser?.['name'],
            avatar: currentUser?.['avatar'],
            content,
            parentId: replyToCommentId || undefined,
          },
        }),
      });
      const json = await res.json();
      const newId = String(json?._id || '');
      const now = Date.now();
      const added: PostComment = {
        id: newId || `${post.id}-${now}`,
        userId: String(currentId),
        username: String(currentUser?.['name'] || ''),
        avatar: currentUser?.['avatar'] ? String(currentUser['avatar']) : undefined,
        content,
        createdAt: now,
        parentId: replyToCommentId || undefined,
        reactions: {},
      };
      setComments((prev) => [...prev, added]);
      setCommentsCount((prev) => prev + 1);
      setNewComment('');
      setReplyToCommentId(null);
    } catch {}
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    const find = comments.find((c) => c.id === commentId);
    if (!find || !currentId) return;
    const current = find.reactions?.[emoji] || [];
    const hasReacted = current.includes(currentId);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleCommentReaction',
          commentId,
          userId: currentId,
          emoji,
          like: !hasReacted,
        }),
      });
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const oldArr = c.reactions?.[emoji] || [];
          const set = new Set(oldArr);
          if (hasReacted) set.delete(currentId);
          else set.add(currentId);
          return { ...c, reactions: { ...(c.reactions || {}), [emoji]: Array.from(set) } };
        }),
      );
    } catch {}
  };

  const handleReply = (c: PostComment) => {
    setReplyToCommentId(c.id);
    const mention = c.username ? `@${c.username} ` : '';
    setNewComment((prev) => (prev ? prev : mention));
  };

  const removeImageAt = (idx: number) => {
    setImagesOverride((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeVideoAt = (idx: number) => {
    setVideosOverride((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeFileAt = (idx: number) => {
    setFilesOverride((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddMediaFiles = async (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 6);
    const total = arr.length || 1;
    let base = 0;
    setUploadLabel('Ảnh/video');
    setUploading(true);
    setUploadProgress(0);
    for (const file of arr) {
      const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const form = new FormData();
      form.append('file', file);
      form.append('roomId', 'moments-feed');
      form.append('sender', 'system');
      form.append('type', 'file');
      form.append('folderName', 'moments-feed');
      const res = await uploadFileWithProgress(`/api/upload?uploadId=${uploadId}`, form, (p) => {
        setUploadProgress(Math.min(100, base + p / total));
      });
      if (res && 'success' in res && res.success) {
        const link = res.link;
        if (file.type.startsWith('image/')) setImagesOverride((p) => [...p, link]);
        else if (file.type.startsWith('video/')) setVideosOverride((p) => [...p, link]);
      }
      base = Math.min(100, base + 100 / total);
      setUploadProgress(base);
    }
    setUploading(false);
  };

  const handleAddDocFiles = async (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 6);
    const total = arr.length || 1;
    let base = 0;
    setUploadLabel('Tập tin');
    setUploading(true);
    setUploadProgress(0);
    for (const f of arr) {
      const uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const form = new FormData();
      form.append('file', f);
      form.append('roomId', 'moments-feed');
      form.append('sender', 'system');
      form.append('type', 'file');
      form.append('folderName', 'moments-feed');
      const res = await uploadFileWithProgress(`/api/upload?uploadId=${uploadId}`, form, (p) => {
        setUploadProgress(Math.min(100, base + p / total));
      });
      if (res && 'success' in res && res.success) {
        const link = res.link;
        setFilesOverride((p) => [...p, link]);
      }
      base = Math.min(100, base + 100 / total);
      setUploadProgress(base);
    }
    setUploading(false);
  };

  const handleSaveMedia = async () => {
    if (!isOwner || !post.id) return;
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          field: '_id',
          value: post.id,
          data: { images: imagesOverride, videos: videosOverride, files: filesOverride },
        }),
      });
      setShowMenu(false);
    } catch {}
  };

  const handleDeletePost = async () => {
    if (!isOwner || !post.id) return;
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', postId: post.id }),
      });
      setDeleted(true);
    } catch {}
  };

  const handleStartEdit = () => {
    if (!isOwner) return;
    setEditContent(contentOverride ?? post.content ?? '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const nextContent = editContent.trim();
    if (!isOwner || !nextContent) {
      setIsEditing(false);
      return;
    }
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', field: '_id', value: post.id, data: { content: nextContent } }),
      });
      setContentOverride(nextContent);
    } catch {}
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm">
      <div className="p-4 flex gap-3 flex-col">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-start gap-2">
            <Image
              src={post.author.avatar ? toMegaStream(post.author.avatar) : ''}
              width={44}
              height={44}
              alt="avatar"
              className="rounded-full"
              unoptimized
            />
            <div className="flex flex-col">
              <p className="font-bold text-sm">{post.author.name}</p>
              <p className="text-xs text-gray-500">{time}</p>
            </div>
          </div>
          <div className="relative">
            {isOwner && !deleted && (
              <>
                <button onClick={() => setShowMenu((v) => !v)} className="p-2 rounded-lg hover:bg-gray-100">
                  <HiEllipsisVertical />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white border rounded-2xl shadow-xl w-64 z-10">
                    <div className="flex border-b">
                      <button
                        onClick={() => setMenuTab('post')}
                        className={`flex-1 py-2 text-sm ${
                          menuTab === 'post' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
                        }`}
                      >
                        Bài viết
                      </button>
                      <button
                        onClick={() => setMenuTab('media')}
                        className={`flex-1 py-2 text-sm ${
                          menuTab === 'media' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'
                        }`}
                      >
                        Media
                      </button>
                    </div>
                    {menuTab === 'post' ? (
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleStartEdit();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
                        >
                          Sửa nội dung
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleDeletePost();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-red-600"
                        >
                          Xóa bài viết
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
                        {uploading && (
                          <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                            <div className="flex items-center justify-between text-xs text-indigo-700">
                              <span>Đang tải lên {uploadLabel}</span>
                              <span>{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="mt-1 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-2 bg-indigo-600 rounded-full"
                                style={{ width: `${Math.round(uploadProgress)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <input
                          ref={mediaAddRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => handleAddMediaFiles(e.target.files)}
                        />
                        <input
                          ref={docAddRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleAddDocFiles(e.target.files)}
                        />
                        {imagesOverride.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Ảnh ({imagesOverride.length})</p>
                            {imagesOverride.map((src, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-gray-100"
                              >
                                <span className="text-xs">Ảnh {i + 1}</span>
                                <button onClick={() => removeImageAt(i)} className="text-xs text-red-600">
                                  Xóa
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {videosOverride.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Video ({videosOverride.length})</p>
                            {videosOverride.map((src, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-gray-100"
                              >
                                <span className="text-xs">Video {i + 1}</span>
                                <button onClick={() => removeVideoAt(i)} className="text-xs text-red-600">
                                  Xóa
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {filesOverride.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">File ({filesOverride.length})</p>
                            {filesOverride.map((src, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between px-3 py-1 rounded-lg hover:bg-gray-100"
                              >
                                <span className="text-xs">File {i + 1}</span>
                                <button onClick={() => removeFileAt(i)} className="text-xs text-red-600">
                                  Xóa
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            disabled={uploading}
                            onClick={() => mediaAddRef.current?.click()}
                            className={`px-3 py-1 rounded-lg text-sm ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-gray-100'}`}
                          >
                            Thêm ảnh/video
                          </button>
                          <button
                            disabled={uploading}
                            onClick={() => docAddRef.current?.click()}
                            className={`px-3 py-1 rounded-lg text-sm ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-gray-100'}`}
                          >
                            Thêm file
                          </button>
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={handleSaveMedia}
                            className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm"
                          >
                            Lưu thay đổi media
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="px-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-xl border p-2 text-sm"
              rows={3}
            />
            <div className="mt-2 flex items-center gap-2">
              <button onClick={handleSaveEdit} className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-sm">
                Lưu
              </button>
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 rounded-xl bg-gray-200 text-sm">
                Huỷ
              </button>
            </div>
          </div>
        )}

        <div className="flex-1">
          {!deleted && (contentOverride ?? post.content) ? (
            <p className="mt-2 px-4 text-sm whitespace-pre-line">{contentOverride ?? post.content}</p>
          ) : null}
          {imagesOverride.length && !deleted ? <ImageGrid images={imagesOverride} /> : null}
          {videosOverride.length ? <VideoGrid videos={videosOverride} /> : null}
          {filesOverride.length ? (
            <div className="mt-2 space-y-2">
              {filesOverride.map((src, i) => (
                <a
                  key={i}
                  href={toMegaStream(src)}
                  className="block bg-gray-100 px-3 py-2 rounded-xl text-sm"
                  target="_blank"
                >
                  File {i + 1}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-3 flex justify-between text-xs text-gray-500">
        <div className="flex gap-1 items-center">
          <HiHandThumbUp className="text-indigo-600" />
          {post.likes}
        </div>
        <span>{commentsCount} bình luận</span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-2 pb-3">
        <button
          onClick={() => onLike(post.id)}
          className="bg-gray-100 py-2 rounded-2xl flex items-center justify-center gap-2"
        >
          <HiHandThumbUp /> Thích
        </button>
        <button
          onClick={handleToggleComments}
          className="bg-gray-100 py-2 rounded-2xl flex items-center justify-center gap-2"
        >
          <HiChatBubbleLeftRight /> Bình luận
        </button>
        <a
          href={shareLink}
          className="bg-gray-100 py-2 rounded-2xl flex items-center justify-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            handleShare();
          }}
        >
          <HiArrowUpTray /> Chia sẻ
        </a>
      </div>

      {showComments && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            {loadingComments ? (
              <div className="text-sm text-gray-500">Đang tải bình luận...</div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-gray-500">Chưa có bình luận</div>
            ) : (
              (() => {
                const byParent: Record<string, PostComment[]> = {};
                comments.forEach((c) => {
                  const key = c.parentId || '__root__';
                  (byParent[key] ||= []).push(c);
                });

                const renderNode = (node: PostComment, depth: number) => (
                  <div key={node.id} className={`flex items-start gap-2 ${depth > 0 ? 'pl-10' : ''}`}>
                    <Image
                      src={node.avatar ? toMegaStream(node.avatar) : ''}
                      width={depth > 0 ? 24 : 28}
                      height={depth > 0 ? 24 : 28}
                      alt="avatar"
                      className="rounded-full"
                      unoptimized
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">{node.username || 'Người dùng'}</p>
                        <span className="text-[10px] text-gray-500">{formatTimeAgo(node.createdAt)}</span>
                      </div>
                      <p className="text-sm">{node.content}</p>
                      <div className="mt-2 flex items-center gap-2 relative">
                        <div className="relative">
                          <ReactionButton
                            isMine={String(node.userId) === String(currentId)}
                            visible={true}
                            className="static translate-y-0 top-auto"
                            onPick={(emoji) => handleToggleReaction(node.id, emoji)}
                          />
                        </div>
                        <button onClick={() => handleReply(node)} className="text-xs text-indigo-600">
                          Trả lời
                        </button>
                      </div>
                      {node.reactions && Object.keys(node.reactions).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 text-xs">
                          {Object.entries(node.reactions).map(([emoji, users]) => (
                            <span key={emoji} className="px-2 py-0.5 rounded-full bg-gray-100">
                              {emoji} {users.length}
                            </span>
                          ))}
                        </div>
                      )}
                      {(byParent[node.id] || []).map((child) => renderNode(child, depth + 1))}
                    </div>
                  </div>
                );

                return (byParent['__root__'] || []).map((root) => (
                  <div key={root.id} className="space-y-2">
                    {renderNode(root, 0)}
                  </div>
                ));
              })()
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentId ? 'Viết bình luận...' : 'Đăng nhập để bình luận'}
              className="flex-1 px-3 py-2 rounded-xl border"
              disabled={!currentId}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!currentId || !newComment.trim()}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white"
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
