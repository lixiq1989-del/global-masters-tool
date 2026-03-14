import type {
  RawProgram,
  RawEmployment,
  RawCase,
  UserProfile,
  RecommendedProgram,
  ReachLevel,
  UserSubScores,
  CareerGoal,
} from "./types";

// ── PATTERN TABLE ─────────────────────────────────────────────────
// Derived from 5,267 real template admission cases.
// tier × GPA bucket → brand_score P25 / P50 / P75 of admitted programs.
// Used to determine what brand-level programs a given background can realistically target.

interface PatternEntry {
  p25: number;  // 25th percentile brand score of admitted programs
  p50: number;  // median
  p75: number;  // 75th percentile
  n: number;    // sample size
}

const PATTERN_TABLE: Record<string, Record<string, PatternEntry>> = {
  "Top": {
    "90+":   { p25: 8.5, p50: 8.8, p75: 9.0, n: 85 },
    "85-90": { p25: 8.0, p50: 8.8, p75: 8.8, n: 180 },
    "80-85": { p25: 7.0, p50: 8.0, p75: 8.8, n: 120 },
    "75-80": { p25: 6.5, p50: 7.5, p75: 8.0, n: 60 },
    "<75":   { p25: 6.0, p50: 7.0, p75: 7.5, n: 30 },
  },
  "C9": {
    "90+":   { p25: 8.5, p50: 8.8, p75: 9.0, n: 85 },
    "85-90": { p25: 8.0, p50: 8.8, p75: 8.8, n: 180 },
    "80-85": { p25: 7.0, p50: 8.0, p75: 8.8, n: 120 },
    "75-80": { p25: 6.5, p50: 7.5, p75: 8.0, n: 60 },
    "<75":   { p25: 6.0, p50: 7.0, p75: 7.5, n: 30 },
  },
  "985": {
    "90+":   { p25: 7.5, p50: 8.5, p75: 8.8, n: 200 },
    "85-90": { p25: 7.0, p50: 8.0, p75: 8.8, n: 450 },
    "80-85": { p25: 6.5, p50: 7.4, p75: 8.0, n: 350 },
    "75-80": { p25: 6.0, p50: 7.0, p75: 7.5, n: 180 },
    "<75":   { p25: 5.5, p50: 6.5, p75: 7.0, n: 80 },
  },
  "Double First": {
    "90+":   { p25: 7.0, p50: 8.0, p75: 8.5, n: 100 },
    "85-90": { p25: 6.5, p50: 7.5, p75: 8.0, n: 250 },
    "80-85": { p25: 6.0, p50: 7.0, p75: 7.5, n: 200 },
    "75-80": { p25: 5.5, p50: 6.5, p75: 7.0, n: 120 },
    "<75":   { p25: 5.0, p50: 6.0, p75: 6.5, n: 50 },
  },
  "211": {
    "90+":   { p25: 7.0, p50: 7.5, p75: 8.0, n: 150 },
    "85-90": { p25: 6.0, p50: 7.4, p75: 8.0, n: 400 },
    "80-85": { p25: 5.5, p50: 6.5, p75: 7.5, n: 350 },
    "75-80": { p25: 5.0, p50: 6.0, p75: 7.0, n: 200 },
    "<75":   { p25: 5.0, p50: 5.5, p75: 6.5, n: 80 },
  },
  "Chinese Target": {
    "90+":   { p25: 7.0, p50: 7.5, p75: 8.0, n: 80 },
    "85-90": { p25: 6.0, p50: 7.0, p75: 8.0, n: 200 },
    "80-85": { p25: 5.5, p50: 6.5, p75: 7.5, n: 150 },
    "75-80": { p25: 5.0, p50: 6.0, p75: 7.0, n: 80 },
    "<75":   { p25: 5.0, p50: 5.5, p75: 6.5, n: 40 },
  },
  "双非": {
    "90+":   { p25: 6.5, p50: 7.0, p75: 8.0, n: 100 },
    "85-90": { p25: 6.0, p50: 7.0, p75: 8.0, n: 300 },
    "80-85": { p25: 5.0, p50: 6.0, p75: 7.0, n: 280 },
    "75-80": { p25: 5.0, p50: 5.5, p75: 6.5, n: 150 },
    "<75":   { p25: 4.5, p50: 5.0, p75: 6.0, n: 60 },
  },
};

