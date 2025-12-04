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

// 🔥 Helper function để normalize member ID
function normalizeMemberId(member: MemberInput): string | null {
  if (!member) return null;
  if (typeof member === 'string') return member;
  if (typeof member === 'object') {
    if ('_id' in member && member._id) return String(member._id);
    if ('id' in member && member.id) return String(member.id);
  }
  return null;
}

// 🔥 Helper function để tạo filter cho member ID (hỗ trợ cả string và number)
function createMemberIdFilter(memberId: string): Array<Record<string, unknown>> {
  const filters: Array<Record<string, unknown>> = [{ '_id': memberId }];

  // Nếu là số, thêm filter cho number
  if (!isNaN(Number(memberId))) {
    filters.push({ '_id': Number(memberId) });
  }

  // Nếu là ObjectId hợp lệ, thêm filter cho ObjectId
  if (ObjectId.isValid(memberId)) {
    filters.push({ '_id': new ObjectId(memberId) });
  }

  return filters;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as GroupApiRequestBody;
  const { action, data, _id, conversationId, newMembers, targetUserId } = body;
  const currentUserId = _id;

  try {
    const collection = await getCollection<GroupConversation>(GROUP_COLLECTION_NAME);

    switch (action) {
      case 'createGroup': {
        if (!data || !data.name || !Array.isArray(data.members) || data.members.length < 2) {
          return NextResponse.json({ error: 'Missing data or not enough members' }, { status: 400 });
        }

        const membersWithRole: GroupMemberSchema[] = data.members.map((memberId: string) => ({
          _id: memberId,
          role: memberId === data.createdBy ? 'OWNER' : 'MEMBER',
          joinedAt: Date.now(),
        }));

        const finalData: GroupConversationCreate = {
          name: data.name as string,
          members: membersWithRole,
          isGroup: true,
          createdBy: data.createdBy as string,
          createdAt: Date.now(),
        };

        const newId = await addRow<GroupConversationCreate>(GROUP_COLLECTION_NAME, finalData);
        return NextResponse.json({ success: true, group: { ...finalData, _id: newId } });
      }

      case 'readGroups': {
        if (!_id) {
          return NextResponse.json({ error: 'Missing _id' }, { status: 400 });
        }

        const userIdStr = String(_id);

        // 🔥 Tạo filter hỗ trợ nhiều kiểu dữ liệu
        const memberFilters = createMemberIdFilter(userIdStr).map(filter => ({
          'members._id': filter._id
        }));

        const filters = {
          isGroup: true,
          $or: memberFilters,
        };

        const result = await getAllRows<GroupConversation>(GROUP_COLLECTION_NAME, { filters });
        const conversations = result.data || [];
        if (!conversations.length) return NextResponse.json(result);

        // 🔥 Thu thập tất cả member IDs
        const allMemberIds = Array.from(
          new Set(
            conversations.flatMap((conv) =>
              ((conv.members || []) as MemberInput[])
                .map(normalizeMemberId)
                .filter((id): id is string => !!id)
            )
          )
        );

        // 🔥 Tạo filters để query users (hỗ trợ cả string, number và ObjectId)
        const userFilters: Array<Record<string, unknown>> = [];

        allMemberIds.forEach(id => {
          // Thêm filter cho string
          userFilters.push({ _id: id });

          // Nếu là số, thêm filter cho number
          if (!isNaN(Number(id))) {
            userFilters.push({ _id: Number(id) });
          }

          // Nếu là ObjectId hợp lệ, thêm filter cho ObjectId
          if (ObjectId.isValid(id)) {
            userFilters.push({ _id: new ObjectId(id) });
          }
        });

        // Query users với $or filter
        const usersResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
          filters: userFilters.length > 0 ? { $or: userFilters } : {}
        });

        // 🔥 Tạo userMap với nhiều key formats
        const userMap = new Map<string, User>();
        (usersResult.data || []).forEach((u) => {
          if (u._id) {
            const id = String(u._id);
            userMap.set(id, u);

            // Thêm cả key dạng number nếu có thể
            if (!isNaN(Number(id))) {
              userMap.set(String(Number(id)), u);
            }
          }
        });

        // Chuẩn hóa conversations
        const enrichedConversations = conversations.map((conv) => {
          const rawMembers: MemberInput[] = Array.isArray(conv.members) ? (conv.members as MemberInput[]) : [];
          const hasOwner = rawMembers.some((m) => m && typeof m === 'object' && m.role === 'OWNER');

          let ownerIdToAssign: string | null = null;
          const createdByStr = conv.createdBy ? String(conv.createdBy) : null;

          if (!hasOwner && rawMembers.length > 0) {
            if (createdByStr && rawMembers.some((m) => normalizeMemberId(m) === createdByStr)) {
              ownerIdToAssign = createdByStr;
            } else {
              const firstId = normalizeMemberId(rawMembers[0]);
              ownerIdToAssign = firstId;
            }
          }

          const normalizedMembers: MemberInfo[] = rawMembers.map((mem) => {
            const memId = normalizeMemberId(mem);
            const base: Partial<MemberInfo> = typeof mem === 'object' ? { ...mem } : { _id: memId ?? '' };

            if (!base.role || !['OWNER', 'ADMIN', 'MEMBER'].includes(base.role)) {
              if (ownerIdToAssign && memId === ownerIdToAssign) {
                base.role = 'OWNER';
              } else {
                base.role = 'MEMBER';
              }
            }

            // 🔥 Tìm user info với nhiều cách
            let memberInfo: User | undefined;
            if (memId) {
              memberInfo = userMap.get(memId);

              // Thử tìm với number format nếu chưa có
              if (!memberInfo && !isNaN(Number(memId))) {
                memberInfo = userMap.get(String(Number(memId)));
              }
            }

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
            const unreadCount = await msgCollection.countDocuments({
              roomId: group._id,
              readBy: { $ne: userIdStr },
            });

            const lastMsgs = await msgCollection.find({ roomId: group._id }).sort({ timestamp: -1 }).limit(1).toArray();
            const lastMsgObj = lastMsgs[0];
            const isPinned = group.isPinnedBy?.[userIdStr] === true;
            const isHidden = group.isHiddenBy?.[userIdStr] === true;

            let lastMessagePreview = '';

            if (lastMsgObj) {
              let senderName = '';
              const senderIdStr = String(lastMsgObj.sender);

              if (senderIdStr === userIdStr) {
                senderName = 'Bạn';
              } else {
                const senderInfo = userMap.get(senderIdStr) ||
                  userMap.get(String(Number(senderIdStr)));
                senderName = senderInfo ? senderInfo.name : 'Người lạ';
              }

              if (lastMsgObj.isRecalled) {
                lastMessagePreview = `${senderName}: đã thu hồi tin nhắn`;
              } else {
                const content =
                  lastMsgObj.type === 'text' || lastMsgObj.type === 'notify'
                    ? lastMsgObj.content
                    : `[${lastMsgObj.type}]`;
                lastMessagePreview = `${senderName}: ${content}`;
              }
            }

            const fallbackTime = typeof group.createdAt === 'number' ? group.createdAt : Date.now();

            return {
              ...group,
              unreadCount,
              lastMessage: lastMessagePreview,
              lastMessageAt: lastMsgObj ? lastMsgObj.timestamp : fallbackTime,
              isRecall: lastMsgObj ? lastMsgObj.isRecalled || false : false,
              isPinned,
              isHidden,
            };
          }),
        );

        return NextResponse.json({
          total: finalConversations.length,
          data: finalConversations,
        });
      }

      case 'addMembers': {
        if (!conversationId || !newMembers || !Array.isArray(newMembers)) {
          return NextResponse.json({ error: 'Missing conversationId or newMembers' }, { status: 400 });
        }

        const filter = { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>;
        const membersToAdd: GroupMemberSchema[] = newMembers.map((memberId: string) => ({
          _id: memberId,
          role: 'MEMBER',
          joinedAt: Date.now(),
        }));

        const result = await collection.updateOne(filter, {
          $push: {
            members: { $each: membersToAdd },
          },
        } as unknown as UpdateFilter<GroupConversation>);

        return NextResponse.json({ success: true, result });
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

        const targetStr = String(targetUserId);

        // 🔥 THAY ĐỔI: Tìm index của member trong array, sau đó update trực tiếp
        let memberIndex = -1;

        // Tìm index của member cần update
        for (let i = 0; i < members.length; i++) {
          const m = members[i];
          const mId = normalizeMemberId(m);

          // So sánh với nhiều format
          if (mId === targetStr) {
            memberIndex = i;
            break;
          }
          if (!isNaN(Number(mId)) && !isNaN(Number(targetStr)) && Number(mId) === Number(targetStr)) {
            memberIndex = i;
            break;
          }
        }

        if (memberIndex === -1) {
          return NextResponse.json({ error: 'Member not found in group' }, { status: 404 });
        }

        // 🔥 Update trực tiếp bằng cách chỉ định index cụ thể
        const updateField = `members.${memberIndex}.role`;

        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $set: { [updateField]: requestedRole as GroupRole } } as unknown as UpdateFilter<GroupConversation>,
        );

        if (result.modifiedCount === 0) {
          return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
        }

        return NextResponse.json({ success: true, result });
      }
      
      case 'kickMember': {
        if (!conversationId || !targetUserId) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }

        const targetStr = String(targetUserId);

        // 🔥 Tạo pull condition cho nhiều định dạng ID
        const pullConditions: Array<Record<string, unknown>> = [
          { _id: targetStr }
        ];

        if (!isNaN(Number(targetStr))) {
          pullConditions.push({ _id: Number(targetStr) });
        }

        if (ObjectId.isValid(targetStr)) {
          pullConditions.push({ _id: new ObjectId(targetStr) });
        }

        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $pull: { members: { $or: pullConditions } } } as unknown as UpdateFilter<GroupConversation>,
        );

        return NextResponse.json({ success: true, result });
      }

      case 'leaveGroup': {
        if (!conversationId || !currentUserId) {
          return NextResponse.json({ error: 'Missing info' }, { status: 400 });
        }

        const userIdStr = String(currentUserId);
        const group = await collection.findOne({
          _id: new ObjectId(conversationId),
        } as unknown as Filter<GroupConversation>);

        if (!group) {
          return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const members: MemberInput[] = Array.isArray(group.members) ? (group.members as MemberInput[]) : [];
        const ownerMember = members.find((m) => {
          if (!m || typeof m === 'string') return false;
          const id = normalizeMemberId(m);
          return id === userIdStr && m.role === 'OWNER';
        });

        if (!ownerMember) {
          // 🔥 Pull với nhiều format
          const pullConditions: Array<Record<string, unknown>> = [
            { _id: userIdStr }
          ];

          if (!isNaN(Number(userIdStr))) {
            pullConditions.push({ _id: Number(userIdStr) });
          }

          if (ObjectId.isValid(userIdStr)) {
            pullConditions.push({ _id: new ObjectId(userIdStr) });
          }

          const result = await collection.updateOne(
            { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
            { $pull: { members: { $or: pullConditions } } } as unknown as UpdateFilter<GroupConversation>,
          );
          return NextResponse.json({ success: true, result });
        }

        const otherMembers = members.filter(
          (m) => m && typeof m === 'object' && '_id' in m && normalizeMemberId(m) !== userIdStr,
        );

        if (otherMembers.length === 0) {
          await collection.deleteOne({ _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>);
          const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);
          await msgCollection.deleteMany({ roomId: String(conversationId) } as unknown as Filter<Message>);
          return NextResponse.json({ success: true });
        }

        const adminCandidate = otherMembers.find((m) => typeof m === 'object' && m.role === 'ADMIN');
        const nextOwnerCandidate = adminCandidate || otherMembers[Math.floor(Math.random() * otherMembers.length)];
        const nextOwnerId = normalizeMemberId(nextOwnerCandidate) || '';

        // 🔥 Update owner với filter phức tạp
        const ownerFilters: Array<Record<string, unknown>> = [
          { 'members._id': nextOwnerId }
        ];

        if (!isNaN(Number(nextOwnerId))) {
          ownerFilters.push({ 'members._id': Number(nextOwnerId) });
        }

        if (ObjectId.isValid(nextOwnerId)) {
          ownerFilters.push({ 'members._id': new ObjectId(nextOwnerId) });
        }

        await collection.updateOne(
          {
            _id: new ObjectId(conversationId),
            $or: ownerFilters
          } as unknown as Filter<GroupConversation>,
          { $set: { 'members.$.role': 'OWNER' } } as unknown as UpdateFilter<GroupConversation>,
        );

        const pullConditions: Array<Record<string, unknown>> = [
          { _id: userIdStr }
        ];

        if (!isNaN(Number(userIdStr))) {
          pullConditions.push({ _id: Number(userIdStr) });
        }

        if (ObjectId.isValid(userIdStr)) {
          pullConditions.push({ _id: new ObjectId(userIdStr) });
        }

        const result = await collection.updateOne(
          { _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>,
          { $pull: { members: { $or: pullConditions } } } as unknown as UpdateFilter<GroupConversation>,
        );

        return NextResponse.json({ success: true, result });
      }

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
        const ownerId = ownerMember ? normalizeMemberId(ownerMember) : null;

        if (!ownerId || ownerId !== userIdStr) {
          return NextResponse.json({ error: 'Only owner can disband group' }, { status: 403 });
        }

        await collection.deleteOne({ _id: new ObjectId(conversationId) } as unknown as Filter<GroupConversation>);
        const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);
        await msgCollection.deleteMany({ roomId: String(conversationId) } as unknown as Filter<Message>);

        return NextResponse.json({ success: true });
      }

      case 'toggleChatStatus': {
        if (!conversationId || !currentUserId || !data) {
          return NextResponse.json({ error: 'Missing ID/Data' }, { status: 400 });
        }

        const updateFields: Record<string, boolean> = {};

        if (typeof data.isPinned === 'boolean') {
          updateFields[`isPinnedBy.${currentUserId}`] = data.isPinned;
        }
        if (typeof data.isHidden === 'boolean') {
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
