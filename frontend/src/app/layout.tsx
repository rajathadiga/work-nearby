import type { Metadata, Viewport } from "next";
import { Nunito, Noto_Sans_Kannada, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Shell from "@/components/Shell";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });
const kannada = Noto_Sans_Kannada({ variable: "--font-kannada", subsets: ["kannada"], weight: ["400", "600", "700", "800"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "KaamNear – Work nearby. Earn daily.",
  description: "AI-powered hyperlocal work marketplace: find trusted local workers or find work near you, in Kannada, Hindi or English.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#059669" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${kannada.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
