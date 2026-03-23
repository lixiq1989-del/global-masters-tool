"use client";

import { useState } from "react";

/** QR code modal for WeChat group */
export function WechatGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-gray-800 text-center">加入 AI 留学选校交流群</h3>
        <p className="text-sm text-gray-500 text-center mt-2">
          扫码加入交流群，和其他申请者一起交流选校和申请经验
        </p>
        <div className="mt-4 flex justify-center">
          <div className="w-52 h-52 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
            {/* Replace with actual QR code image */}
            <img
              src="/wechat-group-qr.png"
              alt="微信群二维码"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  '<div class="text-center text-gray-400 text-sm p-4">请将群二维码放置于<br/>public/wechat-group-qr.png</div>';
              }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          如果二维码失效，可以添加微信：<span className="text-gray-600 font-medium">xxxxxx</span>
        </p>
      </div>
    </div>
  );
}

/** CTA card for embedding in pages */
export function WechatGroupCTA({
  title = "想获得更详细的选校建议？",
  desc = "加入 AI 留学选校交流群",
  features,
}: {
  title?: string;
  desc?: string;
  features?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <p className="text-sm text-blue-600 mt-1 font-medium">{desc}</p>
        {features && features.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {features.map((f, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                {f}
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => setOpen(true)}
          className="mt-4 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2a4d7a] transition-colors shadow-sm"
        >
          加入留学交流群
        </button>
      </div>
      <WechatGroupModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Floating button (bottom-right corner) */
export function WechatGroupFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#1e3a5f] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#2a4d7a] transition-all hover:shadow-xl text-sm font-medium flex items-center gap-1.5"
      >
        <span>💬</span>
        <span>留学交流群</span>
      </button>
      <WechatGroupModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
