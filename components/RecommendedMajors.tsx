"use client";

import { useMemo } from "react";
import type { UserProfile } from "@/lib/types";
import casesData from "@/data/cases.json";
import { compassCases } from "@/lib/compassCases";
import type { RawCase } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const allCases = [...(casesData as any as RawCase[]), ...compassCases];

interface MajorScore {
  key: string;
  label: string;
  score: number;
  reason: string;
}

// Major affinity map: user's undergrad major → which directions suit them
const MAJOR_AFFINITY: Record<string, Record<string, number>> = {
  finance:     { Finance: 10, "Business Analytics": 7, Management: 6, Marketing: 5, Economics: 9, FinTech: 8 },
  economics:   { Finance: 9, Economics: 10, "Business Analytics": 7, Management: 6, Marketing: 5, FinTech: 7 },
  accounting:  { Finance: 8, "Accounting": 10, Management: 6, "Business Analytics": 6, Economics: 7 },
  management:  { Management: 10, Marketing: 8, Finance: 6, "Business Analytics": 6, "Supply Chain": 7, "HR Management": 8 },
  marketing:   { Marketing: 10, Management: 8, "Digital Business": 8, "Business Analytics": 6, Finance: 4 },
  computer:    { "Business Analytics": 10, FinTech: 9, "Digital Business": 8, Finance: 5, Management: 5 },
  statistics:  { "Business Analytics": 10, Finance: 8, Economics: 7, FinTech: 8 },
  math:        { "Business Analytics": 10, Finance: 8, Economics: 7, FinTech: 9 },
  engineering: { "Business Analytics": 8, "Supply Chain": 8, Management: 7, Finance: 6, FinTech: 7 },
  language:    { Marketing: 9, Management: 8, "International Business": 9, Finance: 4, "Business Analytics": 4 },
  law:         { Management: 7, Finance: 6, "International Business": 8, Marketing: 6 },
  art:         { Marketing: 9, Management: 7, "Digital Business": 7 },
};

// Career goal → direction mapping
const CAREER_AFFINITY: Record<string, Record<string, number>> = {
  "Investment Banking": { Finance: 10, Economics: 7, "Business Analytics": 5 },
  "Corporate Finance":  { Finance: 10, "Accounting": 7, Economics: 6, "Business Analytics": 5 },
  "Consulting":         { Management: 9, "Business Analytics": 7, Finance: 7, Economics: 6 },
  "Data/AI":            { "Business Analytics": 10, FinTech: 8, Finance: 5 },
  "Marketing":          { Marketing: 10, "Digital Business": 8, Management: 6 },
  "Management":         { Management: 10, "Supply Chain": 7, Marketing: 6, Finance: 6 },
  "Product":            { "Business Analytics": 8, "Digital Business": 9, Management: 7, Marketing: 6 },
  "Entrepreneurship":   { Management: 8, Marketing: 7, Finance: 6, "Digital Business": 7 },
};

const DIRECTIONS = [
  { key: "Finance", label: "金融 Finance" },
  { key: "Business Analytics", label: "商业分析 BA" },
  { key: "Management", label: "管理学 Management" },
  { key: "Marketing", label: "市场营销 Marketing" },
  { key: "Economics", label: "经济学 Economics" },
  { key: "Accounting", label: "会计 Accounting" },
  { key: "Supply Chain", label: "供应链 SCM" },
  { key: "FinTech", label: "金融科技 FinTech" },
  { key: "Digital Business", label: "数字商业 Digital" },
  { key: "International Business", label: "国际商务 IB" },
  { key: "HR Management", label: "人力资源 HR" },
];

