"use client";

import { useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useTracker, TRACKER_STAGES, type TrackerStatus } from "@/hooks/useTracker";
import { useFavorites } from "@/hooks/useFavorites";
import programsData from "@/data/programs.json";
import type { RawProgram } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs = programsData as any as RawProgram[];

const programMap = new Map<number, RawProgram>();
for (const p of programs) programMap.set(p.id, p);

const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", US: "🇺🇸", "Hong Kong": "🇭🇰", Singapore: "🇸🇬", Australia: "🇦🇺", France: "🇫🇷",
};

export default function TrackerPage() {
  const { tracker, loaded: trackerLoaded, setStatus, remove } = useTracker();
  const { favorites, loaded: favsLoaded } = useFavorites();

  // Merge: all favorited programs + tracked programs
  const allIds = useMemo(() => {
    const ids = new Set<number>();
    if (favsLoaded) favorites.forEach((id) => ids.add(id));
    Object.keys(tracker).forEach((id) => ids.add(Number(id)));
    return ids;
  }, [favorites, tracker, favsLoaded]);

  // Group by stage
  const stages = useMemo(() => {
    const result: Record<TrackerStatus, { program: RawProgram; notes: string }[]> = {
      interested: [], preparing: [], writing: [], submitted: [], interview: [], offer: [],
    };
    allIds.forEach((id) => {
      const prog = programMap.get(id);
      if (!prog) return;
      const entry = tracker[id];
      const status: TrackerStatus = entry?.status || "interested";
      result[status].push({ program: prog, notes: entry?.notes || "" });
    });
    return result;
  }, [allIds, tracker]);

  const totalCount = allIds.size;

  if (!trackerLoaded || !favsLoaded) {
    return <div className="min-h-screen"><NavBar /><main className="max-w-6xl mx-auto px-4 py-6"><p className="text-gray-400">加载中...</p></main></div>;
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl shadow-lg text-white p-6">
          <h2 className="text-xl font-bold">申请进度管理</h2>
          <p className="text-blue-200 text-xs mt-1">跟踪每个项目的申请状态</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
            {TRACKER_STAGES.map((s) => (
              <div key={s.key} className="bg-white/15 rounded-xl p-2 text-center">
                <p className="text-lg">{s.emoji}</p>
                <p className="text-[10px] text-blue-200">{s.label}</p>
                <p className="text-lg font-bold">{stages[s.key].length}</p>
              </div>
            ))}
          </div>
        </div>

        {totalCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center py-16">
            <p className="text-lg text-gray-500 mb-2">还没有跟踪任何项目</p>
            <p className="text-sm text-gray-400 mb-4">先去收藏感兴趣的项目，然后在这里管理申请进度</p>
            <div className="flex justify-center gap-3">
              <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">去智能推荐</Link>
              <Link href="/favorites" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">我的收藏</Link>
            </div>
          </div>
        ) : (
          /* Kanban columns */
          <div className="space-y-4">
            {TRACKER_STAGES.map((stage) => {
              const items = stages[stage.key];
              if (items.length === 0) return null;
              return (
                <div key={stage.key} className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span>{stage.emoji}</span>
                    {stage.label}
                    <span className="text-xs text-gray-400 font-normal">({items.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map(({ program: p }) => (
                      <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs">{COUNTRY_FLAG[(p as any).country] || ""}</span>
                            <Link href={`/school/${encodeURIComponent(p.school_name)}`}
                              className="text-[10px] text-gray-400 hover:text-blue-600 hover:underline">
                              {p.school_name}
                            </Link>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.program_name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full">{p.program_category}</span>
                          </div>
                        </div>
                        {/* Status selector */}
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-blue-400 bg-white"
                          value={tracker[p.id]?.status || "interested"}
                          onChange={(e) => setStatus(p.id, e.target.value as TrackerStatus)}
                        >
                          {TRACKER_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
                          ))}
                        </select>
                        <button onClick={() => remove(p.id)}
                          className="text-gray-300 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          title="移除">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}
