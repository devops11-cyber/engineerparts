"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Equipment, Lot, Product } from "@/lib/types";

export type EnquiryMode = "product" | "offer" | "lot" | "equipment" | "bulk";

export interface EnquiryTarget {
  mode: EnquiryMode;
  product?: Product;
  lot?: Lot;
  equipment?: Equipment;
  heading?: string;
  subheading?: string;
  source?: string;
}

interface EnquiryContextValue {
  target: EnquiryTarget | null;
  openEnquiry: (target: EnquiryTarget) => void;
  closeEnquiry: () => void;
}

const EnquiryContext = createContext<EnquiryContextValue | null>(null);

export function EnquiryProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<EnquiryTarget | null>(null);

  const openEnquiry = useCallback((next: EnquiryTarget) => setTarget(next), []);
  const closeEnquiry = useCallback(() => setTarget(null), []);

  const value = useMemo(() => ({ target, openEnquiry, closeEnquiry }), [target, openEnquiry, closeEnquiry]);

  return <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>;
}

export function useEnquiry(): EnquiryContextValue {
  const ctx = useContext(EnquiryContext);
  if (!ctx) throw new Error("useEnquiry must be used inside EnquiryProvider");
  return ctx;
}
