import React from 'react';

interface UploadProgressBarProps {
  uploadingCount: number;
  overallUploadPercent: number;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ uploadingCount, overallUploadPercent }) => {
  if (uploadingCount <= 0) return null;

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-0.5">
        <span>
          Đang tải {uploadingCount} tệp
          {uploadingCount > 1 ? '' : ''}...
        </span>
        <span className="font-medium">{Math.round(overallUploadPercent)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-200"
          style={{ width: `${Math.max(5, Math.round(overallUploadPercent))}%` }}
        />
      </div>
    </div>
  );
};

export default UploadProgressBar;


