"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/base/toast";

interface NotiState {
  soundEnabled: boolean;
  desktopAlerts: boolean;
  showPreview: boolean;
}

export default function NotificationSettings() {
  const toast = useToast();
  const [state, setState] = useState<NotiState>({ soundEnabled: true, desktopAlerts: true, showPreview: true });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("info_user") : null;
      const u = raw ? JSON.parse(raw) : null;
      const prev = (u?.["notifications"] as NotiState) || null;
      if (prev) setState(prev);
    } catch {}
  }, []);

  const update = async (next: NotiState, key: keyof NotiState) => {
    try {
      setLoadingKey(String(key));
      const raw = typeof window !== "undefined" ? localStorage.getItem("info_user") : null;
      const u = raw ? JSON.parse(raw) : null;
      const userId = String(u?.["_id"] || "");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", field: "_id", value: userId, data: { notifications: next } }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast({ type: "error", message: "Cập nhật thất bại" });
        return;
      }
      try {
        const raw2 = localStorage.getItem("info_user");
        const u2 = raw2 ? JSON.parse(raw2) : null;
        if (u2) localStorage.setItem("info_user", JSON.stringify({ ...u2, notifications: next }));
      } catch {}
      setState(next);
      toast({ type: "success", message: "Đã lưu" });
    } finally {
      setLoadingKey(null);
    }
  };

  const toggle = (key: keyof NotiState) => {
    const next = { ...state, [key]: !state[key] } as NotiState;
    void update(next, key);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
        <span className="text-gray-800 font-medium">Âm thanh thông báo</span>
        <button
          onClick={() => toggle("soundEnabled")}
          className={`px-3 py-1 rounded-lg text-sm ${state.soundEnabled ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          {loadingKey === "soundEnabled" ? "..." : state.soundEnabled ? "Bật" : "Tắt"}
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
        <span className="text-gray-800 font-medium">Hiện banner desktop</span>
        <button
          onClick={() => toggle("desktopAlerts")}
          className={`px-3 py-1 rounded-lg text-sm ${state.desktopAlerts ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          {loadingKey === "desktopAlerts" ? "..." : state.desktopAlerts ? "Bật" : "Tắt"}
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
        <span className="text-gray-800 font-medium">Hiển thị preview nội dung</span>
        <button
          onClick={() => toggle("showPreview")}
          className={`px-3 py-1 rounded-lg text-sm ${state.showPreview ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          {loadingKey === "showPreview" ? "..." : state.showPreview ? "Bật" : "Tắt"}
        </button>
      </div>
    </div>
  );
}

