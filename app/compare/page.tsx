"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import programsData from "@/data/programs.json";
import employmentData from "@/data/employment.json";
import casesData from "@/data/cases.json";
import type { RawProgram, RawEmployment, RawCase } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs = programsData as any as RawProgram[];
const employment = employmentData as any as RawEmployment[];
const cases = casesData as any as RawCase[];

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£", USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", EUR: "€",
};
const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", US: "🇺🇸", "Hong Kong": "🇭🇰", Singapore: "🇸🇬", Australia: "🇦🇺", France: "🇫🇷",
};

const MAX_COMPARE = 4;

// Build lookups
const empMap = new Map<string, RawEmployment>();
for (const e of employment) empMap.set(e.program_key ?? `${e.school_name}__${e.program_name}`, e);

const caseCountMap = new Map<string, { total: number; admitted: number }>();
for (const c of cases) {
  const key = `${c.school_name}__${c.program_name}`;
  const curr = caseCountMap.get(key) ?? { total: 0, admitted: 0 };
  curr.total++;
  if (c.admission_result === "admitted") curr.admitted++;
  caseCountMap.set(key, curr);
}

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const selected = useMemo(
    () => selectedIds.map((id) => programs.find((p) => p.id === id)!).filter(Boolean),
    [selectedIds]
  );

  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.toLowerCase().trim();
    return programs
      .filter(
        (p) =>
          !selectedIds.includes(p.id) &&
          (p.school_name.toLowerCase().includes(q) ||
            p.program_name.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [searchText, selectedIds]);

  function addProgram(id: number) {
    if (selectedIds.length >= MAX_COMPARE) return;
    setSelectedIds((prev) => [...prev, id]);
    setSearchText("");
    setShowSearch(false);
  }

  function removeProgram(id: number) {
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  }

  // Read favorites from localStorage
  const [favIds, setFavIds] = useState<number[]>([]);
  useState(() => {
    try {
      const stored = localStorage.getItem("uk-masters-favorites");
      if (stored) setFavIds(JSON.parse(stored));
    } catch { /* ignore */ }
  });

  const favPrograms = useMemo(
    () => favIds.map((id) => programs.find((p) => p.id === id)).filter(Boolean) as RawProgram[],
    [favIds]
  );

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-1">项目对比</h2>
          <p className="text-xs text-gray-500 mb-4">选择 2-4 个项目进行横向对比</p>

          {/* Selected pills + add button */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            {selected.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-xs text-blue-800"
              >
                <span className="max-w-[200px] truncate font-medium">
                  {p.school_name} · {p.program_name}
                </span>
                <button onClick={() => removeProgram(p.id)} className="text-blue-400 hover:text-red-500">
                  ✕
                </button>
              </div>
            ))}
            {selectedIds.length < MAX_COMPARE && (
              <button
                onClick={() => setShowSearch(true)}
                className="px-3 py-1.5 border border-dashed border-gray-300 rounded-full text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600"
              >
                + 添加项目
              </button>
            )}
          </div>

          {/* Search overlay */}
          {showSearch && (
            <div className="mb-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <input
                type="text"
                autoFocus
                placeholder="搜索学校或项目名称..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Quick add from favorites */}
              {favPrograms.length > 0 && !searchText.trim() && (
                <div className="mb-3">
                  <p className="text-[10px] text-gray-500 font-medium mb-1.5">★ 从收藏中添加</p>
                  <div className="flex flex-wrap gap-1.5">
                    {favPrograms
                      .filter((p) => !selectedIds.includes(p.id))
                      .slice(0, 8)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addProgram(p.id)}
                          className="text-[11px] bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1 hover:bg-yellow-100 truncate max-w-[250px]"
                        >
                          {p.school_name} · {p.program_name}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProgram(p.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm flex items-center gap-2"
                    >
                      <span className="text-xs text-gray-400">{COUNTRY_FLAG[(p as any).country] || ""}</span>
                      <span className="text-gray-500 text-xs">{p.school_name}</span>
                      <span className="text-gray-800 font-medium">{p.program_name}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchText.trim() && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">未找到匹配项目</p>
              )}
              <div className="text-right mt-2">
                <button
                  onClick={() => { setShowSearch(false); setSearchText(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comparison table */}
        {selected.length >= 2 && (
          <CompareTable programs={selected} />
        )}

        {selected.length < 2 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">请选择至少 2 个项目进行对比</p>
            <p className="text-sm">点击「+ 添加项目」搜索并添加</p>
          </div>
        )}
      </main>

      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}

// ── Comparison Table ────────────────────────────────────────────

function CompareTable({ programs: progs }: { programs: RawProgram[] }) {
  const data = progs.map((p) => {
    const emp = empMap.get(p.program_key) ?? null;
    const cc = caseCountMap.get(`${p.school_name}__${p.program_name}`) ?? { total: 0, admitted: 0 };
    return { program: p, employment: emp, caseCount: cc };
  });

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium w-36">对比维度</th>
            {data.map((d) => (
              <th key={d.program.id} className="text-left px-4 py-3 min-w-[200px]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs">{COUNTRY_FLAG[(d.program as any).country] || ""}</span>
                  <span className="text-[10px] text-gray-400 font-normal">{d.program.school_name}</span>
                </div>
                <Link
                  href={`/school/${encodeURIComponent(d.program.school_name)}`}
                  className="text-sm font-semibold text-blue-700 hover:underline leading-tight"
                >
                  {d.program.program_name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <CompareRow label="国家" values={data.map((d) => (d.program as any).country)} />
          <CompareRow label="城市" values={data.map((d) => d.program.location)} />
          <CompareRow label="学制" values={data.map((d) => d.program.duration || "—")} />
          <CompareRow label="学位类型" values={data.map((d) => d.program.degree_type || "—")} />
          <CompareRow label="专业方向" values={data.map((d) => d.program.program_category)} />
          <CompareRow label="院校层级" values={data.map((d) => d.program.school_tier)} />

          {/* Scores */}
          <CompareRow
            label="品牌分"
            values={data.map((d) => d.program.brand_score)}
            highlight="max"
          />
          <CompareRow
            label="录取难度"
            values={data.map((d) => d.program.admission_difficulty_score)}
            highlight="min"
          />
          <CompareRow
            label="地理分"
            values={data.map((d) => d.program.location_score)}
            highlight="max"
          />

          {/* Requirements */}
          <CompareRow
            label="IELTS 要求"
            values={data.map((d) => d.program.ielts_requirement || "—")}
          />
          <CompareRow
            label="GMAT/GRE"
            values={data.map((d) =>
              d.program.gmat_required ? "需要" : d.program.gre_required ? "需GRE" : "免"
            )}
            goodValue="免"
          />
          <CompareRow
            label="工作经验"
            values={data.map((d) =>
              d.program.work_experience_required ? "需要" : "不需要"
            )}
            goodValue="不需要"
          />

          {/* Cost */}
          <CompareRow
            label="学费"
            values={data.map((d) =>
              d.program.tuition_fee
                ? `${CURRENCY_SYMBOL[d.program.tuition_currency] || ""}${d.program.tuition_fee.toLocaleString()}`
                : "待查"
            )}
          />

          {/* Employment */}
          <CompareRow
            label="平均薪资"
            values={data.map((d) =>
              d.employment?.average_salary
                ? `£${d.employment.average_salary.toLocaleString()}`
                : "—"
            )}
            highlight="max"
          />
          <CompareRow
            label="就业率"
            values={data.map((d) =>
              d.employment?.employment_rate
                ? `${d.employment.employment_rate}%`
                : "—"
            )}
            highlight="max"
          />
          <CompareRow
            label="目标行业"
            values={data.map((d) => d.employment?.target_industries || "—")}
            wrap
          />
          <CompareRow
            label="目标岗位"
            values={data.map((d) => d.employment?.target_roles || "—")}
            wrap
          />
          <CompareRow
            label="主要雇主"
            values={data.map((d) => d.employment?.top_employers || "—")}
            wrap
          />

          {/* Cases */}
          <CompareRow
            label="录取案例"
            values={data.map((d) =>
              d.caseCount.total > 0
                ? `${d.caseCount.admitted}录/${d.caseCount.total}例`
                : "暂无"
            )}
          />
        </tbody>
      </table>
    </div>
  );
}

function CompareRow({
  label,
  values,
  highlight,
  goodValue,
  wrap,
}: {
  label: string;
  values: (string | number)[];
  highlight?: "max" | "min";
  goodValue?: string;
  wrap?: boolean;
}) {
  // Find best value index for highlighting
  let bestIdx = -1;
  if (highlight && values.every((v) => typeof v === "number")) {
    const nums = values as number[];
    if (highlight === "max") bestIdx = nums.indexOf(Math.max(...nums));
    else bestIdx = nums.indexOf(Math.min(...nums));
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-2.5 text-xs text-gray-500 font-medium">{label}</td>
      {values.map((v, i) => {
        const isBest = i === bestIdx;
        const isGood = goodValue && String(v) === goodValue;
        return (
          <td
            key={i}
            className={`px-4 py-2.5 text-sm ${
              isBest ? "text-blue-700 font-bold" : isGood ? "text-green-600 font-medium" : "text-gray-700"
            } ${wrap ? "text-xs leading-relaxed" : ""}`}
          >
            {String(v)}
          </td>
        );
      })}
    </tr>
  );
}
