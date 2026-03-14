import type { RecommendedProgram, UserProfile } from "@/lib/types";

interface AnalyzeRequest {
  profile: UserProfile;
  primaryPicks: RecommendedProgram[];
  strength: number;
}

function buildPrompt(
  profile: UserProfile,
  picks: RecommendedProgram[],
  strength: number
): string {
  const reach  = picks.filter((p) => p.reachLevel === "reach");
  const match  = picks.filter((p) => p.reachLevel === "match");
  const safety = picks.filter((p) => p.reachLevel === "safety");

  const fmt = (items: RecommendedProgram[]) =>
    items.length
      ? items
          .map(
            (p) =>
              `${p.program.school_name}·${p.program.program_name}（${Math.round(p.matchScore * 10)}%匹配）`
          )
          .join("、")
      : "暂无";

  const strengthDesc =
    strength >= 8.5 ? "非常强势"
    : strength >= 7  ? "较强"
    : strength >= 5.5 ? "中上"
    : "中等偏弱";

  const background = [
    `本科院校：${profile.undergraduate_school || "未填写"}（背景分 ${profile.undergrad_prestige_score}/10，层级：${profile.undergraduate_tier || "未填写"}）`,
    `专业：${profile.major || "未填写"}`,
    `GPA：${profile.gpa || "未填写"}`,
    `语言成绩：${profile.language_score || "未填写"}`,
    profile.gmat_gre ? `GMAT/GRE：${profile.gmat_gre}` : null,
    profile.internships ? `实习：${profile.internships}` : null,
    profile.work_experience ? `工作经验：${profile.work_experience}` : null,
    `综合实力评分：${strength}/10（${strengthDesc}）`,
    profile.career_goal ? `职业目标：${profile.career_goal}` : null,
    profile.target_job_location && profile.target_job_location !== "Not sure"
      ? `目标就业地：${profile.target_job_location}`
      : null,
  ]
    .filter(Boolean)
    .map((l) => `- ${l}`)
    .join("\n");

  return `你是英国商科硕士申请专业顾问。请根据以下学生背景和推荐项目，生成一段个性化申请策略分析（约200字，中文）。

【学生背景】
${background}

【AI推荐精选项目（共${picks.length}所）】
冲刺 Reach（${reach.length}所）：${fmt(reach)}
匹配 Match（${match.length}所）：${fmt(match)}
保底 Safety（${safety.length}所）：${fmt(safety)}

请直接给出策略，不重复列举背景数据。分析该生核心竞争力与短板，给出申请优先顺序，${profile.career_goal ? `针对「${profile.career_goal}」职业目标给出选校侧重，` : ""}结合具体项目给出1-2条文书或申请的可执行建议。语气专业亲切，像经验丰富的顾问在面对面指导学生。`;
}

export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response("DEEPSEEK_API_KEY not configured", { status: 500 });
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { profile, primaryPicks, strength } = body;

  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: buildPrompt(profile, primaryPicks, strength) }],
      stream: true,
      max_tokens: 1024,
    }),
  });

  if (!resp.ok) {
    return new Response(`DeepSeek API error: ${resp.status}`, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = resp.body!.getReader();

  const readable = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch { /* skip malformed chunks */ }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
