import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Khóa bí mật (Trong thực tế nên để trong .env)
const SECRET_KEY = new TextEncoder().encode('mat-khau-nay-phai-cuc-ky-bi-mat-123');
const ALG = 'HS256'; // Thuật toán mã hóa

// 1. Tạo Token (Sign)
export async function signJWT(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d') // Token hết hạn sau 7 ngày
    .sign(SECRET_KEY);
}

// 2. Xác thực Token (Verify)
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: [ALG],
    });
    return payload;
  } catch (error) {
    // Token lỗi hoặc hết hạn
    return null;
  }
}

// 3. Helper: Lấy thông tin User từ Cookie hiện tại
// (Dùng trong Server Components hoặc API Route để biết ai đang gọi)
export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;
  return await verifyJWT(token);
}
