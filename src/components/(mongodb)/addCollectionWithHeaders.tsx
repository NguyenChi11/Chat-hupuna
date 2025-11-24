// app\lib\monggodb\addCollectionWithHeaders.tsx

import { connectToDatabase } from './connectToDatabase';

export async function addCollectionWithHeaders(collectionName: string, headers: string[]) {
  const { db } = await connectToDatabase();

  // Collection meta dùng để lưu thông tin cấu trúc
  const metaCollection = db.collection('__collections_meta__');

  // 1. Kiểm tra collection meta xem collection đã tồn tại chưa
  const existing = await metaCollection.findOne({ name: collectionName });
  if (existing) {
    return {
      success: false,
      message: `Collection '${collectionName}' đã tồn tại.`,
    };
  }

  // 2. Lưu thông tin header vào meta
  await metaCollection.insertOne({
    name: collectionName,
    headers,
    createdAt: new Date(),
  });

  // 3. Thêm document rỗng vào collection mới (Mongo sẽ tự tạo collection)
  await db.collection(collectionName).insertOne({
    __init: true,
    createdAt: new Date(),
  });

  // Xóa document rỗng ngay sau đó
  await db.collection(collectionName).deleteOne({ __init: true });

  return {
    success: true,
    message: `Collection '${collectionName}' được tạo thành công`,
    collection: collectionName,
    headers,
  };
}
