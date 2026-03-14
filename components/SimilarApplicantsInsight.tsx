"use client";

import { useMemo } from "react";
import casesData from "@/data/cases.json";
import type { UserProfile } from "@/lib/types";

interface RawCaseLocal {
  school_name: string;
  program_name: string;
  applicant_background_tier?: string | null;
  applicant_gpa?: string | null;
  applicant_major?: string | null;
  admission_result?: string;
}

const allCases = casesData as unknown as RawCaseLocal[];

// Parse GPA string to percentage (0-100)
function parseGPAToPercent(raw: string | null | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const s = raw.toLowerCase().trim();

  // X/4 scale
  const m4 = s.match(/(\d+\.?\d*)\s*\/\s*4/);
  if (m4) return Math.min(100, (parseFloat(m4[1]) / 4.0) * 100);

  // X/10 scale
  const m10 = s.match(/(\d+\.?\d*)\s*\/\s*10/);
  if (m10) return Math.min(100, parseFloat(m10[1]) * 10);

  // percentage
  const mpct = s.match(/(\d+\.?\d*)\s*%/);
  if (mpct) return parseFloat(mpct[1]);

  // plain number
  const mnum = s.match(/^(\d+\.?\d*)$/);
  if (mnum) {
    const v = parseFloat(mnum[1]);
    if (v <= 4.0) return (v / 4.0) * 100;
    if (v <= 10) return v * 10;
    return v; // assume percentage
  }
  return null;
}

// Map tier names to equivalent groups for matching
const TIER_GROUPS: Record<string, string[]> = {
  "985":            ["985", "C9", "Top"],
  "C9":             ["985", "C9", "Top"],
  "Top":            ["985", "C9", "Top"],
  "211":            ["211", "Double First", "Chinese Target"],
  "Double First":   ["211", "Double First", "Chinese Target"],
  "Chinese Target": ["211", "Double First", "Chinese Target"],
  "双非":           ["双非"],
  "中外合办":       ["中外合办", "双非"],
  "独立学院":       ["独立学院", "双非"],
  "海外院校":       ["海外院校"],
  "港澳院校":      ["港澳院校"],
};

// Broad program category detection
const PROGRAM_CATEGORIES: [string, RegExp][] = [
  ["金融", /\bfinanc|金融(?!科技)/i],
  ["金融科技", /fintech|financial technology|金融科技/i],
  ["会计", /\baccount|会计/i],
  ["管理", /\bmanagement\b|管理|商学|Master of Business/i],
  ["市场营销", /\bmarketing\b|市场营销|营销/i],
  ["商业分析", /business analytics|data analytics|商业分析/i],
  ["经济学", /\becon|经济/i],
  ["MBA", /\bmba\b|工商管理硕士/i],
  ["供应链", /supply chain|operations|logistics|供应链|物流/i],
];

function getProgramCategory(name: string): string | null {
  for (const [cat, re] of PROGRAM_CATEGORIES) {
    if (re.test(name)) return cat;
  }
  return null;
}

// Map user's preferred_categories to our broad categories for matching
const USER_CAT_MAP: Record<string, string[]> = {
  "Finance":                  ["金融"],
  "FinTech":                  ["金融科技"],
  "Accounting":               ["会计"],
  "Finance & Accounting":     ["金融", "会计"],
  "Management":               ["管理"],
  "Marketing":                ["市场营销"],
  "Business Analytics":       ["商业分析"],
  "Economics":                ["经济学"],
  "MBA":                      ["MBA"],
  "Supply Chain":             ["供应链"],
  "Supply Chain & Operations":["供应链"],
  "Digital Business":         ["商业分析"],
  "International Business":   ["管理"],
  "Entrepreneurship":         ["管理"],
  "HR Management":            ["管理"],
  "Strategy":                 ["管理"],
};

interface Props {
  profile: UserProfile;
}

export default function SimilarApplicantsInsight({ profile }: Props) {
  const insight = useMemo(() => {
    const userTier = profile.undergraduate_tier || "";
    const userGPA = parseGPAToPercent(profile.gpa);
    const matchTiers = TIER_GROUPS[userTier] || [userTier];

    // Determine user's target program categories
    const targetCats = new Set<string>();
    for (const uc of profile.preferred_categories) {
      const mapped = USER_CAT_MAP[uc];
      if (mapped) mapped.forEach((c) => targetCats.add(c));
    }

    // Filter similar applicants
    const similar = allCases.filter((c) => {
      // Must be admitted
      if (c.admission_result !== "admitted") return false;

      // Tier match
      const caseTier = c.applicant_background_tier || "";
      if (userTier && !matchTiers.includes(caseTier)) return false;

      // GPA match (±5 percentage points to get meaningful sample)
      if (userGPA !== null) {
        const caseGPA = parseGPAToPercent(c.applicant_gpa);
        if (caseGPA !== null && Math.abs(caseGPA - userGPA) > 5) return false;
      }

      // Program category match (if user specified preferences)
      if (targetCats.size > 0) {
        const caseCat = getProgramCategory(c.program_name || "");
        if (caseCat && !targetCats.has(caseCat)) return false;
      }

      return true;
    });

    if (similar.length < 5) return null; // Not enough data

    // Top schools
    const schoolCount: Record<string, number> = {};
    for (const c of similar) {
      const name = c.school_name || "";
      if (name) schoolCount[name] = (schoolCount[name] || 0) + 1;
    }
    const topSchools = Object.entries(schoolCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top programs
    const programCount: Record<string, number> = {};
    for (const c of similar) {
      const name = c.program_name || "";
      if (name) programCount[name] = (programCount[name] || 0) + 1;
    }
    const topPrograms = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { total: similar.length, topSchools, topPrograms };
  }, [profile]);

  if (!insight) return null;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-1">
        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </span>
        与你背景相似的申请者
      </h3>
      <p className="text-xs text-gray-400 mb-4 ml-8">
        基于 {insight.total.toLocaleString()} 条相似申请记录
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Schools */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">常见录取学校</h4>
          <ol className="space-y-2">
            {insight.topSchools.map((s, i) => (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? "bg-yellow-400 text-white" :
                  i === 1 ? "bg-gray-300 text-white" :
                  i === 2 ? "bg-orange-300 text-white" :
                  "bg-gray-100 text-gray-500"
                }`}>{i + 1}</span>
                <span className="text-gray-800 flex-1 truncate">{s.name}</span>
                <span className="text-gray-400 text-xs">{s.count}例</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top Programs */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">常见录取项目</h4>
          <ol className="space-y-2">
            {insight.topPrograms.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? "bg-blue-500 text-white" :
                  i === 1 ? "bg-blue-300 text-white" :
                  i === 2 ? "bg-blue-200 text-blue-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{i + 1}</span>
                <span className="text-gray-800 flex-1 truncate">{p.name}</span>
                <span className="text-gray-400 text-xs">{p.count}例</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
