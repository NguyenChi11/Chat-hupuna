import { NextRequest, NextResponse } from 'next/server';
import { File } from 'megajs';

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

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
  }

  try {
    // 1. Kết nối Mega
    const file = File.fromURL(url);
    await file.loadAttributes(); // Lấy size, tên file

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
      const stream = file.download({ start, end });

      // Trả về status 206 Partial Content
      return new NextResponse(stream as any, {
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
      const stream = file.download({});

      return new NextResponse(stream as any, {
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
