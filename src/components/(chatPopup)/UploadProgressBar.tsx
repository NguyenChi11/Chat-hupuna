import React from 'react';
import { HiCheckBadge, HiCloudArrowUp } from 'react-icons/hi2'; // Icon upload

interface UploadProgressBarProps {
  uploadingCount: number;
  overallUploadPercent: number;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ uploadingCount, overallUploadPercent }) => {
  if (uploadingCount <= 0) return null;

  const progress = Math.max(4, Math.round(overallUploadPercent)); // không bao giờ 0% để thấy thanh

  return (
    <div className="sm:mx-1 sm:mt-1 sm:mb-3 sm:relative fixed bottom-[6rem] left-0 right-0 z-[10000] w-full px-3 py-2 bg-white/95 backdrop-blur border-t border-gray-200 animate-in slide-in-from-bottom-3 duration-300">
      {/* Header: số file + phần trăm */}
      <div className="flex items-center justify-between text-xs text-gray-600 mb-2 px-1">
        <div className="flex items-center gap-2.5 font-medium">
          <HiCloudArrowUp className="w-5 h-5 text-blue-600 animate-pulse" />
          <span>
            Đang tải <span className="font-bold text-blue-600">{uploadingCount}</span> tệp
            {uploadingCount > 1 ? 's' : ''}...
          </span>
        </div>
        <span className="font-bold text-blue-600 tabular-nums">{progress}%</span>
      </div>

      {/* Thanh tiến độ hiện đại – gradient + shimmer + glow */}
      <div className="relative h-2.5 bg-gray-200/70 rounded-full overflow-hidden shadow-inner">
        {/* Nền mờ gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/50 to-transparent" />

        {/* Thanh chính – mượt mà, có hiệu ứng ánh sáng chạy */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 
                     shadow-lg relative overflow-hidden transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>

      {/* Tick xanh khi gần hoàn thành (≥90%) */}
      {progress >= 90 && (
        <div className="flex justify-end mt-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <HiCheckBadge className="w-4 h-4 text-white font-bold" />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgressBar;
