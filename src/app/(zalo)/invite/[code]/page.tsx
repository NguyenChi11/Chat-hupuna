'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import JoinGroupModal from '@/components/(chatPopup)/JoinGroupModal';
import { User } from '@/types/User';
import { resolveSocketUrl } from '@/utils/utils';
import { io } from 'socket.io-client';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const inviteCode = params?.code as string;
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in
    try {
      const user = JSON.parse(localStorage.getItem('info_user') || '{}');
      if (user && user._id) {
        setCurrentUser(user);
        setShowModal(true);
      } else {
        // Redirect to login with return URL
        router.push(`/?redirect=/invite/${inviteCode}`);
      }
    } catch {
      router.push(`/?redirect=/invite/${inviteCode}`);
    }
  }, [inviteCode, router]);

  const handleJoin = async () => {
    if (!currentUser || !inviteCode) return;

    const prevInfoRes = await fetch(`/api/groups/invite/${inviteCode}`);
    const prevInfo = await prevInfoRes.json();
    const prevMembersRaw: Array<string | { _id: string; role?: string; name?: string; avatar?: string }> =
      prevInfo?.group?.members || [];

    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode,
        userId: currentUser._id,
        userName: currentUser.name,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
        throw new Error(data.message || 'Tham gia nhóm thất bại');    
      }
      if (data.notifyId && data.notifyContent && data.groupId) {
    const socket = io(resolveSocketUrl(), { 
      transports: ['websocket'], 
      withCredentials: false 
    });

    socket.on('connect', () => {
      const prevMembers = prevMembersRaw.map((m) =>
        typeof m === 'string'
          ? { _id: String(m) }
          : { _id: String(m._id), role: m.role, name: m.name, avatar: m.avatar },
      );
      const newMember = {
        _id: String(currentUser._id),
        role: 'MEMBER',
        name: currentUser.name,
        avatar: currentUser.avatar,
        joinedAt: Date.now(),
      };
      const nextMembers = [...prevMembers, newMember];

      socket.emit('group_members_updated', {
        roomId: String(data.groupId),
        members: nextMembers,
        prevMembers,
        sender: String(currentUser._id),
        senderName: currentUser.name,
      });

      // Emit thông báo vào room
      socket.emit('send_message', {
        _id: data.notifyId,
        roomId: data.groupId,
        sender: currentUser._id,
        senderName: currentUser.name || 'Thành viên mới',
        type: 'notify',
        content: data.notifyContent,
        timestamp: Date.now(),
        isGroup: true,
        members: nextMembers.map((m) => m._id),
      });

      setTimeout(() => socket.disconnect(), 500);
    });
}

    // Redirect to home/chat
    router.push('/home');
  };

  const handleClose = () => {
    setShowModal(false);
    router.push('/home');
  };

  return (
    <JoinGroupModal
      isOpen={showModal}
      inviteCode={inviteCode}
      onClose={handleClose}
      onJoin={handleJoin}
    />
  );
}
