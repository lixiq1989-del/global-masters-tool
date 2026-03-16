"use client";

import Link from "next/link";
import type { RecommendedProgram, ReachLevel } from "@/lib/types";

const REACH_CONFIG: Record<ReachLevel, {
  label: string; bg: string; text: string; dot: string; border: string; matchBg: string;
}> = {
  reach:  { label: "冲刺", bg: "bg-red-50",    text: "text-red-700",   dot: "bg-red-500",   border: "border-red-200",   matchBg: "bg-red-100" },
  match:  { label: "匹配", bg: "bg-green-50",  text: "text-green-700", dot: "bg-green-500", border: "border-green-200", matchBg: "bg-green-100" },
  safety: { label: "保底", bg: "bg-gray-50",   text: "text-gray-600",  dot: "bg-gray-400",  border: "border-gray-200",  matchBg: "bg-gray-100" },
};

const RESULT_BADGE: Record<string, string> = {
  admitted: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
  waitlisted: "bg-yellow-100 text-yellow-700", unclear: "bg-gray-100 text-gray-600",
};
const RESULT_LABEL: Record<string, string> = {
  admitted: "录取", rejected: "拒绝", waitlisted: "等待", unclear: "不明",
};

// Map internal career_goal keys to readable labels
const CAREER_LABELS: Record<string, string> = {
  "Investment Banking": "投行 / IBD",
  "Corporate Finance":  "公司金融 / 资管",
  "Consulting":         "管理咨询",
  "Data/AI":            "数据 / AI",
  "Marketing":          "市场营销",
  "Management":         "综合管理",
  "Product":            "产品 / 科技",
  "Entrepreneurship":   "创业",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£", USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", EUR: "€",
};

const COUNTRY_FLAG: Record<string, string> = {
  UK: "🇬🇧", US: "🇺🇸", "Hong Kong": "🇭🇰", Singapore: "🇸🇬", Australia: "🇦🇺", France: "🇫🇷",
};

interface Props {
  item: RecommendedProgram;
  rank: number;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  careerGoalLabel?: string;
  locationLabel?: string;
}

