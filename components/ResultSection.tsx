"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import ProgramCard from "./ProgramCard";
import { useAuthContext } from "./AuthProvider";
import type { RecommendedProgram, UserProfile, ReachLevel, UserSubScores } from "@/lib/types";
import { useFavorites } from "@/hooks/useFavorites";
import { generateReportHTML } from "@/lib/generateReport";
import { WechatGroupCTA } from "./WechatGroupModal";
import SimilarApplicantsInsight from "./SimilarApplicantsInsight";
import RecommendedMajors from "./RecommendedMajors";

const REACH_CAPS: Record<ReachLevel, number> = { reach: 5, match: 10, safety: 5 };

interface Props {
  results: RecommendedProgram[];
  strength: number;
  subScores: UserSubScores;
  profile: UserProfile;
}

const TABS: { key: ReachLevel | "all" | "saved"; label: string; emoji: string }[] = [
  { key: "all",    label: "全部",  emoji: "📋" },
  { key: "reach",  label: "冲刺",  emoji: "🔥" },
  { key: "match",  label: "匹配",  emoji: "✅" },
  { key: "safety", label: "保底",  emoji: "🛡️" },
  { key: "saved",  label: "收藏",  emoji: "★"  },
];

const SORT_OPTIONS = [
  { value: "default",    label: "默认排序（匹配度）" },
  { value: "brand",      label: "品牌分↓" },
  { value: "difficulty", label: "难度↓" },
  { value: "cost_asc",   label: "学费↑（低→高）" },
  { value: "cost_desc",  label: "学费↓（高→低）" },
  { value: "overall",    label: "综合分↓" },
];

const PAGE_SIZE = 8;

