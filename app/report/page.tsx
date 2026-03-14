"use client";

import { useState, useMemo, useEffect } from "react";
import NavBar from "@/components/NavBar";
import { useAuthContext } from "@/components/AuthProvider";
import InputForm from "@/components/InputForm";
import { recommend, calcUserStrength, calcSubScores } from "@/lib/recommend";
import { generateReportHTML } from "@/lib/generateReport";
import type { UserProfile, RecommendedProgram, ReachLevel } from "@/lib/types";
import programsData from "@/data/programs.json";
import employmentData from "@/data/employment.json";
import casesData from "@/data/cases.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs = programsData as any as Parameters<typeof recommend>[1];
const employment = employmentData as any as Parameters<typeof recommend>[2];
const cases = casesData as any as Parameters<typeof recommend>[3];

const REACH_LABELS: Record<ReachLevel, { label: string; color: string; dot: string }> = {
  reach: { label: "冲刺", color: "text-red-700", dot: "bg-red-500" },
  match: { label: "匹配", color: "text-green-700", dot: "bg-green-500" },
  safety: { label: "保底", color: "text-gray-600", dot: "bg-gray-400" },
};

const DEFAULT_PROFILE: UserProfile = {
  undergraduate_region: "",
  undergraduate_school: "",
  undergraduate_tier: "",
  undergrad_prestige_score: 5,
  major: "",
  gpa: "",
  language_score: "",
  gmat_gre: "",
  internships: "",
  work_experience: "",
  preferred_categories: [],
  target_countries: [],
  budget_gbp: null,
  target_job_location: "",
  career_goal: "",
};

