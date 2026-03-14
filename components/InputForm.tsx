"use client";

import { useState, useEffect, useRef } from "react";
import type { UserProfile, JobLocation, CareerGoal, UndergraduateRegion, ProgramCountry } from "@/lib/types";
import { lookupPrestige } from "@/lib/schoolLookup";
import type { LookupResult } from "@/lib/schoolLookup";

const REGIONS: { value: UndergraduateRegion; label: string }[] = [
  { value: "China",       label: "🇨🇳 中国大陆" },
  { value: "UK",          label: "🇬🇧 英国" },
  { value: "US",          label: "🇺🇸 美国" },
  { value: "Hong Kong",   label: "🇭🇰 香港" },
  { value: "Singapore",   label: "🇸🇬 新加坡" },
  { value: "Australia",   label: "🇦🇺 澳大利亚" },
  { value: "Canada",      label: "🇨🇦 加拿大" },
  { value: "Europe",      label: "🇪🇺 欧洲" },
  { value: "Other",       label: "🌏 其他" },
];

const MANUAL_TIERS = [
  { value: "",                    label: "— 未识别，请手动选择 —" },
  { value: "China Tier 1",        label: "中国 T1（清北复交浙南中科大等）" },
  { value: "China Tier 2",        label: "中国 T2（强 985，如武大中山厦大人大）" },
  { value: "China Tier 3",        label: "中国 T3（211 / 财经外语强校，如上财贸大）" },
  { value: "China Tier 4",        label: "中国 T4（普通一本）" },
  { value: "G5",                  label: "英国 G5（牛剑 ICL LSE UCL）" },
  { value: "UK Top Tier",         label: "英国顶尖（罗素集团，如爱丁堡、曼大、华威）" },
  { value: "UK Strong Target",    label: "英国强 target（巴斯、约克、埃克塞特等）" },
  { value: "UK Target",           label: "英国一般院校" },
  { value: "US Ivy+",             label: "美国常青藤及同级顶校" },
  { value: "US Top 30",           label: "美国 Top 30" },
  { value: "US Top 50",           label: "美国 Top 50" },
  { value: "US Top 100",          label: "美国 Top 100" },
  { value: "HK Top",              label: "香港三大（HKU / CUHK / HKUST）" },
  { value: "HK Strong",           label: "香港次一梯队（城大 / 理大）" },
  { value: "SG Top",              label: "新加坡顶校（NUS / NTU）" },
  { value: "SG Strong",           label: "新加坡 SMU" },
  { value: "AU Go8",              label: "澳洲八校联盟" },
  { value: "AU Strong",           label: "澳洲其他强校" },
  { value: "CA Top",              label: "加拿大顶校（多大 / UBC / McGill）" },
  { value: "CA Strong",           label: "加拿大强校" },
  { value: "EU Top",              label: "欧洲顶校（ETH / Bocconi / HEC 等）" },
  { value: "EU Strong",           label: "欧洲其他有名院校" },
  { value: "Non-target",          label: "双非 / 非 target（保守估计）" },
];

const JOB_LOCATIONS: { value: JobLocation | ""; label: string }[] = [
  { value: "",            label: "不限 / 未定" },
  { value: "UK",          label: "🇬🇧 留英工作" },
  { value: "China",       label: "🇨🇳 回国发展" },
  { value: "US",          label: "🇺🇸 去美国" },
  { value: "Hong Kong",   label: "🇭🇰 香港 / 新加坡" },
  { value: "Europe",      label: "🇪🇺 欧洲其他" },
  { value: "Not sure",    label: "暂不确定 / 随缘" },
];

const CAREER_GOALS: { value: CareerGoal | ""; label: string }[] = [
  { value: "",                   label: "不限 / 未定" },
  { value: "Investment Banking", label: "💰 投行（IBD / M&A）" },
  { value: "Corporate Finance",  label: "🏦 公司金融 / 资管" },
  { value: "Consulting",         label: "🧩 管理咨询" },
  { value: "Data/AI",            label: "📊 数据分析 / AI" },
  { value: "Marketing",          label: "📣 市场营销 / 品牌" },
  { value: "Management",         label: "🏢 综合管理 / 运营" },
  { value: "Product",            label: "📱 产品 / 科技" },
  { value: "Entrepreneurship",   label: "🚀 创业" },
];

