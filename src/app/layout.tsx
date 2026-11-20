import type { Metadata } from "next";
import { cookies } from "next/headers";
import { themeFromCookie, THEME_COOKIE } from "@/lib/theme";
import { SIMPLE_COOKIE } from "@/lib/simple/content";
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
  const jar = await cookies();
  const theme = themeFromCookie(jar.get(THEME_COOKIE)?.value);
  // Simple Mode is set before the first paint, so the right wording shows straight away.
  const simple = jar.get(SIMPLE_COOKIE)?.value === "1";
  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme} data-simple={simple ? "on" : undefined} className={`${inter.variable} ${grotesk.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
