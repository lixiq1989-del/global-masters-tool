"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import InputForm from "@/components/InputForm";
import ResultSection from "@/components/ResultSection";
import { recommend, calcUserStrength, calcSubScores } from "@/lib/recommend";
import type { UserProfile, RecommendedProgram, UserSubScores } from "@/lib/types";
import programsData from "@/data/programs.json";
import employmentData from "@/data/employment.json";
import casesData from "@/data/cases.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const programs   = programsData   as any as Parameters<typeof recommend>[1];
const employment = employmentData as any as Parameters<typeof recommend>[2];
const cases      = casesData      as any as Parameters<typeof recommend>[3];

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

export default function Home() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [results, setResults] = useState<RecommendedProgram[] | null>(null);
  const [strength, setStrength] = useState<number | null>(null);
  const [subScores, setSubScores] = useState<UserSubScores | null>(null);

  function handleGenerate(p: UserProfile) {
    setProfile(p);
    const s = calcUserStrength(p);
    setStrength(s);
    setSubScores(calcSubScores(p));
    const res = recommend(p, programs, employment, cases);
    setResults(res);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Input card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            填写你的背景信息
          </h2>
          <InputForm defaultProfile={DEFAULT_PROFILE} onGenerate={handleGenerate} />
        </div>

        {/* Results */}
        {results !== null && strength !== null && subScores !== null && (
          <div id="results">
            <ResultSection results={results} strength={strength} subScores={subScores} profile={profile} />
          </div>
        )}
      </main>

      <footer className="text-center text-gray-400 text-xs py-8 mt-8 border-t">
        数据来源：各国大学官方网站、QS/FT 排名、WallStreetOasis、GMAT Club 等公开数据 · 仅供参考
      </footer>
    </div>
  );
}
