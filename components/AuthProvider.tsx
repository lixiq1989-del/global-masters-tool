"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginModal from "./LoginModal";

interface AuthCtx {
  authed: boolean;
  loaded: boolean;
  logout: () => void;
  /** Call this to require auth before an action. Returns true if already authed, otherwise shows modal. */
  requireAuth: (callback?: () => void) => boolean;
}

const Ctx = createContext<AuthCtx>({
  authed: false,
  loaded: false,
  logout: () => {},
  requireAuth: () => false,
});

export const useAuthContext = () => useContext(Ctx);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { authed, loaded, login, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  function requireAuth(callback?: () => void): boolean {
    if (authed) return true;
    setPendingCallback(() => callback || null);
    setShowModal(true);
    return false;
  }

  async function handleLogin(code: string): Promise<boolean> {
    const ok = await login(code);
    if (ok) {
      setShowModal(false);
      if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
      }
    }
    return ok;
  }

  return (
    <Ctx.Provider value={{ authed, loaded, logout, requireAuth }}>
      {children}
      {showModal && (
        <LoginModal
          onLogin={handleLogin}
          onClose={() => { setShowModal(false); setPendingCallback(null); }}
        />
      )}
    </Ctx.Provider>
  );
}