export default function ProgramCard({
  item,
  rank,
  isFavorited = false,
  onToggleFavorite,
  careerGoalLabel,
  locationLabel,
}: Props) {
  const { program: p, employment: e, cases, reachLevel, reasons, matchScore, career_match, location_match } = item;
  const cfg = REACH_CONFIG[reachLevel];

  // Match score 0–100%
  const matchPct = Math.min(100, Math.max(0, Math.round(matchScore * 10)));

  // Match bar color
  const matchBarColor = matchPct >= 75 ? "bg-green-500" : matchPct >= 55 ? "bg-yellow-500" : "bg-orange-400";

  const admittedCount = cases.filter((c) => c.admission_result === "admitted").length;
  const rejectedCount = cases.filter((c) => c.admission_result === "rejected").length;

  return (
    <div className={`rounded-xl border ${cfg.border} bg-white shadow-sm overflow-hidden flex flex-col`}>
      {/* Top bar */}
      <div className={`${cfg.bg} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.label}</span>
          {cases.length > 0 && (
            <span className="text-[10px] bg-white/60 text-gray-600 px-1.5 py-0.5 rounded-full">
              {admittedCount}录/{cases.length}例
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Match % pill */}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.matchBg} ${cfg.text}`}>
            {matchPct}% 匹配
          </span>
          {/* Favorite star */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              title={isFavorited ? "取消收藏" : "收藏此项目"}
              className={`text-lg transition-transform hover:scale-110 ${isFavorited ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
            >
              {isFavorited ? "★" : "☆"}
            </button>
          )}
          <span className="text-xs text-gray-400">#{rank}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {/* School + Program */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">
            <span className="mr-1">{COUNTRY_FLAG[(p as any).country] || ""}</span>
            {p.school_name}
            <Link
              href={`/explore?school=${encodeURIComponent(p.school_name)}`}
              className="ml-2 text-blue-400 hover:text-blue-600 normal-case font-normal"
              title={`查看${p.school_name}全部项目`}
            >
              查看该校更多 →
            </Link>
          </p>
          <Link
            href={`/program/${p.id}`}
            className="text-[15px] font-semibold text-blue-700 hover:underline leading-tight block"
          >
            {p.program_name}
          </Link>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge>{p.program_category}</Badge>
            <Badge>{p.school_tier}</Badge>
            <Badge>📍 {p.location}</Badge>
            {p.duration && <Badge>⏱ {p.duration}</Badge>}
          </div>
        </div>

        {/* Match score bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>综合匹配度</span>
            <span className="font-semibold text-gray-700">{matchPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${matchBarColor} rounded-full transition-all`} style={{ width: `${matchPct}%` }} />
          </div>
        </div>

        {/* Career + Location match row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <MatchPill
            type="career"
            match={career_match}
            hitLabel={careerGoalLabel ? `✔ 适合${CAREER_LABELS[careerGoalLabel] || careerGoalLabel}` : "✔ 职业匹配"}
            missLabel={careerGoalLabel ? `⚠ ${CAREER_LABELS[careerGoalLabel] || careerGoalLabel}契合度低` : "⚠ 职业匹配偏低"}
            neutralLabel="— 职业目标未设定"
          />
          <MatchPill
            type="location"
            match={location_match}
            hitLabel={locationLabel ? `✔ ${locationLabel}就业资源好` : "✔ 地点匹配"}
            missLabel={locationLabel ? `⚠ ${locationLabel}资源有限` : "⚠ 地点匹配偏低"}
            neutralLabel="— 就业地未设定"
          />
        </div>

        {/* Score row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <ScoreBox label="品牌分" value={p.brand_score} max={10} color="blue" />
          <ScoreBox label="录取难度" value={p.admission_difficulty_score} max={10} color="orange" />
          <ScoreBox label="地理分" value={p.location_score} max={10} color="purple" />
        </div>

        {/* Tuition + salary row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-3 bg-gray-50 rounded-lg px-3 py-2">
          {p.tuition_fee
            ? <span>💰 <strong>{CURRENCY_SYMBOL[p.tuition_currency] || ""}{p.tuition_fee.toLocaleString()}</strong>/yr</span>
            : <span className="text-gray-400">💷 学费待查</span>}
          {e?.average_salary
            ? <span>📈 均薪 <strong>£{e.average_salary.toLocaleString()}</strong></span>
            : null}
          {e?.employment_rate
            ? <span>✅ 就业率 <strong>{e.employment_rate}%</strong></span>
            : null}
          {!e?.average_salary && !e?.employment_rate && e?.data_scope && (
            <span className="text-gray-400 text-[10px]">就业数据: {e.data_scope}</span>
          )}
        </div>

        {/* Recommendation reasons */}
        {reasons.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
            <p className="text-[10px] font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">推荐理由</p>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="text-[11px] text-amber-900 flex items-start gap-1.5">
                  <span className={`mt-0.5 shrink-0 ${r.startsWith("⚠") ? "text-orange-400" : "text-amber-500"}`}>
                    {r.startsWith("⚠") ? "⚠" : "✦"}
                  </span>
                  <span>{r.startsWith("⚠") ? r.slice(2).trim() : r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Employment summary */}
        {e && (e.target_roles || e.top_employers) && (
          <div className="bg-blue-50 rounded-lg p-2.5 mb-3 text-xs text-gray-700">
            <p className="font-medium text-blue-800 mb-1">就业方向</p>
            {e.target_roles && <p>🎯 {e.target_roles}</p>}
            {e.top_employers && (
              <p className="mt-0.5 text-gray-500 text-[10px] truncate">🏢 {e.top_employers}</p>
            )}
          </div>
        )}

        {/* Admission cases */}
        {cases.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-auto">
            <p className="text-xs font-medium text-gray-500 mb-2">
              真实案例 · {admittedCount}录/{rejectedCount}拒/{cases.length}例
            </p>
            <div className="space-y-2">
              {cases.slice(0, 2).map((c) => (
                <a
                  key={c.id}
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-50 rounded-lg p-2.5 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${RESULT_BADGE[c.admission_result]}`}>
                      {RESULT_LABEL[c.admission_result]}
                    </span>
                    {c.applicant_background_school && (
                      <span className="text-[10px] text-gray-500">{c.applicant_background_school}</span>
                    )}
                    {c.applicant_gpa && <span className="text-[10px] text-gray-500">GPA {c.applicant_gpa}</span>}
                    {c.applicant_gmat_gre && <span className="text-[10px] text-gray-500">{c.applicant_gmat_gre}</span>}
                    {c.entry_year && <span className="text-[10px] text-gray-400">{c.entry_year}</span>}
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2 group-hover:text-gray-900">{c.case_summary}</p>
                  <p className="text-[10px] text-blue-400 mt-0.5">{c.source_platform} ↗</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function MatchPill({
  type, match, hitLabel, missLabel, neutralLabel,
}: {
  type: "career" | "location";
  match: number;
  hitLabel: string;
  missLabel: string;
  neutralLabel: string;
}) {
  const icon = type === "career" ? "🎯" : "📍";
  if (match === 1) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 text-[10px] text-green-700 font-medium flex items-start gap-1">
        <span>{icon}</span><span>{hitLabel}</span>
      </div>
    );
  }
  if (match === 0.5 || match === 0.8) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1.5 text-[10px] text-yellow-700 flex items-start gap-1">
        <span>{icon}</span><span className="text-yellow-600">~{hitLabel.replace("✔ ", "")}</span>
      </div>
    );
  }
  if (match === 0) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5 text-[10px] text-orange-700 flex items-start gap-1">
        <span>{icon}</span><span>{missLabel}</span>
      </div>
    );
  }
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 flex items-start gap-1">
      <span>{icon}</span><span>{neutralLabel}</span>
    </div>
  );
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: "green" | "blue" }) {
  const cls = accent === "green" ? "bg-green-100 text-green-700"
    : accent === "blue" ? "bg-blue-100 text-blue-700"
    : "bg-gray-100 text-gray-600";
  return (
    <span className={`${cls} text-[10px] px-2 py-0.5 rounded-full font-medium`}>{children}</span>
  );
}

function ScoreBox({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500", orange: "bg-orange-500", purple: "bg-purple-500",
  };
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${colorMap[color]} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
