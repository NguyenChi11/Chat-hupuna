import { NextRequest, NextResponse } from 'next/server';
import { File } from 'megajs';

// Đảm bảo route này luôn chạy trên runtime Node.js
export const runtime = 'nodejs';

// Nhận diện lỗi giới hạn băng thông của Mega
function isMegaBandwidthError(error: any) {
  const msg = String(error?.message ?? error ?? '');
  return msg.includes('Bandwidth limit reached');
}

// Lấy số giây còn lại trước khi Mega reset băng thông (nếu có)
function getMegaRetryAfterSeconds(error: any): number | undefined {
  const msg = String(error?.message ?? error ?? '');
  const match = msg.match(/Bandwidth limit reached:\s*(\d+)\s*seconds/);
  if (match) return Number(match[1]);
  const timeLimit = (error as any)?.timeLimit;
  if (typeof timeLimit === 'string' || typeof timeLimit === 'number') {
    return Number(timeLimit);
  }
  return undefined;
}

// Helper đơn giản để đoán Content-Type dựa vào đuôi file
function getContentType(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mkv') return 'video/x-matroska';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return 'application/octet-stream'; // Mặc định
}

// Chuyển Node.js ReadableStream (từ megajs) sang Web ReadableStream
function nodeToWebStream(nodeStream: NodeJS.ReadableStream, abortSignal?: AbortSignal): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Trạng thái để tránh đóng / báo lỗi controller nhiều lần
      let isClosedOrErrored = false;

      const onData = (chunk: any) => {
        try {
          if (isClosedOrErrored) return;
          const uint8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
          controller.enqueue(uint8);
        } catch (err) {
          if (!isClosedOrErrored) {
            isClosedOrErrored = true;
            controller.error(err);
          }
        }
      };

      const onEnd = () => {
        if (!isClosedOrErrored) {
          isClosedOrErrored = true;
          controller.close();
        }
      };

      const onError = (err: any) => {
        if (!isClosedOrErrored) {
          isClosedOrErrored = true;
          controller.error(err);
        }
      };

      nodeStream.on('data', onData);
      nodeStream.on('end', onEnd);
      nodeStream.on('error', onError);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          try {
            if (typeof (nodeStream as any).removeListener === 'function') {
              nodeStream.removeListener('data', onData);
              nodeStream.removeListener('end', onEnd);
              nodeStream.removeListener('error', onError);
            }
            nodeStream.removeListener('data', onData);
            nodeStream.removeListener('end', onEnd);
            nodeStream.removeListener('error', onError);
            // Hủy stream Node khi client hủy request
            if (typeof (nodeStream as any).destroy === 'function') {
              (nodeStream as any).destroy();
            }
          } catch {
            // ignore
          } finally {
            // Đảm bảo đóng controller nếu chưa đóng
            if (!isClosedOrErrored) {
              isClosedOrErrored = true;
              try {
                controller.close();
              } catch {
                // ignore
              }
            }
          }
        });
      }
    },
    cancel() {
      if (typeof (nodeStream as any).destroy === 'function') {
        (nodeStream as any).destroy();
      }
    },
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  try {
    // 1. Kết nối Mega
    const file = File.fromURL(url);

    try {
      await file.loadAttributes(); // Lấy size, tên file
    } catch (err) {
      // Mega báo hết băng thông ngay từ bước load metadata
      if (isMegaBandwidthError(err)) {
        const retryAfter = getMegaRetryAfterSeconds(err);
        const headers: Record<string, string> = {};
        if (retryAfter && Number.isFinite(retryAfter)) {
          headers['Retry-After'] = retryAfter.toString();
        }
        return NextResponse.json(
          {
            error: 'Mega đã hết băng thông tải xuống. Vui lòng thử lại sau hoặc dùng tài khoản / IP khác.',
            retryAfterSeconds: retryAfter ?? null,
          },
          { status: 429, headers },
        );
      }
      throw err;
    }

    const fileName = file.name || 'file';
    const fileSize = file.size || 0;
    const contentType = getContentType(fileName);

    // 2. Xử lý Range Request (Quan trọng cho Video streaming)
    // Trình duyệt sẽ gửi header "range: bytes=0-" hoặc "bytes=1000-2000" khi tua video
    const range = req.headers.get('range');

    if (range) {
      // Parse start và end bytes
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      // Tạo luồng đọc CHỈ phần dữ liệu client cần (start -> end)
      let nodeStream: NodeJS.ReadableStream;
      try {
        nodeStream = file.download({ start, end }) as any;
      } catch (err) {
        if (isMegaBandwidthError(err)) {
          const retryAfter = getMegaRetryAfterSeconds(err);
          const headers: Record<string, string> = {};
          if (retryAfter && Number.isFinite(retryAfter)) {
            headers['Retry-After'] = retryAfter.toString();
          }
          return NextResponse.json(
            {
              error: 'Mega đã hết băng thông tải xuống. Vui lòng thử lại sau hoặc dùng tài khoản / IP khác.',
              retryAfterSeconds: retryAfter ?? null,
            },
            { status: 429, headers },
          );
        }
        throw err;
      }
      const webStream = nodeToWebStream(nodeStream, req.signal);

      // Trả về status 206 Partial Content
      return new NextResponse(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
        },
      });
    } else {
      // 3. Trường hợp không có Range (Download thường hoặc ảnh)
      let nodeStream: NodeJS.ReadableStream;
      try {
        nodeStream = file.download({}) as any;
      } catch (err) {
        if (isMegaBandwidthError(err)) {
          const retryAfter = getMegaRetryAfterSeconds(err);
          const headers: Record<string, string> = {};
          if (retryAfter && Number.isFinite(retryAfter)) {
            headers['Retry-After'] = retryAfter.toString();
          }
          return NextResponse.json(
            {
              error: 'Mega đã hết băng thông tải xuống. Vui lòng thử lại sau hoặc dùng tài khoản / IP khác.',
              retryAfterSeconds: retryAfter ?? null,
            },
            { status: 429, headers },
          );
        }
        throw err;
      }

      const webStream = nodeToWebStream(nodeStream, req.signal);

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': contentType,
          // Cache ảnh lâu dài, nhưng video thì cẩn thận cache
          'Cache-Control': contentType.startsWith('image') ? 'public, max-age=31536000, immutable' : 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('Stream Error:', error);
    return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
  }
}
