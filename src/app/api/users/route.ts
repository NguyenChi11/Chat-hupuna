import { NextRequest, NextResponse } from 'next/server';
import { addRow, deleteByField, getAllRows, getCollection, getRowByIdOrCode, updateByField } from '@/lib/mongoDBCRUD';
import { ObjectId } from 'mongodb';
import { User, USERS_COLLECTION_NAME } from '@/types/User';
import { Message, MESSAGES_COLLECTION_NAME } from '@/types/Message';
import { signJWT } from '@/lib/auth';

export async function POST(req: NextRequest) {
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
    isPinned,
    isHidden,
  } = await req.json();

  try {
    switch (action) {
      case 'create': {
        const _id = await addRow<User>(collectionName, data);
        return NextResponse.json({ success: true, _id });
      }

      case 'read': {
        // 1. Dùng getAllRows lấy danh sách User (Tận dụng sẵn)
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
        // 🔥 2. TẬN DỤNG getCollection ĐỂ TÍNH BADGE
        const msgCollection = await getCollection<Message>(MESSAGES_COLLECTION_NAME);

        const usersWithData = await Promise.all(
          users.map(async (u: User) => {
            // Bỏ qua chính mình trong danh sách
            if (String(u._id) === userIdStr) return u;

            // Tạo Room ID 1-1 (Sort để đảm bảo A_B giống B_A)
            const roomId = [userIdStr, String(u._id)].sort().join('_');

            // --- A. Đếm tin chưa đọc ---
            const unreadCount = await msgCollection.countDocuments({
              roomId,
              readBy: { $ne: userIdStr }, // user chưa đọc
            });

            // --- B. Lấy tin nhắn cuối cùng ---
            const lastMsgs = await msgCollection
              .find({ roomId })
              .sort({ timestamp: -1 }) // Mới nhất lên đầu
              .limit(1)
              .toArray();

            let lastMessagePreview = '';
            const lastMsgObj = lastMsgs[0];

            if (lastMsgObj) {
              // Xử lý nội dung (Text hoặc File/Ảnh)
              const content = lastMsgObj.type === 'text' ? lastMsgObj.content : `[${lastMsgObj.type}]`;

              // Xử lý tiền tố "Bạn:"
              if (String(lastMsgObj.sender) === userIdStr) {
                lastMessagePreview = `Bạn: ${content}`;
              } else {
                // Chat 1-1 thì không cần hiện tên người kia, chỉ hiện nội dung
                lastMessagePreview = content || '';
              }
            } else {
              // Nếu chưa có tin nhắn nào
              lastMessagePreview = 'Các bạn đã kết nối với nhau trên Zalo';
            }

            const isPinned = u.isPinnedBy?.[userIdStr] === true;
            const isHidden = u.isHiddenBy?.[userIdStr] === true;
            return {
              ...u,
              unreadCount, // Số tin chưa đọc
              lastMessage: lastMessagePreview, // Nội dung hiển thị bên dưới tên
              lastMessageAt: lastMsgObj ? lastMsgObj.timestamp : null,
              isGroup: false,
              isPinned,
              isHidden,
            };
          }),
        );
        const visibleUsers = usersWithData.filter((u) => !u.isHidden && String(u._id) !== userIdStr);
        return NextResponse.json({ total: usersWithData.length, data: usersWithData });
      }
      case 'getById':
        return NextResponse.json(await getRowByIdOrCode<User>(collectionName, { _id: requestId, code }));

      case 'update':
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value for update' }, { status: 400 });
        }
        try {
          // FIX: Validate ObjectId để tránh crash app nếu value rác
          const fixedValue = field === '_id' && ObjectId.isValid(value) ? new ObjectId(value) : value;
          const result = await updateByField<User>(collectionName, field, fixedValue, data);
          console.log(result);
          return NextResponse.json({ success: true });
        } catch (e) {
          return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

      case 'delete':
        if (!field || value === undefined) {
          return NextResponse.json({ error: 'Missing field or value for delete' }, { status: 400 });
        }
        // FIX: Thêm logic xử lý ObjectId cho delete tương tự update
        const deleteValue = field === '_id' && ObjectId.isValid(value) ? new ObjectId(value) : value;
        await deleteByField<User>(collectionName, field, deleteValue);
        return NextResponse.json({ success: true });
      // 🔥 CASE MỚI: TOGGLE PIN/HIDE CHO CHAT 1-1
      case 'toggleChatStatus': {
        if (!currentUserId || !data || !roomId) {
          return NextResponse.json({ error: 'Missing currentUserId, roomId or data' }, { status: 400 });
        }
        const partnerId = roomId;
        const updateFields: Record<string, boolean> = {};

        if (typeof data.isPinned === 'boolean') {
          updateFields[`isPinnedBy.${currentUserId}`] = data.isPinned;
        }

        // 🔥 FIX: THÊM LOGIC CHO ISHIDDEN
        if (typeof data.isHidden === 'boolean') {
          // Cập nhật trạng thái ẨN của currentUserId trên document của đối tác.
          updateFields[`isHiddenBy.${currentUserId}`] = data.isHidden;
        }

        if (Object.keys(updateFields).length === 0) {
          return NextResponse.json({ error: 'No status provided' }, { status: 400 });
        }

        // Cập nhật document của ĐỐI TÁC (partnerId)
        const result = await updateByField<User>(collectionName, '_id', partnerId, updateFields);

        return NextResponse.json({ success: true, result });
      }
      case 'login': {
        console.log('data: ', data);
        const { username, password } = data || {};
        if (!username || !password)
          return NextResponse.json({ success: false, message: 'Thiếu tên người dùng hoặc mật khẩu!' }, { status: 400 });

        const queryResult = await getAllRows<User>(collectionName, {
          filters: { username, password },
          limit: 1,
        });
        const found = queryResult.data?.[0];
        if (!found)
          return NextResponse.json({ success: false, message: 'Username hoặc Password không đúng!' }, { status: 401 });

        // --- Tạo session ---
        const token = await signJWT({
          _id: found._id,
          username: found.username,
          name: found.name,
        });

        const res = NextResponse.json({
          success: true,
          user: { _id: found._id, name: found.name, username: found.username },
        });

        // 2. Set Cookie HttpOnly (Thay thế cho session DB)
        res.cookies.set('session_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          sameSite: 'lax',
          maxAge: 7 * 24 * 3600, // 7 ngày
        });

        return res;
      }

      case 'logout': {
        const res = NextResponse.json({ success: true });
        res.cookies.set('session_token', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 0,
        });
        return res;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
