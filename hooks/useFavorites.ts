"use client";

import { useState, useEffect } from "react";

const KEY = "uk-masters-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavorites(new Set(JSON.parse(stored) as number[]));
    } catch {
      // ignore localStorage errors
    }
    setLoaded(true);
  }, []);

  function toggle(id: number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function clear() {
    setFavorites(new Set());
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  return { favorites, toggle, clear, loaded };
}
