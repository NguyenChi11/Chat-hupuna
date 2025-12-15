'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { User } from '../types/User';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'ringing' | 'active' | 'ended';

export interface CallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverIds: string[];
  roomId: string;
  callType: CallType;
  isGroup: boolean;
  status: CallStatus;
  participants: string[];
  startTime?: number;
}

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  roomId: string;
  callType: CallType;
  isGroup: boolean;
}

export function useCall(currentUser: User | null, socket: Socket | null) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [ringtonePlaying, setRingtonePlaying] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const restartAttemptsRef = useRef<Map<string, number>>(new Map());

  // Chuẩn bị tiếng chuông
  useEffect(() => {
    const audio = new Audio('/ringtone.mp3');
    audio.loop = true;
    audio.volume = 0.6;
    ringtoneRef.current = audio;

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
      }
    };
  }, []);

  const playRingtone = useCallback(() => {
    if (!ringtoneRef.current || ringtonePlaying) return;
    ringtoneRef.current
      .play()
      .then(() => setRingtonePlaying(true))
      .catch((err) => console.warn('Cannot play ringtone:', err));
  }, [ringtonePlaying]);

  const stopRingtone = useCallback(() => {
    if (!ringtoneRef.current) return;
    ringtoneRef.current.pause();
    ringtoneRef.current.currentTime = 0;
    setRingtonePlaying(false);
  }, []);

  // Dừng local stream và đóng peer connections
  const endLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc, userId) => {
      console.log('🔌 Closing peer connection with:', userId);
      pc.close();
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    setIsMicMuted(false);
    setIsCameraOff(false);
  }, []);

  // Tạo Peer Connection
  const createPeerConnection = useCallback(
    async (userId: string, callId: string, forceRelay?: boolean): Promise<RTCPeerConnection> => {
      // ✅ Nếu đã tồn tại và đang hoạt động, trả về luôn
      const existing = peerConnectionsRef.current.get(userId);
      if (existing && (existing.connectionState === 'connected' || existing.connectionState === 'connecting')) {
        console.log('♻️ Reusing existing peer connection with:', userId);
        return existing;
      }

      // Đóng connection cũ nếu có
      if (existing) {
        console.log('🔄 Closing old peer connection with:', userId);
        existing.close();
        peerConnectionsRef.current.delete(userId);
      }

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          ...(process.env.NEXT_PUBLIC_TURN_URL && process.env.NEXT_PUBLIC_TURN_USERNAME && process.env.NEXT_PUBLIC_TURN_PASSWORD
            ? [
                {
                  urls: process.env.NEXT_PUBLIC_TURN_URL,
                  username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                  credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
                } as RTCIceServer,
              ]
            : []),
        ],
        iceCandidatePoolSize: 16,
        bundlePolicy: 'max-bundle' as RTCBundlePolicy,
        // You can switch to 'relay' to force TURN for testing restricted networks
        iceTransportPolicy: forceRelay || process.env.NEXT_PUBLIC_FORCE_TURN === 'true' ? 'relay' : 'all',
      };

      const peerConnection = new RTCPeerConnection(configuration);
      console.log('🔗 Created NEW peer connection with:', userId);

      // ✅ CRITICAL: Thêm local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current!);
          console.log('➕ Added local track:', track.kind, 'enabled:', track.enabled);
        });
      }

      // ✅ CRITICAL: Xử lý remote tracks
      peerConnection.ontrack = (event) => {
        console.log('🎵 Received remote track from', userId, ':', {
          kind: event.track.kind,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
        });

        let [remoteStream] = event.streams;
        if (!remoteStream) {
          const ms = new MediaStream();
          ms.addTrack(event.track);
          remoteStream = ms;
        }
        if (remoteStream) {
          // ✅ Enable tất cả tracks
          remoteStream.getTracks().forEach((track) => {
            track.enabled = true;
            console.log('✅ Enabled remote track:', track.kind, track.id);
          });

          remoteStreamsRef.current.set(userId, remoteStream);
          // Trigger re-render
          remoteStreamsRef.current = new Map(remoteStreamsRef.current);
        }
      };

      // ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && currentUser) {
          console.log('🧊 Sending ICE candidate to:', userId);
          socket.emit('call:ice-candidate', {
            callId,
            candidate: event.candidate,
            from: currentUser._id,
            to: userId,
          });
        }
      };

      peerConnection.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', peerConnection.iceGatheringState);
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('🔌 ICE connection state:', peerConnection.iceConnectionState);
      };

      // Connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔄 Peer connection state with ${userId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          console.error('❌ Connection failed with:', userId);
        } else if (peerConnection.connectionState === 'connected') {
          console.log('✅ Connected with:', userId);
        }
      };

      peerConnectionsRef.current.set(userId, peerConnection);
      return peerConnection;
    },
    [socket, currentUser],
  );

  // ✅ NEW: Tạo offer và gửi đến người nhận
  const createAndSendOffer = useCallback(
    async (receiverId: string, callId: string, opts?: { iceRestart?: boolean; forceRelay?: boolean }) => {
      if (!socket || !currentUser) return;

      try {
        // ✅ Kiểm tra xem đã có peer connection chưa
        let peerConnection = peerConnectionsRef.current.get(receiverId);
        
        if (peerConnection) {
          if (opts?.forceRelay) {
            try {
              peerConnection.close();
            } catch {}
            peerConnectionsRef.current.delete(receiverId);
            peerConnection = await createPeerConnection(receiverId, callId, true);
          }
        } else {
          peerConnection = await createPeerConnection(receiverId, callId, opts?.forceRelay);
        }

        console.log('📤 Creating offer for:', receiverId, 'State:', peerConnection.signalingState, 'iceRestart:', !!opts?.iceRestart);

        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: activeCall?.callType === 'video',
          iceRestart: !!opts?.iceRestart,
        });

        await peerConnection.setLocalDescription(offer);
        console.log('✅ Set local description (offer)');

        socket.emit('call:offer', {
          callId,
          offer,
          from: currentUser._id,
          to: receiverId,
        });
      } catch (error) {
        console.error('❌ Error creating offer:', error);
      }
    },
    [socket, currentUser, createPeerConnection, activeCall],
  );

  // Lắng nghe socket events
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleIncomingCall = (data: IncomingCall) => {
      console.log('📥 Received incoming call:', data);
      if (data.callerId !== currentUser._id) {
        setIncomingCall(data);
        playRingtone();
      }
    };

    const handleCallStarted = (data: { callId: string; status: string; startedAt?: number }) => {
      console.log('📞 Call started:', data);
      setActiveCall((prev) => {
        if (prev?.callId === data.callId) {
          return { ...prev, status: data.status as CallStatus, startTime: data.startedAt ?? prev.startTime };
        }
        return prev;
      });
      // Sau khi bắt đầu, không còn incoming
      setIncomingCall((prev) => (prev && prev.callId === data.callId ? null : prev));
    };

    const handleCallAccepted = async (data: {
      callId: string;
      userId: string;
      participants: string[];
    }) => {
      console.log('✅ Call accepted by:', data.userId);

      setActiveCall((prev) => {
        if (prev?.callId === data.callId) {
          return {
            ...prev,
            status: 'active',
            participants: data.participants,
          };
        }
        return prev;
      });

      setIncomingCall(null);
      stopRingtone();

      // ✅ CRITICAL: Người gọi tạo offer sau khi được accept
      if (activeCall && activeCall.callerId === currentUser._id && data.userId !== currentUser._id) {
        console.log('📤 Caller creating offer for:', data.userId);
        await createAndSendOffer(data.userId, data.callId);
        // Fallback: nếu chưa connect sau 3s, thử ICE restart
        setTimeout(async () => {
          const pc = peerConnectionsRef.current.get(data.userId);
          const state = pc?.iceConnectionState;
          if (pc && (state === 'new' || state === 'checking' || state === 'disconnected')) {
            const attempts = (restartAttemptsRef.current.get(data.userId) || 0) + 1;
            if (attempts <= 3) {
              restartAttemptsRef.current.set(data.userId, attempts);
              console.log('🔄 ICE restart attempt', attempts, 'for', data.userId);
              const forceRelay = attempts >= 2;
              await createAndSendOffer(data.userId, data.callId, { iceRestart: true, forceRelay });
            }
          }
        }, 3000);
      }
    };

    const handleCallRejected = (data: { callId: string; userId: string }) => {
      console.log('❌ Call rejected by:', data.userId);
      if (activeCall?.callId === data.callId) {
        setActiveCall(null);
        endLocalStream();
      }
      if (incomingCall?.callId === data.callId) {
        setIncomingCall(null);
      }
      stopRingtone();
    };

    const handleCallEnded = (data: { callId: string; userId: string }) => {
      console.log('🔚 Call ended by:', data.userId);
      if (activeCall?.callId === data.callId || incomingCall?.callId === data.callId) {
        setActiveCall(null);
        setIncomingCall(null);
        endLocalStream();
      }
      stopRingtone();
    };

    const handleCallOffer = async (data: {
      callId: string;
      offer: RTCSessionDescriptionInit;
      from: string;
    }) => {
      console.log('📥 Received offer from:', data.from);
      if (!currentUser) return;

      try {
        // ✅ Kiểm tra xem đã có peer connection chưa
        let peerConnection = peerConnectionsRef.current.get(data.from);
        
        if (peerConnection) {
          console.log('♻️ Peer connection exists, state:', peerConnection.signalingState);
        } else {
          peerConnection = await createPeerConnection(data.from, data.callId);
        }

        // ✅ Chỉ set remote description nếu chưa có
        if (!peerConnection.currentRemoteDescription) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          console.log('✅ Set remote description (offer)');

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log('📤 Sending answer to:', data.from);

          socket.emit('call:answer', {
            callId: data.callId,
            answer,
            from: currentUser._id,
            to: data.from,
          });
        } else {
          console.warn('⚠️ Remote description already set, skipping');
        }
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      }
    };

    const handleCallAnswer = async (data: {
      callId: string;
      answer: RTCSessionDescriptionInit;
      from: string;
    }) => {
      console.log('📥 Received answer from:', data.from);
      const peerConnection = peerConnectionsRef.current.get(data.from);
      
      if (!peerConnection) {
        console.warn('⚠️ No peer connection found for:', data.from);
        return;
      }

      console.log('🔄 Peer connection state:', peerConnection.signalingState);

      // ✅ CRITICAL: Chỉ set remote description khi đang chờ answer
      if (peerConnection.signalingState === 'have-local-offer') {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ Set remote description (answer)');
        } catch (error) {
          console.error('❌ Error setting remote description:', error);
        }
      } else {
        console.warn('⚠️ Peer connection not in correct state for answer:', peerConnection.signalingState);
      }
    };

    const handleIceCandidate = async (data: {
      callId: string;
      candidate: RTCIceCandidateInit;
      from: string;
    }) => {
      console.log('🧊 Received ICE candidate from:', data.from);
      const peerConnection = peerConnectionsRef.current.get(data.from);
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('✅ Added ICE candidate');
        } catch (error) {
          console.error('❌ Error adding ICE candidate:', error);
        }
      }
    };

    const handleParticipantLeft = (data: {
      callId: string;
      userId: string;
      participants: string[];
    }) => {
      console.log('👋 Participant left:', data.userId);
      setActiveCall((prev) => {
        if (prev?.callId === data.callId) {
          return { ...prev, participants: data.participants };
        }
        return prev;
      });

      const peerConnection = peerConnectionsRef.current.get(data.userId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(data.userId);
      }
      remoteStreamsRef.current.delete(data.userId);
      remoteStreamsRef.current = new Map(remoteStreamsRef.current);
    };

    // Đăng ký events
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:started', handleCallStarted);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:participant-left', handleParticipantLeft);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:started', handleCallStarted);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:participant-left', handleParticipantLeft);
    };
  }, [
    socket,
    currentUser,
    activeCall,
    incomingCall,
    endLocalStream,
    createPeerConnection,
    createAndSendOffer,
    playRingtone,
    stopRingtone,
  ]);

  // Bắt đầu cuộc gọi
  const startCall = useCallback(
    async (
      receiverIds: string[],
      roomId: string,
      callType: CallType,
      isGroup: boolean,
    ): Promise<string | null> => {
      if (!socket || !currentUser) {
        console.error('❌ Cannot start call: socket or currentUser is null');
        return null;
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📞 Starting call:', callId);

      // ✅ CRITICAL: Lấy media stream với constraints phù hợp
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callType === 'video',
        });
        
        localStreamRef.current = stream;
        console.log('✅ Got local media stream:', {
          audio: stream.getAudioTracks().length,
          video: stream.getVideoTracks().length,
        });

        // ✅ Verify audio tracks
        stream.getAudioTracks().forEach((track) => {
          console.log('🎤 Audio track:', {
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });
        });
      } catch (error) {
        console.error('❌ Error accessing media:', error);
        alert('Không thể truy cập microphone/camera. Vui lòng kiểm tra quyền truy cập.');
        return null;
      }

      const callData: CallData = {
        callId,
        callerId: currentUser._id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar,
        receiverIds,
        roomId,
        callType,
        isGroup,
        status: 'ringing',
        participants: [currentUser._id],
        startTime: Date.now(),
      };

      setActiveCall(callData);
      setIsMicMuted(false);
      setIsCameraOff(callType !== 'video');

      socket.emit('call:start', {
        callId,
        callerId: currentUser._id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar,
        receiverIds,
        roomId,
        callType,
        isGroup,
      });

      // Bắt đầu phát chuông cho phía gọi
      playRingtone();

      return callId;
    },
    [socket, currentUser, playRingtone],
  );

  // Chấp nhận cuộc gọi
  const acceptCall = useCallback(async () => {
    if (!socket || !currentUser || !incomingCall) {
      console.error('❌ Cannot accept: missing data');
      return;
    }

    console.log('✅ Accepting call:', incomingCall.callId);

    try {
      // ✅ CRITICAL: Lấy media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: incomingCall.callType === 'video',
      });

      localStreamRef.current = stream;
      console.log('✅ Got local media for receiver:', {
        audio: stream.getAudioTracks().length,
        video: stream.getVideoTracks().length,
      });

      // Verify tracks
      stream.getAudioTracks().forEach((track) => {
        console.log('🎤 Receiver audio track:', {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
        });
      });

      // ✅ Emit accept event
      socket.emit('call:accept', {
        callId: incomingCall.callId,
        userId: currentUser._id,
      });

      setActiveCall({
        callId: incomingCall.callId,
        callerId: incomingCall.callerId,
        callerName: incomingCall.callerName,
        callerAvatar: incomingCall.callerAvatar,
        receiverIds: [currentUser._id],
        roomId: incomingCall.roomId,
        callType: incomingCall.callType,
        isGroup: incomingCall.isGroup,
        status: 'active',
        participants: [incomingCall.callerId, currentUser._id],
        startTime: Date.now(),
      });
      setIsMicMuted(false);
      setIsCameraOff(incomingCall.callType !== 'video');

      setIncomingCall(null);
      stopRingtone();
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      alert('Không thể truy cập microphone/camera.');
      socket.emit('call:reject', {
        callId: incomingCall.callId,
        userId: currentUser._id,
      });
      setIncomingCall(null);
    }
  }, [socket, currentUser, incomingCall]);

  // Từ chối cuộc gọi
  const rejectCall = useCallback(() => {
    if (!socket || !currentUser || !incomingCall) return;
    console.log('❌ Rejecting call:', incomingCall.callId);
    socket.emit('call:reject', {
      callId: incomingCall.callId,
      userId: currentUser._id,
    });
    setIncomingCall(null);
    stopRingtone();
  }, [socket, currentUser, incomingCall, stopRingtone]);

  // Kết thúc cuộc gọi
  const endCall = useCallback(() => {
    if (!socket || !currentUser || !activeCall) return;
    console.log('🔚 Ending call:', activeCall.callId);
    socket.emit('call:end', {
      callId: activeCall.callId,
      userId: currentUser._id,
    });
    endLocalStream();
    setActiveCall(null);
    setIsMicMuted(false);
    setIsCameraOff(false);
    stopRingtone();
  }, [socket, currentUser, activeCall, endLocalStream, stopRingtone]);

  // Theo dõi trạng thái để tắt chuông khi đã active
  useEffect(() => {
    if (incomingCall || activeCall?.status === 'ringing') {
      playRingtone();
    } else {
      stopRingtone();
    }
  }, [incomingCall, activeCall?.status, playRingtone, stopRingtone]);

  // Cleanup
  useEffect(() => {
    return () => {
      endLocalStream();
    };
  }, [endLocalStream]);

  return {
    incomingCall,
    activeCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream: localStreamRef.current,
    remoteStreams: remoteStreamsRef.current,
    ringtonePlaying,
    isMicMuted,
    isCameraOff,
    toggleMic: () => {
      const stream = localStreamRef.current;
      if (!stream) return;
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;
      const nextMuted = !isMicMuted;
      audioTracks.forEach((t) => (t.enabled = !nextMuted));
      setIsMicMuted(nextMuted);
    },
    toggleCamera: () => {
      const stream = localStreamRef.current;
      if (!stream || (activeCall && activeCall.callType !== 'video')) return;
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) return;
      const nextOff = !isCameraOff;
      videoTracks.forEach((t) => (t.enabled = !nextOff));
      setIsCameraOff(nextOff);
    },
  };
}
