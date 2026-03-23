"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "./AuthProvider";

const TABS = [
  { href: "/", label: "智能推荐", icon: "🎓", desc: "AI 匹配冲刺/匹配/保底" },
  { href: "/explore", label: "项目探索", icon: "🔍", desc: "自由浏览全部项目" },
  { href: "/compare", label: "项目对比", icon: "⚖️", desc: "横向对比" },
  { href: "/report", label: "申请规划", icon: "📋", desc: "生成申请报告" },
  { href: "/tracker", label: "我的申请", icon: "📊", desc: "收藏·DDL·面试·进度" },
  { href: "/profile", label: "我的档案", icon: "👤", desc: "" },
];

const USER_MENU: { href: string; label: string; icon: string }[] = [];

export default function NavBar() {
  const pathname = usePathname();
  const { authed, loaded, logout, requireAuth } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="bg-[#1e3a5f] text-white shadow-lg">
      {/* Title row */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI 全球商科硕士选校工具</h1>
          <p className="text-blue-200 text-xs mt-1">
            覆盖 6 国 117 所院校 · 1540 个商科硕士项目 · 79956 条录取案例 · 1599 条就业数据
          </p>
        </div>
        {loaded && (
          <div className="shrink-0 ml-4 mt-1 flex items-center gap-2">
            {/* User menu dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm transition-colors"
                title="我的"
              >
                👤
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-36 z-50">
                  {USER_MENU.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                        pathname === item.href ? "text-blue-600 font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  {authed ? (
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                    >
                      🚪 退出登录
                    </button>
                  ) : (
                    <button
                      onClick={() => { requireAuth(); setMenuOpen(false); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
                    >
                      🔑 输入邀请码
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-gray-50 text-gray-800 shadow-sm"
                    : "bg-white/10 text-blue-200 hover:bg-white/20 hover:text-white"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-[10px] hidden sm:inline ${active ? "text-gray-500" : "text-blue-300"}`}>
                  {tab.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
