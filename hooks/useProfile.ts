"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "@/lib/types";

const PROFILE_KEY = "masters-tool-profile";

export interface SavedProfile extends UserProfile {
  updated_at: string;
}

const EMPTY_PROFILE: UserProfile = {
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

export function useProfile() {
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) setProfile(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const save = useCallback((p: UserProfile) => {
    const saved: SavedProfile = { ...p, updated_at: new Date().toISOString() };
    setProfile(saved);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(saved)); } catch { /* ignore */ }
  }, []);

  const clear = useCallback(() => {
    setProfile(null);
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
  }, []);

  // Calculate completion percentage
  const completion = profile ? calcCompletion(profile) : 0;

  return { profile, loaded, save, clear, completion, emptyProfile: EMPTY_PROFILE };
}

function calcCompletion(p: UserProfile): number {
  const fields = [
    !!p.undergraduate_region,
    !!p.undergraduate_school,
    !!p.undergraduate_tier,
    !!p.major,
    !!p.gpa,
    !!p.language_score,
    !!p.gmat_gre,
    !!p.internships,
    !!p.work_experience,
    p.target_countries.length > 0,
    p.preferred_categories.length > 0,
    !!p.career_goal,
    !!p.target_job_location,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
