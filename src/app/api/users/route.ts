import { NextRequest, NextResponse } from 'next/server';
import { addRow, deleteByField, getAllRows, getCollection, getRowByIdOrCode, updateByField } from '@/lib/mongoDBCRUD';
import { Filter, ObjectId } from 'mongodb';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { signJWT, signEphemeralJWT } from '@/lib/auth';
import { createSession, fingerprintFromHeaders } from '@/lib/session';

export const runtime = 'nodejs';

type UserSort = { field: keyof User; order?: 'asc' | 'desc' } | Array<{ field: keyof User; order?: 'asc' | 'desc' }>;

interface ToggleChatStatusPayload {
  isPinned?: boolean;
  isHidden?: boolean;
}

interface LoginPayload {
  username?: string;
  password?: string;
}

type UsersRequestData = Partial<User> & ToggleChatStatusPayload & LoginPayload & Record<string, unknown>;

interface UsersRequestBody {
  action?:
    | 'create'
    | 'read'
    | 'getById'
    | 'update'
    | 'delete'
    | 'toggleChatStatus'
    | 'login'
    | 'logout'
    | 'changePassword';
  collectionName?: string;
  data?: UsersRequestData;
  field?: keyof User;
  value?: unknown;
  filters?: Record<string, unknown>;
  search?: string;
  skip?: number;
  limit?: number;
  _id?: string;
  code?: string;
  sort?: UserSort;
  currentUserId?: string;
  roomId?: string;
  isPinned?: boolean;
  isHidden?: boolean;
}

// 🔥 Helper function để tạo query filter cho _id
function createIdFilter(id: string | number): ObjectId | number {
  if (typeof id === 'number') {
    return id;
  }

  const idStr = String(id);

  // Kiểm tra nếu là ObjectId hợp lệ
  if (ObjectId.isValid(idStr) && idStr.length === 24) {
    return new ObjectId(idStr);
  }

  // Kiểm tra nếu là số
  if (!isNaN(Number(idStr))) {
    return Number(idStr);
  }

  // Mặc định trả về string (trường hợp đặc biệt)
  return idStr as unknown as number;
}

// 🔥 Type-safe filter cho User với _id
type UserIdFilter = Filter<User> & { _id: ObjectId | number };

