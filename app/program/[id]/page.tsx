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
  const m4 = s.match(/(\d+\.?\d*)\s*\/\s*4/);
  if (m4) {
    const v = parseFloat(m4[1]);
    if (v >= 3.7) return "3.7+/4.0";
    if (v >= 3.5) return "3.5-3.7";
    if (v >= 3.3) return "3.3-3.5";
    if (v >= 3.0) return "3.0-3.3";
    return "<3.0";
  }
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

export default function ProgramPage() {
  const params = useParams();
  const programId = Number(params.id);
  const { favorites, toggle: toggleFav, loaded: favsLoaded } = useFavorites();
  const { requireAuth } = useAuthContext();

  function guardedToggleFav(id: number) {
    if (!requireAuth(() => toggleFav(id))) return;
    toggleFav(id);
  }

  const program = useMemo(
    () => programs.find((p) => p.id === programId) ?? null,
    [programId]
  );

  const emp = useMemo(() => {
    if (!program) return null;
    return employment.find((e) => e.program_key === program.program_key) ?? null;
  }, [program]);

  const programCases = useMemo(() => {
    if (!program) return [];
    return cases.filter((c) => {
      if (c.school_name !== program.school_name) return false;
      const cpn = (c.program_name || "").toLowerCase();
      const ppn = program.program_name.toLowerCase();
      const pcat = program.program_category.toLowerCase();
      return cpn.includes(ppn) || ppn.includes(cpn) || cpn.includes(pcat) || pcat.includes(cpn);
    });
  }, [program]);

  if (!program) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500 text-lg">未找到项目（ID: {programId}）</p>
          <Link href="/explore" className="text-blue-600 underline mt-4 block">返回项目探索</Link>
        </main>
      </div>
    );
  }

  const country = (program as any).country as string;

  // ── Admission Stats ────────────────────────────────────────────
  const admittedCases = programCases.filter((c) => c.admission_result === "admitted");
  const chineseCases = admittedCases.filter((c) => c.applicant_country === "China");
  const showAdmission = chineseCases.length >= 3;

  const tierDist = countDistribution(
    chineseCases.map((c) => (c as any).applicant_background_tier || "未知").filter((t: string) => t !== "未知")
  );
  const gpaDist = countDistribution(
    chineseCases.map((c) => parseGPARange(c.applicant_gpa || "")).filter((g) => g !== "未知")
  );
  const langDist = countDistribution(
    chineseCases.map((c) => parseLanguageRange(c.applicant_language_score || "")).filter((l) => l !== "未知" && l !== "其他")
  );
  const majorDist = countDistribution(
    chineseCases.map((c) => c.applicant_major || "未知").filter((m) => m !== "未知" && m !== "")
  );

  // ── Employment Stats ──────────────────────────────────────────
  const allIndustries: string[] = [];
  const allRoles: string[] = [];
  const allEmployers: string[] = [];
  if (emp) {
    if (emp.target_industries) allIndustries.push(...emp.target_industries.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean));
    if (emp.target_roles) allRoles.push(...emp.target_roles.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean));
    if (emp.top_employers) allEmployers.push(...emp.top_employers.split(/[;；,，]/).map((s) => s.trim()).filter(Boolean));
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── Program Header ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl shadow-lg text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight mb-2">{program.program_name}</h1>
              <Link
                href={`/school/${encodeURIComponent(program.school_name)}`}
                className="text-blue-200 hover:text-white hover:underline text-sm font-medium"
              >
                {COUNTRY_FLAG[country] || ""} {program.school_name}
              </Link>

              <div className="flex flex-wrap gap-2 text-sm text-blue-200 mt-3">
                <span className="bg-white/15 px-2 py-0.5 rounded-full">{country}</span>
                <span className="bg-white/15 px-2 py-0.5 rounded-full">{program.program_category}</span>
                {program.degree_type && <span className="bg-white/15 px-2 py-0.5 rounded-full">{program.degree_type}</span>}
                {program.duration && <span className="bg-white/15 px-2 py-0.5 rounded-full">⏱ {program.duration}</span>}
              </div>

              <div className="flex gap-2 mt-3">
                <ScoreDot label="品牌" value={program.brand_score} />
                <ScoreDot label="难度" value={program.admission_difficulty_score} />
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 items-end">
              {favsLoaded && (
                <button
                  onClick={() => guardedToggleFav(program.id)}
                  className={`text-2xl transition-transform hover:scale-110 ${favorites.has(program.id) ? "text-yellow-400" : "text-white/50 hover:text-yellow-300"}`}
                  title={favorites.has(program.id) ? "取消收藏" : "收藏"}
                >
                  {favorites.has(program.id) ? "★" : "☆"}
                </button>
              )}
              <Link
                href={`/explore?school=${encodeURIComponent(program.school_name)}`}
                className="px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-xs font-medium transition-colors"
              >
                在探索页查看
              </Link>
              <Link
                href="/tracker"
                className="px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-xs font-medium transition-colors"
              >
                📊 申请进度
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <StatPill label="录取案例" value={`${admittedCases.length} 条`} />
            <StatPill label="品牌分" value={`${program.brand_score}`} />
            <StatPill label="难度分" value={`${program.admission_difficulty_score}`} />
            <StatPill label="地理分" value={`${program.location_score}`} />
          </div>
        </div>

        {/* ── 基本信息 ──────────────────────────────────────────── */}
        <Section title="基本信息">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem
              label="学费"
              value={
                program.tuition_fee
                  ? `${CURRENCY_SYMBOL[program.tuition_currency] || ""}${program.tuition_fee.toLocaleString()}`
                  : "待查"
              }
            />
            <InfoItem label="学制" value={program.duration || "待查"} />
            <InfoItem
              label="GMAT/GRE"
              value={
                program.gmat_required
                  ? "需要 GMAT"
                  : program.gre_required
                  ? "需要 GRE"
                  : "不需要"
              }
              highlight={!program.gmat_required && !program.gre_required ? "green" : undefined}
            />
            <InfoItem
              label="工作经验"
              value={program.work_experience_required ? "需要" : "接受应届生"}
              highlight={!program.work_experience_required ? "green" : undefined}
            />
            <InfoItem label="IELTS 要求" value={program.ielts_requirement || "待查"} />
            <InfoItem
              label="项目官网"
              value={
                program.program_url ? (
                  <a
                    href={program.program_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm truncate block"
                  >
                    查看官网 ↗
                  </a>
                ) : (
                  "暂无"
                )
              }
            />
          </div>
        </Section>

        {/* ── 录取背景画像 ────────────────────────────────────────── */}
        {showAdmission && (
          <Section title="录取背景画像" subtitle={`基于 ${chineseCases.length} 条中国学生录取数据统计`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {tierDist.length > 0 && (
                <DistChart title="本科院校层级" data={tierDist} />
              )}
              {gpaDist.length > 0 && (
                <DistChart title="GPA 分布" data={gpaDist} />
              )}
              {langDist.length > 0 && (
                <DistChart title="语言成绩" data={langDist} />
              )}
              {majorDist.length > 0 && (
                <DistChart title="专业背景" data={majorDist.slice(0, 8)} />
              )}
            </div>
          </Section>
        )}

        {/* ── 就业统计 ────────────────────────────────────────────── */}
        {emp && (
          <Section title="就业统计" subtitle="来自该项目的就业数据">
            {/* Key numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {emp.average_salary && emp.average_salary > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-600 font-medium">平均薪资</p>
                  <p className="text-xl font-bold text-green-800">
                    {CURRENCY_SYMBOL[emp.salary_currency] || "£"}{emp.average_salary.toLocaleString()}
                  </p>
                </div>
              )}
              {emp.employment_rate && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-blue-600 font-medium">就业率</p>
                  <p className="text-xl font-bold text-blue-800">{emp.employment_rate}%</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {allIndustries.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">目标行业</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allIndustries.map((ind, i) => (
                      <span key={i} className="bg-white border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-gray-700">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {allRoles.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">目标岗位</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allRoles.map((role, i) => (
                      <span key={i} className="bg-white border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-gray-700">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {allEmployers.length > 0 && (
              <div className="mt-4 bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">主要雇主</p>
                <div className="flex flex-wrap gap-1.5">
                  {allEmployers.map((employer, i) => (
                    <span key={i} className="bg-white border border-gray-200 rounded-full px-2.5 py-1 text-[11px] text-gray-700">
                      {employer}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}
      </main>

      {/* WeChat Group CTA */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <WechatGroupCTA
          title="想了解这个项目的真实录取情况？"
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
  const color = value >= 8 ? "text-white bg-white/25" : value >= 6 ? "text-blue-100 bg-white/15" : "text-blue-200 bg-white/10";
  return (
    <div className={`text-center px-2 py-1 rounded-lg ${color}`}>
      <div className="text-[9px] text-blue-200">{label}</div>
      <div className="text-sm font-bold">{value}</div>
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

function InfoItem({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: "green" }) {
  const borderCls = highlight === "green" ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50";
  return (
    <div className={`rounded-xl p-3 border ${borderCls}`}>
      <p className="text-[10px] text-gray-500 font-medium mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-gray-800">{typeof value === "string" ? value : value}</div>
    </div>
  );
}
