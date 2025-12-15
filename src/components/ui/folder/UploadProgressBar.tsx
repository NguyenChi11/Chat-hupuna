'use client';

import React from 'react';

export default function UploadProgressBar({
  uploadingCount,
  overallUploadPercent,
}: {
  uploadingCount: number;
  overallUploadPercent: number;
}) {
  if (!uploadingCount) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[9999] w-[92vw] max-w-md -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-900">Đang tải lên</span>
        <span className="text-gray-600">
          {overallUploadPercent}% • {uploadingCount} tác vụ
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full bg-indigo-600"
          style={{ width: `${Math.min(100, Math.max(0, overallUploadPercent))}%` }}
        />
      </div>
    </div>
  );
}
