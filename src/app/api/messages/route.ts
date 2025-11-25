// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addRow, deleteByField, getAllRows, getRowByIdOrCode, updateByField, updateMany } from '@/lib/mongoDBCRUD';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const {
    action,
    collectionName = MESSAGES_COLLECTION_NAME,
    data,
    filters,
    field,
    value,
    search,
    skip,
    limit,
    _id: requestId,
    code,
    sort,
    roomId,
    userId,
    messageId,
  } = await req.json();

  try {
    switch (action) {
      case 'create': {
        const newData = {
          ...data,
          // Dùng server timestamp để đảm bảo đồng bộ
          timestamp: Date.now(),
          // Người tạo tin nhắn mặc định đã đọc
          readBy: [data.sender],
        };

        // Xóa _id (nếu có) để MongoDB tự sinh ObjectId mới
        if (newData._id) delete newData._id;
        if (newData.id) delete newData.id;

        const newId = await addRow<Message>(collectionName, newData);
        return NextResponse.json({ success: true, _id: newId });
      }

      case 'read': {
        const { roomId, isPinned, searchQuery, ...otherFilters } = filters || {};

        let mongoFilters: any = { ...otherFilters };
        if (roomId) {
          mongoFilters.roomId = roomId;
        }

        if (isPinned !== undefined) {
          mongoFilters.isPinned = isPinned;
        }

        // 🔥 LOGIC TÌM KIẾM CỤC BỘ (SEARCH QUERY)
        if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
          const escapedTerm = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const searchRegex = new RegExp(escapedTerm, 'i');

          // Thêm điều kiện $or để tìm trong content hoặc fileName
          mongoFilters.$or = [
            { content: { $regex: searchRegex } },
            { fileName: { $regex: searchRegex } },
          ];
        }

        // 1. Lấy tin nhắn với filter đã cập nhật
        const result = await getAllRows<Message>(collectionName, {
          search: undefined, // Bỏ search legacy, dùng mongoFilters
          skip,
          limit,
          // field, value, // Không dùng field/value nếu dùng filters
          filters: mongoFilters, // <-- Sử dụng filters đã xây dựng
          sort,
        });

        const messages: Message[] = result.data || [];

        // ... (phần còn lại của case 'read' để lấy thông tin sender và trả về)
        // ... (phần lấy danh sách senderIds, query users, enrichedMessages)

        // Lấy danh sách senderId
        const senderIds = [...new Set(messages.map((m) => String(m.sender)))]
          .filter(ObjectId.isValid)
          .map((id) => new ObjectId(id));

        // ... (các bước lấy userMap và enrichedMessages)

        const usersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
          filters: { _id: { $in: senderIds } },
          limit: 999999,
        });
        const userMap = new Map(usersResult.data?.map((u) => [String(u._id), u]) || []);

        // Map info vào message
        const enrichedMessages = messages.map((msg) => {
          const user = userMap.get(String(msg.sender));
          return {
            ...msg,
            sender: user
              ? { _id: String(user._id), name: user.name, avatar: user.avatar }
              : { _id: msg.sender, name: 'Unknown', avatar: null },
          };
        });

        // 7. Trả về
        return NextResponse.json({
          total: result.total,
          data: enrichedMessages,
        });
      }

      case 'recall': {
        if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
        const result = await updateByField<Message>(collectionName, '_id', messageId, { isRecalled: true });
        return NextResponse.json({ success: true, result });
      }

      case 'markAsRead': {
        if (!roomId || !userId) {
          return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 });
        }

        // 1. Filter: Tìm các tin nhắn trong roomId có userId CHƯA đọc ($ne: not equal)
        const filter = {
          roomId,
          readBy: { $ne: userId },
        };

        // 2. Update: Thêm userId vào mảng readBy của các tin nhắn tìm được ($addToSet)
        const updateData = {
          $addToSet: { readBy: userId },
        };

        const result = await updateMany<Message>(collectionName, filter, updateData);

        return NextResponse.json({ success: true, result });
      }

      case 'togglePin': {
        // messageId: ID tin nhắn cần ghim/bỏ ghim
        // isPinned: Trạng thái mới (true/false) được gửi từ frontend
        if (!messageId || !data || typeof data.isPinned !== 'boolean') {
          return NextResponse.json({ error: 'Missing messageId or invalid data/isPinned status' }, { status: 400 });
        }

        const newPinnedStatus = data.isPinned;

        // Tìm tin nhắn theo ID và cập nhật trường isPinned
        const result = await updateByField<Message>(
          collectionName,
          '_id', // Tìm theo ID
          messageId,
          { isPinned: newPinnedStatus }, // Cập nhật trạng thái mới
        );

        return NextResponse.json({ success: true, result });
      }

      case 'getById':
        return NextResponse.json(await getRowByIdOrCode<Message>(collectionName, { _id: requestId, code }));

      case 'update': {
        if (!field || value === undefined)
          return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
        await updateByField<Message>(collectionName, field, value, data);
        return NextResponse.json({ success: true });
      }

      case 'updateMany': {
        if (!filters || !data) return NextResponse.json({ error: 'Missing filters or data' }, { status: 400 });
        const result = await updateMany<Message>(collectionName, filters, { $set: data });
        return NextResponse.json({
          success: true,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });
      }

      case 'delete': {
        if (!field || value === undefined)
          return NextResponse.json({ error: 'Missing field or value' }, { status: 400 });
        await deleteByField<Message>(collectionName, field, value);
        return NextResponse.json({ success: true });
      }

      case 'globalSearch': {
        const searchTerm = data?.searchTerm;
        const searchUserId = data?.userId;

        if (!searchTerm || !searchUserId) {
          return NextResponse.json({ error: 'Missing userId or searchTerm' }, { status: 400 });
        }

        console.log('🔍 [API] Starting global search:', { searchTerm, searchUserId });

        // ========== BƯỚC 1: LẤY DANH SÁCH GROUP MÀ USER LÀ THÀNH VIÊN ==========
        const groupRoomIds: string[] = [];
        const groupMap = new Map<string, any>();

        try {
          const allGroupsResult = await getAllRows<any>('Groups', {
            filters: {},
            limit: 9999,
          });

          console.log('📊 [API] Total groups in DB:', allGroupsResult.data?.length || 0);

          // 🔥 SỬA LẠI: Filter groups mà user là thành viên
          const userGroups = (allGroupsResult.data || []).filter((g: any) => {
            // Check trong mảng members
            if (g.members && Array.isArray(g.members)) {
              const isMemberInArray = g.members.some((m: any) => {
                const memberId = typeof m === 'string' ? m : String(m._id || m.id || m);
                return String(memberId) === String(searchUserId);
              });

              if (isMemberInArray) return true;
            }

            // // 🔥 THÊM: Check trong isPinnedBy object
            // if (g.isPinnedBy && typeof g.isPinnedBy === 'object') {
            //   if (g.isPinnedBy[searchUserId] !== undefined) {
            //     console.log(`✅ Found user ${searchUserId} in isPinnedBy of group ${g.name}`);
            //     return true;
            //   }
            // }
            //
            // // 🔥 THÊM: Check trong isHiddenBy object (nếu có)
            // if (g.isHiddenBy && typeof g.isHiddenBy === 'object') {
            //   if (g.isHiddenBy[searchUserId] !== undefined) {
            //     return true;
            //   }
            // }

            return false;
          });

          console.log('✅ [API] User groups found:', userGroups.length);

          userGroups.forEach((g: any) => {
            const gId = String(g._id);
            groupRoomIds.push(gId);

            // 🔥 Parse members array đúng cách
            let membersList: string[] = [];
            if (g.members && Array.isArray(g.members)) {
              membersList = g.members.map((m: any) => {
                if (typeof m === 'string') return m;
                if (m && typeof m === 'object') return String(m._id || m.id || m);
                return String(m);
              });
            }

            groupMap.set(gId, {
              _id: gId,
              name: g.name || 'Nhóm',
              avatar: g.avatar,
              isGroup: true,
              members: membersList,
            });
          });

          console.log('📋 [API] Final groupMap:', {
            size: groupMap.size,
            groups: Array.from(groupMap.values()).map((g) => ({
              id: g._id,
              name: g.name,
              membersCount: g.members.length,
            })),
          });
        } catch (e) {
          console.error('❌ [API] Error fetching groups:', e);
        }

        // ========== BƯỚC 2: TẠO REGEX TÌM KIẾM ==========
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedTerm, 'i');

        // ========== BƯỚC 3: LẤY DANH SÁCH ROOMID CHAT 1-1 ==========
        const oneToOneRoomIds: string[] = [];
        const userMap = new Map<string, any>();

        try {
          const allUsersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
            filters: {},
            limit: 9999,
          });

          (allUsersResult.data || []).forEach((u) => {
            userMap.set(String(u._id), u);
          });

          const otherUsers = allUsersResult.data?.filter((u) => String(u._id) !== String(searchUserId)) || [];

          otherUsers.forEach((otherUser) => {
            const ids = [searchUserId, String(otherUser._id)].sort();
            const roomId = `${ids[0]}_${ids[1]}`;
            oneToOneRoomIds.push(roomId);
          });

          console.log('📌 [API] Generated 1-1 roomIds count:', oneToOneRoomIds.length);
        } catch (e) {
          console.error('❌ [API] Error generating 1-1 rooms:', e);
        }

        const allAccessibleRoomIds = [...groupRoomIds, ...oneToOneRoomIds];

        console.log('🎯 [API] All accessible roomIds:', {
          total: allAccessibleRoomIds.length,
          groups: groupRoomIds.length,
          oneToOne: oneToOneRoomIds.length,
          sampleGroupIds: groupRoomIds.slice(0, 3),
          sampleOneToOneIds: oneToOneRoomIds.slice(0, 3),
        });

        // ========== BƯỚC 4: TÌM KIẾM TIN NHẮN ==========
        const searchFilters = {
          $and: [
            {
              $or: [{ content: { $regex: searchRegex } }, { fileName: { $regex: searchRegex } }],
            },
            {
              roomId: { $in: allAccessibleRoomIds },
            },
            { isDeleted: { $ne: true } },
            { isRecalled: { $ne: true } },
          ],
        };

        const searchResults = await getAllRows<Message>(collectionName, {
          filters: searchFilters,
          limit: data.limit || 100,
          sort: { timestamp: -1 },
        });

        const foundMessages: Message[] = searchResults.data || [];

        console.log('🔍 [API] Search results:', {
          searchTerm,
          userId: searchUserId,
          foundMessages: foundMessages.length,
          sampleRoomIds: foundMessages.slice(0, 5).map((m) => m.roomId),
        });

        if (!foundMessages.length) {
          console.log('⚠️ [API] No messages found');
          return NextResponse.json({ success: true, data: [], total: 0 });
        }

        // ========== BƯỚC 5: LÀM GIÀU DỮ LIỆU TIN NHẮN ==========
        const enrichedMessages = foundMessages.map((msg) => {
          const senderId = String(msg.sender);
          const senderUser = userMap.get(senderId);
          const isMyMessage = senderId === searchUserId;

          let chatInfo: any = {
            roomId: msg.roomId,
            roomName: 'Cuộc trò chuyện',
            roomAvatar: null,
            isGroupChat: false,
            partnerId: null,
            partnerName: 'Người dùng',
            partnerAvatar: null,
          };

          // 🔥 CHECK GROUP TRƯỚC
          const isInGroup = groupMap.has(msg.roomId);

          if (isInGroup) {
            const group = groupMap.get(msg.roomId);
            chatInfo.isGroupChat = true;
            chatInfo.roomId = msg.roomId;
            chatInfo.roomName = group.name || 'Nhóm';
            chatInfo.roomAvatar = group.avatar || null;
            chatInfo.partnerId = null;

            console.log(`✅ [ENRICH] Message in GROUP: "${group.name}" (${msg.roomId})`);
          } else {
            // Chat 1-1
            chatInfo.isGroupChat = false;

            let partnerId: string | null = null;

            if (msg.roomId && msg.roomId.includes('_')) {
              const parts = msg.roomId.split('_');
              partnerId = parts[0] === searchUserId ? parts[1] : parts[0];
            } else {
              partnerId = senderId === searchUserId ? (msg.receiver ? String(msg.receiver) : null) : senderId;
            }

            if (partnerId) {
              const partnerUser = userMap.get(partnerId);

              chatInfo.partnerId = partnerId;
              chatInfo.partnerName = partnerUser?.name || 'Người dùng';
              chatInfo.partnerAvatar = partnerUser?.avatar || null;
              chatInfo.roomName = chatInfo.partnerName;
              chatInfo.roomAvatar = chatInfo.partnerAvatar;

              const ids = [searchUserId, partnerId].sort();
              chatInfo.roomId = `${ids[0]}_${ids[1]}`;

              console.log(`💬 [ENRICH] Message in 1-1: "${chatInfo.partnerName}" (${chatInfo.roomId})`);
            }
          }

          // Format content preview
          let contentPreview = '';
          if (msg.type === 'file' && msg.fileName) {
            contentPreview = `📎 ${msg.fileName}`;
          } else if (msg.type === 'image') {
            contentPreview = '🖼️ Hình ảnh';
          } else if (msg.type === 'sticker') {
            contentPreview = '😊 Sticker';
          } else {
            contentPreview = msg.content || 'Tin nhắn';
          }

          const displaySenderName = isMyMessage ? 'Bạn' : senderUser?.name || `User ${senderId.slice(0, 8)}`;
          const displayRoomName = chatInfo.isGroupChat ? chatInfo.roomName : chatInfo.partnerName;

          return {
            _id: String(msg._id),
            type: msg.type,
            content: msg.content,
            fileName: msg.fileName,
            fileUrl: msg.fileUrl,
            timestamp: msg.timestamp,

            sender: senderId,
            senderName: displaySenderName,
            senderAvatar: senderUser?.avatar || null,
            isMyMessage,

            receiver: msg.receiver ? String(msg.receiver) : null,

            ...chatInfo,

            displaySenderName,
            displayRoomName,
            contentPreview,

            replyToMessageId: msg.replyToMessageId,
            replyToMessageName: msg.replyToMessageName,
          };
        });

        // ========== BƯỚC 6: PHÂN LOẠI KẾT QUẢ ==========
        const messagesByType = {
          text: enrichedMessages.filter((m) => m.type === 'text'),
          file: enrichedMessages.filter((m) => m.type === 'file'),
          image: enrichedMessages.filter((m) => m.type === 'image'),
          sticker: enrichedMessages.filter((m) => m.type === 'sticker'),
          all: enrichedMessages,
        };

        const messagesBySource = {
          group: enrichedMessages.filter((m) => m.isGroupChat),
          oneToOne: enrichedMessages.filter((m) => !m.isGroupChat),
          all: enrichedMessages,
        };

        console.log('📊 [API] Final results:', {
          total: enrichedMessages.length,
          groups: messagesBySource.group.length,
          oneToOne: messagesBySource.oneToOne.length,
          byType: {
            text: messagesByType.text.length,
            file: messagesByType.file.length,
            image: messagesByType.image.length,
            sticker: messagesByType.sticker.length,
          },
        });

        return NextResponse.json({
          success: true,
          data: enrichedMessages,
          total: searchResults.total || enrichedMessages.length,
          metadata: {
            searchTerm,
            totalResults: enrichedMessages.length,
            byType: {
              text: messagesByType.text.length,
              file: messagesByType.file.length,
              image: messagesByType.image.length,
              sticker: messagesByType.sticker.length,
            },
            bySource: {
              group: messagesBySource.group.length,
              oneToOne: messagesBySource.oneToOne.length,
            },
          },
        });
      }

      case 'editMessage': {
        const { messageId, newContent } = data;

        // 1. 🔥 LẤY TIN NHẮN HIỆN TẠI ĐỂ LƯU NỘI DUNG GỐC
        const existingMsg = await getRowByIdOrCode<Message>(collectionName, { _id: messageId });

        // 2. Xác định nội dung gốc (nếu originalContent chưa tồn tại)
        const originalContentToSave = existingMsg?.row.originalContent || existingMsg?.row.content;

        if (!messageId || !newContent || typeof newContent !== 'string' || !existingMsg) {
          return NextResponse.json({ error: 'Invalid data or message not found' }, { status: 400 });
        }

        // 3. Cập nhật data
        const updateData = {
          content: newContent,
          editedAt: Date.now(),
          originalContent: originalContentToSave,
        };

        const result = await updateByField<Message>(
          collectionName,
          '_id',
          messageId,
          updateData
        );

        return NextResponse.json({ success: true, result });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MongoDB API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
