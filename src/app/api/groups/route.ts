import { NextRequest, NextResponse } from 'next/server';
import { addRow, getAllRows, getCollection } from '@/lib/mongoDBCRUD';
import { GROUP_COLLECTION_NAME, GroupConversation, GroupConversationCreate, GroupMemberSchema } from '@/types/Group';
import { ObjectId, Filter, UpdateFilter } from 'mongodb';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { MemberInfo, GroupRole } from '@/types/Group';

type MemberInput =
  | string
  | GroupMemberSchema
  | MemberInfo
  | { id?: string; _id?: string; role?: GroupRole; name?: string; avatar?: string };

interface GroupApiRequestBody {
  action: string;
  data?: Record<string, unknown>;
  _id?: string;
  conversationId?: string;
  newMembers?: string[];
  targetUserId?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as GroupApiRequestBody;
  const { action, data, _id, conversationId, newMembers, targetUserId } = body;
  const currentUserId = _id;
  try {
    const collection = await getCollection<GroupConversation>(GROUP_COLLECTION_NAME);
    switch (action) {
      // --- TẠO MỘT NHÓM MỚI (Giữ nguyên logic của bạn) ---
      case 'createGroup': {
        if (!data || !data.name || !Array.isArray(data.members) || data.members.length < 2) {
          return NextResponse.json({ error: 'Missing data or not enough members' }, { status: 400 });
        }

        // Convert mảng ID string -> mảng Object GroupMemberSchema
        const membersWithRole: GroupMemberSchema[] = data.members.map((memberId: string) => ({
          _id: memberId,
          role: memberId === data.createdBy ? 'OWNER' : 'MEMBER',
          joinedAt: Date.now(),
        }));

        const finalData: GroupConversationCreate = {
          name: data.name as string,
          members: membersWithRole, // 🔥 Lưu object có role
          isGroup: true,
          createdBy: data.createdBy as string,
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

        // Chuẩn hóa _id của user thành string để so sánh
        const userIdStr = String(_id);

        // Hỗ trợ cả trường hợp members._id lưu dạng string hoặc ObjectId
        const orFilters: Record<string, unknown>[] = [{ 'members._id': userIdStr }];
        if (ObjectId.isValid(userIdStr)) {
          orFilters.push({ 'members._id': new ObjectId(userIdStr) });
        }

        const filters = {
          isGroup: true,
          $or: orFilters,
        };
        const result = await getAllRows<GroupConversation>(GROUP_COLLECTION_NAME, { filters });
        const conversations = result.data || [];
        if (!conversations.length) return NextResponse.json(result);

        // 1. Lấy tất cả ID thành viên (hỗ trợ cả định dạng cũ: members là string)
        const allMemberIds = Array.from(
          new Set(
            conversations.flatMap((conv) =>
              ((conv.members || []) as MemberInput[]).map((m) => {
                if (!m) return undefined;
                if (typeof m === 'string') return m;
                if (typeof m === 'object' && '_id' in m && m._id) return String(m._id);
                if (typeof m === 'object' && 'id' in m && m.id) return String(m.id);
                return undefined;
              }),
            ),
          ),
        ).filter((id) => !!id);

        // 2. Query User Info
        const allMemberObjectIds = allMemberIds
          .filter((id): id is string => !!id && ObjectId.isValid(id))
          .map((id) => new ObjectId(id));
        const usersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
          filters: { _id: { $in: allMemberObjectIds } },
        });
        const userMap = new Map<string, User>();
        (usersResult.data || []).forEach((u) => {
          if (u._id) userMap.set(String(u._id), u);
        });

        // 3. Chuẩn hóa member & đảm bảo mỗi nhóm có ít nhất 1 OWNER
        const enrichedConversations = conversations.map((conv) => {
          const rawMembers: MemberInput[] = Array.isArray(conv.members) ? (conv.members as MemberInput[]) : [];

          // Tìm xem đã có OWNER chưa
          const hasOwner = rawMembers.some((m) => m && typeof m === 'object' && m.role === 'OWNER');

          // Xác định id người sẽ làm OWNER (ưu tiên createdBy, fallback member đầu tiên)
          let ownerIdToAssign: string | null = null;
          const createdByStr = conv.createdBy ? String(conv.createdBy) : null;

          const getMemberId = (m: MemberInput): string | null => {
            if (!m) return null;
            if (typeof m === 'string') return m;
            if (typeof m === 'object') {
              if ('_id' in m && m._id) return String(m._id);
              if ('id' in m && m.id) return String(m.id);
            }
            return null;
          };

          if (!hasOwner && rawMembers.length > 0) {
            if (createdByStr && rawMembers.some((m) => getMemberId(m) === createdByStr)) {
              ownerIdToAssign = createdByStr;
            } else {
              const firstId = getMemberId(rawMembers[0]);
              ownerIdToAssign = firstId;
            }
          }

          const normalizedMembers: MemberInfo[] = rawMembers.map((mem) => {
            const memId = getMemberId(mem);
            const base: Partial<MemberInfo> = typeof mem === 'object' ? { ...mem } : { _id: memId ?? '' };

            // Gán role mặc định nếu thiếu
            if (!base.role || !['OWNER', 'ADMIN', 'MEMBER'].includes(base.role)) {
              if (ownerIdToAssign && memId === ownerIdToAssign) {
                base.role = 'OWNER';
              } else {
                base.role = 'MEMBER';
              }
            }

            const memberInfo = memId ? userMap.get(memId) : undefined;

            if (memberInfo) {
              return {
                ...(base as MemberInfo),
                _id: memId ?? '',
                name: memberInfo.name,
                avatar: memberInfo.avatar,
              };
            }

            return {
              ...(base as MemberInfo),
              _id: memId ?? '',
              name: base.name ?? 'Unknown User',
            };
          });

          return {
            ...conv,
            _id: conv._id.toString(),
            members: normalizedMembers,
          };
        });

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

            // Nếu nhóm chưa có tin nhắn nào, ưu tiên dùng thời gian tạo nhóm để sort trên sidebar
            const fallbackTime = typeof group.createdAt === 'number' ? group.createdAt : Date.now();

            return {
              ...group,
              unreadCount,
              lastMessage: lastMessagePreview, // Trả về chuỗi đã có tên người gửi
              lastMessageAt: lastMsgObj ? lastMsgObj.timestamp : fallbackTime,
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
          const filter = { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>;

          // 3. Chuẩn hóa dữ liệu thành viên mới (String ID -> Object Member)
          // Lưu ý: Mặc định role là 'MEMBER' khi add thêm vào nhóm
          const membersToAdd: GroupMemberSchema[] = newMembers.map((memberId: string) => ({
            _id: memberId,

            role: 'MEMBER',
            joinedAt: Date.now(),
          }));

          // 4. Thực hiện Update
          // Sử dụng collection.updateOne để thao tác trực tiếp và chính xác hơn với ObjectId
          const result = await collection.updateOne(filter, {
            $push: {
              members: { $each: membersToAdd },
            },
          } as unknown as UpdateFilter<GroupConversation>);
          return NextResponse.json({ success: true, result });
        } catch (err) {
          console.error('addMembers Error:', err);
          return NextResponse.json({ error: 'Server error during addMembers' }, { status: 500 });
        }
      }

      case 'updateAvatar': {
        if (!conversationId || !data?.avatar) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }

        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $set: { avatar: data.avatar as string } } as unknown as UpdateFilter<GroupConversation>,
        );

