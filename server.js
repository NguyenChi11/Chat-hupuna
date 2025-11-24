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
    const sidebarData = { ...data, lastMessage }; // Giữ nguyên data gốc

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

  // --- 🔥 SỬA LOGIC THU HỒI TẠI ĐÂY ---
  socket.on('recall_message', (data) => {
    // data nhận được từ client: { _id, roomId, sender, receiver, isGroup, members... }

    // 1. Báo cho Chat Window (cập nhật bong bóng chat ngay lập tức)
    io.in(data.roomId).emit('message_recalled', {
      _id: data._id,
      roomId: data.roomId,
    });

    // 2. Update Sidebar (Quan trọng: Phải ghi đè nội dung hiển thị)
    // const sidebarData = {
    //   ...data,
    //   content: 'Tin nhắn đã bị thu hồi', // Ghi đè nội dung hiển thị ở sidebar
    //   type: 'recall', // Đổi type để frontend có thể style (vd: chữ nghiêng, màu xám)
    //   isRecalled: true,
    // };

    // Gửi cho Group
    if (data.isGroup && data.members) {
      data.members.forEach((memberId) => {
        const idStr = typeof memberId === 'object' ? memberId._id : memberId;
        io.to(idStr).emit('update_sidebar', sidebarData);
      });
    }
    // Gửi cho 1-1
    else if (data.receiver) {
      io.to(data.receiver).emit('update_sidebar', sidebarData);
    }

    // Gửi cho chính mình (Sender) để sidebar mình cũng cập nhật
    if (data.sender) {
      io.to(data.sender).emit('update_sidebar', sidebarData);
    }
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

console.log('Socket.io server running on port 3001');
