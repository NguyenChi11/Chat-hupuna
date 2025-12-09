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

io.on('connection', (socket) => {
  let connectedUserId = null;

  socket.on('join_room', (room) => {
    const roomId = String(room);
    socket.join(roomId);
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
    io.in(roomId).emit('group_members_updated', {
      roomId,
      members: Array.isArray(data.members) ? data.members : [],
      sender: data.sender,
      senderName: data.senderName,
      timestamp: Date.now(),
    });

    const sidebarData = {
      roomId,
      lastMessage: `${data.senderName || 'Ai đó'}: [Cập nhật thành viên]`,
      type: 'notify',
      timestamp: Date.now(),
      isGroup: true,
      members: Array.isArray(data.members) ? data.members : [],
    };

    const prevMembers = Array.isArray(data.prevMembers) ? data.prevMembers : [];
    const nextMembers = Array.isArray(data.members) ? data.members : [];
    const merged = [...prevMembers, ...nextMembers];
    const recipients = new Set(
      merged
        .map((m) => (typeof m === 'object' && m?._id ? String(m._id) : String(m)))
        .filter((id) => !!id),
    );

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
  });
});
