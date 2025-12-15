'use client';

import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { HiLink } from 'react-icons/hi';

export default function ContentToolbar({
  selectedFolderId,
  linkInput,
  onLinkInputChange,
  onAddLink,
  onSelectMediaFiles,
  onSelectAnyFiles,
  nameInput,
  onNameInputChange,
}: {
  selectedFolderId: string | null;
  linkInput: string;
  onLinkInputChange: (v: string) => void;
  onAddLink: (link?: string, nameOverride?: string) => void;
  onSelectMediaFiles: (files: FileList, nameOverride?: string) => void;
  onSelectAnyFiles: (files: FileList, nameOverride?: string) => void;
  nameInput: string;
  onNameInputChange: (v: string) => void;
}) {
  const mediaRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [openKind, setOpenKind] = useState<'media' | 'file' | 'link' | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempLink, setTempLink] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const disabled = !selectedFolderId;

  const openUpload = (kind: 'media' | 'file') => {
    if (disabled) return;
    setTempName(nameInput || '');
    setSelectedFiles([]);
    setOpenKind(kind);
  };
  const openLink = () => {
    if (disabled) return;
    setTempName(nameInput || '');
    setTempLink(linkInput || '');
    setOpenKind('link');
  };

  const closeUpload = () => {
    setOpenKind(null);
    setSelectedFiles([]);
  };

  const confirmUpload = () => {
    if (!openKind) return;
    const nextName = tempName.trim();
    onNameInputChange(nextName);
    if (openKind === 'link') {
      const nextLink = tempLink.trim();
      if (!nextLink) return;
      onLinkInputChange(nextLink);
      onAddLink(nextLink, nextName);
    } else if (openKind === 'media') {
      if (mediaRef.current?.files?.length) onSelectMediaFiles(mediaRef.current.files, nextName);
    } else if (openKind === 'file') {
      if (fileRef.current?.files?.length) onSelectAnyFiles(fileRef.current.files, nextName);
    }
    closeUpload();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="ml-0 flex items-center gap-2">
          <button
            onClick={openLink}
            disabled={disabled}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Thêm link
          </button>
          <button
            onClick={() => openUpload('media')}
            disabled={disabled}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Ảnh/Video
          </button>
          <button
            onClick={() => openUpload('file')}
            disabled={disabled}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            File
          </button>
        </div>
      </div>

      {!selectedFolderId ? <p className="mt-2 text-xs text-gray-500">Chọn thư mục để thêm nội dung.</p> : null}

      {openKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl mx-4">
            <p className="text-sm font-semibold text-gray-900">
              {openKind === 'link' ? 'Thêm Link' : `Upload ${openKind === 'media' ? 'Ảnh/Video' : 'File'}`}
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Đặt tên (tuỳ chọn)"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              {openKind === 'link' ? (
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <HiLink className="h-4 w-4 text-gray-500" />
                  <input
                    value={tempLink}
                    onChange={(e) => setTempLink(e.target.value)}
                    placeholder="Dán link..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              ) : (
                <>
                  <input
                    ref={mediaRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className={openKind === 'media' ? 'block' : 'hidden'}
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className={openKind === 'file' ? 'block' : 'hidden'}
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                  <div className="flex items-center gap-2">
                    {openKind === 'media' ? (
                      <button
                        onClick={() => mediaRef.current?.click()}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Chọn ảnh/video
                      </button>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Chọn file
                      </button>
                    )}
                  </div>
                  <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700">Xem trước</p>
                      <p className="text-xs text-gray-500">{selectedFiles.length} tệp đã chọn</p>
                    </div>
                    {openKind === 'media' ? (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedFiles.map((f, i) => {
                          const url = URL.createObjectURL(f);
                          const isVideo = f.type.startsWith('video/');
                          return (
                            <div
                              key={i}
                              className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100"
                            >
                              {isVideo ? (
                                <video src={url} className="h-full w-full object-cover" muted />
                              ) : (
                                <Image
                                  width={100}
                                  height={100}
                                  src={url}
                                  alt={f.name}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFiles.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1"
                          >
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-500 text-white text-xs">
                              F
                            </span>
                            <span className="truncate text-sm text-gray-800">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeUpload}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmUpload}
                disabled={
                  (openKind === 'link' && !tempLink.trim()) || (openKind !== 'link' && selectedFiles.length === 0)
                }
                className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
