import { NextRequest, NextResponse } from 'next/server';
import { addRow, deleteByField, getAllRows, getCollection, getRowByIdOrCode, updateByField } from '@/lib/mongoDBCRUD';
import { ObjectId } from 'mongodb';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { signJWT } from '@/lib/auth';
// import bcrypt from 'bcryptjs'; // ❌ COMMENT: Không sử dụng bcrypt nữa

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

        // ❌ COMMENT: Không băm mật khẩu nữa, lưu trực tiếp plaintext
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(data.password as string, salt);

        const newData = {
          ...data,
          // password: hashedPassword, // ❌ Lưu hash
          password: data.password, // ✅ Lưu plaintext
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
              const content = lastMsgObj.type === 'text' ? lastMsgObj.content : `[${lastMsgObj.type}]`;

              if (String(lastMsgObj.sender) === userIdStr) {
                lastMessagePreview = `Bạn: ${content}`;
              } else {
                lastMessagePreview = content || '';
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
              isPinned,
              isHidden,
            };
          }),
        );
        return NextResponse.json({ total: usersWithData.length, data: usersWithData });
      }

      case 'getById':
        return NextResponse.json(await getRowByIdOrCode<User>(collectionName, { _id: requestId, code }));

      case 'update':
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value for update' }, { status: 400 });
        }
        try {
          if (field === '_id' && typeof value === 'string' && !ObjectId.isValid(value)) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
          }
          const result = await updateByField<User>(
            collectionName,
            field,
            value as string | number,
            (data || {}) as Partial<User>,
          );
          console.log(result);
          return NextResponse.json({ success: true });
        } catch {
          return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
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

        // ✅ Tìm user bằng username VÀ password (plaintext)
        const queryResult = await getAllRows<User>(collectionName, {
          filters: {
            username,
            password, // ✅ So sánh trực tiếp plaintext
          },
          limit: 1,
        });

        const found = queryResult.data?.[0];

        // Nếu không tìm thấy user
        if (!found) {
          return NextResponse.json({ success: false, message: 'Username hoặc Password không đúng!' }, { status: 401 });
        }

        // ❌ COMMENT: Không cần xác minh bcrypt nữa
        // if (!found.password) {
        //   return NextResponse.json(
        //     { success: false, message: 'Tài khoản cần được cập nhật. Vui lòng liên hệ admin!' },
        //     { status: 401 }
        //   );
        // }

        // ❌ COMMENT: Không cần bcrypt.compare nữa
        // try {
        //   const isPasswordValid = await bcrypt.compare(password, found.password as string);
        //   if (!isPasswordValid) {
        //     return NextResponse.json(
        //       { success: false, message: 'Username hoặc Password không đúng!' },
        //       { status: 401 }
        //     );
        //   }
        // } catch (compareError) {
        //   return NextResponse.json(
        //     { success: false, message: 'Lỗi xác thực. Vui lòng liên hệ admin!' },
        //     { status: 500 }
        //   );
        // }

        // ✅ Đăng nhập thành công (password đã match qua filters)
        const token = await signJWT({
          _id: String(found._id),
          username: String(found.username || ''),
          name: String(found.name || ''),
        });

        const res = NextResponse.json({
          success: true,
          user: {
            _id: String(found._id),
            name: String(found.name || ''),
            username: String(found.username || ''),
            avatar: found.avatar,
            role: found.role,
            department: found.department,
            status: found.status,
          },
        });

        res.cookies.set('session_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 30 * 24 * 3600,
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
        return res;
      }

      case 'changePassword': {
        const changeData = data as { userId?: string; currentPassword?: string; newPassword?: string };
        const { userId, currentPassword, newPassword } = changeData;

        if (!userId || !currentPassword || !newPassword) {
          return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        // 1. Tìm user
        const userDoc = await getRowByIdOrCode<User>(collectionName, { _id: userId });

        if (!userDoc || !userDoc.row.password) {
          return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản' }, { status: 404 });
        }

        // ✅ So sánh plaintext trực tiếp
        if (currentPassword !== userDoc.row.password) {
          return NextResponse.json({ success: false, message: 'Mật khẩu hiện tại không đúng' }, { status: 401 });
        }

        // ❌ COMMENT: Không hash password mới nữa
        // const salt = await bcrypt.genSalt(10);
        // const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // ✅ Cập nhật password mới (plaintext)
        await updateByField<User>(
          collectionName,
          '_id',
          userId,
          { password: newPassword }, // ✅ Lưu plaintext
        );

        console.log('✅ Password changed successfully for userId:', userId);

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
