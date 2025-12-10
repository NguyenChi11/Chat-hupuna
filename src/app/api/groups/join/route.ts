import { NextRequest, NextResponse } from 'next/server';
import { getAllRows, updateByField, addRow } from '@/lib/mongoDBCRUD';
import { GroupConversation, GroupMemberSchema, GroupRole } from '@/types/Group';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { ObjectId } from 'mongodb';

const GROUPS_COLLECTION = 'Groups';

export async function POST(req: NextRequest) {
  try {
    const { inviteCode, userId, userName: userNameClient } = await req.json();

    if (!inviteCode || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing parameters' 
      }, { status: 400 });
    }

    // ✅ 1. Find group by invite code
    const result = await getAllRows<GroupConversation>(GROUPS_COLLECTION, {
      filters: { inviteCode },
      limit: 1,
    });

    const group = result.data?.[0];

    if (!group) {
      return NextResponse.json({ 
        success: false, 
        message: 'Link không hợp lệ' 
      }, { status: 404 });
    }

    // ✅ 2. Check if already member
    type MemberLike = string | { _id?: string; id?: string };
    const isMember = Array.isArray(group.members)
      ? (group.members as MemberLike[]).some((m) => {
          const memberId = typeof m === 'string' ? m : (m._id ?? m.id);
          return String(memberId) === String(userId);
        })
      : false;

    if (isMember) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bạn đã là thành viên của nhóm',
        groupId: group._id,
        groupName: group.name,
      });
    }

    // ✅ 3. Get user info để lấy tên (thử nhiều cách, có cả ObjectId và số)
    const orFilters: Array<Record<string, unknown>> = [{ username: userId }, { id: userId }, { _id: userId }];
    if (typeof userId === 'string' && ObjectId.isValid(userId)) {
      orFilters.push({ _id: new ObjectId(userId) });
    }
    const asNum = Number(userId);
    if (!Number.isNaN(asNum)) {
      orFilters.push({ _id: asNum });
      orFilters.push({ id: asNum });
    }
    const userResult = await getAllRows<User>(USERS_COLLECTION_NAME, {
      filters: { $or: orFilters },
      limit: 1,
    });

    const user = userResult.data?.[0];
    const userName = (user?.name && String(user.name).trim())
      || (user?.username && String(user.username).trim())
      || (typeof userNameClient === 'string' && userNameClient.trim())
      || String(userId);

    // ✅ 4. Add member to group
    const newMember: GroupMemberSchema = {
      _id: String(userId),
      role: 'MEMBER' as GroupRole,
      joinedAt: Date.now(),
    };

    type RichMemberLike = string | { _id?: string; id?: string; role?: GroupRole | string; joinedAt?: number };
    const normalizedExisting: GroupMemberSchema[] = Array.isArray(group.members)
      ? (group.members as RichMemberLike[]).map((m) => {
          const id = typeof m === 'string' ? m : (m._id ?? m.id);
          const roleRaw = typeof m === 'object' ? m.role : undefined;
          const role: GroupRole = roleRaw === 'OWNER' || roleRaw === 'ADMIN' || roleRaw === 'MEMBER' ? (roleRaw as GroupRole) : 'MEMBER';
          const joinedAtRaw = typeof m === 'object' ? m.joinedAt : undefined;
          const joinedAt = typeof joinedAtRaw === 'number' ? joinedAtRaw : Date.now();
          return { _id: String(id), role, joinedAt };
        })
      : [];

    const updatedMembers: GroupMemberSchema[] = [...normalizedExisting, newMember];

    const updated = await updateByField<GroupConversation>(
      GROUPS_COLLECTION,
      '_id',
      group._id,
      { members: updatedMembers }
    );

    if (!updated) {
      return NextResponse.json({ 
        success: false, 
        message: 'Thêm thành viên thất bại' 
      }, { status: 500 });
    }

    // ✅ 5. TẠO THÔNG BÁO TRONG NHÓM
    const notifyContent = `${userName} đã tham gia nhóm qua link mời`;
    
    const notifyId = await addRow<Partial<Message>>(MESSAGES_COLLECTION_NAME, {
      roomId: String(group._id),
      sender: String(userId),
      type: 'notify',
      content: notifyContent,
      timestamp: Date.now(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Tham gia nhóm thành công',
      groupId: group._id,
      groupName: group.name,
      notifyId, // ✅ Trả về để emit socket
      notifyContent,
    });

  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error' 
    }, { status: 500 });
  }
}
