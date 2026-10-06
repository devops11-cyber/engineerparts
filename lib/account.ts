export const SESSION_COOKIE = "engineerparts_session";

export interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  company: string;
  emailVerified: boolean;
}

export interface CustomerAddress {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
}

export interface AccountCustomer extends Customer {
  jobTitle: string;
  department: string;
  vatNumber: string;
  companyWebsite: string;
  customerType: string;
  activeSessionCount: number;
  billingAddress: CustomerAddress;
  shippingAddress: CustomerAddress;
}

export interface CustomerOrder {
  id: number;
  number: string;
  date: string;
  status: string;
  total: number;
  currency: string;
  paymentStatus: "paid" | "unpaid" | "not-required";
  itemCount: number;
  canPay: boolean;
  canReorder: boolean;
}

export interface CustomerOrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total: number;
}

export interface CustomerOrderDetail extends CustomerOrder {
  paymentMethod: string;
  paymentUrl: string;
  transactionReference: string;
  customerNote: string;
  subtotal: number;
  tax: number;
  shipping: number;
  billingAddress: CustomerAddress;
  shippingAddress: CustomerAddress;
  items: CustomerOrderItem[];
}

export interface CustomerEnquiry {
  reference: string;
  date: string;
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  message: string;
  status: string;
}

export interface UserSession {
  authenticated: boolean;
  customer: Customer | null;
}

export interface AuthResponse {
  ok: boolean;
  message?: string;
  error?: string;
  code?: string;
  customer?: Customer;
  requiresVerification?: boolean;
}

export const CUSTOMER_TYPES = [
  "End User",
  "Contractor",
  "EPC Contractor",
  "Trading Company",
  "Distributor",
  "Maintenance Company",
  "OEM",
  "Other",
] as const;

export function validPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function safeRedirect(value: string | null | undefined, fallback = "/account"): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export interface APIError {
  ok: false;
  error: string;
  code?: string;
}