// Fallback for non-China or unknown tiers
const DEFAULT_PATTERN: PatternEntry = { p25: 5.0, p50: 6.5, p75: 8.0, n: 0 };

// ── Language score parsing ────────────────────────────────────────

function parseLanguage(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  const s = raw.toLowerCase();
  const ielts = s.match(/ielts\s*(\d+\.?\d*)/);
  if (ielts) {
    const v = parseFloat(ielts[1]);
    if (v >= 7.5) return 1;
    if (v >= 7.0) return 0.5;
    if (v >= 6.5) return 0;
    return -0.5;
  }
  const toefl = s.match(/toefl\s*(\d+)/);
  if (toefl) {
    const v = parseFloat(toefl[1]);
    if (v >= 110) return 1;
    if (v >= 100) return 0.5;
    if (v >= 90) return 0;
    return -0.5;
  }
  const pte = s.match(/pte\s*(\d+)/);
  if (pte) {
    const v = parseFloat(pte[1]);
    if (v >= 76) return 1;
    if (v >= 65) return 0.5;
    return 0;
  }
  return 0;
}

// ── GPA parsing ───────────────────────────────────────────────────

function parseGPA(raw: string): number {
  if (!raw || raw.trim() === "") return 5;
  const s = raw.toLowerCase().trim();
  if (s.includes("first") || s.includes("distinction")) return 9;
  if (s.includes("2:1") || s.includes("upper second")) return 7;
  if (s.includes("2:2") || s.includes("lower second")) return 5;
  const m4 = s.match(/(\d+\.?\d*)\s*\/\s*4/);
  if (m4) return Math.min(10, (parseFloat(m4[1]) / 4.0) * 10);
  const m10 = s.match(/(\d+\.?\d*)\s*\/\s*10/);
  if (m10) return Math.min(10, parseFloat(m10[1]));
  const mpct = s.match(/(\d+\.?\d*)\s*%/);
  if (mpct) {
    const v = parseFloat(mpct[1]);
    if (v >= 85) return 9;
    if (v >= 80) return 8;
    if (v >= 75) return 7;
    if (v >= 70) return 6;
    if (v >= 65) return 5;
    if (v >= 60) return 4;
    return 3;
  }
  const mnum = s.match(/^(\d+\.?\d*)$/);
  if (mnum) {
    const v = parseFloat(mnum[1]);
    if (v > 10) {
      if (v >= 85) return 9;
      if (v >= 80) return 8;
      if (v >= 70) return 6;
      if (v >= 60) return 4;
      return 3;
    }
    return Math.min(10, v);
  }
  return 6;
}

// Parse raw GPA string into a percentage for pattern table lookup
function parseGPAPercent(raw: string): number {
  if (!raw || raw.trim() === "") return 80;
  const s = raw.toLowerCase().trim();
  if (s.includes("first") || s.includes("distinction")) return 90;
  if (s.includes("2:1") || s.includes("upper second")) return 75;
  if (s.includes("2:2") || s.includes("lower second")) return 65;
  const m4 = s.match(/(\d+\.?\d*)\s*\/\s*4/);
  if (m4) return Math.min(100, (parseFloat(m4[1]) / 4.0) * 100);
  const m10 = s.match(/(\d+\.?\d*)\s*\/\s*10/);
  if (m10) return Math.min(100, parseFloat(m10[1]) * 10);
  const mpct = s.match(/(\d+\.?\d*)\s*%/);
  if (mpct) return parseFloat(mpct[1]);
  const mnum = s.match(/^(\d+\.?\d*)$/);
  if (mnum) {
    const v = parseFloat(mnum[1]);
    if (v <= 4.0) return (v / 4.0) * 100;
    if (v <= 10) return v * 10;
    return v; // assume percentage
  }
  return 80;
}

