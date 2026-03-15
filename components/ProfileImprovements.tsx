"use client";

import { useMemo } from "react";
import type { UserProfile } from "@/lib/types";

interface Suggestion {
  icon: string;
  title: string;
  reason: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

interface Props {
  profile: UserProfile;
  strength: number;
}

export default function ProfileImprovements({ profile, strength }: Props) {
  const suggestions = useMemo(() => {
    const items: Suggestion[] = [];

    // Parse IELTS score
    const ieltsMatch = (profile.language_score || "").match(/ielts\s*([\d.]+)/i);
    const ielts = ieltsMatch ? parseFloat(ieltsMatch[1]) : null;

    // Parse TOEFL score
    const toeflMatch = (profile.language_score || "").match(/toefl\s*(\d+)/i);
    const toefl = toeflMatch ? parseInt(toeflMatch[1]) : null;

    // Parse GMAT
    const gmatMatch = (profile.gmat_gre || "").match(/gmat\s*(\d+)/i);
    const gmat = gmatMatch ? parseInt(gmatMatch[1]) : null;

    // Parse GRE
    const greMatch = (profile.gmat_gre || "").match(/gre\s*(\d+)/i);
    const gre = greMatch ? parseInt(greMatch[1]) : null;

    // Parse GPA (try to get numeric)
    const gpaNum = parseFloat(profile.gpa || "0");

    // 1. Language improvement
    if (ielts !== null && ielts < 7.5) {
      items.push({
        icon: "🌐",
        title: `IELTS 从 ${ielts} 提高到 7.5`,
        reason: "G5 及 Top 30 项目多数要求 7.0+，部分单项要求 7.0。7.5 可解锁 UCL、KCL、Edinburgh 等热门项目的全部专业。",
        impact: "冲刺校匹配度预计提升 15-20%",
        priority: ielts < 6.5 ? "high" : "medium",
      });
    } else if (toefl !== null && toefl < 105) {
      items.push({
        icon: "🌐",
        title: `TOEFL 从 ${toefl} 提高到 105+`,
        reason: "美国 Top 30 商学院多数要求 100+，105+ 更有竞争力。",
        impact: "扩大美国项目匹配范围",
        priority: toefl < 95 ? "high" : "medium",
      });
    } else if (!ielts && !toefl) {
      items.push({
        icon: "🌐",
        title: "尽早准备语言考试（IELTS 7.0+ / TOEFL 100+）",
        reason: "语言成绩是硬性门槛，建议在申请前至少 3 个月完成考试。",
        impact: "解锁全部目标项目",
        priority: "high",
      });
    }

    // 2. GMAT/GRE supplement
    const targetFinance = (profile.preferred_categories || []).some((c) =>
      /finance|analytics|fintech|accounting|economics/i.test(c)
    );
    const targetUS = (profile.target_countries || []).includes("US");

    if (!gmat && !gre && targetFinance) {
      items.push({
        icon: "📐",
        title: "考虑备考 GMAT（目标 680+）",
        reason: "金融/分析方向的 Top 项目（如 LBS、Imperial、LSE）强烈建议提交 GMAT。700+ 有显著竞争优势。",
        impact: "金融方向冲刺校录取概率显著提升",
        priority: "high",
      });
    } else if (!gmat && !gre && targetUS) {
      items.push({
        icon: "📐",
        title: "备考 GRE（目标 320+）",
        reason: "美国项目普遍接受或要求 GRE，缺少标化成绩会影响竞争力。",
        impact: "美国项目申请竞争力提升",
        priority: "high",
      });
    } else if (gmat && gmat < 680) {
      items.push({
        icon: "📐",
        title: `GMAT 从 ${gmat} 提高到 700+`,
        reason: "GMAT 700+ 是金融/分析方向 Top 项目的隐性门槛。",
        impact: "冲刺校竞争力显著增强",
        priority: "medium",
      });
    }

    // 3. Internship experience
    const internCount = (profile.internships || "").match(/\d/)?.[0];
    const numInterns = internCount ? parseInt(internCount) : (profile.internships ? 1 : 0);

    if (numInterns === 0) {
      items.push({
        icon: "💼",
        title: "增加 1-2 段相关实习经历",
        reason: "实习经历是文书素材的核心来源，也是录取委员会评估潜力的重要依据。与目标方向相关的实习（如金融、咨询、数据分析）尤为加分。",
        impact: "申请竞争力全面提升，文书素材更丰富",
        priority: "high",
      });
    } else if (numInterns < 2) {
      items.push({
        icon: "💼",
        title: "再增加一段与目标方向匹配的实习",
        reason: "两段以上实习展示了持续的职业方向探索，比单一经历更有说服力。",
        impact: "文书说服力增强，目标导向性更清晰",
        priority: "medium",
      });
    }

    // 4. GPA recovery (if low and presumably not graduated)
    if (gpaNum > 0 && gpaNum < 80 && profile.gpa.includes("%")) {
      items.push({
        icon: "📈",
        title: "最后学期冲刺提升 GPA",
        reason: `当前 GPA ${profile.gpa} 处于偏低区间。每提高 2-3 分，匹配校范围显著扩大。80+ 是多数 Top 项目的隐性门槛。`,
        impact: "匹配校和保底校选择面扩大 30%+",
        priority: "high",
      });
    } else if (gpaNum > 0 && gpaNum < 3.3 && profile.gpa.includes("/4")) {
      items.push({
        icon: "📈",
        title: "尽量提升 GPA 到 3.5+",
        reason: "3.5/4.0 是美国 Top 50 项目的常见均值，低于 3.3 会限制冲刺选择。",
        impact: "解锁更多 Top 50 项目",
        priority: "high",
      });
    }

    // 5. Quantitative background for BA/Finance
    const targetBA = (profile.preferred_categories || []).some((c) =>
      /analytics|data|fintech/i.test(c)
    );
    const quantMajor = /math|statist|comput|engineer|物理|数学|统计|计算机/.test((profile.major || "").toLowerCase());

    if (targetBA && !quantMajor) {
      items.push({
        icon: "🔢",
        title: "补充量化技能（Python / SQL / 数据分析）",
        reason: "商业分析方向看重量化能力。非理工背景的申请者，可以通过在线课程证书（如 Coursera、DataCamp）或量化实习来弥补。",
        impact: "BA 方向匹配度提升，弥补专业背景短板",
        priority: "medium",
      });
    }

    // 6. Work experience for management programs
    const targetMgmt = (profile.preferred_categories || []).some((c) =>
      /management|mba|strategy/i.test(c)
    );
    const hasWorkExp = !!(profile.work_experience && profile.work_experience !== "无" && profile.work_experience !== "0");

    if (targetMgmt && !hasWorkExp && strength < 7) {
      items.push({
        icon: "🏢",
        title: "积累 1-2 年工作经验",
        reason: "管理学 / MBA 方向偏好有工作经验的申请者。即使项目不硬性要求，工作经验也能显著增强文书说服力。",
        impact: "管理方向项目录取概率提升",
        priority: "low",
      });
    }

    return items.slice(0, 5);
  }, [profile, strength]);

  if (suggestions.length === 0) return null;

  const priorityColors = {
    high: "border-red-200 bg-red-50",
    medium: "border-yellow-200 bg-yellow-50",
    low: "border-gray-200 bg-gray-50",
  };
  const priorityLabels = {
    high: { text: "高优先级", cls: "bg-red-100 text-red-700" },
    medium: { text: "建议提升", cls: "bg-yellow-100 text-yellow-700" },
    low: { text: "可选", cls: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
      <h3 className="text-base font-bold text-gray-800 mb-1">背景提升建议</h3>
      <p className="text-xs text-gray-500 mb-4">基于你的当前背景，以下提升可帮助扩大匹配范围</p>
      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div key={i} className={`border rounded-xl p-4 ${priorityColors[s.priority]}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityLabels[s.priority].cls}`}>
                    {priorityLabels[s.priority].text}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-1">{s.reason}</p>
                <p className="text-xs font-medium text-blue-700">{s.impact}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
