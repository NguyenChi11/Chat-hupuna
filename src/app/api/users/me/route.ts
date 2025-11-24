// app\api\users\\route.ts

import { connectToDatabase } from '@/components/(mongodb)/connectToDatabase';
import { getSession } from '@/lib/session';
import { USERS_COLLECTION_NAME } from '@/types/User';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { db } = await connectToDatabase();

  const sid = req.cookies.get('sid')?.value;
  if (!sid) return NextResponse.json({ success: false }, { status: 401 });

  const session = await getSession(sid);
  if (!session) return NextResponse.json({ success: false }, { status: 401 });

  const user = await db.collection(USERS_COLLECTION_NAME).findOne({ _id: new ObjectId(session.userId) });
  return NextResponse.json({ success: true, user: { ...user, password: undefined } });
}
