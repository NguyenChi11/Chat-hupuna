"use client";

import React, { useState } from "react";
import { useToast } from "@/components/base/toast";

export default function PasswordChange() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ type: "error", message: "Mật khẩu xác nhận không khớp" });
      return;
    }
    try {
      setLoading(true);
      const raw = typeof window !== "undefined" ? localStorage.getItem("info_user") : null;
      const u = raw ? JSON.parse(raw) : null;
      const userId = String(u?.["_id"] || "");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", data: { userId, currentPassword, newPassword } }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast({ type: "error", message: json.message || "Đổi mật khẩu thất bại" });
        return;
      }
      toast({ type: "success", message: "Đổi mật khẩu thành công" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="password"
        placeholder="Mật khẩu hiện tại"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800"
      />
      <input
        type="password"
        placeholder="Mật khẩu mới"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800"
      />
      <input
        type="password"
        placeholder="Xác nhận mật khẩu mới"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70"
      >
        {loading ? "Đang đổi..." : "Đổi mật khẩu"}
      </button>
    </div>
  );
}

