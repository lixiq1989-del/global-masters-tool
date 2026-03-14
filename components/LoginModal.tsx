"use client";

import { useState } from "react";

interface Props {
  onLogin: (code: string) => Promise<boolean>;
  onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(false);
    const ok = await onLogin(code);
    setLoading(false);
    if (!ok) setError(true);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-1">输入邀请码</h2>
        <p className="text-xs text-gray-500 mb-4">
          收藏、申请报告等功能需要邀请码才能使用。请联系顾问获取。
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            autoFocus
            placeholder="请输入邀请码..."
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            className={`w-full border rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {error && <p className="text-xs text-red-500 mb-3">邀请码无效，请重新输入</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "验证中..." : "确认"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
