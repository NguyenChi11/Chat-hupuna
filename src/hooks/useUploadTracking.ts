import { useRef, useState } from 'react';

export function useUploadTracking() {
  const uploadStreamsRef = useRef<Record<string, EventSource>>({});

  const [uploadingCount, setUploadingCount] = useState(0);
  const [overallPercent, setOverallPercent] = useState(0);

  const startTracking = (uploadId: string) => {
    setUploadingCount((c) => c + 1);

    try {
      const es = new EventSource(`/api/upload/progress?id=${uploadId}`);
      uploadStreamsRef.current[uploadId] = es;

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { id: string; percent: number; done: boolean };
          setOverallPercent(Math.max(0, Math.round(data.percent || 0)));

          if (data.done) {
            setUploadingCount((c) => Math.max(0, c - 1));
            try {
              uploadStreamsRef.current[uploadId]?.close();
              delete uploadStreamsRef.current[uploadId];
            } catch {}
          }
        } catch {}
      };

      es.onerror = () => {
        try {
          uploadStreamsRef.current[uploadId]?.close();
          delete uploadStreamsRef.current[uploadId];
        } catch {}
      };
    } catch {
      setUploadingCount((c) => Math.max(0, c - 1));
    }
  };

  return {
    uploadingCount,
    overallPercent,
    startTracking,
  };
}
