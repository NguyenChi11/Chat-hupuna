// app/api/upload/progress/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '@/lib/uploadStore';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const percent = getProgress(id);

        // Gửi dữ liệu về client
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ percent })}\n\n`));

        // Nếu xong hoặc lỗi thì dừng
        if (percent >= 100 || percent < 0) {
          clearInterval(interval);
          controller.close();
        }
      }, 200); // Cập nhật mỗi 200ms

      req.signal.addEventListener('abort', () => clearInterval(interval));
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