const TARGET_COUNTRIES: { value: ProgramCountry; label: string }[] = [
  { value: "UK",          label: "🇬🇧 英国" },
  { value: "US",          label: "🇺🇸 美国" },
  { value: "Hong Kong",   label: "🇭🇰 香港" },
  { value: "Singapore",   label: "🇸🇬 新加坡" },
  { value: "Australia",   label: "🇦🇺 澳大利亚" },
  { value: "France",      label: "🇫🇷 法国" },
];

const CATEGORIES = [
  "Finance", "Management", "Marketing", "Business Analytics",
  "Accounting", "MBA", "Economics", "Supply Chain",
];

interface Props {
  defaultProfile: UserProfile;
  onGenerate: (p: UserProfile) => void;
}

export default function InputForm({ defaultProfile, onGenerate }: Props) {
  const [p, setP] = useState<UserProfile>(defaultProfile);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "manual">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-run lookup when school name or region changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const schoolName = p.undergraduate_school.trim();
    if (!schoolName) {
      setLookup(null);
      setLookupStatus("idle");
      return;
    }
    debounceRef.current = setTimeout(() => {
      const result = lookupPrestige(p.undergraduate_region, schoolName, p.undergraduate_tier);
      setLookup(result);

      if (result.confidence === "fallback" || result.confidence === "low") {
        setLookupStatus("manual");
        // Don't overwrite user's manual tier if already set
      } else {
        setLookupStatus("found");
        // Auto-update tier + prestige score
        setP((prev) => ({
          ...prev,
          undergraduate_tier: result.detected_tier,
          undergrad_prestige_score: result.prestige_score,
        }));
      }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.undergraduate_school, p.undergraduate_region]);

  // When user manually changes tier, update prestige score too
  function handleTierChange(tier: string) {
    const result = lookupPrestige(p.undergraduate_region, p.undergraduate_school, tier);
    setP((prev) => ({
      ...prev,
      undergraduate_tier: tier,
      undergrad_prestige_score: result.prestige_score,
    }));
  }

  function set<K extends keyof UserProfile>(k: K, v: UserProfile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  function toggleCountry(country: ProgramCountry) {
    setP((prev) => ({
      ...prev,
      target_countries: prev.target_countries.includes(country)
        ? prev.target_countries.filter((c) => c !== country)
        : [...prev.target_countries, country],
    }));
  }

  function toggleCat(cat: string) {
    setP((prev) => ({
      ...prev,
      preferred_categories: prev.preferred_categories.includes(cat)
        ? prev.preferred_categories.filter((c) => c !== cat)
        : [...prev.preferred_categories, cat],
    }));
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onGenerate(p); }}
      className="space-y-6"
    >
      {/* Row 1: Region + School Name */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="本科院校所在地区">
          <select
            className={input}
            value={p.undergraduate_region}
            onChange={(e) => set("undergraduate_region", e.target.value as UndergraduateRegion)}
          >
            <option value="">— 请选择地区 —</option>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>
        <Field label="本科院校名称" className="md:col-span-2">
          <input
            className={input}
            placeholder="e.g. 北京大学 · Tsinghua · UCL · Harvard"
            value={p.undergraduate_school}
            onChange={(e) => set("undergraduate_school", e.target.value)}
          />
        </Field>
      </div>

      {/* School detection status */}
      {p.undergraduate_school && (
        <div className="rounded-xl border px-4 py-3 text-sm flex items-start gap-3">
          {lookupStatus === "found" && lookup ? (
            <>
              <span className="text-green-600 mt-0.5 text-base">✓</span>
              <div>
                <span className="font-semibold text-green-700">院校识别成功</span>
                {lookup.matched_name && (
                  <span className="text-gray-600 ml-2">· {lookup.matched_name}</span>
                )}
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {lookup.detected_tier}
                </span>
                <span className="ml-2 text-gray-500">综合背景分 {lookup.prestige_score}/10</span>
              </div>
            </>
          ) : lookupStatus === "manual" ? (
            <>
              <span className="text-amber-500 mt-0.5 text-base">⚠</span>
              <div className="flex-1">
                <span className="font-medium text-amber-700">未能自动识别学校，请手动选择院校档次</span>
                <span className="ml-2 text-gray-500 text-xs">（推荐结果将基于你选择的档次，偏保守估计）</span>
                <div className="mt-2">
                  <select
                    className={input}
                    value={p.undergraduate_tier}
                    onChange={(e) => handleTierChange(e.target.value)}
                  >
                    {MANUAL_TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <span className="text-gray-400">正在识别学校...</span>
          )}
        </div>
      )}

      {/* If found, still allow manual override */}
      {lookupStatus === "found" && (
        <div className="text-xs text-gray-400 -mt-4 ml-1">
          识别结果不准确？
          <button
            type="button"
            className="underline text-blue-500 ml-1"
            onClick={() => setLookupStatus("manual")}
          >
            手动修改档次
          </button>
        </div>
      )}

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="本科专业">
          <input
            className={input}
            placeholder="e.g. Finance · Economics · Engineering"
            value={p.major}
            onChange={(e) => set("major", e.target.value)}
          />
        </Field>
        <Field label="GPA / 绩点">
          <input
            className={input}
            placeholder="e.g. 3.7/4.0 · 85% · First Class"
            value={p.gpa}
            onChange={(e) => set("gpa", e.target.value)}
          />
        </Field>
        <Field label="语言成绩">
          <input
            className={input}
            placeholder="e.g. IELTS 7.0 · TOEFL 105"
            value={p.language_score}
            onChange={(e) => set("language_score", e.target.value)}
          />
        </Field>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="GMAT / GRE（选填）">
          <input
            className={input}
            placeholder="e.g. GMAT 720 · GRE 325"
            value={p.gmat_gre}
            onChange={(e) => set("gmat_gre", e.target.value)}
          />
        </Field>
        <Field label="实习经历">
          <input
            className={input}
            placeholder="e.g. 2 finance internships · 无"
            value={p.internships}
            onChange={(e) => set("internships", e.target.value)}
          />
        </Field>
        <Field label="工作经验（选填）">
          <input
            className={input}
            placeholder="e.g. 1 year investment banking"
            value={p.work_experience}
            onChange={(e) => set("work_experience", e.target.value)}
          />
        </Field>
      </div>

      {/* Target Countries */}
      <Field label="目标留学国家/地区（可多选，不选则显示全部）">
        <div className="flex flex-wrap gap-2 mt-1">
          {TARGET_COUNTRIES.map((c) => {
            const active = p.target_countries.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCountry(c.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Categories */}
      <Field label="偏好专业方向（可多选）">
        <div className="flex flex-wrap gap-2 mt-1">
          {CATEGORIES.map((cat) => {
            const active = p.preferred_categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCat(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Career goal + Job location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="职业目标（选填）">
          <select
            className={input}
            value={p.career_goal}
            onChange={(e) => set("career_goal", e.target.value as CareerGoal | "")}
          >
            {CAREER_GOALS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="目标就业地（选填）">
          <select
            className={input}
            value={p.target_job_location}
            onChange={(e) => set("target_job_location", e.target.value as JobLocation | "")}
          >
            {JOB_LOCATIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Budget */}
      <Field label="学费预算上限（当地货币/年，选填 · 英国填英镑、美国填美元、港新填港币/新币等）">
        <input
          className={input}
          type="number"
          placeholder="e.g. 40000 · 不限则留空"
          value={p.budget_gbp ?? ""}
          onChange={(e) =>
            set("budget_gbp", e.target.value ? Number(e.target.value) : null)
          }
        />
      </Field>

      <button
        type="submit"
        className="w-full md:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md transition-colors text-base"
      >
        🚀 生成推荐列表
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const input =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
