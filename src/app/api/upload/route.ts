// app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { uploadToMega } from '@/lib/megaUploadService';
import { MessageCreate, MessageType } from '@/types/Message';
import { setProgress, clearProgress } from '@/lib/uploadStore';

export async function POST(req: NextRequest) {
  // 1. Lấy ID để tracking
  const uploadId = req.nextUrl.searchParams.get('uploadId') || 'unknown';

  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File;

    // Lấy roomId (Bắt buộc phải có)
    const roomId = form.get('roomId') as string;
    const sender = form.get('sender') as string;
    const receiver = (form.get('receiver') as string) || '';
    const type = form.get('type') as MessageType;
    const customFolderName = form.get('folderName') as string;

    const finalFolderName = customFolderName || `Chat_${roomId}`;

    if (!file) return NextResponse.json({ success: false }, { status: 400 });

    // 2. Chuyển về Buffer (Load vào RAM Server)
    // Lưu ý: Cách này giới hạn file < 200MB (do giới hạn RAM của Serverless Function)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Upload với callback update Store

    const result = await uploadToMega(buffer, file.name, buffer.length, finalFolderName, (percent) => {
      // 🔥 Cập nhật tiến trình vào Store khi Mega báo về
      setProgress(uploadId, percent);
    });


    // Kết thúc: 100%
    setProgress(uploadId, 100);
    setTimeout(() => clearProgress(uploadId), 2000);

    // 4. Trả kết quả
    const messageData: MessageCreate = {
      roomId,
      sender,
      receiver,
      type,
      fileName: file.name,
      fileUrl: result.link,
      timestamp: Date.now(),
    };

    return NextResponse.json({ success: true, link: result.link, data: messageData });
  } catch (err: unknown) {
    console.error('❌ Lỗi:', err);
    setProgress(uploadId, -1); // Báo lỗi

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
