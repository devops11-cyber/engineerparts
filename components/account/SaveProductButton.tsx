"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSavedProducts } from "@/components/providers/SavedProductsProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

export function SaveProductButton({ productId, compact = false, className }: { productId: string; compact?: boolean; className?: string }) {
  const pathname = usePathname(); const router = useRouter(); const { ready, isSaved, toggle } = useSavedProducts(); const { toast } = useToast(); const [saving, setSaving] = useState(false);
  const saved = isSaved(productId);
  async function onClick() { setSaving(true); try { const next = await toggle(productId); toast(next ? "Product saved." : "Product removed from saved products.", "info"); if (pathname === "/account/saved-products") router.refresh(); } catch (caught) { toast(caught instanceof Error ? caught.message : "Unable to save this product.", "error"); } finally { setSaving(false); } }
  return <button type="button" onClick={() => void onClick()} disabled={!ready || saving} className={cn(compact ? "flex h-9 w-9 items-center justify-center rounded-md border border-navy-200 bg-white text-lg text-brand-700 shadow-card hover:border-brand-500" : "btn-outline", className)} aria-label={saved ? "Remove from saved products" : "Save product"} title={saved ? "Remove from saved products" : "Save product"}><span aria-hidden="true">{saved ? "♥" : "♡"}</span>{compact ? null : <span>{saved ? "Saved" : "Save Product"}</span>}</button>;
}