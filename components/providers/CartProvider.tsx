"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, CartTotals } from "@/lib/types";
import { track } from "@/lib/analytics";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingLabel: string;
  freeShippingRemaining?: number;
  freeShippingLabel?: string;
  quoteLoading: boolean;
  quoteError: boolean;
  quoteCountry: string;
  setQuoteCountry: (country: string) => void;
  ready: boolean;
  stockValid: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  quantityFor: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "engineerparts.cart.v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [quote, setQuote] = useState<CartTotals | null>(null);
  const [quoteCountry, setQuoteCountry] = useState("AE");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      void 0;
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      void 0;
    }
  }, [items, ready]);

  useEffect(() => {
    if (!ready || !items.length) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(false);
      return;
    }

    const controller = new AbortController();
    setQuote(null);
    setQuoteLoading(true);
    setQuoteError(false);
    fetch("/api/cart/totals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: quoteCountry,
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to calculate totals");
        const nextQuote = (await response.json()) as CartTotals;
        setQuote(nextQuote);
        if (nextQuote.stockLimits) {
          setItems((current) => {
            let changed = false;
            const next = current.map((line) => {
              const stock = nextQuote.stockLimits?.find(({ productId }) => productId === line.productId);
              if (!stock || stock.maxQuantity === null) return line;
              const quantity = stock.maxQuantity > 0
                ? Math.min(line.quantity, stock.maxQuantity)
                : line.quantity;
              if (line.maxQuantity === stock.maxQuantity && line.quantity === quantity) return line;
              changed = true;
              return {
                ...line,
                maxQuantity: stock.maxQuantity,
                quantity,
              };
            });
            return changed ? next : current;
          });
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setQuote(null);
          setQuoteError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoteLoading(false);
      });

    return () => controller.abort();
  }, [items, quoteCountry, ready]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((line) => line.productId === item.productId);
      if (existing) {
        const next = Math.min(existing.quantity + quantity, item.maxQuantity);
        return current.map((line) =>
          line.productId === item.productId ? { ...line, quantity: next } : line,
        );
      }
      return [...current, { ...item, quantity: Math.min(quantity, item.maxQuantity) }];
    });
    track("add_to_cart", {
      product_id: item.productId,
      sku: item.sku,
      quantity,
      unit_price: item.unitPrice,
      value: item.unitPrice * quantity,
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(1, Math.min(quantity, line.maxQuantity)) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => {
      const line = current.find((item) => item.productId === productId);
      if (line) {
        track("remove_from_cart", { product_id: productId, sku: line.sku, quantity: line.quantity });
      }
      return current.filter((item) => item.productId !== productId);
    });
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, line) => sum + line.quantity, 0);
    const localSubtotal = items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const subtotal = quote?.subtotal ?? localSubtotal;
    const stockValid = Boolean(quote?.stockLimits) &&
      items.every((line) => line.maxQuantity > 0 && line.quantity <= line.maxQuantity);
    return {
      items,
      count,
      subtotal,
      shipping: quote?.shipping ?? 0,
      tax: quote?.tax ?? 0,
      total: quote?.total ?? localSubtotal,
      shippingLabel: quote?.shippingLabel ?? "Shipping",
      freeShippingRemaining: quote?.freeShippingRemaining,
      freeShippingLabel: quote?.freeShippingLabel,
      quoteLoading,
      quoteError,
      quoteCountry,
      setQuoteCountry,
      ready,
      stockValid,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      quantityFor: (productId: string) =>
        items.find((line) => line.productId === productId)?.quantity ?? 0,
    };
  }, [items, quote, quoteCountry, quoteLoading, quoteError, ready, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