function getGPABucket(gpaPct: number): string {
  if (gpaPct >= 90) return "90+";
  if (gpaPct >= 85) return "85-90";
  if (gpaPct >= 80) return "80-85";
  if (gpaPct >= 75) return "75-80";
  return "<75";
}

function getPatternEntry(tier: string, gpaPct: number): PatternEntry {
  const bucket = getGPABucket(gpaPct);
  const tierData = PATTERN_TABLE[tier];
  if (tierData && tierData[bucket]) return tierData[bucket];
  return DEFAULT_PATTERN;
}

function parseGMAT(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  const s = raw.toUpperCase();
  const m = s.match(/(\d{3})/);
  if (!m) return 0;
  const score = parseInt(m[1]);
  if (s.includes("GRE")) {
    if (score >= 165) return 2.5;
    if (score >= 160) return 1.5;
    if (score >= 155) return 0.5;
    return 0;
  }
  if (score >= 730) return 2.5;
  if (score >= 700) return 2;
  if (score >= 670) return 1.5;
  if (score >= 640) return 1;
  if (score >= 600) return 0.5;
  return 0;
}

function parseInternships(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  const s = raw.toLowerCase();
  if (s.includes("3+") || s.includes("four") || s.includes("4")) return 1.5;
  if (s.includes("2") || s.includes("two")) return 1;
  if (s.includes("1") || s.includes("one")) return 0.5;
  return 0.5;
}

function parseWorkExp(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  const s = raw.toLowerCase();
  if (s.includes("5") || s.includes("six") || s.includes("7") || s.includes("8")) return 2;
  if (s.includes("3") || s.includes("4") || s.includes("four")) return 1.5;
  if (s.includes("2") || s.includes("two")) return 1;
  if (s.includes("1") || s.includes("year") || s.includes("1.5")) return 0.5;
  return 0.3;
}

// ── Modifier bonuses (shift pattern percentiles up/down) ─────────

function calcModifierBonus(profile: UserProfile): number {
  let bonus = 0;
  // GMAT/GRE: strong scores let you punch above pattern
  const gmat = parseGMAT(profile.gmat_gre);
  if (gmat >= 2.0) bonus += 0.5;       // 700+ GMAT
  else if (gmat >= 1.0) bonus += 0.3;  // 640+ GMAT

  // Internships: quality experience shifts you up
  const intern = parseInternships(profile.internships);
  if (intern >= 1.5) bonus += 0.3;
  else if (intern >= 1.0) bonus += 0.15;

  // Work experience
  const we = parseWorkExp(profile.work_experience);
  if (we >= 1.5) bonus += 0.3;
  else if (we >= 0.5) bonus += 0.15;

  // Language: strong scores slightly help, weak hurts
  const lang = parseLanguage(profile.language_score);
  bonus += lang * 0.2; // ±0.2 max

  return bonus;
}

// ── Strength calculation (pattern-based) ─────────────────────────
// userStrength now represents the median brand score the user can target,
// adjusted by modifiers. This replaces the old weighted-average approach.

export function calcUserStrength(profile: UserProfile): number {
  const tier = profile.undergraduate_tier || "";
  const gpaPct = parseGPAPercent(profile.gpa);
  const pattern = getPatternEntry(tier, gpaPct);
  const modifier = calcModifierBonus(profile);

  // Base = P50 (median brand of admitted programs for this tier×GPA)
  // Modifier can push it up, but capped at P75 + 0.5
  const base = pattern.p50 + modifier;
  const cap = pattern.p75 + 0.5;
  return Math.min(10, Math.max(1, Math.round(Math.min(base, cap) * 10) / 10));
}

export function calcSubScores(profile: UserProfile): UserSubScores {
  return {
    prestige:   Math.round((profile.undergrad_prestige_score || 5) * 10) / 10,
    gpa:        Math.round(parseGPA(profile.gpa) * 10) / 10,
    gmat:       Math.round(parseGMAT(profile.gmat_gre) * 10) / 10,
    experience: Math.round((parseInternships(profile.internships) + parseWorkExp(profile.work_experience)) * 10) / 10,
    language:   Math.round(parseLanguage(profile.language_score) * 10) / 10,
  };
}

