import { connectToDatabase } from '@/components/(mongodb)/connectToDatabase';
import { getSession, fingerprintFromHeaders } from '@/lib/session';
import { verifyJWT, signJWT } from '@/lib/auth';
import { USERS_COLLECTION_NAME } from '@/types/User';
import { Filter, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 💡 ĐỊNH NGHĨA DOCUMENT USER CƠ BẢN (dùng cho MongoDB Collection)
interface UserDocument {
  _id: ObjectId | number;
  username: string;
  name: string;
  password?: string;
  // 🎯 FIX: Thay thế 'any' bằng 'unknown' để loại bỏ kiểu any và làm cho mã an toàn hơn
  [key: string]: unknown;
}

// 💡 ĐỊNH NGHĨA TYPE CHO FILTER
type UserIdFilter = Filter<UserDocument>;

// --- Định nghĩa Interface cho JWT Payloads để tránh kiểu 'any' ---
interface JWTPayloadBase {
  fp: string;
  [key: string]: unknown; // Đã sử dụng unknown ở đây
}

interface JWTAccessPayload extends JWTPayloadBase {
  _id?: string;
  username?: string;
  name?: string;
}

interface JWTRefreshPayload extends JWTPayloadBase {
  sub?: string; // Subject, thường là userId
  purpose?: 'refresh';
  username?: string;
  name?: string;
}
// ------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { db } = await connectToDatabase();
  let userId: string | null = null;
  let refreshedAccess: string | null = null;
  const fp = fingerprintFromHeaders({
    'user-agent': req.headers.get('user-agent') || '',
    'accept-language': req.headers.get('accept-language') || '',
  });

  const sid = req.cookies.get('sid')?.value || null;
  if (sid) {
    const session = await getSession(sid);
    if (session && session.deviceFingerprint === fp) userId = session.userId;
  }

  if (!userId) {
    const token = req.cookies.get('session_token')?.value || null;
    if (token) {
      // 🎯 FIX: Gán kiểu rõ ràng cho payload của Access Token
      const payload = await verifyJWT(token) as JWTAccessPayload;

      // Truy cập các thuộc tính đã được định kiểu, không còn implicit 'any'
      const pid = payload && typeof payload._id === 'string' ? (payload._id as string) : undefined;
      const tfp = payload && typeof payload.fp === 'string' ? (payload.fp as string) : '';
      if (pid && tfp && tfp === fp) userId = pid;
    }
  }

  if (!userId) {
    const rft = req.cookies.get('refresh_token')?.value || null;
    if (rft) {
      // 🎯 FIX: Gán kiểu rõ ràng cho payload của Refresh Token
      const payload = await verifyJWT(rft) as JWTRefreshPayload;

      // Truy cập các thuộc tính đã được định kiểu
      const sub = payload && typeof payload.sub === 'string' ? (payload.sub as string) : undefined;
      const tfp = payload && typeof payload.fp === 'string' ? (payload.fp as string) : '';

      if (payload && payload.purpose === 'refresh' && sub && tfp === fp) {
        userId = sub;
        // Các trường này đã có kiểu string | undefined, nên không cần kiểm tra kiểu nữa
        const username = typeof payload.username === 'string' ? payload.username : '';
        const name = typeof payload.name === 'string' ? payload.name : '';
        refreshedAccess = await signJWT({ _id: sub, username, name, fp });
      }
    }
  }


  const isValidObjectId = (id: string) => {
    if (!id) return false;
    return id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Khai báo rõ ràng kiểu của query là UserIdFilter
  let query: UserIdFilter;

  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  if (isValidObjectId(userId)) {
    query = { _id: new ObjectId(userId) };
  } else if (!isNaN(Number(userId))) {
    query = { _id: Number(userId) };
  } else {
    return NextResponse.json({ success: false, message: 'Invalid user ID format.' }, { status: 401 });
  }

  // Gán kiểu cho collection bằng <UserDocument> (Đã fix lỗi trước đó)
  const user = await db.collection<UserDocument>(USERS_COLLECTION_NAME).findOne(query);

  const res = NextResponse.json({ success: true, user: { ...user, password: undefined } });
  if (refreshedAccess) {
    res.cookies.set('session_token', refreshedAccess, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
    });
  }
  return res;
}