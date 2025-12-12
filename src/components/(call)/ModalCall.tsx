import React from 'react';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';
import { HiMicrophone, HiPhone } from 'react-icons/hi2';
import MicOffIcon from '../svg/MicOffIcon';
import ICVideoOff from '../svg/ICVideoOff';
import ICVideo from '../svg/ICVideo';

type Props = {
  avatar?: string;
  name: string;
  mode: 'connecting' | 'active';
  callType: 'voice' | 'video';
  callStartAt?: number | null;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteStreams?: MediaStream[];
  micEnabled?: boolean;
  camEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onEndCall: () => void;
};

export default function ModalCall({
  avatar,
  name,
  mode,
  callType,
  callStartAt,
  localVideoRef,
  remoteStreams = [],
  micEnabled = true,
  camEnabled = true,
  onToggleMic,
  onToggleCamera,
  onEndCall,
}: Props) {
  const timer = (() => {
    if (!callStartAt) return '';
    const now = Date.now();
    const s = Math.floor((now - callStartAt) / 1000);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    const mm = String(m).padStart(2, '0');
    const sss = String(ss).padStart(2, '0');
    return `${mm}:${sss}`;
  })();

  if (mode === 'connecting') {
    return (
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            <div className="w-12 h-12 rounded-full overflow-hidden">
              <Image
                src={getProxyUrl(avatar)}
                alt={name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
              {String(name || '')
                .trim()
                .charAt(0)
                .toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex flex-col">
            <div className="font-medium">{name}</div>
            <div className="text-sm text-gray-600">Đang chờ...</div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            className="flex items-center px-3 py-2 hover:bg-gray-300 shadow-lg rounded-lg hover:cursor-pointer"
            onClick={onEndCall}
          >
            <HiPhone className="w-7 h-7 text-red-600" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {avatar ? (
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={getProxyUrl(avatar)}
                alt={name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
              {String(name || '')
                .trim()
                .charAt(0)
                .toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex flex-col">
            <div className="font-medium">{name}</div>
            <div className="text-xs text-gray-600">{callType === 'video' ? 'Video' : 'Thoại'}</div>
          </div>
        </div>
        {timer && <div className="text-sm text-gray-600">{timer}</div>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {callType === 'video' && (
          <div className="bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={localVideoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
        )}
        {remoteStreams.map((stream, idx) => (
          <div key={idx} className={callType === 'video' ? 'bg-black rounded-lg overflow-hidden aspect-video' : ''}>
            {callType === 'video' ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) {
                    const v = el as HTMLVideoElement & { srcObject?: MediaStream };
                    v.srcObject = stream;
                    try {
                      v.play();
                    } catch {}
                  }
                }}
              />
            ) : (
              <audio
                autoPlay
                ref={(el) => {
                  if (el) {
                    const a = el as HTMLAudioElement & { srcObject?: MediaStream };
                    a.srcObject = stream;
                    try {
                      a.play();
                    } catch {}
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 mt-2">
        <button className="px-4 py-2 rounded-full bg-gray-200  hover:bg-gray-300 hover:cursor-pointer" onClick={onToggleMic}>
          {micEnabled ? (
            <HiMicrophone className="w-5 h-5" title="Tắt mic" />
          ) : (
            <MicOffIcon className="w-5 h-5" stroke="red" title="Bật mic" />
          )}
        </button>
        {callType === 'video' && (
          <button className="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 hover:cursor-pointer" onClick={onToggleCamera}>
            {camEnabled ? (
              <ICVideo className="w-5 h-5"  title="Tắt video" />
            ) : (
              <ICVideoOff className="w-5 h-5" stroke="red" title="Bật video" />
            )}
          </button>
        )}
        <button className="px-4 py-2 rounded-full bg-gray-200 hover:cursor-pointer hover:bg-gray-300 text-white flex items-center gap-2" onClick={onEndCall}>
          <HiPhone className="w-6 h-6 text-red-500" />
        </button>
      </div>
    </div>
  );
}
