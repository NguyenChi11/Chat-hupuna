import { useCallback, useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { resolveSocketUrl } from '@/utils/utils';
import { playGlobalRingTone, stopGlobalRingTone } from '@/utils/callRing';

type CallType = 'voice' | 'video';
type Member = string | { _id: string };
type IncomingCallPayload = {
  from: string;
  type: CallType;
  roomId: string;
  sdp: RTCSessionDescriptionInit;
};

export function useCallSession({
  socketRef,
  roomId,
  currentUserId,
  isGroup,
  selectedChat,
  onCallNotify,
}: {
  socketRef: React.MutableRefObject<Socket | null>;
  roomId: string;
  currentUserId: string;
  isGroup: boolean;
  selectedChat?: { _id?: string; members?: Member[] } | null;
  onCallNotify?: (payload: {
    status: 'answered' | 'timeout';
    type: CallType;
    durationSec?: number;
    wasIncoming: boolean;
    roomId: string;
    counterpartId?: string | null;
  }) => void;
}) {
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteStreamsState, setRemoteStreamsState] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const receiversRef = useRef<string[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    type: CallType;
    roomId: string;
    sdp: RTCSessionDescriptionInit;
  } | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callStartAt, setCallStartAt] = useState<number | null>(null);
  const [callConnecting, setCallConnecting] = useState(false);
  const [roomCallActive, setRoomCallActive] = useState(false);
  const [roomCallType, setRoomCallType] = useState<CallType | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<string[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>(roomId);
  const [counterpartId, setCounterpartId] = useState<string | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const callActiveRef = useRef<boolean>(false);
  const callConnectingRef = useRef<boolean>(false);
  const endingRef = useRef(false);
  const endedRef = useRef(false);
  const callTypeRef = useRef<CallType | null>(null);
  const activeRoomIdRef = useRef<string>(roomId);
  const callStartAtRef = useRef<number | null>(null);
  const incomingFlagRef = useRef<boolean>(false);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);
  useEffect(() => {
    callConnectingRef.current = callConnecting;
  }, [callConnecting]);
  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);
  useEffect(() => {
    callStartAtRef.current = callStartAt;
  }, [callStartAt]);

  const createPeerConnection = useCallback(
    (otherUserId: string, forceNew = false) => {
      let existing = peerConnectionsRef.current.get(otherUserId);
      if (existing && forceNew) {
        try {
          existing.onicecandidate = null;
          existing.ontrack = null;
          existing.onconnectionstatechange = null;
          existing.oniceconnectionstatechange = null;
          const pcToClose = existing;
          pcToClose.getSenders().forEach((s) => {
            try {
              pcToClose.removeTrack(s);
            } catch {}
          });
          pcToClose.close();
        } catch {}
        peerConnectionsRef.current.delete(otherUserId);
        existing = undefined as unknown as RTCPeerConnection | undefined;
      }
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.onicecandidate = (event) => {
        const candidate = event.candidate;
        if (!candidate) return;
        socketRef.current?.emit('call_candidate', {
          roomId,
          target: otherUserId,
          from: String(currentUserId),
          candidate,
        });
      };
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        remoteStreamsRef.current.set(otherUserId, stream);
        setRemoteStreamsState(new Map(remoteStreamsRef.current));
        stopGlobalRingTone();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          stopGlobalRingTone();
          setCallConnecting(false);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          stopGlobalRingTone();
          setCallConnecting(false);
        }
      };
      peerConnectionsRef.current.set(otherUserId, pc);
      return pc;
    },
    [roomId, currentUserId, socketRef],
  );

  const startLocalStream = useCallback(
    async (type: CallType) => {
      const constraints = { audio: true, video: type === 'video' };
      const navi =
        typeof navigator !== 'undefined'
          ? (navigator as Navigator & {
              webkitGetUserMedia?: (
                constraints: MediaStreamConstraints,
                success: (stream: MediaStream) => void,
                error: (err: unknown) => void,
              ) => void;
              mozGetUserMedia?: (
                constraints: MediaStreamConstraints,
                success: (stream: MediaStream) => void,
                error: (err: unknown) => void,
              ) => void;
            })
          : undefined;
      let stream: MediaStream | null = null;
      const md = typeof navigator !== 'undefined' ? (navigator as Navigator).mediaDevices : undefined;
      try {
        if (md && typeof md.getUserMedia === 'function') {
          stream = await md.getUserMedia(constraints);
        } else if (navi && typeof navi.webkitGetUserMedia === 'function') {
          stream = await new Promise<MediaStream>((resolve, reject) => {
            navi.webkitGetUserMedia!(constraints, resolve, reject);
          });
        } else if (navi && typeof navi.mozGetUserMedia === 'function') {
          stream = await new Promise<MediaStream>((resolve, reject) => {
            navi.mozGetUserMedia!(constraints, resolve, reject);
          });
        } else {
          const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          const hint = isSecure || host === 'localhost' ? '' : ' Truy cập bằng HTTPS hoặc localhost để cấp quyền mic/camera.';
          throw new Error('MediaDevices API is unavailable.' + hint);
        }
      } catch {
        if (type === 'video') {
          try {
            if (md && typeof md.getUserMedia === 'function') {
              stream = await md.getUserMedia({ audio: true, video: false });
            } else if (navi && typeof navi.webkitGetUserMedia === 'function') {
              stream = await new Promise<MediaStream>((resolve, reject) => {
                navi.webkitGetUserMedia!({ audio: true, video: false }, resolve, reject);
              });
            } else if (navi && typeof navi.mozGetUserMedia === 'function') {
              stream = await new Promise<MediaStream>((resolve, reject) => {
                navi.mozGetUserMedia!({ audio: true, video: false }, resolve, reject);
              });
            }
          } catch {}
        }
        if (!stream) {
          stream = new MediaStream();
        }
      }
      localStreamRef.current = stream;
      const a = stream!.getAudioTracks()[0];
      if (a) a.enabled = micEnabled;
      const v = stream!.getVideoTracks()[0];
      if (v) v.enabled = camEnabled;
      if (localVideoRef.current && type === 'video') {
        try {
          // Ensure autoplay policy allows playing
          localVideoRef.current.muted = true;
          (localVideoRef.current as HTMLVideoElement & { autoplay?: boolean }).autoplay = true;
        } catch {}
        localVideoRef.current.srcObject = stream!;
        try {
          await localVideoRef.current.play();
        } catch {}
      }
      return stream!;
    },
    [micEnabled, camEnabled],
  );


  const resetCallLocal = useCallback(() => {
    try {
      setCallActive(false);
      setCallType(null);
      setCallStartAt(null);
      setCallConnecting(false);
      remoteStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      remoteStreamsRef.current.clear();
      setRemoteStreamsState(new Map());
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.close();
        } catch {}
      });
      peerConnectionsRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = null;
        } catch {}
      }
      setIncomingCall(null);
    } catch {}
  }, []);

  const getReceiverIds = useCallback(() => {
    if (isGroup) {
      const members = (selectedChat?.members || []) as Member[];
      const ids = members
        .map((m) => (typeof m === 'object' ? String(m._id) : String(m)))
        .filter((id) => id !== String(currentUserId));
      return ids;
    }
    const id = String(selectedChat?._id || '');
    return id ? [id] : [];
  }, [isGroup, selectedChat, currentUserId]);

  const startCall = useCallback(
    async (type: CallType) => {
      resetCallLocal();
      endedRef.current = false;
      incomingFlagRef.current = false;
      try {
        if (!socketRef.current || !socketRef.current.connected) {
          socketRef.current = io(resolveSocketUrl(), { transports: ['websocket'], withCredentials: false });
          await new Promise<void>((resolve) => {
            socketRef.current!.on('connect', () => resolve());
          });
          socketRef.current.emit('join_room', roomId);
          socketRef.current.emit('join_user', { userId: String(currentUserId) });
        }
      } catch {}
      const receivers = (() => {
        if (isGroup && roomCallActive && roomParticipants && roomParticipants.length > 0) {
          return roomParticipants.filter((id) => String(id) !== String(currentUserId));
        }
        return getReceiverIds();
      })();
      receiversRef.current = receivers;
      if (receivers.length === 0) return;
      setCallType(type);
      setCallActive(false);
      setCallStartAt(null);
      setCallConnecting(true);
      activeRoomIdRef.current = roomId;
      setActiveRoomId(roomId);
      // setCounterpartId(!isGroup && receivers.length > 0 ? String(receivers[0]) : null);
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      playGlobalRingTone();
      ringTimeoutRef.current = window.setTimeout(() => {
        if (!callActiveRef.current && callConnectingRef.current) {
          stopGlobalRingTone();
          endCall('local');
        }
      }, 30000);
      try {
        const stream = await startLocalStream(type);
        for (const otherId of receivers) {
          const pc = createPeerConnection(otherId, true);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
          await pc.setLocalDescription(offer);
          socketRef.current?.emit('call_offer', {
            roomId: activeRoomIdRef.current,
            target: otherId,
            from: String(currentUserId),
            type,
            sdp: offer,
          });
        }
      } catch {
        setCallConnecting(false);
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
        if (localVideoRef.current) {
          try {
            localVideoRef.current.srcObject = null;
          } catch {}
        }
      }
    },
    [getReceiverIds, startLocalStream, createPeerConnection, roomId, currentUserId, resetCallLocal, socketRef],
  );

  const endCall = useCallback(
    (source: 'local' | 'remote' = 'local') => {
      if (endingRef.current || endedRef.current) return;
      endingRef.current = true;
      if (source === 'local' && socketRef.current?.connected) {
        socketRef.current.emit('call_end', {
          roomId: activeRoomIdRef.current,
          from: String(currentUserId),
          targets: receiversRef.current,
        });
        const parts = String(activeRoomIdRef.current).split('_').filter(Boolean);
        const isDirect = parts.length === 2;
        if (isDirect && onCallNotify) {
          const started = typeof callStartAtRef.current === 'number' ? callStartAtRef.current : null;
          const ended = Date.now();
          const status: 'answered' | 'timeout' = started ? 'answered' : 'timeout';
          const durationSec = started ? Math.max(0, Math.floor((ended - started) / 1000)) : undefined;
          const type = (callTypeRef.current ?? 'voice') as CallType;
          onCallNotify({
            status,
            type,
            durationSec,
            wasIncoming: !!incomingFlagRef.current,
            roomId: activeRoomIdRef.current,
            counterpartId,
          });
        }
      }
      setCallActive(false);
      setCallType(null);
      setCallStartAt(null);
      callStartAtRef.current = null;
      setCallConnecting(false);
      setRoomCallActive(false);
      setRoomCallType(null);
      setRoomParticipants([]);
      remoteStreamsRef.current.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
      remoteStreamsRef.current.clear();
      setRemoteStreamsState(new Map());
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.close();
        } catch {}
      });
      peerConnectionsRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (localVideoRef.current) {
        try {
          localVideoRef.current.srcObject = null;
        } catch {}
      }
      setIncomingCall(null);
      setCounterpartId(null);
      setActiveRoomId('');
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      try {
        if (typeof window !== 'undefined') localStorage.removeItem('pendingIncomingCall');
      } catch {}
      endedRef.current = true;
      endingRef.current = false;
    },
    [currentUserId, socketRef, onCallNotify, counterpartId],
  );

  const toggleMic = useCallback(() => {
    const next = !micEnabled;
    setMicEnabled(next);
    const a = localStreamRef.current?.getAudioTracks()[0];
    if (a) a.enabled = next;
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    const next = !camEnabled;
    setCamEnabled(next);
    const v = localStreamRef.current?.getVideoTracks()[0];
    if (v) v.enabled = next;
  }, [camEnabled]);

  const acceptIncomingCallWith = useCallback(
    async (payload: IncomingCallPayload) => {
      if (!payload) return;
      stopGlobalRingTone();
      endedRef.current = false;
      incomingFlagRef.current = true;
      const type = payload.type;
      const from = payload.from;
      setCallType(type);
      if (!callActiveRef.current) {
        setCallActive(true);
      }
      try {
        if (socketRef.current && socketRef.current.connected) {
          activeRoomIdRef.current = String(payload.roomId || roomId);
          socketRef.current.emit('join_room', activeRoomIdRef.current);
        }
        setActiveRoomId(activeRoomIdRef.current);
        const parts = String(activeRoomIdRef.current).split('_').filter(Boolean);
        if (parts.length === 2) {
          setCounterpartId(String(from));
        } else {
          setCounterpartId(null);
        }
        const stream = await startLocalStream(type);
        const pc = createPeerConnection(from, true);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('call_answer', {
          roomId: activeRoomIdRef.current,
          target: from,
          from: String(currentUserId),
          sdp: answer,
        });
        // Không gọi lại những thành viên chưa tham gia khi Accept trong nhóm
        // Việc kết nối bổ sung sẽ dựa vào danh sách participants từ server
        setIncomingCall(null);
      } catch  {
        setIncomingCall(null);
      }
    },
    [roomId, currentUserId, startLocalStream, createPeerConnection, endCall, socketRef, isGroup, endCall],
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    await acceptIncomingCallWith(incomingCall);
  }, [incomingCall, acceptIncomingCallWith]);

  useEffect(() => {
    if (!roomId) return;
    const socket = socketRef.current;
    if (!socket) return;
    socket.off('call_offer');
    socket.off('call_answer');
    socket.off('call_candidate');
    socket.off('call_end');
    socket.off('call_reject');
    socket.off('call_leave');
    socket.off('call_state');
    const handleCallOffer = async (data: {
      roomId: string;
      target: string;
      from: string;
      type: CallType;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (String(data.target) !== String(currentUserId)) return;
      if (callActiveRef.current || callConnectingRef.current) {
        await acceptIncomingCallWith({ from: String(data.from), type: data.type, roomId: data.roomId, sdp: data.sdp });
        return;
      }
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('pendingIncomingCall') : null;
        if (raw) {
          const p = JSON.parse(raw) as { roomId: string; from: string };
          if (String(p.roomId) === String(data.roomId) && String(p.from) === String(data.from)) return;
        }
      } catch {}
      setIncomingCall({ from: String(data.from), type: data.type, roomId: data.roomId, sdp: data.sdp });
      playGlobalRingTone();
    };
    const handleCallAnswer = async (data: { roomId: string; target: string; from: string; sdp: RTCSessionDescriptionInit }) => {
      if (String(data.target) !== String(currentUserId)) return;
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      setCallConnecting(false);
      endedRef.current = false;
      const pc = peerConnectionsRef.current.get(String(data.from));
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        setCallActive(true);
        const isDirect = String(data.roomId).split('_').filter(Boolean).length === 2;
        if (isDirect) {
          setCallStartAt(Date.now());
          callStartAtRef.current = Date.now();
        }
      } catch  {
        stopGlobalRingTone();
      }
    };
    const handleCallCandidate = async (data: { roomId: string; target: string; from: string; candidate: RTCIceCandidateInit }) => {
      if (String(data.target) !== String(currentUserId)) return;
      const pc = peerConnectionsRef.current.get(String(data.from));
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    };
    const handleCallEnd = (data: { roomId: string }) => {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      setIncomingCall(null);
      endCall('remote');
      if (String(data.roomId) === String(roomId)) {
        setRoomCallActive(false);
        setRoomCallType(null);
        setRoomParticipants([]);
      }
    };
    const handleCallReject = (data: { roomId: string }) => {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      setIncomingCall(null);
      const isDirect = String(data.roomId).split('_').filter(Boolean).length === 2;
      if (isDirect) {
        endCall('remote');
        if (String(data.roomId) === String(roomId)) {
          setRoomCallActive(false);
          setRoomCallType(null);
          setRoomParticipants([]);
        }
      }
      // Nhóm: giữ cuộc gọi tiếp tục, server sẽ gửi 'call_leave' và 'call_state' để cập nhật danh sách tham gia
    };
    const handleCallLeave = (data: { roomId: string; userId: string }) => {
      if (String(data.roomId) !== String(roomId)) return;
      const uid = String(data.userId);
      const pc = peerConnectionsRef.current.get(uid);
      if (pc) {
        try {
          pc.onicecandidate = null;
          pc.ontrack = null;
          pc.close();
        } catch {}
        peerConnectionsRef.current.delete(uid);
      }
      const s = remoteStreamsRef.current.get(uid);
      if (s) {
        s.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        remoteStreamsRef.current.delete(uid);
        setRemoteStreamsState(new Map(remoteStreamsRef.current));
      }
    };
    const handleCallState = (data: { roomId: string; type: CallType; participants: string[]; active: boolean; startAt?: number | null }) => {
      if (String(data.roomId) !== String(roomId)) return;
      setRoomCallActive(!!data.active);
      setRoomCallType(data.type);
      setRoomParticipants(Array.isArray(data.participants) ? data.participants.map((x) => String(x)) : []);
      setCallStartAt(typeof data.startAt === 'number' ? data.startAt : null);
      callStartAtRef.current = typeof data.startAt === 'number' ? data.startAt : null;
    };
    socket.on('call_offer', handleCallOffer);
    socket.on('call_answer', handleCallAnswer);
    socket.on('call_candidate', handleCallCandidate);
    socket.on('call_end', handleCallEnd);
    socket.on('call_reject', handleCallReject);
    socket.on('call_leave', handleCallLeave);
    socket.on('call_state', handleCallState);
    return () => {
      socket.off('call_offer', handleCallOffer);
      socket.off('call_answer', handleCallAnswer);
      socket.off('call_candidate', handleCallCandidate);
      socket.off('call_end', handleCallEnd);
      socket.off('call_reject', handleCallReject);
      socket.off('call_leave', handleCallLeave);
      socket.off('call_state', handleCallState);
    };
  }, [roomId, currentUserId, socketRef.current, endCall, acceptIncomingCallWith, socketRef]);

  useEffect(() => {
    setRoomCallActive(false);
    setRoomCallType(null);
    setRoomParticipants([]);
    setCallStartAt(null);
  }, [roomId]);

  useEffect(() => {
    if (remoteStreamsState && remoteStreamsState.size > 0) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [remoteStreamsState]);
  useEffect(() => {
    if (callActive) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      if (callTypeRef.current === 'video') {
        const el = localVideoRef.current;
        const s = localStreamRef.current;
        if (el && s) {
          try {
            el.muted = true;
            (el as HTMLVideoElement & { autoplay?: boolean }).autoplay = true;
          } catch {}
          try {
            // Always rebind in case element mounted after stream started
            (el as HTMLVideoElement & { srcObject?: MediaStream }).srcObject = s;
            void el.play().catch(() => {});
          } catch {}
        }
      }
    }
  }, [callActive]);
  useEffect(() => {
    if (!callConnecting) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [callConnecting]);
  useEffect(() => {
    if (!incomingCall) {
      stopGlobalRingTone();
      if (ringTimeoutRef.current) {
        window.clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    }
  }, [incomingCall]);

  return {
    callActive,
    callType,
    callStartAt,
    callConnecting,
    remoteStreamsState,
    incomingCall,
    localVideoRef,
    startCall,
    endCall,
    toggleMic,
    toggleCamera,
    acceptIncomingCall,
    acceptIncomingCallWith,
    setIncomingCall,
    micEnabled,
    camEnabled,
    roomCallActive,
    roomCallType,
    roomParticipants,
    activeRoomId,
    counterpartId,
  };
}
