export const getProxyUrl = (url?: string) => {
  if (!url) return '';

  // Nếu là link Mega -> Chuyển qua API Stream của mình
  if (url.includes('mega.nz')) {
    return `/api/mega-stream?url=${encodeURIComponent(url)}`;
  }

  // Các link khác (S3, Firebase, External...) -> Giữ nguyên
  return url;
};

// 2. Helper check video (đặt ngoài component)
export const isVideoFile = (fileName?: string) => {
  if (!fileName) return false;
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];
  const ext = fileName.split('.').pop()?.toLowerCase();
  return videoExtensions.includes(ext || '');
};

export const isLink = (str: string | undefined): boolean => {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' + // protocol
      '(' + // Bắt đầu nhóm Hostname
      'localhost|' + // ✅ THÊM DÒNG NÀY: Chấp nhận localhost
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,})|' + // domain name (google.com)
      '((\\d{1,3}\\.){3}\\d{1,3})' + // OR ip (127.0.0.1)
      ')' + // Kết thúc nhóm Hostname
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$', // fragment locator
    'i',
  );
  return !!pattern.test(str || '');
};