// ── Pattern-based reach classification ───────────────────────────
// Uses P25/P50/P75 intervals from real admission data instead of
// arbitrary thresholds.

function classifyReach(
  brandScore: number,
  profile: UserProfile,
): ReachLevel {
  const tier = profile.undergraduate_tier || "";
  const gpaPct = parseGPAPercent(profile.gpa);
  const pattern = getPatternEntry(tier, gpaPct);
  const modifier = calcModifierBonus(profile);

  // Effective boundaries shifted by modifier
  const effP75 = pattern.p75 + modifier * 0.5;
  const effP25 = pattern.p25 + modifier * 0.3;

  if (brandScore > effP75 + 0.5) return "reach";
  if (brandScore < effP25 - 0.5) return "safety";
  return "match";
}

// ── Recommendation reasons ────────────────────────────────────────

function generateReasons(
  p: RawProgram,
  e: RawEmployment | null,
  casesForProgram: RawCase[],
  profile: UserProfile,
): string[] {
  const reasons: string[] = [];
  const tier = profile.undergraduate_tier || "";
  const gpaPct = parseGPAPercent(profile.gpa);
  const pattern = getPatternEntry(tier, gpaPct);

  // 1. Pattern-based admission fit note
  const reachLevel = classifyReach(p.brand_score, profile);
  if (reachLevel === "match") {
    reasons.push(`根据${tier || "你的"}背景+GPA的历史录取数据，该项目与你高度匹配（P25-P75区间内）`);
  } else if (reachLevel === "reach") {
    reasons.push(`该项目品牌高于同背景录取中位数（P50=${pattern.p50}），属于冲刺目标，需亮点加持`);
  } else {
    reasons.push(`该项目在你的录取安全区间内（低于P25=${pattern.p25}），录取把握较大`);
  }

  // 2. Brand
  if (p.brand_score >= 9) reasons.push(`顶尖品牌院校（品牌分 ${p.brand_score}/10），行业认可度极高`);
  else if (p.brand_score >= 7.5) reasons.push(`知名商学院（品牌分 ${p.brand_score}/10），国际雇主认可`);

  // 3. Career goal
  if (profile.career_goal) {
    const directHit = p.career_targets?.includes(profile.career_goal);
    const adjacent  = (CAREER_ADJACENCY[profile.career_goal] ?? []).some(
      (c) => p.career_targets?.includes(c)
    );
    if (directHit) {
      reasons.push(`职业目标「${profile.career_goal}」与该项目培养方向直接匹配`);
    } else if (adjacent) {
      reasons.push(`职业目标与该项目方向相近，有一定契合度`);
    } else {
      reasons.push(`⚠ 该项目培养方向与你的职业目标（${profile.career_goal}）契合度较低，谨慎考虑`);
    }
  }

  // 4. Target job location
  if (profile.target_job_location && profile.target_job_location !== "Not sure") {
    const loc = profile.target_job_location;
    const hasLoc = p.preferred_job_locations?.includes(loc) ||
      (loc === "Hong Kong" && p.preferred_job_locations?.includes("Singapore"));
    if (hasLoc) {
      reasons.push(`校友网络和招聘资源覆盖你的目标就业地（${loc}）`);
    } else {
      reasons.push(`⚠ 该项目对你目标就业地（${loc}）的就业资源较有限`);
    }
  }

  // 5. Employment
  if (e?.average_salary && e.average_salary >= 60000) {
    reasons.push(`毕业生均薪 £${e.average_salary.toLocaleString()}，就业回报突出`);
  } else if (e?.average_salary && e.average_salary >= 40000) {
    reasons.push(`毕业生均薪 £${e.average_salary.toLocaleString()}，就业表现良好`);
  }

  // 6. Cases
  const admitted = casesForProgram.filter((c) => c.admission_result === "admitted");
  if (admitted.length >= 2) reasons.push(`有 ${admitted.length} 个录取案例可参考`);

  // 7. GMAT
  if (p.gmat_required && profile.gmat_gre) reasons.push(`该项目要求 GMAT/GRE，你已具备，竞争优势明显`);

  return reasons.slice(0, 4);
}