export default function ResultSection({ results, strength, subScores, profile }: Props) {
  const [activeTab, setActiveTab] = useState<ReachLevel | "all" | "saved">("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterHasCases, setFilterHasCases] = useState(false);
  const [filterHasSalary, setFilterHasSalary] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [showCount, setShowCount] = useState(PAGE_SIZE);
  const [showMoreExpanded, setShowMoreExpanded] = useState(false);
  const [moreCount, setMoreCount] = useState(PAGE_SIZE);

  const { favorites, toggle: toggleFav, clear: clearFavs, loaded: favsLoaded } = useFavorites();
  const { authed, requireAuth } = useAuthContext();

  function guardedToggleFav(id: number) {
    if (!requireAuth(() => toggleFav(id))) return;
    toggleFav(id);
  }

  // ── AI Analysis ───────────────────────────────────────────────
  const [aiStrategy, setAiStrategy] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Derive filter options
  const allCountries = useMemo(() => {
    const cs = new Set(results.map((r) => (r.program as any).country as string).filter(Boolean));
    return ["all", ...Array.from(cs).sort()];
  }, [results]);

  const allCategories = useMemo(() => {
    const cats = new Set(results.map((r) => r.program.program_category).filter(Boolean));
    return ["all", ...Array.from(cats).sort()];
  }, [results]);

  const allCities = useMemo(() => {
    const cities = new Set(results.map((r) => r.program.location).filter(Boolean));
    return ["all", ...Array.from(cities).sort()];
  }, [results]);

  // Counts
  const reach  = results.filter((r) => r.reachLevel === "reach");
  const match  = results.filter((r) => r.reachLevel === "match");
  const safety = results.filter((r) => r.reachLevel === "safety");
  const saved  = results.filter((r) => favorites.has(r.program.id));

  const careerMatchedCount   = results.filter((r) => r.career_match   === 1).length;
  const locationMatchedCount = results.filter((r) => r.location_match === 1).length;
  const careerLabel          = profile.career_goal         || "";
  const locationLabel        = profile.target_job_location || "";

  const tabCounts: Record<string, number> = {
    all: results.length, reach: reach.length, match: match.length,
    safety: safety.length, saved: saved.length,
  };

  // Filter + sort pipeline
  const filtered = useMemo(() => {
    let arr: RecommendedProgram[];
    if (activeTab === "saved") {
      arr = results.filter((r) => favorites.has(r.program.id));
    } else if (activeTab === "all") {
      arr = results;
    } else {
      arr = results.filter((r) => r.reachLevel === activeTab);
    }
    if (filterCountry !== "all") arr = arr.filter((r) => (r.program as any).country === filterCountry);
    if (filterCategory !== "all") arr = arr.filter((r) => r.program.program_category === filterCategory);
    if (filterCity !== "all") arr = arr.filter((r) => r.program.location === filterCity);
    if (filterHasCases) arr = arr.filter((r) => r.cases.length > 0);
    if (filterHasSalary) arr = arr.filter((r) => !!r.employment?.average_salary);

    return [...arr].sort((a, b) => {
      switch (sortBy) {
        case "brand":      return b.program.brand_score - a.program.brand_score;
        case "difficulty": return b.program.admission_difficulty_score - a.program.admission_difficulty_score;
        case "cost_asc":   return (a.program.tuition_fee ?? 99999) - (b.program.tuition_fee ?? 99999);
        case "cost_desc":  return (b.program.tuition_fee ?? 0) - (a.program.tuition_fee ?? 0);
        case "overall":    return b.program.overall_program_score - a.program.overall_program_score;
        default:           return b.matchScore - a.matchScore;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, activeTab, filterCountry, filterCategory, filterCity, filterHasCases, filterHasSalary, sortBy, favorites]);

  // Primary 3/5/3 picks for "all" tab
  const primaryPicks = useMemo(() => {
    if (activeTab !== "all") return null;
    const buckets: Record<ReachLevel, RecommendedProgram[]> = { reach: [], match: [], safety: [] };
    for (const r of filtered) {
      if (buckets[r.reachLevel].length < REACH_CAPS[r.reachLevel]) {
        buckets[r.reachLevel].push(r);
      }
    }
    return [...buckets.reach, ...buckets.match, ...buckets.safety];
  }, [filtered, activeTab]);

  const primarySet = useMemo(() => new Set(primaryPicks?.map((r) => r.program.id) ?? []), [primaryPicks]);
  const moreItems  = useMemo(() => filtered.filter((r) => !primarySet.has(r.program.id)), [filtered, primarySet]);

  // Trigger AI analysis whenever primary picks change
  useEffect(() => {
    if (!primaryPicks || primaryPicks.length === 0) return;

    // Cancel previous request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setAiStrategy("");
    setAiLoading(true);
    setAiError(false);

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, primaryPicks, strength }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          setAiError(true);
          setAiLoading(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        setAiLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setAiStrategy((prev) => prev + decoder.decode(value));
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setAiError(true);
          setAiLoading(false);
        }
      }
    })();

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const display = activeTab === "all" ? null : filtered.slice(0, showCount);
  const hasMore = activeTab !== "all" && filtered.length > showCount;

  const handleTabChange = (key: typeof activeTab) => {
    setActiveTab(key);
    setShowCount(PAGE_SIZE);
    setShowMoreExpanded(false);
    setMoreCount(PAGE_SIZE);
  };
  const handleFilterChange = () => {
    setShowCount(PAGE_SIZE);
    setShowMoreExpanded(false);
    setMoreCount(PAGE_SIZE);
  };

  // ── Strategy text ──────────────────────────────────────────────
  const primarySchoolNames = (primaryPicks ?? [])
    .filter((r) => r.reachLevel === "match")
    .slice(0, 3)
    .map((r) => r.program.normalized_school_name || r.program.school_name);

  const strengthDesc = strength >= 8.5 ? "非常强势"
    : strength >= 7 ? "较强"
    : strength >= 5.5 ? "中上"
    : "中等偏弱";

  const careerAdvice = careerLabel
    ? careerMatchedCount >= 5
      ? `有 ${careerMatchedCount} 个项目与你的职业目标「${careerLabel}」高度匹配，优先筛选这些项目申请。`
      : careerMatchedCount >= 2
      ? `有 ${careerMatchedCount} 个项目与「${careerLabel}」直接匹配，建议重点关注这些项目，并酌情考虑相近方向。`
      : `匹配「${careerLabel}」的项目较少（${careerMatchedCount} 个），建议放宽专业方向或调整职业目标设定。`
    : "未设定职业目标，推荐涵盖全类项目。";

  const strategyLines = [
    `你的综合背景实力评分 ${strength}/10（${strengthDesc}）。`,
    strength >= 8.5
      ? "建议以 G5 / 罗素集团顶尖项目为主要冲刺目标，搭配 2–3 个稳妥匹配选择。"
      : strength >= 7
      ? `建议申请组合：2–3 个冲刺（Reach）+ 3–4 个核心匹配（Match）+ 2 个保底（Safety）。${primarySchoolNames.length ? "重点匹配院校：" + primarySchoolNames.join("、") + "。" : ""}`
      : strength >= 5.5
      ? `建议以 1–2 个冲刺为辅、4–5 个匹配为主，搭配 2 个保底保障。${primarySchoolNames.length ? "主力申请方向：" + primarySchoolNames.join("、") + "。" : ""}`
      : "建议主攻匹配和保底院校，重点提升文书质量，突出实习亮点，酌情考虑 1 个冲刺。",
    careerAdvice,
    locationLabel && locationLabel !== "Not sure"
      ? `就业地偏好「${locationLabel}」：有 ${locationMatchedCount} 个项目的招聘网络覆盖该地区。`
      : "",
  ].filter(Boolean).join(" ");

  // ── Generate Report ────────────────────────────────────────────
  function handleGenerateReport() {
    if (!requireAuth(() => handleGenerateReport())) return;
    const html = generateReportHTML(profile, results, strength, aiStrategy || strategyLines);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Application Strategy ─────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl shadow-lg text-white p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              你的申请策略
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">
              {aiLoading ? "AI 分析中…" : aiStrategy ? "✨ AI 个性化分析 · 仅供参考" : "基于你的背景自动生成 · 仅供参考"}
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            className="shrink-0 px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
          >
            📄 生成申请报告
          </button>
        </div>

        {/* Score pills */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          <Pill label="综合实力" value={`${strength}/10`} bright />
          <Pill label="冲刺" value={`${reach.length}个`} note="精选≤3" />
          <Pill label="匹配" value={`${match.length}个`} note="精选≤5" />
          <Pill label="保底" value={`${safety.length}个`} note="精选≤3" />
          <Pill label="职业匹配" value={`${careerMatchedCount}个`} note={careerLabel || "未设定"} />
          <Pill label="地点匹配" value={`${locationMatchedCount}个`} note={locationLabel || "未设定"} />
        </div>

        {/* Strategy text */}
        {aiLoading ? (
          <div className="flex items-center gap-2 text-blue-200 text-sm py-1">
            <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
            AI 正在分析你的申请策略…
          </div>
        ) : aiError ? (
          <p className="text-sm text-blue-100 leading-relaxed">{strategyLines}</p>
        ) : aiStrategy ? (
          <p className="text-sm text-blue-100 leading-relaxed whitespace-pre-wrap">{aiStrategy}</p>
        ) : (
          <p className="text-sm text-blue-100 leading-relaxed">{strategyLines}</p>
        )}

        {/* Sub-scores */}
        <div className="mt-4 bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-blue-200 mb-2 font-medium uppercase tracking-wide">背景细分评分</p>
          <div className="grid grid-cols-5 gap-2">
            <SubBar label="本科背景" value={subScores.prestige} max={10} />
            <SubBar label="GPA" value={subScores.gpa} max={10} />
            <SubBar label="语言" value={subScores.language} max={1} isBonus />
            <SubBar label="GMAT/GRE" value={subScores.gmat} max={2.5} isBonus />
            <SubBar label="实习+工作" value={subScores.experience} max={3.5} isBonus />
          </div>
        </div>

        {/* Profile tags */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-200 mt-3">
          {profile.undergraduate_school && <span>🏫 {profile.undergraduate_school}</span>}
          {profile.undergraduate_tier && <span>📊 {profile.undergraduate_tier}</span>}
          {profile.undergrad_prestige_score > 0 && (
            <span className="text-white font-semibold">背景分 {profile.undergrad_prestige_score}/10</span>
          )}
          {profile.gpa && <span>📝 {profile.gpa}</span>}
          {profile.language_score && <span>🌐 {profile.language_score}</span>}
          {profile.gmat_gre && <span>📐 {profile.gmat_gre}</span>}
          {profile.career_goal && <span className="text-yellow-200 font-semibold">🎯 {profile.career_goal}</span>}
          {locationLabel && locationLabel !== "Not sure" && (
            <span className="text-green-200 font-semibold">📍 {locationLabel}</span>
          )}
          {profile.preferred_categories.length > 0 && (
            <span>📚 {profile.preferred_categories.join(" · ")}</span>
          )}
          {profile.budget_gbp && <span>💷 预算 £{profile.budget_gbp.toLocaleString()}</span>}
        </div>
      </div>

      {/* ── Recommended Majors ────────────────────────────── */}
      <RecommendedMajors profile={profile} />

      {/* ── Similar Applicants Insight ──────────────────────── */}
      <SimilarApplicantsInsight profile={profile} />

      {/* ── Tabs + Filters ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300"
              }`}
            >
              {t.emoji} {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === t.key ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {tabCounts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Filter / Sort bar */}
        <div className="flex flex-wrap gap-2 items-center pb-4 border-b border-gray-100">
          <select
            className={filterSelect}
            value={filterCountry}
            onChange={(e) => { setFilterCountry(e.target.value); handleFilterChange(); }}
          >
            {allCountries.map((c) => (
              <option key={c} value={c}>{c === "all" ? "全部国家" : c}</option>
            ))}
          </select>
          <select
            className={filterSelect}
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); handleFilterChange(); }}
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>{c === "all" ? "全部专业方向" : c}</option>
            ))}
          </select>
          <select
            className={filterSelect}
            value={filterCity}
            onChange={(e) => { setFilterCity(e.target.value); handleFilterChange(); }}
          >
            {allCities.map((c) => (
              <option key={c} value={c}>{c === "all" ? "全部城市" : c}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={filterHasCases}
              onChange={(e) => { setFilterHasCases(e.target.checked); handleFilterChange(); }} className="rounded" />
            有真实案例
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={filterHasSalary}
              onChange={(e) => { setFilterHasSalary(e.target.checked); handleFilterChange(); }} className="rounded" />
            有薪资数据
          </label>
          <div className="flex-1" />
          <select
            className={filterSelect}
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); handleFilterChange(); }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-[11px] text-gray-400">共 {filtered.length} 个</span>
        </div>

        {/* ── Cards ─────────────────────────────────────────── */}
        <div className="mt-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              该筛选条件下暂无项目。
              <br /><span className="text-sm">尝试放宽条件或切换标签。</span>
            </div>
          ) : activeTab === "all" && primaryPicks ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {primaryPicks.map((item, i) => (
                  <ProgramCard
                    key={item.program.id} item={item} rank={i + 1}
                    isFavorited={favsLoaded && favorites.has(item.program.id)}
                    onToggleFavorite={() => guardedToggleFav(item.program.id)}
                    careerGoalLabel={profile.career_goal}
                    locationLabel={locationLabel}
                  />
                ))}
              </div>
              {moreItems.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowMoreExpanded((v) => !v)}
                    className="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    {showMoreExpanded ? "▲ 收起" : `▼ 查看更多项目 · 还有 ${moreItems.length} 个`}
                  </button>
                  {showMoreExpanded && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {moreItems.slice(0, moreCount).map((item, i) => (
                          <ProgramCard
                            key={item.program.id} item={item} rank={primaryPicks.length + i + 1}
                            isFavorited={favsLoaded && favorites.has(item.program.id)}
                            onToggleFavorite={() => guardedToggleFav(item.program.id)}
                            careerGoalLabel={profile.career_goal}
                            locationLabel={locationLabel}
                          />
                        ))}
                      </div>
                      {moreItems.length > moreCount && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setMoreCount((n) => n + PAGE_SIZE)}
                            className="px-6 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400"
                          >
                            继续加载 · 还有 {moreItems.length - moreCount} 个
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {display!.map((item, i) => (
                  <ProgramCard
                    key={item.program.id} item={item} rank={i + 1}
                    isFavorited={favsLoaded && favorites.has(item.program.id)}
                    onToggleFavorite={() => guardedToggleFav(item.program.id)}
                    careerGoalLabel={profile.career_goal}
                    locationLabel={locationLabel}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowCount((n) => n + PAGE_SIZE)}
                    className="px-6 py-2 bg-white border border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400"
                  >
                    加载更多 · 还有 {filtered.length - showCount} 个
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── My Application List ──────────────────────────────── */}
      {favsLoaded && favorites.size > 0 && activeTab !== "saved" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
              ★ 我的申请收藏 · {favorites.size} 所
            </h3>
            <button
              onClick={() => handleTabChange("saved")}
              className="text-xs text-yellow-700 underline hover:text-yellow-900"
            >
              查看全部 →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {results
              .filter((r) => favorites.has(r.program.id))
              .slice(0, 10)
              .map((r) => (
                <div key={r.program.id} className="flex items-center gap-1.5 bg-white border border-yellow-200 rounded-full pl-3 pr-1.5 py-1 text-xs text-gray-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.reachLevel === "reach" ? "bg-red-500" : r.reachLevel === "match" ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="max-w-[180px] truncate">{r.program.school_name} · {r.program.program_name}</span>
                  <button
                    onClick={() => toggleFav(r.program.id)}
                    className="text-gray-400 hover:text-red-500 ml-0.5"
                  >✕</button>
                </div>
              ))}
            {favorites.size > 10 && (
              <span className="text-xs text-yellow-600 self-center">+{favorites.size - 10} 个</span>
            )}
          </div>
          <div className="flex gap-3 mt-3">
            <a
              href="/tracker"
              className="text-xs text-green-600 underline hover:text-green-800"
            >
              📊 管理申请进度
            </a>
            <button
              onClick={handleGenerateReport}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              📄 生成申请报告
            </button>
            <button
              onClick={clearFavs}
              className="text-xs text-gray-400 underline hover:text-gray-600"
            >
              清空收藏
            </button>
          </div>
        </div>
      )}

      {/* WeChat Group CTA */}
      <WechatGroupCTA
        title="想获得更详细的选校建议？"
        desc="加入 AI 留学选校交流群"
        features={[
          "真实录取案例分享",
          "项目就业数据分析",
          "留学申请经验交流",
          "免费选校建议",
        ]}
      />

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800">
        ⚠️ <strong>免责声明：</strong>
        本工具推荐结果基于规则模型和公开数据，仅供参考，不代表任何学校的实际录取决定。
        录取结果受多重因素影响，请结合官方信息和专业顾问建议做出申请决策。
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function Pill({ label, value, note, bright }: { label: string; value: string; note?: string; bright?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 text-center ${bright ? "bg-white/20" : "bg-white/10"}`}>
      <p className="text-[9px] text-blue-200 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${bright ? "text-white" : "text-blue-50"}`}>{value}</p>
      {note && <p className="text-[9px] text-blue-300 truncate mt-0.5">{note}</p>}
    </div>
  );
}

function SubBar({ label, value, max, isBonus }: { label: string; value: number; max: number; isBonus?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[9px] text-blue-200 mb-0.5">
        <span>{label}</span>
        <span className="font-semibold text-white">{value}{isBonus ? "+" : ""}</span>
      </div>
      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const filterSelect = "text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-blue-400 bg-white";
