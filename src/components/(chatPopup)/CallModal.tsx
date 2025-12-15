'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    __ringPlay?: () => void;
    __ringStop?: () => void;
  }
}
import Image from 'next/image';
import { getProxyUrl } from '../../utils/utils';
import type { IncomingCall, CallData } from '../../hooks/useCall';

interface CallModalProps {
  incomingCall: IncomingCall | null;
  activeCall: CallData | null;
  currentUserId: string;
  allUsers: Array<{ _id: string; name: string; avatar?: string }>;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

export default function CallModal({
  incomingCall,
  activeCall,
  currentUserId,
  allUsers,
  onAccept,
  onReject,
  onEnd,
  localStream,
  remoteStreams,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOff,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  // ✅ THÊM: Audio refs cho remote audio streams
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const ringAudioRef = useRef<HTMLAudioElement | null>(null);
  const RINGTONE_URL = 'https://assets.mixkit.co/sfx/preview/mixkit-classic-alarm-995.mp3';
  const [ringBlocked, setRingBlocked] = useState(false);

  // Hiển thị local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ✅ THÊM: Hiển thị remote audio (quan trọng cho voice call)
  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
      // Tìm audio track trong stream
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        // Tạo hoặc lấy audio element
        let audioElement = remoteAudioRefs.current.get(userId);
        if (!audioElement) {
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.setAttribute('playsinline', 'true');
          document.body.appendChild(audioElement);
          remoteAudioRefs.current.set(userId, audioElement);
        }
        
        // Gán stream vào audio element
        audioElement.srcObject = stream;
      }
      
      // Hiển thị video nếu có
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
    
    // Cleanup: Xóa audio elements khi stream bị xóa
    return () => {
      remoteAudioRefs.current.forEach((audioElement, userId) => {
        if (!remoteStreams.has(userId)) {
          audioElement.pause();
          audioElement.srcObject = null;
          document.body.removeChild(audioElement);
          remoteAudioRefs.current.delete(userId);
        }
      });
    };
  }, [remoteStreams]);

  useEffect(() => {
    const incoming = !!incomingCall;
    const status = activeCall?.status;
    const shouldRing = incoming || status === 'ringing';
    const isActive = status === 'active';
    if (shouldRing && !isActive) {
      if (!ringAudioRef.current) {
        ringAudioRef.current = new Audio(RINGTONE_URL);
        ringAudioRef.current.loop = true;
      }
      const audio = ringAudioRef.current;
      audio.currentTime = 0;
      audio.volume = 0.6;
      void audio.play().then(() => setRingBlocked(false)).catch(() => {
        setRingBlocked(true);
      });
    } else {
      if (ringAudioRef.current) {
        try {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
        } catch {}
      }
      setRingBlocked(false);
    }
    return () => {
      if (ringAudioRef.current) {
        try {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
        } catch {}
      }
    };
  }, [incomingCall, activeCall?.status]);

  useEffect(() => {
    window.__ringPlay = () => {
      if (!ringAudioRef.current) {
        ringAudioRef.current = new Audio(RINGTONE_URL);
        ringAudioRef.current.loop = true;
      }
      const a = ringAudioRef.current;
      a.currentTime = 0;
      a.volume = 0.6;
      void a.play().then(() => setRingBlocked(false)).catch(() => setRingBlocked(true));
    };
    window.__ringStop = () => {
      if (ringAudioRef.current) {
        try {
          ringAudioRef.current.pause();
          ringAudioRef.current.currentTime = 0;
        } catch {}
      }
      setRingBlocked(false);
    };
    return () => {
      try {
        delete window.__ringPlay;
        delete window.__ringStop;
      } catch {}
    };
  }, []);

  // Nếu không có cuộc gọi nào, không hiển thị
  if (!incomingCall && !activeCall) return null;

  const isIncoming = !!incomingCall;
  const call = incomingCall || activeCall;
  if (!call) return null;

  const isVideoCall = call.callType === 'video';
  const isGroupCall = call.isGroup;

  // Lấy thông tin người gọi/nhóm
  const getCallerInfo = () => {
    // Nhóm: dùng nhãn chung
    if (isGroupCall) {
      return { name: 'Cuộc gọi nhóm', avatar: undefined };
    }
    // 1-1: hiển thị đối phương
    const myId = currentUserId;
    let otherUserId = '';
    if (isIncoming) {
      // Với cuộc gọi đến, đối phương là caller
      otherUserId = call.callerId;
    } else if (activeCall) {
      // Với cuộc gọi đang hoạt động, nếu mình là caller thì đối phương là receiverIds[0], ngược lại là caller
      otherUserId = myId === activeCall.callerId ? (activeCall.receiverIds[0] || '') : activeCall.callerId;
    } else {
      otherUserId = call.callerId;
    }
    const other = allUsers.find((u) => u._id === otherUserId);
    return {
      name: other?.name || call.callerName || 'Người dùng',
      avatar: other?.avatar || call.callerAvatar,
    };
  };

  const callerInfo = getCallerInfo();
  const avatarChar = callerInfo.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
      <div className="relative w-full h-full flex flex-col">
        {/* Remote Video (nếu là video call và đang active) */}
        {isVideoCall && activeCall && !isIncoming && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const user = allUsers.find((u) => u._id === userId);
              return (
                <div key={userId} className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={(el) => {
                      if (el) remoteVideoRefs.current.set(userId, el);
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                    {user?.name || 'Người dùng'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Local Video (nếu là video call) */}
        {isVideoCall && localStream && (
          <div className="absolute top-4 right-4 w-32 h-48 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Call Info (khi đang ringing hoặc voice call) */}
        {(!isVideoCall || isIncoming) && (
          <div className="flex-1 flex flex-col items-center justify-center text-white px-4">
            {/* Avatar */}
            <div className="relative mb-6">
              <div
                className={`
                  w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-2xl
                  ${callerInfo.avatar ? '' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}
                `}
              >
                {callerInfo.avatar ? (
                  <Image
                    src={getProxyUrl(callerInfo.avatar)}
                    alt={callerInfo.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{avatarChar}</span>
                )}
              </div>
              {isIncoming && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping" />
              )}
            </div>

            {/* Tên */}
            <h2 className="text-2xl font-semibold mb-2">{callerInfo.name}</h2>

            {/* Trạng thái */}
            <p className="text-gray-300 mb-8">
              {isIncoming
                ? isVideoCall
                  ? 'Cuộc gọi video đến...'
                  : 'Cuộc gọi thoại đến...'
                : activeCall?.status === 'active'
                  ? 'Đang kết nối...'
                  : 'Đang gọi...'}
            </p>

            {/* Thời gian (nếu đang active) */}
            {activeCall && activeCall.status === 'active' && activeCall.startTime && (
              <CallTimer startTime={activeCall.startTime} />
            )}
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          {isIncoming ? (
            <>
              {/* Nút từ chối */}
              <button
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
                title="Từ chối"
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Nút chấp nhận */}
              <button
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-colors"
                title="Chấp nhận"
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </button>
            </>
          ) : (
            <>
              {ringBlocked && (!activeCall || activeCall.status === 'ringing') && (
                <button
                  onClick={() => {
                    const a = ringAudioRef.current;
                    if (a) {
                      a.currentTime = 0;
                      void a.play().then(() => setRingBlocked(false)).catch(() => {});
                    }
                  }}
                  className="px-3 py-2 rounded bg-yellow-500 text-white shadow"
                >
                  Bật âm thanh chuông
                </button>
              )}
              {/* Mic toggle */}
              <button
                onClick={onToggleMic}
                className={`w-16 h-16 rounded-full ${isMicMuted ? 'bg-gray-600' : 'bg-blue-500'} hover:opacity-90 flex items-center justify-center shadow-lg transition-colors`}
                title={isMicMuted ? 'Bật mic' : 'Tắt mic'}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMicMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V5a3 3 0 016 0v9m0 0a3 3 0 01-3 3m3-3l3 3M9 12l-6 6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 013 3v8a3 3 0 11-6 0V4a3 3 0 013-3zm0 14a5 5 0 005-5M7 10a5 5 0 005 5m0 0v4m-4 0h8" />
                  )}
                </svg>
              </button>

              {/* Camera toggle (chỉ video call) */}
              {isVideoCall && (
                <button
                  onClick={onToggleCamera}
                  className={`w-16 h-16 rounded-full ${isCameraOff ? 'bg-gray-600' : 'bg-purple-500'} hover:opacity-90 flex items-center justify-center shadow-lg transition-colors`}
                  title={isCameraOff ? 'Bật camera' : 'Tắt camera'}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isCameraOff ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4-4v12l-4-4v4H5V6h10v4zm-8 8l-4 4M5 6L1 2" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4-4v12l-4-4v4H5V6h10v4z" />
                    )}
                  </svg>
                </button>
              )}

              {/* End call */}
              <button
                onClick={onEnd}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
                title="Kết thúc"
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Component hiển thị thời gian cuộc gọi
function CallTimer({ startTime }: { startTime: number }) {
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return <p className="text-xl font-mono text-gray-300">{formatTime(duration)}</p>;
}
