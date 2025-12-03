// app/lib/megaUploadService.ts

import { Storage } from 'megajs';

const MEGA_EMAIL = (process.env.MEGA_EMAIL || '').trim();
const MEGA_PASSWORD = (process.env.MEGA_PASSWORD || '').trim();
const MASTER_FOLDER_NAME = (process.env.MASTER_FOLDER_NAME || 'Uploads').trim();

export async function uploadToMega(
  fileBuffer: Buffer, // 👈 Quay lại dùng Buffer cho ổn định
  originalFileName: string,
  fileSize: number,
  subFolderName: string,
  onProgress?: (percent: number) => void, // 👈 Callback nhận tiến trình
) {
  if (!MEGA_EMAIL || !MEGA_PASSWORD) {
    throw new Error('Thiếu thông tin đăng nhập Mega (MEGA_EMAIL/MEGA_PASSWORD)');
  }

  const storage = new Storage({
    email: MEGA_EMAIL,
    password: MEGA_PASSWORD,
  });

  // Đợi đăng nhập Mega, có timeout để tránh treo
  const ready = new Promise<void>((resolve, reject) => {
    storage.on('ready', () => resolve());
    storage.on('error' as never, (err) => reject(err));
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Đăng nhập Mega quá thời gian')), 15000),
  );
  await Promise.race([ready, timeout]);

  // --- BƯỚC 1 & 2: TẠO FOLDER (Giữ nguyên logic cũ) ---
  let masterFolder = storage.root.children?.find((node) => node.name === MASTER_FOLDER_NAME && node.directory);
  if (!masterFolder) masterFolder = await storage.mkdir(MASTER_FOLDER_NAME);

  const safeSubFolder = subFolderName && subFolderName.trim() ? subFolderName.trim() : 'Default';
  let targetFolder = masterFolder.children?.find((node) => node.name === safeSubFolder && node.directory);
  if (!targetFolder) targetFolder = await masterFolder.mkdir(safeSubFolder);

  // --- BƯỚC 3: UPLOAD ---
  const safeName = originalFileName && originalFileName.trim() ? originalFileName.trim() : `file_${Date.now()}`;
  const uploadTask = targetFolder.upload({ name: safeName, size: fileSize }, fileBuffer);

  // 🔥 LẮNG NGHE TIẾN TRÌNH TỪ CHÍNH MEGAJS
  if (onProgress) {
    uploadTask.on('progress', (stats: { bytesLoaded: number; bytesTotal: number }) => {
      const percent = Math.round((stats.bytesLoaded / stats.bytesTotal) * 100);
      onProgress(percent);
    });
  }

  const link = await new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'complete',
      (uploadedFile: { link: (isPublic: boolean, cb: (err: Error | null, url: string) => void) => void }) => {
        uploadedFile.link(false, (err: Error | null, url: string) => {
          if (err) reject(err);
          else resolve(url);
        });
      },
    );
    uploadTask.on('error', (err: Error) => reject(err));
  });

  return {
    link,
    fileName: safeName,
    folderPath: `${MASTER_FOLDER_NAME}/${safeSubFolder}`,
  };
}
