import type { Metadata } from "next";
import { cookies } from "next/headers";
import { themeFromCookie, THEME_COOKIE } from "@/lib/theme";
import { Inter, Space_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--kw-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--kw-grotesk", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--kw-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--kw-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Keelwork — build something gorgeous", template: "%s · Keelwork" },
  description: "Turn ideas into real apps and websites by chatting with AI. Design it, ship it, own every line.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = themeFromCookie((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme} className={`${inter.variable} ${grotesk.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
