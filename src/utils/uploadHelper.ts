/**
 * Upload file sử dụng XMLHttpRequest để theo dõi tiến trình (Progress)
 * @param url Đường dẫn API (ví dụ: /api/upload)
 * @param formData Dữ liệu form chứa file
 * @param onProgress Callback nhận % hoàn thành (0 -> 100)
 */
import type { MessageCreate } from '@/types/Message';

export interface UploadSuccessResponse {
  success: true;
  link: string;
  data: MessageCreate;
}

export interface UploadErrorResponse {
  success: false;
  message: string;
}

export type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

export const uploadFileWithProgress = (
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void,
): Promise<UploadResponse> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 1. Lắng nghe sự kiện tiến trình upload (quan trọng nhất)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete); // Gọi callback để cập nhật UI
      }
    };

    // 2. Mở kết nối POST
    xhr.open('POST', url);

    // 3. Xử lý khi hoàn tất
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Parse kết quả trả về từ server (JSON)
          const response = JSON.parse(xhr.responseText) as UploadResponse;
          resolve(response);
        } catch {
          reject('Phản hồi từ server không phải JSON hợp lệ');
        }
      } else {
        reject(xhr.statusText || 'Upload thất bại');
      }
    };

    // 4. Xử lý lỗi mạng
    xhr.onerror = () => {
      reject('Lỗi mạng (Network Error)');
    };

    // 5. Gửi dữ liệu đi
    xhr.send(formData);
  });
};