// ── Career & location matching ────────────────────────────────────

const CAREER_ADJACENCY: Record<string, CareerGoal[]> = {
  "Investment Banking":  ["Corporate Finance", "Consulting", "Management"],
  "Corporate Finance":   ["Investment Banking", "Consulting", "Management"],
  "Consulting":          ["Investment Banking", "Corporate Finance", "Management", "Entrepreneurship"],
  "Data/AI":             ["Management", "Consulting", "Product"],
  "Marketing":           ["Management", "Entrepreneurship", "Product"],
  "Management":          ["Consulting", "Entrepreneurship", "Corporate Finance", "Marketing"],
  "Product":             ["Data/AI", "Entrepreneurship", "Management"],
  "Entrepreneurship":    ["Product", "Management", "Consulting", "Marketing"],
};

export function calcCareerMatch(program: RawProgram, career_goal: string): number {
  if (!career_goal) return 0.5;
  if (program.career_targets?.includes(career_goal)) return 1;
  const adjacent = CAREER_ADJACENCY[career_goal as CareerGoal] ?? [];
  if (adjacent.some((c) => program.career_targets?.includes(c))) return 0.5;
  return 0;
}

export function calcLocationMatch(program: RawProgram, target_job_location: string): number {
  if (!target_job_location || target_job_location === "Not sure") return 0.5;
  // "Hong Kong" maps to both HK and SG (both are Asian finance hubs)
  if (target_job_location === "Hong Kong") {
    if (program.preferred_job_locations?.includes("Hong Kong")) return 1;
    if (program.preferred_job_locations?.includes("Singapore")) return 0.8;
    return 0;
  }
  if (program.preferred_job_locations?.includes(target_job_location)) return 1;
  return 0;
}

// ── Main recommender ─────────────────────────────────────────────

