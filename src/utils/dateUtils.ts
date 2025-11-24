export const formatTimeAgo = (timestamp?: number | null): string => {
  if (!timestamp) return '';

  const now = Date.now();
  const diff = now - timestamp;

  // Quy đổi ra giây, phút, giờ, ngày
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Vừa xong';
  } else if (minutes < 60) {
    return `${minutes} phút`;
  } else if (hours < 24) {
    return `${hours} giờ`;
  } else if (days < 7) {
    return `${days} ngày`;
  } else {
    // Nếu quá 7 ngày thì hiện ngày tháng (VD: 20/11)
    const date = new Date(timestamp);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
};
