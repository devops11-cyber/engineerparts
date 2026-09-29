import type { Equipment } from "@/lib/types";

export const equipment: Equipment[] = [];

export function getEquipment(reference: string): Equipment | undefined {
  return equipment.find(
    (item) => item.reference.toLowerCase() === reference.toLowerCase() || item.slug === reference,
  );
}