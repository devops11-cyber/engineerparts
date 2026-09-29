export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
}

export const primaryNav: NavItem[] = [
  { label: "Clearance Stock", href: "/clearance" },
  { label: "Brands", href: "/brands" },
  { label: "Recently Added", href: "/recently-added" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
