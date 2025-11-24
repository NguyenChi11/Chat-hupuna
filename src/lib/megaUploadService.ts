// app/lib/megaUploadService.ts

import { Storage } from 'megajs';

const MEGA_EMAIL = process.env.MEGA_EMAIL || 'tuonghue2303@gmail.com';
const MEGA_PASSWORD = process.env.MEGA_PASSWORD || 'vanhue102';
const MASTER_FOLDER_NAME = 'Hupuna_chat';

export async function uploadToMega(
  fileBuffer: Buffer, // 👈 Quay lại dùng Buffer cho ổn định
  originalFileName: string,
  fileSize: number,
  subFolderName: string,
  onProgress?: (percent: number) => void, // 👈 Callback nhận tiến trình
) {
  const storage = new Storage({
    email: MEGA_EMAIL,
    password: MEGA_PASSWORD,
  });

  await new Promise<void>((resolve, reject) => {
    storage.on('ready', () => resolve());
    storage.on('error' as any, (err) => reject(err));
  });

  // --- BƯỚC 1 & 2: TẠO FOLDER (Giữ nguyên logic cũ) ---
  let masterFolder = storage.root.children?.find((node) => node.name === MASTER_FOLDER_NAME && node.directory);
  if (!masterFolder) masterFolder = await storage.mkdir(MASTER_FOLDER_NAME);

  let targetFolder = masterFolder.children?.find((node) => node.name === subFolderName && node.directory);
  if (!targetFolder) targetFolder = await masterFolder.mkdir(subFolderName);

  // --- BƯỚC 3: UPLOAD ---
  const uploadTask = targetFolder.upload({ name: originalFileName, size: fileSize }, fileBuffer);

  // 🔥 LẮNG NGHE TIẾN TRÌNH TỪ CHÍNH MEGAJS
  if (onProgress) {
    uploadTask.on('progress', (stats: { bytesLoaded: number; bytesTotal: number }) => {
      const percent = Math.round((stats.bytesLoaded / stats.bytesTotal) * 100);
      onProgress(percent);
    });
  }

  const link = await new Promise<string>((resolve, reject) => {
    uploadTask.on('complete', (uploadedFile: any) => {
      uploadedFile.link(false, (err: Error | null, url: string) => {
        if (err) reject(err);
        else resolve(url);
      });
    });
    uploadTask.on('error', (err: any) => reject(err));
  });

  return {
    link,
    fileName: originalFileName,
    folderPath: `${MASTER_FOLDER_NAME}/${subFolderName}`,
  };
}
