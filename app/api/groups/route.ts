import { NextRequest, NextResponse } from 'next/server';
import { addRow, getAllRows, getCollection } from '@/lib/monggodb/mongoDBCRUD';
import { GROUP_COLLECTION_NAME, GroupConversation, GroupConversationCreate, GroupMemberSchema } from '@/types/Group';
import { ObjectId } from 'mongodb';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, data, _id, conversationId, newMembers, targetUserId } = body;
  const currentUserId = _id;
  try {
    const collection = await getCollection<GroupConversation>(GROUP_COLLECTION_NAME);
    switch (action) {
      // --- TẠO MỘT NHÓM MỚI (Giữ nguyên logic của bạn) ---
      case 'createGroup': {
        if (!data || !data.name || !data.members || data.members.length < 2) {
          return NextResponse.json({ error: 'Missing data or not enough members' }, { status: 400 });
        }

        // Convert mảng ID string -> mảng Object GroupMemberSchema
        const membersWithRole: GroupMemberSchema[] = data.members.map((memberId: string) => ({
          _id: memberId,
          role: memberId === data.createdBy ? 'OWNER' : 'MEMBER',
          joinedAt: Date.now(),
        }));

        const finalData: GroupConversationCreate = {
          name: data.name,
          members: membersWithRole, // 🔥 Lưu object có role
          isGroup: true,
          createdBy: data.createdBy,
          createdAt: Date.now(),
        };

        const newId = await addRow<GroupConversationCreate>(GROUP_COLLECTION_NAME, finalData);
        return NextResponse.json({ success: true, group: { ...finalData, _id: newId } });
      }

      // --- LẤY TẤT CẢ NHÓM MÀ USER NÀY THAM GIA (members là string) ---
      case 'readGroups': {
        if (!_id) {
          return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
        }

        const userIdStr = _id.toString(); // chuẩn hóa thành string

        const filters = { 'members._id': userIdStr, isGroup: true };
        const result = await getAllRows<GroupConversation>(GROUP_COLLECTION_NAME, { filters });
        const conversations = result.data || [];
        if (!conversations.length) return NextResponse.json(result);

        // 1. Lấy tất cả ID thành viên
        const allMemberIds = Array.from(new Set(conversations.flatMap((conv) => conv.members.map((m: any) => m._id))));

        // 2. Query User Info
        const allMemberObjectIds = allMemberIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
        const usersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
          filters: { _id: { $in: allMemberObjectIds } },
        });
        const userMap = new Map<string, User>();
        (usersResult.data || []).forEach((u) => {
          if (u._id) userMap.set(String(u._id), u);
        });

        // 3. Enrich (Thêm tên, avatar vào object member)
        const enrichedConversations = conversations.map((conv) => ({
          ...conv,
          _id: conv._id.toString(),
          members: conv.members.map((mem: any) => {
            const memberInfo = userMap.get(mem._id);
            return memberInfo
              ? { ...mem, name: memberInfo.name, avatar: memberInfo.avatar } // Giữ nguyên role trong mem
              : { ...mem, name: 'Unknown User' };
          }),
        }));

        const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);

        const finalConversations = await Promise.all(
          enrichedConversations.map(async (group) => {
            // 1. Đếm tin chưa đọc (Code cũ)
            const unreadCount = await msgCollection.countDocuments({
              roomId: group._id,
              readBy: { $ne: userIdStr },
            });

            // 2. Lấy tin nhắn cuối (Code cũ)
            const lastMsgs = await msgCollection.find({ roomId: group._id }).sort({ timestamp: -1 }).limit(1).toArray();

            const lastMsgObj = lastMsgs[0];

            const isPinned = group.isPinnedBy?.[userIdStr] === true;
            const isHidden = group.isHiddenBy?.[userIdStr] === true;

            let lastMessagePreview = '';

            if (lastMsgObj) {
              // 🔥 LOGIC LẤY TÊN NGƯỜI GỬI TIN CUỐI 🔥
              let senderName = '';

              if (String(lastMsgObj.sender) === userIdStr) {
                senderName = 'Bạn'; // Nếu chính mình gửi
              } else {
                // Tìm tên trong userMap đã tạo ở bước trên
                // Lưu ý: msg.sender có thể là String hoặc ObjectId, cần convert về string để map
                const senderIdStr = String(lastMsgObj.sender);
                const senderInfo = userMap.get(senderIdStr);
                // Nếu tìm thấy thì lấy tên, k thấy thì lấy "Người lạ"
                senderName = senderInfo ? senderInfo.name : 'Người lạ';

                // Lấy tên ngắn (Tên cuối cùng) cho gọn. VD: "Nguyễn Văn A" -> "A"
                // senderName = senderName.split(' ').pop();
              }
              if (String(lastMsgObj.sender) === userIdStr) {
                senderName = 'Bạn';
              } else {
                const senderIdStr = String(lastMsgObj.sender);
                const senderInfo = userMap.get(senderIdStr);
                senderName = senderInfo ? senderInfo.name : 'Người lạ';
              }
              if (lastMsgObj.isRecalled) {
                // Nếu đã thu hồi -> Ghép tên + thông báo
                lastMessagePreview = `${senderName}: Tin nhắn đã bị thu hồi`;
              } else {
                const content =
                  lastMsgObj.type === 'text' || lastMsgObj.type === 'notify'
                    ? lastMsgObj.content
                    : `[${lastMsgObj.type}]`;
                lastMessagePreview = `${senderName}: ${content}`;
              }
            }

            return {
              ...group,
              unreadCount,
              lastMessage: lastMessagePreview, // Trả về chuỗi đã có tên người gửi
              lastMessageAt: lastMsgObj ? lastMsgObj.timestamp : null,
              isRecall: lastMsgObj ? lastMsgObj.isRecalled || false : false,
              isPinned,
              isHidden,
            };
          }),
        );

        // const visibleConversations = finalConversations.filter(chat => !chat.isHidden);
        return NextResponse.json({
          total: finalConversations.length,
          data: finalConversations,
        });
      }
      case 'addMembers': {
        // 1. Validate input
        if (!conversationId || !newMembers || !Array.isArray(newMembers)) {
          return NextResponse.json({ error: 'Missing conversationId or newMembers' }, { status: 400 });
        }

        try {
          // 2. Chuẩn bị Filter ID
          const filter = { _id: new ObjectId(conversationId) };

          // 3. Chuẩn hóa dữ liệu thành viên mới (String ID -> Object Member)
          // Lưu ý: Mặc định role là 'MEMBER' khi add thêm vào nhóm
          const membersToAdd: GroupMemberSchema[] = newMembers.map((memberId: string) => ({
            _id: memberId,

            role: 'MEMBER',
            joinedAt: Date.now(),
          }));

          // 4. Thực hiện Update
          // Sử dụng collection.updateOne để thao tác trực tiếp và chính xác hơn với ObjectId
          const result = await collection.updateOne(
            filter as any,
            {
              $push: {
                members: { $each: membersToAdd },
              },
            } as any,
          );

          return NextResponse.json({ success: true, result });
        } catch (err) {
          console.error('addMembers Error:', err);
          return NextResponse.json({ error: 'Server error during addMembers' }, { status: 500 });
        }
      }

      case 'changeRole': {
        if (!conversationId || !targetUserId || !data.role) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }
        // Update role của member có _id == targetUserId
        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId), 'members._id': targetUserId } as any,
          { $set: { 'members.$.role': data.role } } as any,
        );
        return NextResponse.json({ success: true, result });
      }

      // --- 🔥 PHÂN QUYỀN: KICK MEMBER ---
      case 'kickMember': {
        if (!conversationId || !targetUserId) return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        const result = await collection.updateOne({ _id: new ObjectId(conversationId) } as any, {
          $pull: { members: { _id: targetUserId } } as any,
        });
        return NextResponse.json({ success: true, result });
      }
      // 🔥 CASE MỚI: TOGGLE PIN/HIDE CHO CHAT NHÓM
      case 'toggleChatStatus': {
        if (!conversationId || !currentUserId || !data) {
          return NextResponse.json({ error: 'Missing ID/Data' }, { status: 400 });
        }

        const updateFields: any = {};

        if (typeof data.isPinned === 'boolean') {
          // Cập nhật isPinnedBy.{currentUserId}
          updateFields[`isPinnedBy.${currentUserId}`] = data.isPinned;
        }
        if (typeof data.isHidden === 'boolean') {
          // Cập nhật isHiddenBy.{currentUserId}
          updateFields[`isHiddenBy.${currentUserId}`] = data.isHidden;
        }

        if (Object.keys(updateFields).length === 0) {
          return NextResponse.json({ error: 'No status provided' }, { status: 400 });
        }

        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as any,
          { $set: updateFields } as any,
        );

        return NextResponse.json({ success: true, result });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Conversations API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