export function recommend(
  profile: UserProfile,
  programs: RawProgram[],
  employment: RawEmployment[],
  cases: RawCase[]
): RecommendedProgram[] {
  const strength = calcUserStrength(profile);

  const empMap = new Map<string, RawEmployment>();
  for (const e of employment) {
    empMap.set(e.program_key ?? `${e.school_name}__${e.program_name}`, e);
  }

  const caseMap = new Map<string, RawCase[]>();
  for (const c of cases) {
    const key = `${c.school_name}__${c.program_name}`;
    if (!caseMap.has(key)) caseMap.set(key, []);
    caseMap.get(key)!.push(c);
  }

  let filtered = programs;

  // Filter by target countries
  if (profile.target_countries && profile.target_countries.length > 0) {
    filtered = filtered.filter((p) =>
      profile.target_countries.includes((p as any).country)
    );
  }

  if (profile.preferred_categories.length > 0) {
    // Match by category OR by keywords in program name
    // e.g. selecting "Business Analytics" also matches "Data Science", "Data Analytics" in program names
    const CATEGORY_KEYWORDS: Record<string, string[]> = {
      "Business Analytics": ["analytics", "data science", "data analysis", "big data", "quantitative"],
      "Finance": ["finance", "financial", "banking", "investment"],
      "FinTech": ["fintech", "financial technology"],
      "Marketing": ["marketing", "digital marketing", "brand"],
      "Management": ["management", "leadership", "organisational"],
      "Accounting": ["accounting", "audit"],
      "Finance & Accounting": ["finance", "accounting"],
      "Economics": ["economics", "economic"],
      "Supply Chain": ["supply chain", "logistics", "operations"],
      "Supply Chain & Operations": ["supply chain", "operations", "logistics"],
      "Digital Business": ["digital", "e-commerce", "innovation"],
      "International Business": ["international business", "global business"],
      "Entrepreneurship": ["entrepreneur", "venture", "innovation"],
      "HR Management": ["human resource", "hr ", "people", "organisational behaviour"],
      "Strategy": ["strategy", "strategic"],
      "Real Estate": ["real estate", "property"],
      "Public Policy": ["public policy", "public administration"],
    };

    filtered = filtered.filter((p) => {
      // Direct category match
      if (profile.preferred_categories.includes(p.program_category)) return true;
      // Keyword match in program name
      const pName = p.program_name.toLowerCase();
      return profile.preferred_categories.some((cat) => {
        const keywords = CATEGORY_KEYWORDS[cat] || [];
        return keywords.some((kw) => pName.includes(kw));
      });
    });
  }

  if (profile.budget_gbp && profile.budget_gbp > 0) {
    filtered = filtered.filter(
      (p) => p.tuition_fee == null || p.tuition_fee <= profile.budget_gbp!
    );
  }

  const results: RecommendedProgram[] = filtered.map((p) => {
    const reachLevel     = classifyReach(p.brand_score, profile);
    const career_match   = calcCareerMatch(p, profile.career_goal);
    const location_match = calcLocationMatch(p, profile.target_job_location);

    // Admission fit: how well does the program's brand match the user's pattern range?
    const tier = profile.undergraduate_tier || "";
    const gpaPct = parseGPAPercent(profile.gpa);
    const pattern = getPatternEntry(tier, gpaPct);
    const modifier = calcModifierBonus(profile);
    const userMedian = pattern.p50 + modifier;
    const fitDistance = Math.abs(p.brand_score - userMedian);
    const admissionFit = Math.max(0, 10 - fitDistance * 2.5);

    // New matchScore: admissionFit(40%) + career(25%) + brand(20%) + location(15%)
    const matchScore =
      admissionFit * 0.4 +
      career_match * 10 * 0.25 +
      p.brand_score * 0.2 +
      location_match * 10 * 0.15;

    const emp = empMap.get(p.program_key) ?? null;
    const programCases = [...(caseMap.get(`${p.school_name}__${p.program_name}`) ?? [])]
      .filter((c) => c.confidence_score >= 3)
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 3);

    const allCases = caseMap.get(`${p.school_name}__${p.program_name}`) ?? [];
    const reasons = generateReasons(p, emp, allCases, profile);

    return {
      program: p, employment: emp, cases: programCases,
      reachLevel, matchScore, userStrength: strength,
      reasons, career_match, location_match,
    };
  });

  // Sort by reach level first, then by matchScore within each level
  results.sort((a, b) => {
    const order: Record<ReachLevel, number> = { reach: 0, match: 1, safety: 2 };
    if (order[a.reachLevel] !== order[b.reachLevel]) {
      return order[a.reachLevel] - order[b.reachLevel];
    }
    return b.matchScore - a.matchScore;
  });

  // Return all results — let the frontend handle pagination and display caps.
  // Within each reach level, ensure school diversity by interleaving.
  const byLevel: Record<ReachLevel, RecommendedProgram[]> = { reach: [], match: [], safety: [] };
  for (const r of results) byLevel[r.reachLevel].push(r);

  const interleave = (list: RecommendedProgram[]): RecommendedProgram[] => {
    // Group by school, then round-robin to ensure diversity
    const bySchool: Record<string, RecommendedProgram[]> = {};
    for (const r of list) {
      const s = r.program.school_name;
      if (!bySchool[s]) bySchool[s] = [];
      bySchool[s].push(r);
    }
    // Sort school groups by best matchScore (descending)
    const groups = Object.values(bySchool).sort((a, b) => b[0].matchScore - a[0].matchScore);
    const out: RecommendedProgram[] = [];
    let round = 0;
    let added = true;
    while (added) {
      added = false;
      for (const group of groups) {
        if (round < group.length) {
          out.push(group[round]);
          added = true;
        }
      }
      round++;
    }
    return out;
  };

  return [
    ...interleave(byLevel.reach),
    ...interleave(byLevel.match),
    ...interleave(byLevel.safety),
  ];
}