export default function ReportPage() {
  const { authed, loaded: authLoaded, requireAuth } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [results, setResults] = useState<RecommendedProgram[] | null>(null);
  const [strength, setStrength] = useState<number>(0);
  const [generated, setGenerated] = useState(false);

  function handleGenerate(p: UserProfile) {
    setProfile(p);
    const s = calcUserStrength(p);
    setStrength(s);
    const res = recommend(p, programs, employment, cases);
    setResults(res);
    setGenerated(true);
    setTimeout(() => {
      document.getElementById("report-preview")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // Build strategy text
  const strategyText = useMemo(() => {
    if (!results || !strength) return "";
    const reach = results.filter((r) => r.reachLevel === "reach").length;
    const match = results.filter((r) => r.reachLevel === "match").length;
    const safety = results.filter((r) => r.reachLevel === "safety").length;
    const careerMatched = results.filter((r) => r.career_match === 1).length;

    const strengthDesc = strength >= 8.5 ? "非常强势"
      : strength >= 7 ? "较强"
      : strength >= 5.5 ? "中上"
      : "中等偏弱";

    const lines = [
      `你的综合背景实力评分 ${strength}/10（${strengthDesc}）。`,
      `共匹配到 ${results.length} 个项目：${reach} 个冲刺、${match} 个匹配、${safety} 个保底。`,
      profile.career_goal
        ? `有 ${careerMatched} 个项目与职业目标「${profile.career_goal}」直接匹配。`
        : "",
      strength >= 8.5
        ? "建议以顶尖项目为主要冲刺目标，搭配 2-3 个稳妥匹配选择。"
        : strength >= 7
        ? "建议申请组合：2-3 个冲刺 + 3-4 个核心匹配 + 2 个保底。"
        : strength >= 5.5
        ? "建议以 1-2 个冲刺为辅、4-5 个匹配为主，搭配 2 个保底保障。"
        : "建议主攻匹配和保底院校，重点提升文书质量。",
    ].filter(Boolean).join(" ");
    return lines;
  }, [results, strength, profile.career_goal]);

  // Primary picks (3 reach + 5 match + 3 safety)
  const primaryPicks = useMemo(() => {
    if (!results) return [];
    const caps: Record<ReachLevel, number> = { reach: 3, match: 5, safety: 3 };
    const buckets: Record<ReachLevel, RecommendedProgram[]> = { reach: [], match: [], safety: [] };
    for (const r of results) {
      if (buckets[r.reachLevel].length < caps[r.reachLevel]) {
        buckets[r.reachLevel].push(r);
      }
    }
    return [...buckets.reach, ...buckets.match, ...buckets.safety];
  }, [results]);

  function handleExportPDF() {
    if (!results) return;
    const html = generateReportHTML(profile, results, strength, strategyText);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  // Timeline based on typical academic calendar
  const timeline = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
    return [
      { period: `${year - 1}年9-11月`, task: "确定选校名单，准备文书初稿", status: "prep" },
      { period: `${year - 1}年12月-${year}年1月`, task: "提交第一批申请（冲刺 + 部分匹配）", status: "apply" },
      { period: `${year}年1-3月`, task: "提交第二批申请（匹配 + 保底），面试准备", status: "apply" },
      { period: `${year}年3-5月`, task: "收到 Offer/拒信，对比选择", status: "decide" },
      { period: `${year}年5-7月`, task: "确认入学，办理签证，行前准备", status: "final" },
      { period: `${year}年9月`, task: "入学", status: "start" },
    ];
  }, []);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Auth gate */}
        {authLoaded && !authed ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 text-center py-16">
            <p className="text-lg text-gray-500 mb-2">申请规划报告需要登录</p>
            <p className="text-sm text-gray-400 mb-4">请输入邀请码解锁全部功能</p>
            <button
              onClick={() => requireAuth()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              输入邀请码
            </button>
          </div>
        ) : null}

        {/* Input section */}
        {(!authLoaded || authed) && !generated && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">申请规划报告</h2>
            <p className="text-xs text-gray-500 mb-5">填写背景信息，生成个性化申请规划</p>
            <InputForm defaultProfile={DEFAULT_PROFILE} onGenerate={handleGenerate} />
          </div>
        )}

        {/* Report preview */}
        {generated && results && (
          <div id="report-preview" className="space-y-5">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl shadow-lg text-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">申请规划报告</h2>
                  <p className="text-blue-200 text-xs">
                    {profile.undergraduate_school || "—"} · {profile.undergraduate_tier || "—"} · GPA {profile.gpa || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl text-xs font-medium"
                  >
                    导出 PDF
                  </button>
                  <button
                    onClick={() => setGenerated(false)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs"
                  >
                    重新填写
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                <MiniStat label="综合实力" value={`${strength}/10`} />
                <MiniStat label="冲刺" value={`${primaryPicks.filter((r) => r.reachLevel === "reach").length}`} />
                <MiniStat label="匹配" value={`${primaryPicks.filter((r) => r.reachLevel === "match").length}`} />
                <MiniStat label="保底" value={`${primaryPicks.filter((r) => r.reachLevel === "safety").length}`} />
                <MiniStat label="总匹配" value={`${results.length}`} />
              </div>
            </div>

            {/* Strategy */}
            <Section title="申请策略">
              <p className="text-sm text-gray-700 leading-relaxed">{strategyText}</p>
            </Section>

            {/* Background summary */}
            <Section title="背景评估">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoCell label="本科院校" value={profile.undergraduate_school || "—"} />
                <InfoCell label="院校层级" value={profile.undergraduate_tier || "—"} />
                <InfoCell label="背景分" value={`${profile.undergrad_prestige_score}/10`} />
                <InfoCell label="GPA" value={profile.gpa || "—"} />
                <InfoCell label="语言成绩" value={profile.language_score || "—"} />
                <InfoCell label="GMAT/GRE" value={profile.gmat_gre || "—"} />
                <InfoCell label="实习经历" value={profile.internships || "—"} />
                <InfoCell label="工作经验" value={profile.work_experience || "—"} />
                <InfoCell label="职业目标" value={profile.career_goal || "未设定"} />
              </div>
              {profile.preferred_categories.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  偏好方向: {profile.preferred_categories.join("、")}
                </p>
              )}
            </Section>

            {/* Recommended picks */}
            <Section title={`推荐申请组合（精选 ${primaryPicks.length} 所）`}>
              {(["reach", "match", "safety"] as ReachLevel[]).map((level) => {
                const items = primaryPicks.filter((r) => r.reachLevel === level);
                if (items.length === 0) return null;
                const cfg = REACH_LABELS[level];
                return (
                  <div key={level} className="mb-4 last:mb-0">
                    <h4 className={`text-sm font-bold ${cfg.color} mb-2 flex items-center gap-1.5`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}（{items.length} 个）
                    </h4>
                    <div className="space-y-2">
                      {items.map((item, i) => {
                        const p = item.program;
                        const e = item.employment;
                        const matchPct = Math.min(100, Math.round(item.matchScore * 10));
                        return (
                          <div key={p.id} className="bg-gray-50 rounded-xl px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400">{p.school_name}</p>
                                <p className="text-sm font-semibold text-gray-800">{p.program_name}</p>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {p.program_category}
                                  </span>
                                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {p.location}
                                  </span>
                                  {p.duration && (
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                      {p.duration}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`text-lg font-bold ${cfg.color}`}>{matchPct}%</span>
                                <p className="text-[10px] text-gray-400">匹配度</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-500 mt-2">
                              {p.tuition_fee && (
                                <span>学费 {p.tuition_currency === "GBP" ? "£" : ""}{p.tuition_fee.toLocaleString()}</span>
                              )}
                              {e?.average_salary && (
                                <span>均薪 £{e.average_salary.toLocaleString()}</span>
                              )}
                              <span>品牌{p.brand_score} · 难度{p.admission_difficulty_score}</span>
                            </div>
                            {item.reasons.length > 0 && (
                              <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2">
                                {item.reasons.slice(0, 2).map((r, ri) => (
                                  <p key={ri}>• {r.startsWith("⚠") ? r.slice(2).trim() : r}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Section>

            {/* Timeline */}
            <Section title="申请时间线">
              <div className="space-y-3">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{t.period}</p>
                      <p className="text-xs text-gray-500">{t.task}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Materials checklist - per school */}
            <Section title="各校申请要求汇总">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">学校 / 项目</th>
                      <th className="text-center px-2 py-2 text-gray-500 font-medium">IELTS</th>
                      <th className="text-center px-2 py-2 text-gray-500 font-medium">GMAT/GRE</th>
                      <th className="text-center px-2 py-2 text-gray-500 font-medium">工作经验</th>
                      <th className="text-center px-2 py-2 text-gray-500 font-medium">档位</th>
                    </tr>
                  </thead>
                  <tbody>
                    {primaryPicks.map((item) => {
                      const p = item.program;
                      const cfg = REACH_LABELS[item.reachLevel];
                      return (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <p className="text-[10px] text-gray-400">{p.school_name}</p>
                            <p className="text-xs font-medium text-gray-700 truncate max-w-[240px]">{p.program_name}</p>
                          </td>
                          <td className="text-center px-2 py-2 text-gray-700">
                            {p.ielts_requirement || "—"}
                          </td>
                          <td className="text-center px-2 py-2">
                            {p.gmat_required ? (
                              <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[10px]">需要</span>
                            ) : p.gre_required ? (
                              <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[10px]">需GRE</span>
                            ) : (
                              <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px]">免</span>
                            )}
                          </td>
                          <td className="text-center px-2 py-2">
                            {p.work_experience_required ? (
                              <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[10px]">需要</span>
                            ) : (
                              <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px]">不需要</span>
                            )}
                          </td>
                          <td className="text-center px-2 py-2">
                            <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* General materials */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">通用材料清单</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { item: "个人陈述 (PS / SoP)", note: `需为 ${primaryPicks.length} 个项目分别定制` },
                    { item: "推荐信 2-3 封", note: "学术推荐 + 实习/工作推荐" },
                    { item: "本科成绩单 + 在读证明/毕业证", note: "需学校盖章，部分需 WES 认证" },
                    {
                      item: "语言成绩",
                      note: (() => {
                        const reqs = primaryPicks.map((r) => r.program.ielts_requirement).filter(Boolean);
                        const maxReq = reqs.length > 0 ? reqs.sort().reverse()[0] : null;
                        return maxReq
                          ? `最高要求 IELTS ${maxReq}${profile.language_score ? `，你的成绩: ${profile.language_score}` : ""}`
                          : profile.language_score || "IELTS/TOEFL 需在有效期内";
                      })(),
                    },
                    {
                      item: "GMAT/GRE",
                      note: (() => {
                        const needGmat = primaryPicks.filter((r) => r.program.gmat_required || r.program.gre_required);
                        if (needGmat.length === 0) return "所有推荐项目均免 GMAT/GRE";
                        return `${needGmat.length} 个项目要求提交${profile.gmat_gre ? `，你的成绩: ${profile.gmat_gre}` : ""}`;
                      })(),
                    },
                    { item: "CV / Resume", note: "一页，量化描述实习和项目经历" },
                    { item: "护照扫描件", note: "确保有效期覆盖签证期" },
                    { item: "申请费", note: `预估 ${primaryPicks.length} 所共约 £${(primaryPicks.length * 80).toLocaleString()}` },
                  ].map((m, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                      <span className="text-green-500 mt-0.5 shrink-0">☐</span>
                      <div>
                        <p className="text-xs font-medium text-gray-700">{m.item}</p>
                        <p className="text-[10px] text-gray-500">{m.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Export */}
            <div className="text-center py-4">
              <button
                onClick={handleExportPDF}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md text-sm"
              >
                导出 PDF 报告
              </button>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800">
              ⚠️ <strong>免责声明：</strong>
              本报告由 AI 工具生成，基于规则模型和公开数据，仅供参考，不代表任何学校的实际录取决定。
              录取结果受多重因素影响，请结合官方信息和专业顾问建议做出申请决策。
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名等公开数据 · 仅供参考
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl p-2 text-center">
      <p className="text-[9px] text-blue-200">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <h3 className="text-base font-bold text-gray-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
