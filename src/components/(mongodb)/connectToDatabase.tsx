// app\lib\monggodb\connectToDatabase.tsx

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || ''; // Full URI
const MONGODB_DB = process.env.MONGODB_DB || ''; // Database name

if (!MONGODB_URI) {
  throw new Error('⚠️ Please add your Mongo URI to .env.local');
}

if (!MONGODB_DB) {
  throw new Error('⚠️ Please add your Database name to .env.local');
}

// Cache client khi hot-reload (Next.js dev mode)
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
