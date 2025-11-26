// server.js
import { Server } from 'socket.io';

const io = new Server(3001, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);

    // Logic Update Sidebar cho send_message
    const lastMessage = `${data.senderName}: ${data.type != 'text' ? `[${data.type ?? 'Unknown'}]` : data.content}`;
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

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

console.log('Socket.io server running on port 3001');
