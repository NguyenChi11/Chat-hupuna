// server.js
import { Server } from 'socket.io';
const io = new Server(
  Number(process.env.SOCKET_PORT || process.env.NEXT_PUBLIC_SOCKET_PORT || process.env.NEXT_PUBLIC_SERVER_PORT || 3002),
  {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  },
);
const presence = new Map();
const callSessions = new Map();
const roomCalls = new Map();

const formatDuration = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec || 0)));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m} phút ${ss} giây`;
};
const buildCallContent = ({ type, incoming, status, durationSec }) => {
  const kind = type === 'video' ? 'video' : 'thoại';
  const dir = incoming ? 'đến' : 'đi';
  if (status === 'answered') return `Cuộc gọi ${kind} ${dir} – ${formatDuration(durationSec || 0)}`;
  if (status === 'rejected') return `Cuộc gọi ${kind} ${dir} – Bị từ chối`;
  return `Cuộc gọi ${kind} ${dir} – Không phản hồi`;
};
const createCallNotify = async ({ roomId, sender, callerId, calleeId, type, status, durationSec }) => {
  try {
    const incoming = String(sender) === String(calleeId);
    const content = buildCallContent({ type, incoming, status, durationSec });
    const receiver = String(sender) === String(callerId) ? String(calleeId) : String(callerId);
    const uniqueId = `notify-${String(roomId)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      _id: uniqueId,
      roomId: String(roomId),
      sender: String(sender),
      senderName: 'Hệ thống',
      isGroup: false,
      receiver,
      members: [],
      type: 'notify',
      content,
      timestamp: Date.now(),
      callerId: String(callerId),
      calleeId: String(calleeId),
      callType: type,
      callStatus: status,
      callDurationSec: typeof durationSec === 'number' ? Math.max(0, Math.floor(durationSec)) : 0,
    };
    io.in(String(roomId)).emit('receive_message', payload);
    const lastMessage = `Hệ thống: ${content}`;
    const sidebarData = { ...payload, lastMessage };
    io.to(String(sender)).emit('update_sidebar', sidebarData);
    io.to(String(receiver)).emit('update_sidebar', sidebarData);
  } catch {}
};

