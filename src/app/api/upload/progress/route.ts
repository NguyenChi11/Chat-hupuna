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
        const raw = getProgress(id);
        const percent = raw;
        const done = percent >= 100 || percent < 0 || percent === -1;
        const payload = { id, percent, formattedPercent: `${Math.round(Math.max(0, percent))}%`, done };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        if (done) {
          clearInterval(interval);
          controller.close();
        }
      }, 250);

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
