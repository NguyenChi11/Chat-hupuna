// server.js
import { Server } from 'socket.io';

const io = new Server(process.env.PORT || 3001, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const presence = new Map();

io.on('connection', (socket) => {
  let connectedUserId = null;

  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);

    const isTextLike = data.type === 'text' || data.type === 'notify';
    const lastMessage = `${data.senderName}: ${isTextLike ? (data.content ?? '') : `[${data.type ?? 'Unknown'}]`}`;
    const sidebarData = { ...data, lastMessage };

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

  // 🔥 THÊM SOCKET EVENT CHO EDIT MESSAGE
  socket.on('edit_message', (data) => {
    // Broadcast cho người khác trong room (KHÔNG bao gồm người gửi)
    socket.to(data.roomId).emit('message_edited', {
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
    });

    // Update Sidebar
    const sidebarData = {
      _id: data._id,
      roomId: data.roomId,
      sender: data.sender,
      senderName: data.senderName,
      content: data.newContent, // ✅ Field đúng
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

  socket.on('recall_message', (data) => {
    io.in(data.roomId).emit('message_recalled', {
      _id: data._id,
      roomId: data.roomId,
    });

    const sidebarData = {
      ...data,
      content: 'Tin nhắn đã bị thu hồi',
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

