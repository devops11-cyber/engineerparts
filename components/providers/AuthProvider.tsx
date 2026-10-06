"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, UserSession } from "@/lib/account";
import { readLeads } from "@/lib/leads";

interface AuthContextValue extends UserSession {
  loading: boolean;
  refreshUser: () => Promise<Customer | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json()) as UserSession;
      const nextCustomer = response.ok ? data.customer : null;
      setCustomer(nextCustomer);
      if (nextCustomer) {
        const references = readLeads().map((lead) => lead.lead_id);
        if (references.length) {
          void fetch("/api/account/enquiries/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references }) });
        }
      }
      return nextCustomer;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setCustomer(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({
    authenticated: Boolean(customer),
    customer,
    loading,
    refreshUser,
    logout,
  }), [customer, loading, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}