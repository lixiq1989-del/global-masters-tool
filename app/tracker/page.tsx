"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useTracker, TRACKER_STAGES, type TrackerStatus, type InterviewInfo } from "@/hooks/useTracker";
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

const INTERVIEW_FORMATS: { value: InterviewInfo["format"]; label: string }[] = [
  { value: "", label: "未定" },
  { value: "video", label: "视频面试" },
  { value: "phone", label: "电话面试" },
  { value: "onsite", label: "线下面试" },
];

type ViewMode = "kanban" | "timeline" | "interviews";

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number | null): string {
  if (days === null) return "text-gray-400";
  if (days < 0) return "text-gray-400 line-through";
  if (days <= 7) return "text-red-600 font-bold";
  if (days <= 14) return "text-orange-500 font-semibold";
  if (days <= 30) return "text-yellow-600";
  return "text-green-600";
}

function urgencyBg(days: number | null): string {
  if (days === null) return "bg-gray-50";
  if (days < 0) return "bg-gray-50";
  if (days <= 7) return "bg-red-50 border-red-200";
  if (days <= 14) return "bg-orange-50 border-orange-200";
  if (days <= 30) return "bg-yellow-50 border-yellow-200";
  return "bg-green-50 border-green-200";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TrackerPage() {
  const { tracker, loaded: trackerLoaded, setStatus, setDeadline, setInterview, remove } = useTracker();
  const { favorites, loaded: favsLoaded } = useFavorites();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [editingDeadline, setEditingDeadline] = useState<number | null>(null);
  const [editingInterview, setEditingInterview] = useState<number | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);

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

  // Timeline: all items with deadlines, sorted by date
  const timelineItems = useMemo(() => {
    const items: { program: RawProgram; deadline: string; days: number | null; status: TrackerStatus }[] = [];
    allIds.forEach((id) => {
      const prog = programMap.get(id);
      if (!prog) return;
      const entry = tracker[id];
      const deadline = entry?.deadline || "";
      items.push({
        program: prog,
        deadline,
        days: daysUntil(deadline),
        status: entry?.status || "interested",
      });
    });
    // Items with deadlines first (sorted by date), then without
    return items.sort((a, b) => {
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  }, [allIds, tracker]);

  // Interview items
  const interviewItems = useMemo(() => {
    const items: { program: RawProgram; interview: InterviewInfo; status: TrackerStatus }[] = [];
    allIds.forEach((id) => {
      const prog = programMap.get(id);
      if (!prog) return;
      const entry = tracker[id];
      if (entry?.interview?.date) {
        items.push({ program: prog, interview: entry.interview, status: entry.status });
      }
    });
    return items.sort((a, b) => new Date(a.interview.date).getTime() - new Date(b.interview.date).getTime());
  }, [allIds, tracker]);

  // Upcoming alerts
  const urgentDeadlines = timelineItems.filter((i) => i.days !== null && i.days >= 0 && i.days <= 14);
  const urgentInterviews = interviewItems.filter((i) => {
    const days = daysUntil(i.interview.date);
    return days !== null && days >= 0 && days <= 14;
  });

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">我的申请</h2>
              <p className="text-blue-200 text-xs mt-1">收藏的项目在这里管理 · 进度 · 截止日期 · 面试</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {TRACKER_STAGES.map((s) => (
              <div key={s.key} className="bg-white/15 rounded-xl p-2 text-center">
                <p className="text-lg">{s.emoji}</p>
                <p className="text-[10px] text-blue-200">{s.label}</p>
                <p className="text-lg font-bold">{stages[s.key].length}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick add project */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddPanel(!showAddPanel)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 shrink-0"
            >
              + 添加项目
            </button>
            <p className="text-xs text-gray-400">搜索并添加项目到申请进度，或在"智能推荐""项目探索"中点 ★ 收藏</p>
          </div>
          {showAddPanel && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="搜索学校或项目名称..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {addSearch.trim().length >= 2 && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {programs
                    .filter((p) => {
                      const q = addSearch.toLowerCase();
                      return (
                        p.school_name.toLowerCase().includes(q) ||
                        p.program_name.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 10)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100"
                      >
                        <div className="min-w-0">
                          <span className="text-xs text-gray-400">{COUNTRY_FLAG[(p as any).country] || ""} {p.school_name}</span>
                          <p className="text-sm font-medium text-gray-800 truncate">{p.program_name}</p>
                        </div>
                        {allIds.has(p.id) ? (
                          <span className="text-[10px] text-green-600 font-medium shrink-0 ml-2">已添加</span>
                        ) : (
                          <button
                            onClick={() => { setStatus(p.id, "interested"); setAddSearch(""); }}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 shrink-0 ml-2"
                          >
                            添加
                          </button>
                        )}
                      </div>
                    ))}
                  {programs.filter((p) => {
                    const q = addSearch.toLowerCase();
                    return p.school_name.toLowerCase().includes(q) || p.program_name.toLowerCase().includes(q);
                  }).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">没有找到匹配的项目</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Urgent alerts */}
        {(urgentDeadlines.length > 0 || urgentInterviews.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-red-700 mb-2">⚠️ 近期提醒</h3>
            <div className="space-y-1.5">
              {urgentDeadlines.map((item) => (
                <div key={`ddl-${item.program.id}`} className="flex items-center gap-2 text-xs">
                  <span className="text-red-500 font-bold">{item.days === 0 ? "今天截止！" : `${item.days}天后截止`}</span>
                  <span className="text-gray-600">{item.program.school_name} · {item.program.program_name}</span>
                  <span className="text-gray-400">{formatDate(item.deadline)}</span>
                </div>
              ))}
              {urgentInterviews.map((item) => {
                const days = daysUntil(item.interview.date);
                return (
                  <div key={`int-${item.program.id}`} className="flex items-center gap-2 text-xs">
                    <span className="text-orange-500 font-bold">🎤 {days === 0 ? "今天面试！" : `${days}天后面试`}</span>
                    <span className="text-gray-600">{item.program.school_name} · {item.program.program_name}</span>
                    <span className="text-gray-400">{formatDate(item.interview.date)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View mode tabs */}
        <div className="flex gap-2">
          {([
            { key: "kanban" as ViewMode, label: "看板视图", emoji: "📋" },
            { key: "timeline" as ViewMode, label: "DDL 时间线", emoji: "📅" },
            { key: "interviews" as ViewMode, label: "面试管理", emoji: "🎤" },
          ]).map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                viewMode === v.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
              }`}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>

        {totalCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center py-16">
            <p className="text-lg text-gray-500 mb-2">还没有跟踪任何项目</p>
            <p className="text-sm text-gray-400 mb-4">先去收藏感兴趣的项目，然后在这里管理申请进度</p>
            <div className="flex justify-center gap-3">
              <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">去智能推荐</Link>
              <Link href="/explore" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">浏览项目</Link>
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          /* ── Kanban View ── */
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
                    {items.map(({ program: p }) => {
                      const entry = tracker[p.id];
                      const days = daysUntil(entry?.deadline || "");
                      return (
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
                              {entry?.deadline && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${urgencyBg(days)}`}>
                                  📅 {formatDate(entry.deadline)}
                                  {days !== null && days >= 0 && <span className={`ml-1 ${urgencyColor(days)}`}>({days}天)</span>}
                                </span>
                              )}
                              {entry?.interview?.date && (
                                <span className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                  🎤 {formatDate(entry.interview.date)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Deadline quick set */}
                          {editingDeadline === p.id ? (
                            <input
                              type="date"
                              className="text-xs border border-blue-300 rounded-lg px-2 py-1 focus:outline-none"
                              defaultValue={entry?.deadline || ""}
                              onBlur={(e) => { setDeadline(p.id, e.target.value); setEditingDeadline(null); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { setDeadline(p.id, (e.target as HTMLInputElement).value); setEditingDeadline(null); } }}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => setEditingDeadline(p.id)}
                              className="text-[10px] text-gray-400 hover:text-blue-600 shrink-0"
                              title="设置截止日期"
                            >
                              {entry?.deadline ? "📅" : "+ DDL"}
                            </button>
                          )}
                          <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-blue-400 bg-white"
                            value={entry?.status || "interested"}
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "timeline" ? (
          /* ── Timeline View ── */
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">📅 申请截止日期时间线</h3>
            {timelineItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">还没有项目，去收藏一些吧</p>
            ) : (
              <div className="space-y-2">
                {timelineItems.map((item) => {
                  const entry = tracker[item.program.id];
                  const stageInfo = TRACKER_STAGES.find((s) => s.key === item.status);
                  return (
                    <div key={item.program.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${urgencyBg(item.days)}`}>
                      {/* Date column */}
                      <div className="w-24 shrink-0 text-center">
                        {item.deadline ? (
                          <>
                            <p className="text-sm font-bold text-gray-800">{formatDate(item.deadline)}</p>
                            <p className={`text-xs ${urgencyColor(item.days)}`}>
                              {item.days === null ? "" : item.days < 0 ? "已过期" : item.days === 0 ? "今天！" : `${item.days} 天后`}
                            </p>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingDeadline(item.program.id)}
                            className="text-xs text-gray-400 hover:text-blue-600"
                          >
                            + 设置DDL
                          </button>
                        )}
                        {editingDeadline === item.program.id && (
                          <input
                            type="date"
                            className="text-xs border border-blue-300 rounded-lg px-1 py-0.5 mt-1 w-full focus:outline-none"
                            defaultValue={entry?.deadline || ""}
                            onBlur={(e) => { setDeadline(item.program.id, e.target.value); setEditingDeadline(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { setDeadline(item.program.id, (e.target as HTMLInputElement).value); setEditingDeadline(null); } }}
                            autoFocus
                          />
                        )}
                      </div>
                      {/* Program info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{COUNTRY_FLAG[(item.program as any).country] || ""}</span>
                          <span className="text-[10px] text-gray-400">{item.program.school_name}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.program.program_name}</p>
                      </div>
                      {/* Status badge */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${stageInfo?.color || "bg-gray-100 text-gray-600"}`}>
                        {stageInfo?.emoji} {stageInfo?.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Interview View ── */
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">🎤 面试管理</h3>

            {/* Add interview button for programs in interview stage */}
            {stages.interview.length > 0 && (
              <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-xs text-purple-700 font-medium mb-2">以下项目在"面试中"阶段，点击添加面试信息：</p>
                <div className="flex flex-wrap gap-2">
                  {stages.interview.map(({ program: p }) => {
                    const entry = tracker[p.id];
                    return (
                      <button
                        key={p.id}
                        onClick={() => setEditingInterview(p.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          entry?.interview?.date
                            ? "bg-purple-100 border-purple-300 text-purple-700"
                            : "bg-white border-purple-200 text-purple-600 hover:bg-purple-50"
                        }`}
                      >
                        {entry?.interview?.date ? "✅" : "+"} {p.school_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interview edit modal */}
            {editingInterview !== null && (() => {
              const p = programMap.get(editingInterview);
              const entry = tracker[editingInterview];
              if (!p) return null;
              const iv = entry?.interview || { date: "", format: "" as const, notes: "", result: "" as const };
              return (
                <div className="mb-4 bg-white border-2 border-purple-300 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-800">{p.school_name} · {p.program_name}</h4>
                    <button onClick={() => setEditingInterview(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 font-medium">面试日期</label>
                      <input
                        type="date"
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:border-purple-400"
                        defaultValue={iv.date}
                        onChange={(e) => setInterview(editingInterview, { ...iv, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-medium">面试形式</label>
                      <select
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:border-purple-400"
                        defaultValue={iv.format}
                        onChange={(e) => setInterview(editingInterview, { ...iv, format: e.target.value as InterviewInfo["format"] })}
                      >
                        {INTERVIEW_FORMATS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] text-gray-500 font-medium">面试笔记 / 准备要点</label>
                    <textarea
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mt-1 focus:outline-none focus:border-purple-400 h-16 resize-none"
                      defaultValue={iv.notes}
                      placeholder="记录面试准备要点、常见问题等..."
                      onBlur={(e) => setInterview(editingInterview, { ...iv, notes: e.target.value })}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => setEditingInterview(null)}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700"
                    >
                      保存
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Interview list */}
            {interviewItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                还没有面试安排。将项目状态设为"面试中"后，可以在这里管理面试信息。
              </p>
            ) : (
              <div className="space-y-2">
                {interviewItems.map((item) => {
                  const days = daysUntil(item.interview.date);
                  const formatLabel = INTERVIEW_FORMATS.find((f) => f.value === item.interview.format)?.label || "未定";
                  return (
                    <div
                      key={item.program.id}
                      className={`rounded-xl px-4 py-3 border cursor-pointer hover:shadow-sm transition-shadow ${urgencyBg(days)}`}
                      onClick={() => setEditingInterview(item.program.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{COUNTRY_FLAG[(item.program as any).country] || ""}</span>
                            <span className="text-[10px] text-gray-400">{item.program.school_name}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.program.program_name}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold text-gray-800">{formatDate(item.interview.date)}</p>
                          <p className={`text-xs ${urgencyColor(days)}`}>
                            {days === null ? "" : days < 0 ? "已结束" : days === 0 ? "今天！" : `${days} 天后`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">{formatLabel}</span>
                        {item.interview.notes && (
                          <span className="text-[10px] text-gray-400 truncate">📝 {item.interview.notes}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}
