"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import programsData from "@/data/programs.json";
import employmentData from "@/data/employment.json";
import casesData from "@/data/cases.json";
import { compassCases } from "@/lib/compassCases";
import type { RawProgram, RawEmployment, RawCase } from "@/lib/types";
import { WechatGroupCTA } from "@/components/WechatGroupModal";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuthContext } from "@/components/AuthProvider";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs = programsData as any as RawProgram[];
const employment = employmentData as any as RawEmployment[];
const cases = [...(casesData as any as RawCase[]), ...compassCases];

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£", USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", EUR: "€",
};
const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", US: "🇺🇸", "Hong Kong": "🇭🇰", Singapore: "🇸🇬", Australia: "🇦🇺", France: "🇫🇷",
};

// ── Stat helpers ────────────────────────────────────────────────

function parseGPARange(gpa: string): string {
  if (!gpa) return "未知";
  const s = gpa.toLowerCase().trim();
  // 4.0 scale
  const m4 = s.match(/(\d+\.?\d*)\s*\/\s*4/);
  if (m4) {
    const v = parseFloat(m4[1]);
    if (v >= 3.7) return "3.7+/4.0";
    if (v >= 3.5) return "3.5-3.7";
    if (v >= 3.3) return "3.3-3.5";
    if (v >= 3.0) return "3.0-3.3";
    return "<3.0";
  }
  // percentage
  const mpct = s.match(/(\d+\.?\d*)\s*%?/);
  if (mpct) {
    const v = parseFloat(mpct[1]);
    if (v > 10) {
      if (v >= 90) return "90%+";
      if (v >= 85) return "85-90%";
      if (v >= 80) return "80-85%";
      if (v >= 75) return "75-80%";
      return "<75%";
    }
  }
  if (s.includes("first")) return "First/90%+";
  if (s.includes("2:1")) return "2:1/75-80%";
  return "其他";
}

function parseLanguageRange(lang: string): string {
  if (!lang) return "未知";
  const s = lang.toLowerCase();
  const ielts = s.match(/ielts\s*(\d+\.?\d*)/);
  if (ielts) {
    const v = parseFloat(ielts[1]);
    if (v >= 7.5) return "IELTS 7.5+";
    if (v >= 7.0) return "IELTS 7.0";
    if (v >= 6.5) return "IELTS 6.5";
    return "IELTS <6.5";
  }
  const toefl = s.match(/toefl\s*(\d+)/);
  if (toefl) {
    const v = parseInt(toefl[1]);
    if (v >= 110) return "TOEFL 110+";
    if (v >= 100) return "TOEFL 100-109";
    if (v >= 90) return "TOEFL 90-99";
    return "TOEFL <90";
  }
  return "其他";
}

