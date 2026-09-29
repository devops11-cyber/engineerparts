import type { Lot } from "@/lib/types";

export const lots: Lot[] = [];

export function getLot(reference: string): Lot | undefined {
  return lots.find(
    (lot) =>
      lot.lot_reference.toLowerCase() === reference.toLowerCase() || lot.slug === reference,
  );
}

export function getLotByReference(reference: string | null): Lot | undefined {
  return reference ? getLot(reference) : undefined;
}