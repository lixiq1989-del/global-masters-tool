/**
 * School prestige lookup module.
 * Matches user-entered school name + region to a prestige_score (1-10).
 * Falls back to manual tier if school not found.
 */

import chinaDb from "@/data/china_university_tiers_draft.json";
import globalBands from "@/data/global_university_bands.json";

export type UndergraduateRegion =
  | "China"
  | "UK"
  | "US"
  | "Hong Kong"
  | "Singapore"
  | "Australia"
  | "Canada"
  | "Europe"
  | "Other"
  | "";

export interface LookupResult {
  prestige_score: number;
  detected_tier: string;
  confidence: "high" | "medium" | "low" | "fallback";
  matched_name?: string;
}

// Normalize a string for matching: lowercase, strip punctuation/spaces
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "") // keep letters, digits, CJK
    .trim();
}

// ── China lookup ──────────────────────────────────────────────────

interface ChinaEntry {
  school_name_cn: string;
  school_name_en: string;
  aliases: string[];
  tier: string;
  prestige_score: number;
  confidence: string;
}

export function lookupChina(schoolName: string): LookupResult | null {
  if (!schoolName.trim()) return null;
  const needle = normalize(schoolName);
  if (needle.length < 2) return null;

  const entries = chinaDb as ChinaEntry[];

  // Phase 1: exact match
  for (const entry of entries) {
    for (const c of [entry.school_name_cn, entry.school_name_en, ...entry.aliases]) {
      if (normalize(c) === needle) {
        return {
          prestige_score: entry.prestige_score,
          detected_tier: entry.tier,
          confidence: entry.confidence as LookupResult["confidence"],
          matched_name: entry.school_name_cn,
        };
      }
    }
  }

  // Phase 2: prefix match only (one must START WITH the other)
  // Prevents "暨南大学" matching "南京大学" via middle substring "南大学"
  let best: { entry: ChinaEntry; score: number } | null = null;
  for (const entry of entries) {
    for (const c of [entry.school_name_cn, entry.school_name_en, ...entry.aliases]) {
      const hay = normalize(c);
      if (hay.length < 2) continue;
      let score = 0;
      if (hay.startsWith(needle)) score = needle.length / hay.length;
      else if (needle.startsWith(hay)) score = hay.length / needle.length;
      if (score > 0 && (!best || score > best.score)) best = { entry, score };
    }
  }

  if (best) {
    return {
      prestige_score: best.entry.prestige_score,
      detected_tier: best.entry.tier,
      confidence: best.entry.confidence as LookupResult["confidence"],
      matched_name: best.entry.school_name_cn,
    };
  }

  return null;
}

// ── Global lookup ─────────────────────────────────────────────────

interface GlobalBand {
  tier: string;
  prestige_score: number;
  schools: string[];
}

interface RegionData {
  bands: GlobalBand[];
}

export function lookupGlobal(
  region: UndergraduateRegion,
  schoolName: string
): LookupResult | null {
  if (!region || region === "China" || !schoolName.trim())
    return null;

  const regionData = (globalBands as unknown as Record<string, RegionData>)[region];
  if (!regionData?.bands) return null;

  const needle = normalize(schoolName);

  // Phase 1: exact match
  for (const band of regionData.bands) {
    for (const s of band.schools) {
      if (normalize(s) === needle) {
        return { prestige_score: band.prestige_score, detected_tier: band.tier, confidence: "high", matched_name: s };
      }
    }
  }
  // Phase 2: prefix match
  for (const band of regionData.bands) {
    for (const s of band.schools) {
      const hay = normalize(s);
      if ((hay.startsWith(needle) || needle.startsWith(hay)) && needle.length >= 2 && hay.length >= 2) {
        return { prestige_score: band.prestige_score, detected_tier: band.tier, confidence: "high", matched_name: s };
      }
    }
  }

  // Not found in explicit list — return lowest band for that region as fallback
  const lastBand = regionData.bands[regionData.bands.length - 1];
  if (lastBand) {
    return {
      prestige_score: lastBand.prestige_score,
      detected_tier: lastBand.tier + " (estimated)",
      confidence: "low",
    };
  }

  return null;
}

// ── Tier-to-score fallback (legacy) ──────────────────────────────

const TIER_TO_SCORE: Record<string, number> = {
  "G5": 10,
  "UK Top Tier": 8.5,
  "UK Strong Target": 7,
  "UK Target": 5.5,
  "European Target": 7,
  "Chinese Target": 6.5,
  "Asian Target": 7,
  "Indian Target": 6,
  "Non-target": 4,
  "China Tier 1": 10,
  "China Tier 2": 8,
  "China Tier 3": 6,
  "China Tier 4": 4,
  "US Ivy+": 10,
  "US Top 30": 8.5,
  "US Top 50": 7.5,
  "US Top 100": 6,
  "HK Top": 9.5,
  "HK Strong": 7.5,
  "SG Top": 9.5,
  "SG Strong": 7.5,
  "AU Go8": 8.5,
  "AU Strong": 6.5,
  "CA Top": 9,
  "CA Strong": 7,
  "EU Top": 9,
  "EU Strong": 7,
  "Unknown": 5,
};

export function tierToScore(tier: string): number {
  return TIER_TO_SCORE[tier] ?? 5;
}

// ── Main lookup: combine both sources ────────────────────────────

export function lookupPrestige(
  region: UndergraduateRegion,
  schoolName: string,
  manualTier?: string
): LookupResult {
  // 1. Try database lookup
  let result: LookupResult | null = null;

  if (region === "China" || (!region && schoolName.match(/[\u4e00-\u9fa5]/))) {
    result = lookupChina(schoolName);
  } else if (region && region !== "Other") {
    result = lookupGlobal(region, schoolName);
    // Also try China lookup in case user typed a Chinese school name
    if (!result || result.confidence === "low") {
      const chinaResult = lookupChina(schoolName);
      if (chinaResult && chinaResult.confidence !== "low") {
        result = chinaResult;
      }
    }
  } else {
    // Try both
    result = lookupChina(schoolName) ?? lookupGlobal(region, schoolName);
  }

  // 2. If found with reasonable confidence, use it
  if (result && result.confidence !== "low") return result;

  // 3. Fall back to manual tier
  if (manualTier && TIER_TO_SCORE[manualTier]) {
    return {
      prestige_score: TIER_TO_SCORE[manualTier],
      detected_tier: manualTier,
      confidence: "medium",
    };
  }

  // 4. Use low-confidence lookup result if we have one
  if (result) return result;

  // 5. Global fallback
  return {
    prestige_score: (globalBands as { _fallback: { prestige_score: number } })._fallback.prestige_score,
    detected_tier: "Unknown",
    confidence: "fallback",
  };
}
