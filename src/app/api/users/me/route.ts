// app\api\users\\route.ts

import { connectToDatabase } from '@/components/(mongodb)/connectToDatabase';
import { getSession, fingerprintFromHeaders } from '@/lib/session';
import { verifyJWT, signJWT } from '@/lib/auth';
import { USERS_COLLECTION_NAME } from '@/types/User';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
      const payload = await verifyJWT(token);
      const pid = payload && typeof payload['_id'] === 'string' ? (payload['_id'] as string) : undefined;
      const tfp = payload && typeof payload['fp'] === 'string' ? (payload['fp'] as string) : '';
      if (pid && tfp && tfp === fp) userId = pid;
    }
  }

  if (!userId) {
    const rft = req.cookies.get('refresh_token')?.value || null;
    if (rft) {
      const payload = await verifyJWT(rft);
      const sub = payload && typeof payload['sub'] === 'string' ? (payload['sub'] as string) : undefined;
      const tfp = payload && typeof payload['fp'] === 'string' ? (payload['fp'] as string) : '';
      if (payload && payload['purpose'] === 'refresh' && sub && tfp === fp) {
        userId = sub;
        const username = typeof payload['username'] === 'string' ? (payload['username'] as string) : '';
        const name = typeof payload['name'] === 'string' ? (payload['name'] as string) : '';
        refreshedAccess = await signJWT({ _id: sub, username, name, fp });
      }
    }
  }

  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const user = await db.collection(USERS_COLLECTION_NAME).findOne({ _id: new ObjectId(userId) });
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
