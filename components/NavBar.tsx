"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "./AuthProvider";

const TABS = [
  { href: "/", label: "智能推荐", icon: "🎓", desc: "AI 匹配冲刺/匹配/保底" },
  { href: "/explore", label: "项目探索", icon: "🔍", desc: "自由浏览全部项目" },
  { href: "/compare", label: "项目对比", icon: "⚖️", desc: "横向对比" },
  { href: "/report", label: "申请规划", icon: "📋", desc: "生成申请报告" },
  { href: "/favorites", label: "收藏", icon: "★", desc: "" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { authed, loaded, logout, requireAuth } = useAuthContext();

  return (
    <header className="bg-[#1e3a5f] text-white shadow-lg">
      {/* Title row */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI 全球商科硕士选校工具</h1>
          <p className="text-blue-200 text-xs mt-1">
            覆盖 6 国 117 所院校 · 1540 个商科硕士项目 · 25345 条录取案例 · 1599 条就业数据
          </p>
        </div>
        {loaded && (
          <div className="shrink-0 ml-4 mt-1">
            {authed ? (
              <button
                onClick={logout}
                className="text-xs text-blue-200 hover:text-white border border-blue-300/30 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                已登录 · 退出
              </button>
            ) : (
              <button
                onClick={() => requireAuth()}
                className="text-xs text-white bg-white/15 hover:bg-white/25 border border-white/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                输入邀请码
              </button>
            )}
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
