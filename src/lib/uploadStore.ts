// lib/uploadStore.ts

// 👇 KHAI BÁO KIỂU CHO GLOBAL
declare global {
  var uploadProgressMap: Map<string, number> | undefined;
}

// Khởi tạo nếu chưa có
globalThis.uploadProgressMap = globalThis.uploadProgressMap || new Map<string, number>();

export const setProgress = (id: string, percent: number) => {
  if (globalThis.uploadProgressMap) {
    globalThis.uploadProgressMap.set(id, percent);
  }
};

export const getProgress = (id: string) => {
  return globalThis.uploadProgressMap?.get(id) || 0;
};

export const clearProgress = (id: string) => {
  globalThis.uploadProgressMap?.delete(id);
};
