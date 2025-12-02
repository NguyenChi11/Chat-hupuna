"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/base/toast";

interface PrivacyState {
  showOnline: boolean;
  allowFriendRequests: boolean;
  allowTagging: boolean;
}

export default function PrivacySettings() {
  const toast = useToast();
  const [state, setState] = useState<PrivacyState>({ showOnline: true, allowFriendRequests: true, allowTagging: true });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("info_user") : null;
      const u = raw ? JSON.parse(raw) : null;
      const prev = (u?.["privacy"] as PrivacyState) || null;
      if (prev) setState(prev);
    } catch {}
  }, []);

  const update = async (next: PrivacyState, key: keyof PrivacyState) => {
    try {
      setLoadingKey(String(key));
      const raw = typeof window !== "undefined" ? localStorage.getItem("info_user") : null;
      const u = raw ? JSON.parse(raw) : null;
      const userId = String(u?.["_id"] || "");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", field: "_id", value: userId, data: { privacy: next } }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast({ type: "error", message: "Cập nhật thất bại" });
        return;
      }
      try {
        const raw2 = localStorage.getItem("info_user");
        const u2 = raw2 ? JSON.parse(raw2) : null;
        if (u2) localStorage.setItem("info_user", JSON.stringify({ ...u2, privacy: next }));
      } catch {}
      setState(next);
      toast({ type: "success", message: "Đã lưu" });
    } finally {
      setLoadingKey(null);
    }
  };

  const toggle = (key: keyof PrivacyState) => {
    const next = { ...state, [key]: !state[key] } as PrivacyState;
    void update(next, key);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
        <span className="text-gray-800 font-medium">Hiển thị trạng thái online</span>
        <button
          onClick={() => toggle("showOnline")}
          className={`px-3 py-1 rounded-lg text-sm ${state.showOnline ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          {loadingKey === "showOnline" ? "..." : state.showOnline ? "Bật" : "Tắt"}
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
        <span className="text-gray-800 font-medium">Cho phép lời mời kết bạn</span>
        <button
          onClick={() => toggle("allowFriendRequests")}
          className={`px-3 py-1 rounded-lg text-sm ${state.allowFriendRequests ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          {loadingKey === "allowFriendRequests" ? "..." : state.allowFriendRequests ? "Bật" : "Tắt"}
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
        <span className="text-gray-800 font-medium">Cho phép gắn thẻ @</span>
        <button
          onClick={() => toggle("allowTagging")}
          className={`px-3 py-1 rounded-lg text-sm ${state.allowTagging ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"}`}
        >
          {loadingKey === "allowTagging" ? "..." : state.allowTagging ? "Bật" : "Tắt"}
        </button>
      </div>
    </div>
  );
}