io.on('connection', (socket) => {
  let connectedUserId = null;

  socket.on('join_room', (room) => {
    const roomId = String(room);
    socket.join(roomId);
  });

  socket.on('join_user', (payload) => {
    const userId = typeof payload === 'string' ? payload : String(payload?.userId || '');
    if (!userId) return;
    socket.join(String(userId));
    connectedUserId = String(userId);
  });

  socket.on('send_message', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('receive_message', data);

    const isTextLike = data.type === 'text' || data.type === 'notify';
    const lastMessage = `${data.senderName}: ${isTextLike ? (data.content ?? '') : `[${data.type ?? 'Unknown'}]`}`;
    const sidebarData = { ...data, lastMessage };

    if (data.isGroup && data.members) {
      data.members.forEach((memberId) => {
        const idRaw = typeof memberId === 'object' ? memberId._id : memberId;
        io.to(String(idRaw)).emit('update_sidebar', sidebarData);
      });
    } else if (data.receiver) {
      io.to(String(data.receiver)).emit('update_sidebar', sidebarData);
    }
    if (data.sender) {
      io.to(String(data.sender)).emit('update_sidebar', sidebarData);
    }
  });

  socket.on('group_members_updated', (data) => {
    const roomId = String(data.roomId);
    const members = Array.isArray(data.members) ? data.members : [];
    const payload = {
      roomId,
      members,
      sender: data.sender,
      senderName: data.senderName,
      timestamp: Date.now(),
    };

    // Broadcast vào room (cho những client đang mở phòng)
    io.in(roomId).emit('group_members_updated', payload);

    const sidebarData = {
      roomId,
      lastMessage: `${data.senderName || 'Ai đó'}: [Cập nhật thành viên]`,
      type: 'notify',
      timestamp: Date.now(),
      isGroup: true,
      members,
      groupName: data.groupName,
    };

    const prevMembers = Array.isArray(data.prevMembers) ? data.prevMembers : [];
    const nextMembers = members;
    const merged = [...prevMembers, ...nextMembers];
    const recipients = new Set(
      merged
        .map((m) => (typeof m === 'object' && m?._id ? String(m._id) : String(m)))
        .filter((id) => !!id),
    );

    recipients.forEach((id) => {
      io.to(id).emit('update_sidebar', sidebarData);
      io.to(id).emit('group_members_updated', payload);
    });
    if (data.sender) {
      io.to(String(data.sender)).emit('update_sidebar', sidebarData);
    }
  });

  socket.on('group_created', (data) => {
    const roomId = String(data.roomId);
    const members = Array.isArray(data.members) ? data.members : [];

    const sidebarData = {
      roomId,
      lastMessage: `${data.senderName || 'Ai đó'}: [Tạo nhóm]`,
      type: 'notify',
      timestamp: Date.now(),
      isGroup: true,
      members,
      sender: data.sender,
      senderName: data.senderName,
      groupName: data.groupName,
    };

    const recipients = new Set(
      members
        .map((m) => (typeof m === 'object' && m?._id ? String(m._id) : String(m)))
        .filter(Boolean),
    );

    // Gửi cho tất cả thành viên (bao gồm người tạo)
    recipients.forEach((id) => {
      io.to(id).emit('update_sidebar', sidebarData);
    });
    if (data.sender) {
      io.to(String(data.sender)).emit('update_sidebar', sidebarData);
    }
  });


  

  socket.on('pin_message', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('message_pinned', {
      _id: data._id,
      roomId: data.roomId,
      isPinned: data.isPinned,
    });
  });
  socket.on('toggle_reaction', (data) => {
  
  const roomId = String(data.roomId);
  
  // ✅ Broadcast reaction update tới tất cả clients trong room
  const payload = {
    _id: data._id,
    roomId: data.roomId,
    reactions: data.reactions, // ✅ QUAN TRỌNG: Phải có field này
    editedAt: data.editedAt || Date.now(),
  };
  
  // Emit tới tất cả clients trong room (bao gồm cả sender)
  io.in(roomId).emit('reaction_updated', payload);
  
  // ✅ Optional: Update sidebar nếu cần
  if (data.isGroup && data.members) {
    data.members.forEach((memberId) => {
      const idRaw = typeof memberId === 'object' ? memberId._id : memberId;
      io.to(String(idRaw)).emit('update_sidebar', {
        ...data,
        lastMessage: `${data.senderName || 'Ai đó'}: [Đã thả cảm xúc]`,
        type: 'reaction',
        timestamp: data.editedAt || Date.now(),
      });
    });
  } else if (data.receiver) {
    io.to(String(data.receiver)).emit('update_sidebar', {
      ...data,
      lastMessage: `${data.senderName || 'Ai đó'}: [Đã thả cảm xúc]`,
      type: 'reaction',
      timestamp: data.editedAt || Date.now(),
    });
  }
});
  // 🔥 THÊM SOCKET EVENT CHO EDIT MESSAGE
  socket.on('edit_message', (data) => {
    const payload = {
      _id: data._id,
      roomId: data.roomId,
      content: data.newContent,
      editedAt: data.editedAt,
      originalContent: data.originalContent,
      pollQuestion: data.pollQuestion,
      pollOptions: data.pollOptions,
      pollVotes: data.pollVotes,
      isPollLocked: data.isPollLocked,
      pollLockedAt: data.pollLockedAt,
      // Reminder fields
      reminderAt: data.reminderAt,
      reminderNote: data.reminderNote,
      reminderRepeat: data.reminderRepeat,
      reminderFired: data.reminderFired,
      // Timestamp
      timestamp: data.timestamp,
      // other flags
      isPinned: data.isPinned,
      reactions: data.reactions
    };

    io.in(String(data.roomId)).emit('edit_message', payload);
    io.in(String(data.roomId)).emit('message_edited', payload);

    // Update Sidebar
    if (typeof data.newContent === 'string') {
      const sidebarData = {
        _id: data._id,
        roomId: data.roomId,
        sender: data.sender,
        senderName: data.senderName,
        content: data.newContent,
        lastMessage: `${data.senderName}: ${data.newContent}`,
        type: 'text',
        timestamp: data.editedAt || Date.now(),
        editedAt: data.editedAt,
        isGroup: data.isGroup,
        members: data.members,
        receiver: data.receiver,
      };

      if (data.isGroup && data.members) {
        data.members.forEach((memberId) => {
          const idRaw = typeof memberId === 'object' ? memberId._id : memberId;
          io.to(String(idRaw)).emit('update_sidebar', sidebarData);
        });
      } else if (data.receiver) {
        io.to(String(data.receiver)).emit('update_sidebar', sidebarData);
      }
      if (data.sender) {
        io.to(String(data.sender)).emit('update_sidebar', sidebarData);
      }
    }
  });
  socket.on('folder_item_updated', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('folder_item_updated', data);
  });
  socket.on('folder_tree_updated', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('folder_tree_updated', data);
  });
  socket.on('chatflash_folder_updated', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('chatflash_folder_updated', data);
  });
  socket.on('chatflash_kv_updated', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('chatflash_kv_updated', data);
  });

  socket.on('recall_message', (data) => {
    io.in(data.roomId).emit('message_recalled', {
      _id: data._id,
      roomId: data.roomId,
    });

    const sidebarData = {
      ...data,
      content: 'đã thu hồi tin nhắn',
      type: 'recall',
      isRecalled: true,
    };

    if (data.isGroup && data.members) {
      data.members.forEach((memberId) => {
        const idStr = typeof memberId === 'object' ? memberId._id : memberId;
        io.to(idStr).emit('update_sidebar', sidebarData);
      });
    } else if (data.receiver) {
      io.to(data.receiver).emit('update_sidebar', sidebarData);
    }
    if (data.sender) {
      io.to(data.sender).emit('update_sidebar', sidebarData);
    }
  });

  socket.on('message_deleted', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('message_deleted', {
      _id: data._id,
      roomId: data.roomId,
    });

    const sidebarData = {
      _id: data._id,
      roomId: data.roomId,
      sender: data.sender,
      senderName: data.senderName,
      isGroup: data.isGroup,
      receiver: data.receiver,
      members: data.members,
      type: 'delete',
      timestamp: data.timestamp || Date.now(),
      lastMessage: `${data.senderName || 'Ai đó'}: [Xóa lịch hẹn]`,
    };

    if (data.isGroup && data.members) {
      data.members.forEach((memberId) => {
        const idStr = typeof memberId === 'object' ? memberId._id : memberId;
        io.to(String(idStr)).emit('update_sidebar', sidebarData);
      });
    } else if (data.receiver) {
      io.to(String(data.receiver)).emit('update_sidebar', sidebarData);
    }
    if (data.sender) {
      io.to(String(data.sender)).emit('update_sidebar', sidebarData);
    }
  });

  socket.on('user_online', (payload) => {
    const userId = String(payload?.userId || '');
    if (!userId) return;
    connectedUserId = userId;
    const prev = presence.get(userId) || { online: false, lastSeen: null };
    const next = { online: true, lastSeen: prev.lastSeen };
    presence.set(userId, next);
    io.emit('presence_update', { userId, online: true, lastSeen: next.lastSeen });
  });

  socket.on('heartbeat', (payload) => {
    const userId = String(payload?.userId || connectedUserId || '');
    if (!userId) return;
    const next = { online: true, lastSeen: Date.now() };
    presence.set(userId, next);
    io.emit('presence_update', { userId, online: true, lastSeen: next.lastSeen });
  });

  socket.on('user_offline', (payload) => {
    const userId = String(payload?.userId || connectedUserId || '');
    if (!userId) return;
    const next = { online: false, lastSeen: Date.now() };
    presence.set(userId, next);
    io.emit('presence_update', { userId, online: false, lastSeen: next.lastSeen });
  });

  socket.on('disconnect', () => {
    if (!connectedUserId) return;
    const next = { online: true, lastSeen: Date.now() };
    presence.set(connectedUserId, next);
    roomCalls.forEach((rc, roomId) => {
      if (rc.participants.has(connectedUserId)) {
        rc.participants.delete(connectedUserId);
        const isOneToOne = roomId.includes('_') && roomId.split('_').filter(Boolean).length === 2;
        if (isOneToOne) {
          io.in(roomId).emit('call_end', { roomId });
          rc.active = false;
          rc.participants.clear();
          rc.startAt = null;
        } else {
          if (rc.participants.size === 0) {
            io.in(roomId).emit('call_end', { roomId });
            rc.active = false;
            rc.startAt = null;
          } else {
            io.in(roomId).emit('call_leave', { roomId, userId: connectedUserId });
          }
        }
        roomCalls.set(roomId, rc);
        io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: Array.from(rc.participants), active: rc.active, startAt: rc.startAt || null });
      }
    });
  });

  socket.on('call_offer', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('call_offer', data);
    if (data?.target) io.to(String(data.target)).emit('call_offer', data);
    const key = `${roomId}|${String(data.from)}|${String(data.target)}`;
    callSessions.set(key, { roomId, callerId: String(data.from), calleeId: String(data.target), type: data.type, offerAt: Date.now() });
    const rc = roomCalls.get(roomId) || { type: data.type || 'voice', participants: new Set(), active: false, startAt: null };
    rc.type = data.type || rc.type;
    rc.participants.add(String(data.from));
    roomCalls.set(roomId, rc);
    io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: Array.from(rc.participants), active: rc.active, startAt: rc.startAt || null });
  });

  socket.on('call_answer', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('call_answer', data);
    if (data?.target) io.to(String(data.target)).emit('call_answer', data);
    if (data?.from) io.to(String(data.from)).emit('call_answer', data);
    const key = `${roomId}|${String(data.target)}|${String(data.from)}`;
    const s = callSessions.get(key);
    if (s) callSessions.set(key, { ...s, startAt: Date.now() });
    const rc = roomCalls.get(roomId) || { type: s?.type || 'voice', participants: new Set(), active: false, startAt: null };
    rc.type = (s?.type || rc.type);
    rc.active = true;
    rc.participants.add(String(data.target));
    rc.participants.add(String(data.from));
    if (!rc.startAt) {
      rc.startAt = s?.startAt || Date.now();
    }
    roomCalls.set(roomId, rc);
    io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: Array.from(rc.participants), active: rc.active, startAt: rc.startAt || null });
  });

  socket.on('call_candidate', (data) => {
    const roomId = String(data.roomId);
    io.in(roomId).emit('call_candidate', data);
    if (data?.target) io.to(String(data.target)).emit('call_candidate', data);
  });

  socket.on('call_end', async (data) => {
    const roomId = String(data.roomId);
    const fromId = String(data?.from || connectedUserId || '');
    const targets = Array.isArray(data?.targets) ? data.targets : [];
    const isOneToOne = roomId.includes('_') && roomId.split('_').filter(Boolean).length === 2;
    const rc = roomCalls.get(roomId) || { type: 'voice', participants: new Set(), active: false, startAt: null };
    rc.participants.delete(fromId);
    roomCalls.set(roomId, rc);
    if (isOneToOne) {
      io.in(roomId).emit('call_end', { roomId });
      targets.forEach((t) => io.to(String(t)).emit('call_end', { roomId }));
      for (const t of targets) {
        const key = `${roomId}|${fromId}|${String(t)}`;
        const s = callSessions.get(key);
        if (!s) continue;
        const started = typeof s.startAt === 'number' ? s.startAt : null;
        const ended = Date.now();
        if (started) {
          const durSec = Math.max(0, Math.floor((ended - started) / 1000));
          await createCallNotify({ roomId, sender: fromId, callerId: s.callerId, calleeId: s.calleeId, type: s.type, status: 'answered', durationSec: durSec });
        } else {
          await createCallNotify({ roomId, sender: fromId, callerId: s.callerId, calleeId: s.calleeId, type: s.type, status: 'timeout', durationSec: 0 });
        }
        callSessions.delete(key);
      }
      rc.active = false;
      rc.participants.clear();
      rc.startAt = null;
      roomCalls.set(roomId, rc);
      io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: Array.from(rc.participants), active: rc.active, startAt: rc.startAt });
    } else {
      if (rc.participants.size === 0) {
        io.in(roomId).emit('call_end', { roomId });
        targets.forEach((t) => io.to(String(t)).emit('call_end', { roomId }));
        rc.active = false;
        rc.startAt = null;
        roomCalls.set(roomId, rc);
        io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: [], active: false, startAt: rc.startAt });
      } else {
        io.in(roomId).emit('call_leave', { roomId, userId: fromId });
        io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: Array.from(rc.participants), active: true, startAt: rc.startAt || null });
      }
    }
  });
  socket.on('call_reject', async (data) => {
    const roomId = String(data.roomId);
    const targets = Array.isArray(data?.targets) ? data.targets : [];
    const fromId = String(connectedUserId || '');
    const isOneToOne = roomId.includes('_') && roomId.split('_').filter(Boolean).length === 2;
    if (isOneToOne) {
      io.in(roomId).emit('call_reject', { roomId });
      targets.forEach((t) => io.to(String(t)).emit('call_reject', { roomId }));
    } else {
      io.in(roomId).emit('call_leave', { roomId, userId: fromId });
    }
    for (const t of targets) {
      const key = `${roomId}|${String(t)}|${fromId}`;
      const s = callSessions.get(key);
      const type = s?.type || 'voice';
      const callerId = s?.callerId || String(t);
      const calleeId = s?.calleeId || fromId;
      await createCallNotify({ roomId, sender: fromId, callerId, calleeId, type, status: 'rejected', durationSec: 0 });
      callSessions.delete(key);
    }
    const rc = roomCalls.get(roomId) || { type: 'voice', participants: new Set(), active: false, startAt: null };
    rc.participants.delete(fromId);
    if (isOneToOne) {
      rc.active = false;
      rc.participants.clear();
      rc.startAt = null;
    }
    roomCalls.set(roomId, rc);
    io.in(roomId).emit('call_state', { roomId, type: rc.type, participants: Array.from(rc.participants), active: rc.active, startAt: rc.startAt || null });
  });
});
