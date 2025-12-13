import React from 'react';
import Image from 'next/image';
import { getProxyUrl } from '@/utils/utils';
import { HiMicrophone, HiPhone } from 'react-icons/hi2';
import MicOffIcon from '../svg/MicOffIcon';
import ICVideoOff from '../svg/ICVideoOff';
import ICVideo from '../svg/ICVideo';

type RemotePeer = { userId: string; stream: MediaStream; name?: string; avatar?: string };
type Participant = { userId: string; name?: string; avatar?: string };
type Props = {
  avatar?: string;
  name: string;
  mode: 'connecting' | 'active';
  callType: 'voice' | 'video';
  callStartAt?: number | null;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  currentUserName?: string;
  currentUserAvatar?: string;
  remotePeers?: RemotePeer[];
  participants?: Participant[];
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
  currentUserName,
  currentUserAvatar,
  remotePeers = [],
  participants = [],
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
      {callType === 'voice' && (
        <div className="mt-2">
          <div className="text-sm font-medium text-gray-700 mb-2">Thành viên đang tham gia</div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
              {currentUserAvatar ? (
                <span className="inline-block w-5 h-5 rounded-full overflow-hidden">
                  <Image src={getProxyUrl(currentUserAvatar)} alt={currentUserName || ''} width={20} height={20} />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-400 text-white text-[10px]">
                  {(currentUserName || 'U').trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm text-gray-800">{currentUserName || 'Bạn'}</span>
            </div>
            {participants.map((p) => (
              <div key={`chip-${p.userId}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
                {p.avatar ? (
                  <span className="inline-block w-5 h-5 rounded-full overflow-hidden">
                    <Image src={getProxyUrl(p.avatar)} alt={p.name || ''} width={20} height={20} />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-400 text-white text-[10px]">
                    {(p.name || 'U').trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-gray-800">{p.name || 'Thành viên'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {callType === 'video' && (
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={localVideoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
              {currentUserAvatar ? (
                <span className="inline-block w-5 h-5 rounded-full overflow-hidden">
                  <Image src={getProxyUrl(currentUserAvatar)} alt={currentUserName || ''} width={20} height={20} />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-500 text-white text-[10px]">
                  {(currentUserName || 'U').trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate max-w-[8rem]">{currentUserName || 'Bạn'}</span>
            </div>
          </div>
        )}
        {remotePeers.map((peer) => (
          <div key={peer.userId} className={callType === 'video' ? 'relative bg-black rounded-lg overflow-hidden aspect-video' : ''}>
            {callType === 'video' ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) {
                    const v = el as HTMLVideoElement & { srcObject?: MediaStream };
                    v.srcObject = peer.stream;
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
                    a.srcObject = peer.stream;
                    try {
                      a.play();
                    } catch {}
                  }
                }}
              />
            )}
            {callType === 'video' && (
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
                {peer.avatar ? (
                  <span className="inline-block w-5 h-5 rounded-full overflow-hidden">
                    <Image src={getProxyUrl(peer.avatar)} alt={peer.name || ''} width={20} height={20} />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-500 text-white text-[10px]">
                    {(peer.name || 'U').trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate max-w-[8rem]">{peer.name || 'Thành viên'}</span>
              </div>
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
