"use client";

import { useState, useEffect, useCallback } from "react";

const AUTH_KEY = "masters-tool-auth";

export function useAuth() {
  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) setAuthed(true);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const login = useCallback(async (code: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        localStorage.setItem(AUTH_KEY, code.trim());
        setAuthed(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
    setAuthed(false);
  }, []);

  return { authed, loaded, login, logout };
}
