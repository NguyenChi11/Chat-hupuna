// app\lib\session.ts

import crypto from 'crypto';
import { connectToDatabase } from '../components/(mongodb)/connectToDatabase';

export interface Session {
  _id: string;
  userId: string;
  deviceName?: string;
  deviceFingerprint?: string;
  ip?: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
}

/**
 * Tạo session mới
 */
export async function createSession(params: {
  userId: string;
  deviceName?: string;
  ip?: string;
  headers?: Record<string, string>;
  ttlDays?: number;
}): Promise<string> {
  const { db } = await connectToDatabase();
  const { userId, deviceName = 'web', ip = '', headers = {}, ttlDays = 7 } = params;

  const sid = crypto.randomBytes(32).toString('hex');
  const fingerprint = crypto
    .createHash('sha256')
    .update((headers['user-agent'] || '') + '|' + (headers['accept-language'] || ''))
    .digest('hex');

  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);

  const session: Session = {
    _id: sid,
    userId,
    deviceName,
    deviceFingerprint: fingerprint,
    ip,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    isRevoked: false,
  };

  await db.collection<Session>('sessions').insertOne(session);
  return sid;
}

/**
 * Lấy session theo sid
 */
export async function getSession(sid: string): Promise<Session | null> {
  const { db } = await connectToDatabase();
  if (!sid) return null;
  const session = await db.collection<Session>('sessions').findOne({ _id: sid });
  if (!session || session.isRevoked || session.expiresAt < new Date()) return null;
  return session;
}

/**
 * Cập nhật lastSeenAt
 */
export async function touchSession(sid: string): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<Session>('sessions').updateOne({ _id: sid }, { $set: { lastSeenAt: new Date() } });
}

/**
 * Revoke session
 */
export async function revokeSession(sid: string): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection<Session>('sessions').updateOne({ _id: sid }, { $set: { isRevoked: true } });
}

/**
 * Lấy tất cả session của user
 */
export async function listUserSessions(userId: string): Promise<Session[]> {
  const { db } = await connectToDatabase();
  return db.collection<Session>('sessions').find({ userId, isRevoked: false }).sort({ lastSeenAt: -1 }).toArray();
}

/**
 * Tạo fingerprint từ headers
 */
export function fingerprintFromHeaders(headers: Record<string, string>): string {
  return crypto
    .createHash('sha256')
    .update((headers['user-agent'] || '') + '|' + (headers['accept-language'] || ''))
    .digest('hex');
}