function countDistribution(items: string[]): { label: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  for (const item of items) counts[item] = (counts[item] || 0) + 1;
  const total = items.length;
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

// ── Main Page ────────────────────────────────────────────────────

export default function SchoolPage() {
  const params = useParams();
  const schoolName = decodeURIComponent(params.name as string);
  const { favorites, toggle: toggleFav, loaded: favsLoaded } = useFavorites();
  const { requireAuth } = useAuthContext();

  function guardedToggleFav(id: number) {
    if (!requireAuth(() => toggleFav(id))) return;
    toggleFav(id);
  }

  const schoolPrograms = useMemo(
    () => programs.filter((p) => p.school_name === schoolName),
    [schoolName]
  );

  const schoolEmployment = useMemo(() => {
    const empMap = new Map<string, RawEmployment>();
    for (const e of employment) {
      if (e.school_name === schoolName) {
        empMap.set(e.program_key ?? `${e.school_name}__${e.program_name}`, e);
      }
    }
    return empMap;
  }, [schoolName]);

  const schoolCases = useMemo(
    () => cases.filter((c) => c.school_name === schoolName),
    [schoolName]
  );

  if (schoolPrograms.length === 0) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500 text-lg">未找到学校「{schoolName}」</p>
          <Link href="/explore" className="text-blue-600 underline mt-4 block">返回项目探索</Link>
        </main>
      </div>
    );
  }

  const firstProg = schoolPrograms[0];
  const country = (firstProg as any).country as string;
  const tier = firstProg.school_tier || "";
  const location = firstProg.location || "";
  const categories = Array.from(new Set(schoolPrograms.map((p) => p.program_category))).sort();

  // ── Admission Stats ────────────────────────────────────────────
  const admittedCases = schoolCases.filter((c) => c.admission_result === "admitted");
  const chineseCases = admittedCases.filter((c) => c.applicant_country === "China");

  const tierDist = countDistribution(
    chineseCases.map((c) => (c as any).applicant_background_tier || "未知").filter((t: string) => t !== "未知")
  );
  const gpaDist = countDistribution(
    chineseCases.map((c) => parseGPARange(c.applicant_gpa || "")).filter((g) => g !== "未知")
  );
  const langDist = countDistribution(
    chineseCases.map((c) => parseLanguageRange(c.applicant_language_score || "")).filter((l) => l !== "未知" && l !== "其他")
  );
  const gmatCases = chineseCases.filter((c) => c.applicant_gmat_gre && c.applicant_gmat_gre.trim());
  const majorDist = countDistribution(
    chineseCases.map((c) => c.applicant_major || "未知").filter((m) => m !== "未知" && m !== "")
  );

  // ── Employment Stats ──────────────────────────────────────────
  const empEntries = Array.from(schoolEmployment.values());
  const salaries = empEntries.filter((e) => e.average_salary && e.average_salary > 0);
  const avgSalary = salaries.length > 0
    ? Math.round(salaries.reduce((sum, e) => sum + (e.average_salary || 0), 0) / salaries.length)
    : null;

  const allIndustries: string[] = [];
  const allRoles: string[] = [];
  const allEmployers: string[] = [];
  for (const e of empEntries) {
    if (e.target_industries) allIndustries.push(...e.target_industries.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean));
    if (e.target_roles) allRoles.push(...e.target_roles.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean));
    if (e.top_employers) allEmployers.push(...e.top_employers.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean));
  }
  const industryDist = countDistribution(allIndustries).slice(0, 8);
  const roleDist = countDistribution(allRoles).slice(0, 8);
  const topEmployers = countDistribution(allEmployers).slice(0, 12);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── School Header ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl shadow-lg text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{COUNTRY_FLAG[country] || ""}</span>
                <h1 className="text-2xl font-bold">{schoolName}</h1>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-blue-200">
                {tier && <span className="bg-white/15 px-2 py-0.5 rounded-full">{tier}</span>}
                <span className="bg-white/15 px-2 py-0.5 rounded-full">{country}</span>
                {location && <span className="bg-white/15 px-2 py-0.5 rounded-full">📍 {location}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href="/tracker"
                className="px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-xs font-medium transition-colors"
              >
                📊 申请进度
              </Link>
              <Link
                href={`/explore?school=${encodeURIComponent(schoolName)}`}
                className="px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-xs font-medium transition-colors"
              >
                在探索页查看
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <StatPill label="项目数量" value={`${schoolPrograms.length}`} />
            <StatPill label="专业方向" value={`${categories.length} 个`} />
            <StatPill label="录取案例" value={`${admittedCases.length} 条`} />
            <StatPill label="就业数据" value={`${empEntries.length} 条`} />
          </div>
        </div>

        {/* ── Admission Profile ──────────────────────────────────── */}
        {chineseCases.length >= 5 && (
          <Section title="录取背景画像" subtitle={`基于 ${chineseCases.length} 条中国学生录取数据统计`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tier distribution */}
              {tierDist.length > 0 && (
                <DistChart title="本科院校层级" data={tierDist} />
              )}

              {/* GPA distribution */}
              {gpaDist.length > 0 && (
                <DistChart title="GPA 分布" data={gpaDist} />
              )}

              {/* Language distribution */}
              {langDist.length > 0 && (
                <DistChart title="语言成绩" data={langDist} />
              )}

              {/* Major distribution */}
              {majorDist.length > 0 && (
                <DistChart title="专业背景" data={majorDist.slice(0, 8)} />
              )}
            </div>

            {/* GMAT stat */}
            {gmatCases.length > 0 && (
              <div className="mt-4 bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">GMAT/GRE</p>
                <p className="text-sm text-gray-700">
                  {chineseCases.length} 条录取案例中，{gmatCases.length} 人提交了 GMAT/GRE（{Math.round(gmatCases.length / chineseCases.length * 100)}%）
                </p>
              </div>
            )}
          </Section>
        )}

        {/* ── Employment Stats ───────────────────────────────────── */}
        {empEntries.length > 0 && (
          <Section title="就业统计" subtitle={`来自 ${empEntries.length} 个项目的就业数据`}>
            {/* Key numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {avgSalary && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-600 font-medium">平均薪资</p>
                  <p className="text-xl font-bold text-green-800">£{avgSalary.toLocaleString()}</p>
                </div>
              )}
              {empEntries.some((e) => e.employment_rate) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-blue-600 font-medium">就业率</p>
                  <p className="text-xl font-bold text-blue-800">
                    {Math.round(empEntries.filter((e) => e.employment_rate).reduce((s, e) => s + (e.employment_rate || 0), 0) / empEntries.filter((e) => e.employment_rate).length)}%
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Industry distribution */}
              {industryDist.length > 0 && (
                <DistChart title="目标行业" data={industryDist} />
              )}

              {/* Role distribution */}
              {roleDist.length > 0 && (
                <DistChart title="目标岗位" data={roleDist} />
              )}
            </div>

            {/* Top employers */}
            {topEmployers.length > 0 && (
              <div className="mt-4 bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">主要雇主</p>
                <div className="flex flex-wrap gap-1.5">
                  {topEmployers.map((e) => (
                    <span key={e.label} className="bg-white border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-gray-700">
                      {e.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ── Programs List ──────────────────────────────────────── */}
        <Section title="项目列表" subtitle={`共 ${schoolPrograms.length} 个项目`}>
          <div className="space-y-2">
            {schoolPrograms.map((p) => {
              const emp = schoolEmployment.get(p.program_key) ?? null;
              return (
                <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/program/${p.id}`}
                        className="text-sm font-semibold text-blue-700 hover:underline truncate">
                        {p.program_name}
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <MiniTag>{p.program_category}</MiniTag>
                      {p.duration && <MiniTag>⏱ {p.duration}</MiniTag>}
                      {p.degree_type && <MiniTag>{p.degree_type}</MiniTag>}
                      {!p.gmat_required && !p.gre_required && <MiniTag color="green">免GMAT</MiniTag>}
                      {p.gmat_required && <MiniTag color="orange">需GMAT</MiniTag>}
                      {!p.work_experience_required && <MiniTag color="green">接受应届</MiniTag>}
                      {p.work_experience_required && <MiniTag color="orange">需工作经验</MiniTag>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="flex gap-1.5">
                      <ScoreDot label="品牌" value={p.brand_score} />
                      <ScoreDot label="难度" value={p.admission_difficulty_score} />
                    </div>
                    {p.tuition_fee ? (
                      <p className="text-xs text-gray-500 font-medium">
                        {CURRENCY_SYMBOL[p.tuition_currency] || ""}{p.tuition_fee.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">学费待查</p>
                    )}
                    {emp?.average_salary && (
                      <p className="text-[10px] text-gray-400">均薪 £{emp.average_salary.toLocaleString()}</p>
                    )}
                  </div>
                  {favsLoaded && (
                    <button
                      onClick={() => guardedToggleFav(p.id)}
                      className={`text-lg shrink-0 transition-colors ${favorites.has(p.id) ? "text-yellow-400" : "text-gray-300 hover:text-yellow-400"}`}
                      title={favorites.has(p.id) ? "取消收藏" : "收藏"}
                    >
                      {favorites.has(p.id) ? "★" : "☆"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </main>

      {/* WeChat Group CTA */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <WechatGroupCTA
          title="想了解这个学校真实录取情况？"
          desc="加入留学申请交流群，一起讨论申请策略"
        />
      </div>

      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 统计画像仅供参考
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl p-2.5 text-center">
      <p className="text-[10px] text-blue-200">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function MiniTag({ children, color }: { children: React.ReactNode; color?: "green" | "orange" }) {
  const cls = color === "green" ? "bg-green-50 text-green-600"
    : color === "orange" ? "bg-orange-50 text-orange-600"
    : "bg-gray-100 text-gray-600";
  return <span className={`${cls} text-[10px] px-1.5 py-0.5 rounded-full`}>{children}</span>;
}

function ScoreDot({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? "text-blue-700 bg-blue-50" : value >= 6 ? "text-gray-700 bg-gray-100" : "text-gray-500 bg-gray-50";
  return (
    <div className={`text-center px-1.5 py-0.5 rounded ${color}`}>
      <div className="text-[8px] text-gray-400">{label}</div>
      <div className="text-xs font-bold">{value}</div>
    </div>
  );
}

function DistChart({ title, data }: { title: string; data: { label: string; count: number; pct: number }[] }) {
  const maxPct = Math.max(...data.map((d) => d.pct), 1);
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-600 mb-3">{title}</p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-700 w-24 truncate shrink-0" title={d.label}>{d.label}</span>
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(d.pct / maxPct) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 w-10 text-right shrink-0">{d.pct}%</span>
            <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