        return NextResponse.json({ success: true, result });
      }

      case 'renameGroup': {
        if (!conversationId || !data?.name) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }

        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $set: { name: data.name as string } } as unknown as UpdateFilter<GroupConversation>,
        );

        return NextResponse.json({ success: true, result });
      }

      case 'changeRole': {
        if (!conversationId || !targetUserId || !data?.role || !currentUserId) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }
        const group = await collection.findOne({
          _id: new ObjectId(conversationId),
        } as unknown as Filter<GroupConversation>);
        if (!group) {
          return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }
        const members: MemberInput[] = Array.isArray(group.members) ? (group.members as MemberInput[]) : [];
        const ownerMember = members.find(
          (m) => m && typeof m === 'object' && m.role === 'OWNER' && '_id' in m && m._id,
        ) as GroupMemberSchema | undefined;
        const ownerId = ownerMember ? String(ownerMember._id) : null;
        const userIdStr = String(currentUserId);
        if (!ownerId || ownerId !== userIdStr) {
          return NextResponse.json({ error: 'Only owner can change roles' }, { status: 403 });
        }
        const requestedRole = String(data.role);
        if (!['ADMIN', 'MEMBER'].includes(requestedRole)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId), 'members._id': targetUserId } as unknown as Filter<GroupConversation>,
          { $set: { 'members.$.role': requestedRole as GroupRole } } as unknown as UpdateFilter<GroupConversation>,
        );
        return NextResponse.json({ success: true, result });
      }

      // --- 🔥 PHÂN QUYỀN: KICK MEMBER ---
      case 'kickMember': {
        if (!conversationId || !targetUserId) return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $pull: { members: { _id: targetUserId } } } as unknown as UpdateFilter<GroupConversation>,
        );
        return NextResponse.json({ success: true, result });
      }

      // --- RỜI NHÓM: Thành viên tự rời khỏi nhóm ---
      case 'leaveGroup': {
        if (!conversationId || !currentUserId) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }

        const userIdStr = String(currentUserId);

        // Lấy thông tin nhóm hiện tại
        const group = await collection.findOne({
          _id: new ObjectId(conversationId),
        } as unknown as Filter<GroupConversation>);
        if (!group) {
          return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const members: MemberInput[] = Array.isArray(group.members) ? (group.members as MemberInput[]) : [];

        // Xác định xem current user có phải OWNER không
        const ownerMember = members.find((m) => {
          if (!m || typeof m === 'string') return false;
          const id = typeof m === 'object' && '_id' in m ? String(m._id) : '';
          return id === userIdStr && m.role === 'OWNER';
        });

        if (!ownerMember) {
          // Không phải OWNER -> chỉ cần rời nhóm
          const result = await collection.updateOne(
            { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
            { $pull: { members: { _id: userIdStr } } } as unknown as UpdateFilter<GroupConversation>,
          );
          return NextResponse.json({ success: true, result });
        }

        // Nếu là OWNER: tìm người kế nhiệm
        const otherMembers = members.filter(
          (m) => m && typeof m === 'object' && '_id' in m && String(m._id) !== userIdStr,
        );

        if (otherMembers.length === 0) {
          // Không còn ai trong nhóm -> xóa luôn nhóm
          await collection.deleteOne({ _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>);
          const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);
          await msgCollection.deleteMany({ roomId: String(conversationId) } as unknown as Filter<Message>);
          return NextResponse.json({ success: true });
        }

        const adminCandidate = otherMembers.find((m) => typeof m === 'object' && m.role === 'ADMIN');
        const nextOwnerCandidate = adminCandidate || otherMembers[Math.floor(Math.random() * otherMembers.length)];
        const nextOwnerId = String(
          typeof nextOwnerCandidate === 'object' && '_id' in nextOwnerCandidate
            ? nextOwnerCandidate._id
            : nextOwnerCandidate,
        );

        // 1) Nâng quyền người kế nhiệm lên OWNER
        await collection.updateOne(
          { _id: new ObjectId(conversationId), 'members._id': nextOwnerId } as unknown as Filter<GroupConversation>,
          { $set: { 'members.$.role': 'OWNER' } } as unknown as UpdateFilter<GroupConversation>,
        );

        // 2) Xóa OWNER cũ khỏi nhóm
        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $pull: { members: { _id: userIdStr } } } as unknown as UpdateFilter<GroupConversation>,
        );

        return NextResponse.json({ success: true, result });
      }

      // --- GIẢI TÁN NHÓM: Chỉ OWNER mới được phép ---
      case 'disbandGroup': {
        if (!conversationId || !currentUserId) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }

        const group = await collection.findOne({
          _id: new ObjectId(conversationId),
        } as unknown as Filter<GroupConversation>);
        if (!group) {
          return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const userIdStr = String(currentUserId);

        const ownerMember = Array.isArray(group.members)
          ? (group.members as MemberInput[]).find((m) => m && typeof m === 'object' && m.role === 'OWNER' && '_id' in m)
          : null;
        const ownerId = ownerMember ? String((ownerMember as { _id: string | ObjectId })._id) : null;
        if (!ownerId || ownerId !== userIdStr) {
          return NextResponse.json({ error: 'Only owner can disband group' }, { status: 403 });
        }

        // Xóa nhóm
        await collection.deleteOne({ _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>);

        // Xóa toàn bộ tin nhắn của nhóm
        const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);
        await msgCollection.deleteMany({ roomId: String(conversationId) } as unknown as Filter<Message>);

        return NextResponse.json({ success: true });
      }

      // 🔥 CASE MỚI: TOGGLE PIN/HIDE CHO CHAT NHÓM
      case 'toggleChatStatus': {
        if (!conversationId || !currentUserId || !data) {
          return NextResponse.json({ error: 'Missing ID/Data' }, { status: 400 });
        }

        const updateFields: Record<string, boolean> = {};

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
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $set: updateFields } as unknown as UpdateFilter<GroupConversation>,
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