export async function POST(req: NextRequest) {
  let body: UsersRequestBody = {};
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = (await req.json()) as UsersRequestBody;
    }
  } catch (err) {
    console.warn('Invalid JSON body in /api/users:', err);
    body = {};
  }

  const {
    action,
    collectionName = USERS_COLLECTION_NAME,
    data,
    field,
    value,
    filters,
    search,
    skip,
    limit,
    _id: requestId,
    code,
    sort,
    currentUserId,
    roomId,
  } = body;

  try {
    switch (action) {
      case 'create': {
        if (!data || !data.password) {
          return NextResponse.json({ error: 'Missing data or password' }, { status: 400 });
        }

        const newData = {
          ...data,
          password: data.password, // Lưu plaintext
        };

        const _id = await addRow<User>(collectionName, newData as User);
        return NextResponse.json({ success: true, _id });
      }

      case 'read': {
        const result = await getAllRows<User>(collectionName, {
          search,
          skip,
          limit,
          field,
          value,
          filters,
          sort,
        });

        const users = result.data || [];

        if (!currentUserId) {
          return NextResponse.json(result);
        }
        const userIdStr = String(currentUserId);
        const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);

        const usersWithData = await Promise.all(
          users.map(async (u: User) => {
            if (String(u._id) === userIdStr) return u;

            const roomId = [userIdStr, String(u._id)].sort().join('_');

            const unreadCount = await msgCollection.countDocuments({
              roomId,
              readBy: { $ne: userIdStr },
            });

            const lastMsgs = await msgCollection.find({ roomId }).sort({ timestamp: -1 }).limit(1).toArray();

            let lastMessagePreview = '';
            const lastMsgObj = lastMsgs[0];

            if (lastMsgObj) {
              if(lastMsgObj.isRecalled) {
                const isMySender = String(lastMsgObj.sender) === userIdStr;
                const senderName = isMySender ? 'Bạn' : u.name  || 'Người dùng';
                lastMessagePreview = `${senderName}: đã thu hồi tin nhắn`;
              }else{
                const content =
                  lastMsgObj.type === 'text' || lastMsgObj.type === 'notify'
                    ? lastMsgObj.content
                    : `[${lastMsgObj.type}]`;

                if (String(lastMsgObj.sender) === userIdStr) {
                  lastMessagePreview = `Bạn: ${content}`;
              } else {
                lastMessagePreview = content || '';
              }
              }
              
            } else {
              lastMessagePreview = 'Các bạn đã kết nối với nhau trên Zalo';
            }

            const isPinned = u.isPinnedBy?.[userIdStr] === true;
            const isHidden = u.isHiddenBy?.[userIdStr] === true;
            return {
              ...u,
              unreadCount,
              lastMessage: lastMessagePreview,
              lastMessageAt: lastMsgObj ? lastMsgObj.timestamp : null,
              isGroup: false,
              isRecall:lastMsgObj ? lastMsgObj.isRecalled || false : false,
              isPinned,
              isHidden,
            };
          }),
        );
        return NextResponse.json({ total: usersWithData.length, data: usersWithData });
      }

      case 'getById': {
        const idStr = requestId ? String(requestId) : '';
        const isObjId = idStr ? ObjectId.isValid(idStr) && idStr.length === 24 : false;
        const isNumeric = idStr ? !isNaN(Number(idStr)) : false;

        if (isObjId || isNumeric || code) {
          return NextResponse.json(await getRowByIdOrCode<User>(collectionName, { _id: idStr, code }));
        }

        if (!idStr) return NextResponse.json(null);

        const result = await getAllRows<User>(collectionName, {
          filters: { $or: [{ username: idStr }, { _id: idStr }] },
          limit: 1,
        });
        const row = (result.data || [])[0];
        return NextResponse.json(row ? { rowIndex: 0, row } : null);
      }

      case 'update':
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value for update' }, { status: 400 });
        }
        try {
          if (field === '_id') {
            const userCollection = await getCollection<User>(collectionName);
            const idStr = String(value);

            const orFilters: Array<Record<string, unknown>> = [{ _id: idStr }];
            if (!isNaN(Number(idStr))) {
              orFilters.push({ _id: Number(idStr) });
            }
            if (ObjectId.isValid(idStr) && idStr.length === 24) {
              orFilters.push({ _id: new ObjectId(idStr) });
            }

            const result = await userCollection.updateOne({ $or: orFilters } as Filter<User>, { $set: data || {} });

            if (result.matchedCount === 0) {
              return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, modified: result.modifiedCount });
          } else {
            await updateByField<User>(collectionName, field, value as string | number, (data || {}) as Partial<User>);
            return NextResponse.json({ success: true });
          }
        } catch (error) {
          console.error('Update error:', error);
          return NextResponse.json({ error: 'Invalid ID format or update failed' }, { status: 400 });
        }

      case 'delete':
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value for delete' }, { status: 400 });
        }
        const deleteValue =
          field === '_id' && typeof value === 'string' && ObjectId.isValid(value)
            ? new ObjectId(value)
            : (value as string | number);
        await deleteByField<User>(collectionName, field, deleteValue as string | number);
        return NextResponse.json({ success: true });

      case 'toggleChatStatus': {
        if (!currentUserId || !data || !roomId) {
          return NextResponse.json({ error: 'Missing currentUserId, roomId or data' }, { status: 400 });
        }
        const statusData = data as ToggleChatStatusPayload;
        const partnerId = roomId;
        const updateFields: Record<string, boolean> = {};

        if (typeof statusData.isPinned === 'boolean') {
          updateFields[`isPinnedBy.${currentUserId}`] = statusData.isPinned;
        }

        if (typeof statusData.isHidden === 'boolean') {
          updateFields[`isHiddenBy.${currentUserId}`] = statusData.isHidden;
        }

        if (Object.keys(updateFields).length === 0) {
          return NextResponse.json({ error: 'No status provided' }, { status: 400 });
        }

        const result = await updateByField<User>(collectionName, '_id', partnerId, updateFields);
        return NextResponse.json({ success: true, result });
      }

      case 'login': {
        const loginData = (data || {}) as LoginPayload;
        const { username, password } = loginData;

        if (!username || !password) {
          return NextResponse.json({ success: false, message: 'Thiếu tên người dùng hoặc mật khẩu!' }, { status: 400 });
        }

        const queryResult = await getAllRows<User>(collectionName, {
          filters: {
            username,
            password,
          },
          limit: 1,
        });

        const found = queryResult.data?.[0];

        if (!found) {
          return NextResponse.json({ success: false, message: 'Username hoặc Password không đúng!' }, { status: 401 });
        }

        const fp = fingerprintFromHeaders({
          'user-agent': req.headers.get('user-agent') || '',
          'accept-language': req.headers.get('accept-language') || '',
        });
        const sid = await createSession({
          userId: String(found._id),
          deviceName: 'web',
          headers: {
            'user-agent': req.headers.get('user-agent') || '',
            'accept-language': req.headers.get('accept-language') || '',
          },
        });
        const token = await signJWT({
          _id: String(found._id),
          username: String(found.username || ''),
          name: String(found.name || ''),
          sid,
          fp,
        });

        const res = NextResponse.json({
          success: true,
          token,
          user: {
            _id: String(found._id),
            name: String(found.name || ''),
            username: String(found.username || ''),
            avatar: found.avatar,
            role: found.role,
            department: found.department,
            status: found.status,
            phone: found['phone'],
            gender: found['gender'],
            birthday: found['birthday'],
            email: found['email'],
            address: found['address'],
            title: found['title'],
          },
        });

        res.cookies.set('session_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 30 * 24 * 3600,
        });
        res.cookies.set('sid', sid, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 7 * 24 * 3600,
        });

        const refreshToken = await signEphemeralJWT(
          {
            purpose: 'refresh',
            sub: String(found._id),
            username: String(found.username || ''),
            name: String(found.name || ''),
            fp,
          },
          90 * 24 * 3600,
        );
        res.cookies.set('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 90 * 24 * 3600,
        });

        return res;
      }

      case 'logout': {
        const res = NextResponse.json({ success: true });
        res.cookies.set('session_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });
        res.cookies.set('sid', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });
        res.cookies.set('refresh_token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        });
        return res;
      }

      case 'changePassword': {
        const changeData = data as { userId?: string; currentPassword?: string; newPassword?: string };
        const { userId, currentPassword, newPassword } = changeData;

        if (!userId || !currentPassword || !newPassword) {
          return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        // 🔥 FIX: Xử lý cả ObjectId và number
        const userCollection = await getCollection<User>(collectionName);
        const queryId = createIdFilter(userId);

        // 🔥 Type-safe filter
        const filter: UserIdFilter = { _id: queryId } as UserIdFilter;

        const userDoc = await userCollection.findOne(filter);

        if (!userDoc || !userDoc.password) {
          return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản' }, { status: 404 });
        }

        // So sánh plaintext trực tiếp
        if (currentPassword !== userDoc.password) {
          return NextResponse.json({ success: false, message: 'Mật khẩu hiện tại không đúng' }, { status: 401 });
        }

        // Cập nhật password mới (plaintext)
        await userCollection.updateOne(filter, { $set: { password: newPassword } });
        return NextResponse.json({
          success: true,
          message: 'Đổi mật khẩu thành công',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
