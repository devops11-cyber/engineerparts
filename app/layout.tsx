import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { CartProvider } from "@/components/providers/CartProvider";
import { EnquiryProvider } from "@/components/providers/EnquiryProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SavedProductsProvider } from "@/components/providers/SavedProductsProvider";
import { EnquiryModal } from "@/components/modals/EnquiryModal";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Engineerparts.com | Industrial products",
    template: "%s | Engineerparts.com",
  },
  description:
    "Browse products available from Engineerparts.com through the live WooCommerce catalogue.",
  metadataBase: new URL("https://engineerparts.com"),
  openGraph: {
    title: "Engineerparts.com | Industrial products",
    description: "Browse products from the live Engineerparts.com catalogue.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AE" className={`${inter.variable} ${archivo.variable}`}>
      <body className="flex min-h-screen flex-col bg-white">
        <ToastProvider>
          <AuthProvider>
            <SavedProductsProvider>
              <CartProvider>
                <EnquiryProvider>
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                  <FloatingWhatsApp />
                  <EnquiryModal />
                </EnquiryProvider>
              </CartProvider>
            </SavedProductsProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
