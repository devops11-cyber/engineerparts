"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

const STORAGE_KEY = "engineerparts.saved-products";

interface SavedProductsContextValue {
  ready: boolean;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean>;
}

const SavedProductsContext = createContext<SavedProductsContextValue | null>(null);

function readGuest(): string[] {
  try { const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown; return Array.isArray(value) ? value.map(String).filter((id) => /^\d+$/.test(id)).slice(0, 100) : []; } catch { return []; }
}

export function SavedProductsProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    const guest = readGuest();
    if (!authenticated) { setIds(new Set(guest)); setReady(true); return; }
    let cancelled = false;
    fetch("/api/account/saved-products", { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json()) as { productIds: number[] } : { productIds: [] })
      .then(async (data) => {
        const account = new Set(data.productIds.map(String));
        const missing = guest.filter((id) => !account.has(id));
        const merged = await Promise.all(missing.map(async (productId) => {
          const response = await fetch("/api/account/saved-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
          return response.ok ? productId : null;
        }));
        if (cancelled) return;
        merged.forEach((id) => { if (id) account.add(id); });
        window.localStorage.removeItem(STORAGE_KEY);
        setIds(account); setReady(true);
      })
      .catch(() => { if (!cancelled) { setIds(new Set(guest)); setReady(true); } });
    return () => { cancelled = true; };
  }, [authenticated, loading]);

  const toggle = useCallback(async (productId: string) => {
    if (authenticated) {
      const response = await fetch("/api/account/saved-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      const data = (await response.json()) as { saved?: boolean; productIds?: number[]; error?: string };
      if (!response.ok || data.saved === undefined) throw new Error(data.error || "Unable to save this product.");
      setIds(new Set((data.productIds ?? []).map(String)));
      return data.saved;
    }
    let saved = false;
    setIds((current) => {
      const next = new Set(current);
      saved = !next.has(productId);
      if (saved) next.add(productId); else next.delete(productId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
    return saved;
  }, [authenticated]);

  const value = useMemo(() => ({ ready, isSaved: (productId: string) => ids.has(productId), toggle }), [ids, ready, toggle]);
  return <SavedProductsContext.Provider value={value}>{children}</SavedProductsContext.Provider>;
}

export function useSavedProducts(): SavedProductsContextValue {
  const context = useContext(SavedProductsContext);
  if (!context) throw new Error("useSavedProducts must be used inside SavedProductsProvider");
  return context;
}