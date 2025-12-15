'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { HiDocumentText, HiUpload } from 'react-icons/hi';
import { HiOutlinePhoto, HiOutlineDocumentText, HiXMark } from 'react-icons/hi2';

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
  const [activeTab, setActiveTab] = useState<'media' | 'files'>('media');

  const mediaRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

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
    setActiveTab('media');
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
      {/* Header - Avatar + Textarea */}
      <div className="p-5 flex items-start gap-4">
        <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/40 shadow-lg">
          {author?.avatar ? (
            <Image
              src={toMegaStream(author.avatar)}
              width={56}
              height={56}
              alt={author.name}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {author?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
          )}
        </div>

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bạn đang nghĩ gì hôm nay?"
            className="w-full resize-none bg-gray-50/80 border-2 border-gray-200 rounded-2xl px-5 py-4 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all duration-300"
            rows={3}
          />
        </div>
      </div>

      {/* Media Preview */}
      {(images.length > 0 || videos.length > 0 || files.length > 0) && (
        <div className="px-5 pb-4">
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {images.map((src, i) => (
                <div key={i} className="relative group">
                  <Image
                    src={toMegaStream(src)}
                    width={400}
                    height={400}
                    alt={`image ${i}`}
                    className="rounded-2xl w-full h-44 object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    onClick={() => setImages((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {videos.map((src, i) => (
                <div key={i} className="relative group">
                  <video
                    src={toMegaStream(src)}
                    controls
                    className="rounded-2xl w-full h-44 object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    onClick={() => setVideos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2 mt-3">
              {files.map((src, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-100 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <HiDocumentText className="w-6 h-6 text-indigo-600" />
                    <span className="text-sm font-medium">Tập tin {i + 1}</span>
                  </div>
                  <button
                    onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs + Actions */}
      <div className="px-5 pb-5 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('media')}
              className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all duration-300 ${
                activeTab === 'media'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HiOutlinePhoto className="w-5 h-5" />
              Ảnh / Video
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all duration-300 ${
                activeTab === 'files'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HiOutlineDocumentText className="w-5 h-5" />
              Tập tin
            </button>
          </div>

          {/* Upload buttons */}
          <div className="flex items-center gap-3">
            <input
              ref={mediaRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleMediaFiles(e.target.files)}
            />
            <input
              ref={docRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleDocFiles(e.target.files)}
            />

            <button
              onClick={() => (activeTab === 'media' ? mediaRef.current?.click() : docRef.current?.click())}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl flex items-center gap-2 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105"
            >
              <HiUpload className="w-5 h-5" />
              <span>{activeTab === 'media' ? 'Thêm ảnh/video' : 'Thêm tập tin'}</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canPost}
              className={`px-6 py-2.5 rounded-2xl font-semibold transition-all duration-300 shadow-md ${
                canPost
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Đăng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
