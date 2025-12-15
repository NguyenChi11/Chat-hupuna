import React from 'react';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';
import { HiPhone } from 'react-icons/hi';

type Props = {
  avatar?: string;
  name: string;
  onAccept: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  acceptText?: string;
  rejectText?: string;
  titleText?: string;
};

export default function IncomingCallModal({
  avatar,
  name,
  onAccept,
  onReject,

  titleText = 'Cuộc gọi đến',
}: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {avatar ? (
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <Image src={getProxyUrl(avatar)} alt={name || ''} width={48} height={48} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
            {String(name || '').trim().charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <div className="flex flex-col">
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-600">{titleText}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 flex items-center hover:bg-gray-300 shadow-lg rounded-lg hover:cursor-pointer" onClick={() => void onAccept()}>
          <HiPhone className="w-7 h-7 text-green-600" />
        </button>
        <button className="flex items-center px-3 py-2 hover:bg-gray-300 shadow-lg rounded-lg hover:cursor-pointer" onClick={() => void onReject()}>
           <HiPhone className="w-7 h-7 text-red-600" />
        </button>
      </div>
    </div>
  );
}

