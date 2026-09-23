import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Kannada, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import Shell from "@/components/Shell";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const kannada = Noto_Sans_Kannada({ variable: "--font-kannada", subsets: ["kannada"], weight: ["400", "500", "600", "700"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "KaamNear – Work nearby. Earn daily.",
  description: "AI-powered hyperlocal work marketplace: find trusted local workers or find work near you, in Kannada, Hindi or English.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f6b65" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${kannada.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
