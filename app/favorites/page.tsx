"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import programsData from "@/data/programs.json";
import employmentData from "@/data/employment.json";
import type { RawProgram, RawEmployment } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs = programsData as any as RawProgram[];
const employment = employmentData as any as RawEmployment[];

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£", USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", EUR: "€",
};
const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", US: "🇺🇸", "Hong Kong": "🇭🇰", Singapore: "🇸🇬", Australia: "🇦🇺", France: "🇫🇷",
};

const empMap = new Map<string, RawEmployment>();
for (const e of employment) empMap.set(e.program_key ?? `${e.school_name}__${e.program_name}`, e);

const KEY = "uk-masters-favorites";

export default function FavoritesPage() {
  const [favIds, setFavIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavIds(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  function removeFav(id: number) {
    const next = favIds.filter((i) => i !== id);
    setFavIds(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function clearAll() {
    setFavIds([]);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  const favPrograms = useMemo(
    () => favIds.map((id) => programs.find((p) => p.id === id)).filter(Boolean) as RawProgram[],
    [favIds]
  );

  // Group by country
  const grouped = useMemo(() => {
    const map: Record<string, RawProgram[]> = {};
    for (const p of favPrograms) {
      const country = (p as any).country as string;
      if (!map[country]) map[country] = [];
      map[country].push(p);
    }
    return map;
  }, [favPrograms]);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">我的收藏</h2>
              <p className="text-xs text-gray-500">
                {loaded ? `共 ${favPrograms.length} 个项目` : "加载中..."}
              </p>
            </div>
            <div className="flex gap-2">
              {favPrograms.length >= 2 && (
                <Link
                  href="/compare"
                  className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100"
                >
                  去对比
                </Link>
              )}
              {favPrograms.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500"
                >
                  清空全部
                </button>
              )}
            </div>
          </div>

          {loaded && favPrograms.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-2">还没有收藏任何项目</p>
              <p className="text-sm mb-4">在智能推荐结果中点击 ☆ 收藏感兴趣的项目</p>
              <div className="flex justify-center gap-3">
                <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
                  去智能推荐
                </Link>
                <Link href="/explore" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200">
                  浏览项目
                </Link>
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([country, progs]) => (
            <div key={country} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <span>{COUNTRY_FLAG[country] || ""}</span>
                {country}
                <span className="text-xs text-gray-400 font-normal">({progs.length})</span>
              </h3>
              <div className="space-y-2">
                {progs.map((p) => {
                  const emp = empMap.get(p.program_key) ?? null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link
                            href={`/school/${encodeURIComponent(p.school_name)}`}
                            className="text-[10px] text-gray-400 hover:text-blue-600 hover:underline"
                          >
                            {p.school_name}
                          </Link>
                        </div>
                        <a
                          href={p.program_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-700 hover:underline truncate block"
                        >
                          {p.program_name}
                        </a>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            {p.program_category}
                          </span>
                          {p.duration && (
                            <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
                              {p.duration}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className="flex gap-1.5">
                          <div className="text-center px-1.5 py-0.5 rounded bg-blue-50">
                            <div className="text-[8px] text-gray-400">品牌</div>
                            <div className="text-xs font-bold text-blue-700">{p.brand_score}</div>
                          </div>
                          <div className="text-center px-1.5 py-0.5 rounded bg-gray-100">
                            <div className="text-[8px] text-gray-400">难度</div>
                            <div className="text-xs font-bold text-gray-700">{p.admission_difficulty_score}</div>
                          </div>
                        </div>
                        {p.tuition_fee ? (
                          <p className="text-xs text-gray-500 font-medium">
                            {CURRENCY_SYMBOL[p.tuition_currency] || ""}{p.tuition_fee.toLocaleString()}
                          </p>
                        ) : null}
                        {emp?.average_salary && (
                          <p className="text-[10px] text-gray-400">
                            均薪 £{emp.average_salary.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFav(p.id)}
                        className="text-yellow-400 hover:text-red-500 text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="取消收藏"
                      >
                        ★
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}
