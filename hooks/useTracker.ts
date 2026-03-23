"use client";

import { useState, useEffect, useCallback } from "react";

const TRACKER_KEY = "masters-tool-tracker";

export type TrackerStatus = "interested" | "preparing" | "writing" | "submitted" | "interview" | "offer";

export interface InterviewInfo {
  date: string;          // ISO date string
  format: "video" | "phone" | "onsite" | "";
  notes: string;
  result: "pending" | "passed" | "rejected" | "";
}

export interface TrackerEntry {
  status: TrackerStatus;
  notes: string;
  updated_at: string;
  deadline: string;      // application deadline ISO date
  interview: InterviewInfo | null;
}

export type TrackerData = Record<number, TrackerEntry>;

export const TRACKER_STAGES: { key: TrackerStatus; label: string; emoji: string; color: string }[] = [
  { key: "interested",  label: "感兴趣",   emoji: "💡", color: "bg-gray-100 text-gray-700" },
  { key: "preparing",   label: "准备材料", emoji: "📚", color: "bg-blue-100 text-blue-700" },
  { key: "writing",     label: "文书中",   emoji: "✍️", color: "bg-purple-100 text-purple-700" },
  { key: "submitted",   label: "已提交",   emoji: "📮", color: "bg-orange-100 text-orange-700" },
  { key: "interview",   label: "面试中",   emoji: "🎤", color: "bg-yellow-100 text-yellow-700" },
  { key: "offer",       label: "Offer",    emoji: "🎉", color: "bg-green-100 text-green-700" },
];

export function useTracker() {
  const [tracker, setTracker] = useState<TrackerData>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRACKER_KEY);
      if (stored) setTracker(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const persist = useCallback((data: TrackerData) => {
    try { localStorage.setItem(TRACKER_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, []);

  const setStatus = useCallback((programId: number, status: TrackerStatus) => {
    setTracker((prev) => {
      const next = {
        ...prev,
        [programId]: {
          ...prev[programId],
          status,
          notes: prev[programId]?.notes || "",
          deadline: prev[programId]?.deadline || "",
          interview: prev[programId]?.interview || null,
          updated_at: new Date().toISOString(),
        },
      };
      persist(next);
      return next;
    });
  }, [persist]);

  const setNotes = useCallback((programId: number, notes: string) => {
    setTracker((prev) => {
      const entry = prev[programId];
      if (!entry) return prev;
      const next = { ...prev, [programId]: { ...entry, notes, updated_at: new Date().toISOString() } };
      persist(next);
      return next;
    });
  }, [persist]);

  const setDeadline = useCallback((programId: number, deadline: string) => {
    setTracker((prev) => {
      const entry = prev[programId];
      if (!entry) return prev;
      const next = { ...prev, [programId]: { ...entry, deadline, updated_at: new Date().toISOString() } };
      persist(next);
      return next;
    });
  }, [persist]);

  const setInterview = useCallback((programId: number, interview: InterviewInfo | null) => {
    setTracker((prev) => {
      const entry = prev[programId];
      if (!entry) return prev;
      const next = { ...prev, [programId]: { ...entry, interview, updated_at: new Date().toISOString() } };
      persist(next);
      return next;
    });
  }, [persist]);

  const remove = useCallback((programId: number) => {
    setTracker((prev) => {
      const next = { ...prev };
      delete next[programId];
      persist(next);
      return next;
    });
  }, [persist]);

  const clear = useCallback(() => {
    setTracker({});
    try { localStorage.removeItem(TRACKER_KEY); } catch { /* ignore */ }
  }, []);

  return { tracker, loaded, setStatus, setNotes, setDeadline, setInterview, remove, clear };
}
