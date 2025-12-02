'use client';

import Image from 'next/image';
import { HiX, HiCamera } from 'react-icons/hi';
import { getProxyUrl } from '@/utils/utils';

export default function Header({
  onClose,
  displayName,
  backgroundUrl,
  avatarUrl,
  isUploading,
  avatarFailed,
  setAvatarFailed,
  onSelectFile,
  isUploadingBackground,
  onSelectBackgroundFile,
}: {
  onClose: () => void;
  displayName: string;
  backgroundUrl?: string;
  avatarUrl?: string;
  isUploading: boolean;
  avatarFailed: boolean;
  setAvatarFailed: (failed: boolean) => void;
  onSelectFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingBackground?: boolean;
  onSelectBackgroundFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="h-40 relative">
      {backgroundUrl ? (
        <Image src={getProxyUrl(backgroundUrl)} alt="bg" fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500 to-blue-600" />
      )}

      {isUploadingBackground && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
          <div className="flex items-center gap-3 px-3 py-2 rounded bg-black/50">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Đang tải nền...</span>
          </div>
        </div>
      )}

      {/* Change Background Button */}
      <label className="absolute top-4 left-4 p-3 bg-white/20 rounded-full cursor-pointer group">
        <HiCamera className="text-white w-6 h-6" />
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onSelectBackgroundFile}
          disabled={Boolean(isUploadingBackground)}
        />
      </label>

      <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-white/20 rounded-full">
        <HiX className="text-white w-6 h-6" />
      </button>

      <div className="absolute left-1/2 -bottom-16 -translate-x-1/2 w-28 h-28 rounded-3xl overflow-hidden">
        <label className="group cursor-pointer relative block w-full h-full">
          {!avatarFailed && avatarUrl ? (
            <Image
              src={getProxyUrl(avatarUrl)}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              alt={displayName}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-4xl">
              {displayName[0].toUpperCase()}
            </div>
          )}

          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100`}
          >
            <HiCamera className="w-8 h-8" />
          </div>

          {isUploading && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2 px-2 py-1 rounded bg-black/50 text-white">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Đang tải...</span>
            </div>
          )}

          <input type="file" accept="image/*" className="sr-only" onChange={onSelectFile} disabled={isUploading} />
        </label>
      </div>
    </div>
  );
}
