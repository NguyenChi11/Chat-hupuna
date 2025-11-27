// app\api\users\\route.ts

import { connectToDatabase } from '@/components/(mongodb)/connectToDatabase';
import { getSession } from '@/lib/session';
import { verifyJWT } from '@/lib/auth';
import { USERS_COLLECTION_NAME } from '@/types/User';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { db } = await connectToDatabase();
  let userId: string | null = null;

  const sid = req.cookies.get('sid')?.value || null;
  if (sid) {
    const session = await getSession(sid);
    if (session) userId = session.userId;
  }

  if (!userId) {
    const token = req.cookies.get('session_token')?.value || null;
    if (token) {
      const payload = await verifyJWT(token);
      const pid = payload && typeof payload['_id'] === 'string' ? (payload['_id'] as string) : undefined;
      if (pid) userId = pid;
    }
  }

  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const user = await db.collection(USERS_COLLECTION_NAME).findOne({ _id: new ObjectId(userId) });
  return NextResponse.json({ success: true, user: { ...user, password: undefined } });
}
