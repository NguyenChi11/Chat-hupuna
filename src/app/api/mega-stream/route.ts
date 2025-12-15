import { NextRequest, NextResponse } from 'next/server';
import { File } from 'megajs';

// Đảm bảo route này luôn chạy trên runtime Node.js
export const runtime = 'nodejs';

// Nhận diện lỗi giới hạn băng thông của Mega
function isMegaBandwidthError(error: unknown) {
  const hasMessage = typeof error === 'object' && error !== null && 'message' in (error as Record<string, unknown>);
  const msg = String(hasMessage ? (error as { message?: unknown }).message : (error ?? ''));
  return msg.includes('Bandwidth limit reached');
}

// Lấy số giây còn lại trước khi Mega reset băng thông (nếu có)
function getMegaRetryAfterSeconds(error: unknown): number | undefined {
  const hasMessage = typeof error === 'object' && error !== null && 'message' in (error as Record<string, unknown>);
  const msg = String(hasMessage ? (error as { message?: unknown }).message : (error ?? ''));
  const match = msg.match(/Bandwidth limit reached:\s*(\d+)\s*seconds/);
  if (match) return Number(match[1]);
  const maybeTimeLimit = (error as { timeLimit?: unknown })?.timeLimit;
  if (typeof maybeTimeLimit === 'string' || typeof maybeTimeLimit === 'number') return Number(maybeTimeLimit);
  return undefined;
}

// Helper đơn giản để đoán Content-Type dựa vào đuôi file
function getContentType(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mkv') return 'video/x-matroska';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'avi') return 'video/x-msvideo';

  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'ico') return 'image/x-icon';
  if (ext === 'tif' || ext === 'tiff') return 'image/tiff';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  if (ext === 'avif') return 'image/avif';

  return 'application/octet-stream'; // Mặc định
}

// Chuyển Node.js ReadableStream (từ megajs) sang Web ReadableStream
function nodeToWebStream(nodeStream: NodeJS.ReadableStream, abortSignal?: AbortSignal): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Trạng thái để tránh đóng / báo lỗi controller nhiều lần
      let isClosedOrErrored = false;

      const onData = (chunk: unknown) => {
        try {
          if (isClosedOrErrored) return;
          let uint8: Uint8Array;
          if (chunk instanceof Uint8Array) uint8 = chunk;
          else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(chunk)) uint8 = new Uint8Array(chunk as Buffer);
          else if (chunk instanceof ArrayBuffer) uint8 = new Uint8Array(chunk);
          else if (typeof chunk === 'string') uint8 = new Uint8Array(Buffer.from(chunk));
          else uint8 = new Uint8Array();
          controller.enqueue(uint8);
        } catch (err) {
          if (!isClosedOrErrored) {
            isClosedOrErrored = true;
            controller.error(err instanceof Error ? err : new Error(String(err)));
          }
        }
      };

      const onEnd = () => {
        if (!isClosedOrErrored) {
          isClosedOrErrored = true;
          controller.close();
        }
      };

      const onError = () => {
        if (!isClosedOrErrored) {
          isClosedOrErrored = true;
          // Tránh 500 do pipe error: đóng stream nhẹ nhàng thay vì controller.error
          try {
            controller.close();
          } catch {}
        }
      };

      nodeStream.on('data', onData);
      nodeStream.on('end', onEnd);
      nodeStream.on('error', onError);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          try {
            nodeStream.removeListener('data', onData);
            nodeStream.removeListener('end', onEnd);
            nodeStream.removeListener('error', onError);
            // Hủy stream Node khi client hủy request
            const maybeDestroy = (nodeStream as { destroy?: (err?: Error) => void }).destroy;
            if (typeof maybeDestroy === 'function') maybeDestroy();
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
      const maybeDestroy = (nodeStream as { destroy?: (err?: Error) => void }).destroy;
      if (typeof maybeDestroy === 'function') maybeDestroy();
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
    let contentType = getContentType(fileName);
    const acceptHeader = req.headers.get('accept') || '';
    const wantsImage = acceptHeader.includes('image/');
    const isImageType = contentType.startsWith('image/');
    if (wantsImage && !isImageType) {
      // Trường hợp Next/Image yêu cầu ảnh nhưng không đoán được đuôi -> fallback ảnh phổ biến
      contentType = 'image/jpeg';
    }

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
        nodeStream = file.download({ start, end }) as NodeJS.ReadableStream;
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
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    } else {
      // 3. Trường hợp không có Range (Download thường hoặc ảnh)
      let nodeStream: NodeJS.ReadableStream;
      try {
        nodeStream = file.download({}) as NodeJS.ReadableStream;
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
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
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
