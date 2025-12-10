'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { HiPhoto } from 'react-icons/hi2';

function toMegaStream(url: string) {
  return url.startsWith('https://mega.nz/') ? `/api/mega-stream?url=${encodeURIComponent(url)}` : url;
}

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

export default function PostComposer({
  onPost,
  author,
}: {
  onPost: (p: {
    author: { id: string; name: string; avatar?: string };
    content: string;
    images?: string[];
    videos?: string[];
    files?: string[];
  }) => void;
  author: { id: string; name: string; avatar?: string } | null;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const mediaRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);

  const canPost = text.trim().length > 0 || images.length > 0 || videos.length > 0 || files.length > 0;

  const handleMediaFiles = async (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 4);
    for (const file of arr) {
      const link = await uploadFileMega(file);
      if (!link) continue;
      if (file.type.startsWith('image/')) setImages((p) => [...p, link]);
      else if (file.type.startsWith('video/')) setVideos((p) => [...p, link]);
    }
  };

  const handleDocFiles = async (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 4);
    for (const f of arr) {
      const link = await uploadFileMega(f);
      if (link) setFiles((p) => [...p, link]);
    }
  };

  const handleSubmit = () => {
    if (!canPost) return;
    const a = author ?? { id: 'me', name: 'Bạn', avatar: undefined };
    onPost({ author: a, content: text.trim(), images, videos, files });
    setText('');
    setImages([]);
    setVideos([]);
    setFiles([]);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <Image src={author?.avatar ? toMegaStream(author?.avatar) : ''} width={40} height={40} alt="avatar" className="rounded-full" unoptimized />
        <div className="flex-1">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Bạn đang nghĩ gì?" className="w-full resize-none bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3" rows={3} />
          {images.length > 0 && (
            <div className="mt-3 grid  gap-2">
              {images.map((src, i) => (
                <img key={i} src={toMegaStream(src)} className="rounded-xl w-full h-40 object-cover" />
              ))}
            </div>
          )}
          {videos.length > 0 && (
            <div className="mt-3 grid  gap-2">
              {videos.map((src, i) => (
                <video key={i} src={toMegaStream(src)} controls className="rounded-xl w-full h-40 object-cover" />
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((src, i) => (
                <a key={i} href={toMegaStream(src)} className="block bg-gray-100 px-3 py-2 rounded-xl text-sm" target="_blank">
                  File {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 pb-4 flex items-center gap-3">
        <input ref={mediaRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => handleMediaFiles(e.target.files)} />
        <input ref={docRef} type="file" multiple className="hidden" onChange={(e) => handleDocFiles(e.target.files)} />
        <button onClick={() => mediaRef.current?.click()} className="px-4 py-2 bg-gray-100 rounded-2xl flex items-center gap-2">
          <HiPhoto className="text-indigo-600" /> Ảnh/video
        </button>
        <button onClick={() => docRef.current?.click()} className="px-4 py-2 bg-gray-100 rounded-2xl flex items-center gap-2">
          Tập tin
        </button>
        <button onClick={handleSubmit} disabled={!canPost} className={`ml-auto px-5 py-2 rounded-2xl font-semibold ${canPost ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          Đăng
        </button>
      </div>
    </div>
  );
}