function detectMajorKey(major: string): string {
  const m = major.toLowerCase();
  if (/financ|金融/.test(m)) return "finance";
  if (/econom|经济/.test(m)) return "economics";
  if (/account|会计/.test(m)) return "accounting";
  if (/manag|管理|工商/.test(m)) return "management";
  if (/market|营销|广告/.test(m)) return "marketing";
  if (/comput|计算机|软件|信息/.test(m)) return "computer";
  if (/statist|统计/.test(m)) return "statistics";
  if (/math|数学/.test(m)) return "math";
  if (/engineer|工程/.test(m)) return "engineering";
  if (/language|语言|英语|翻译|文学/.test(m)) return "language";
  if (/law|法/.test(m)) return "law";
  if (/art|design|艺术|设计/.test(m)) return "art";
  return "management"; // default
}

interface Props {
  profile: UserProfile;
}

export default function RecommendedMajors({ profile }: Props) {
  const scores = useMemo(() => {
    const majorKey = detectMajorKey(profile.major || "management");
    const majorAff = MAJOR_AFFINITY[majorKey] || {};
    const careerAff = profile.career_goal ? CAREER_AFFINITY[profile.career_goal] || {} : {};

    // Count cases per category for user's tier group
    const categoryCounts: Record<string, number> = {};
    const userTier = profile.undergraduate_tier?.toLowerCase() || "";
    for (const c of allCases) {
      if (c.admission_result !== "admitted") continue;
      const cat = c.program_name || "";
      for (const dir of DIRECTIONS) {
        if (cat.toLowerCase().includes(dir.key.toLowerCase())) {
          categoryCounts[dir.key] = (categoryCounts[dir.key] || 0) + 1;
        }
      }
    }
    const maxCount = Math.max(1, ...Object.values(categoryCounts));

    const results: MajorScore[] = [];

    for (const dir of DIRECTIONS) {
      // 1. Major affinity (30%)
      const majorScore = (majorAff[dir.key] || 5) / 10;
      // 2. Career affinity (25%)
      const careerScore = profile.career_goal ? (careerAff[dir.key] || 4) / 10 : 0.5;
      // 3. Case support (20%)
      const caseScore = (categoryCounts[dir.key] || 0) / maxCount;
      // 4. GMAT bonus (15%) — Finance/BA benefit from GMAT
      const hasGmat = /gmat\s*[67]\d{2}/i.test(profile.gmat_gre || "");
      const gmatScore = hasGmat && ["Finance", "Business Analytics", "Economics"].includes(dir.key) ? 1 : hasGmat ? 0.6 : 0.4;
      // 5. Country coverage (10%)
      const countryScore = profile.target_countries.length > 0 ? 0.7 : 0.5;

      const total = majorScore * 0.30 + careerScore * 0.25 + caseScore * 0.20 + gmatScore * 0.15 + countryScore * 0.10;
      const finalScore = Math.min(9.8, Math.max(3.0, total * 10));

      // Generate reason
      let reason = "";
      if (majorScore >= 0.8) reason = `你的${profile.major || "专业"}背景非常契合`;
      else if (careerScore >= 0.8) reason = `与${profile.career_goal}职业目标高度匹配`;
      else if (caseScore >= 0.5) reason = "大量相似背景申请者成功录取";
      else reason = "该方向项目丰富，值得考虑";

      results.push({ key: dir.key, label: dir.label, score: Math.round(finalScore * 10) / 10, reason });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [profile]);

  if (scores.length === 0) return null;

  const maxScore = scores[0]?.score || 10;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <h3 className="text-base font-bold text-gray-800 mb-1">适合你的专业方向</h3>
      <p className="text-xs text-gray-500 mb-4">基于你的本科专业、职业目标和录取数据综合评分</p>
      <div className="space-y-3">
        {scores.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-28 shrink-0">
              <p className="text-sm font-semibold text-gray-800">{s.label.split(" ")[0]}</p>
              <p className="text-[10px] text-gray-400">{s.label.split(" ").slice(1).join(" ")}</p>
            </div>
            <div className="flex-1">
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${(s.score / maxScore) * 100}%` }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-700">
                  {s.score}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 w-36 shrink-0 hidden sm:block">{s.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
