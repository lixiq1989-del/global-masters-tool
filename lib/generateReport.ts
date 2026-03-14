import type { RecommendedProgram, UserProfile, ReachLevel } from "./types";

const REACH_LABELS: Record<ReachLevel, string> = {
  reach: "冲刺 Reach", match: "匹配 Match", safety: "保底 Safety",
};

const REACH_CAPS: Record<ReachLevel, number> = { reach: 3, match: 5, safety: 3 };

function pickPrimary(results: RecommendedProgram[]): RecommendedProgram[] {
  const buckets: Record<ReachLevel, RecommendedProgram[]> = { reach: [], match: [], safety: [] };
  for (const r of results) {
    if (buckets[r.reachLevel].length < REACH_CAPS[r.reachLevel]) buckets[r.reachLevel].push(r);
  }
  return [...buckets.reach, ...buckets.match, ...buckets.safety];
}

export function generateReportHTML(
  profile: UserProfile,
  results: RecommendedProgram[],
  strength: number,
  strategyText: string
): string {
  const picks = pickPrimary(results);

  const profileRows = [
    ["本科院校", profile.undergraduate_school || "—"],
    ["院校层级", profile.undergraduate_tier || "—"],
    ["背景分", `${profile.undergrad_prestige_score} / 10`],
    ["专业", profile.major || "—"],
    ["GPA", profile.gpa || "—"],
    ["语言成绩", profile.language_score || "—"],
    ["GMAT/GRE", profile.gmat_gre || "—"],
    ["实习经历", profile.internships || "—"],
    ["工作经验", profile.work_experience || "—"],
    ["职业目标", profile.career_goal || "未设定"],
    ["目标就业地", profile.target_job_location || "未设定"],
    ["综合实力", `${strength} / 10`],
  ].map(([k, v]) => `<tr><td class="key">${k}</td><td>${v}</td></tr>`).join("");

  const groupedPicks: Record<ReachLevel, RecommendedProgram[]> = { reach: [], match: [], safety: [] };
  for (const p of picks) groupedPicks[p.reachLevel].push(p);

  function renderGroup(level: ReachLevel) {
    const items = groupedPicks[level];
    if (!items.length) return "";
    const color = level === "reach" ? "#dc2626" : level === "match" ? "#16a34a" : "#6b7280";
    return `
      <div class="group">
        <h3 style="color:${color}; border-bottom: 2px solid ${color}; padding-bottom:4px;">
          ${REACH_LABELS[level]} (${items.length} 个)
        </h3>
        ${items.map((item, i) => {
          const p = item.program;
          const e = item.employment;
          const matchPct = Math.min(100, Math.max(0, Math.round(item.matchScore * 10)));
          return `
          <div class="program-card">
            <div class="program-header">
              <span class="rank">#${i + 1}</span>
              <div>
                <div class="school">${p.school_name}</div>
                <div class="program-name">${p.program_name}</div>
              </div>
              <span class="match-pct" style="color:${color}">${matchPct}%</span>
            </div>
            <div class="program-meta">
              ${p.location} · ${p.program_category} · ${p.duration || "1年"}
              ${p.tuition_fee ? ` · 学费 £${p.tuition_fee.toLocaleString()}` : ""}
              ${e?.average_salary ? ` · 均薪 £${e.average_salary.toLocaleString()}` : ""}
            </div>
            <div class="reasons">
              ${item.reasons.map(r => `<div class="reason">• ${r}</div>`).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>UK 商科硕士申请方案 · ${profile.undergraduate_school || "选校报告"}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; padding:32px; color:#1f2937; max-width:860px; margin:0 auto; }
    h1 { font-size:22px; color:#1e3a5f; margin-bottom:4px; }
    .subtitle { color:#6b7280; font-size:13px; margin-bottom:24px; }
    h2 { font-size:16px; color:#1e3a5f; margin:24px 0 12px; }
    h3 { font-size:14px; margin:20px 0 10px; }
    .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    td { padding:5px 10px; border-bottom:1px solid #f3f4f6; }
    td.key { font-weight:600; color:#6b7280; width:110px; }
    .strategy-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px; font-size:13px; line-height:1.7; margin:12px 0; }
    .program-card { border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:12px; }
    .program-header { display:flex; align-items:flex-start; gap:10px; margin-bottom:6px; }
    .rank { background:#f3f4f6; color:#6b7280; font-size:11px; font-weight:700; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap; }
    .school { font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:.05em; }
    .program-name { font-size:15px; font-weight:700; color:#1e3a5f; }
    .match-pct { font-size:18px; font-weight:800; margin-left:auto; white-space:nowrap; }
    .program-meta { font-size:11px; color:#6b7280; margin-bottom:8px; }
    .reasons { font-size:12px; color:#78350f; background:#fffbeb; border-radius:6px; padding:8px 12px; line-height:1.6; }
    .reason { margin-bottom:2px; }
    .group { margin-bottom:24px; }
    .footer { margin-top:40px; font-size:11px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:12px; }
    @media print {
      body { padding:16px; }
      .program-card { page-break-inside:avoid; }
    }
  </style>
</head>
<body>
  <h1>🎓 UK 商科硕士申请方案</h1>
  <div class="subtitle">生成时间：${new Date().toLocaleDateString("zh-CN")} · AI 选校工具输出 · 仅供参考</div>

  <h2>一、申请人背景</h2>
  <table><tbody>${profileRows}</tbody></table>

  <h2>二、申请策略</h2>
  <div class="strategy-box">${strategyText}</div>

  <h2>三、推荐申请组合（精选 ${picks.length} 所）</h2>
  ${(["reach", "match", "safety"] as ReachLevel[]).map(renderGroup).join("")}

  <div class="footer">
    ⚠️ 免责声明：本报告由 AI 工具生成，基于规则模型和公开数据，仅供参考，不代表任何学校的实际录取决定。
    录取结果受多重因素影响，请结合官方信息和专业顾问建议做出申请决策。
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}
