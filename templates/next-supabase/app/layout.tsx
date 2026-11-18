import type { Metadata } from "next";
import "./globals.css";
import { KwInspector } from "./kw-inspector";
import { KwAnalytics } from "./kw-analytics";

export const metadata: Metadata = { title: "My Keelwork app", description: "Built with Keelwork." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <KwInspector />
        <KwAnalytics />
      </body>
    </html>
  );
}
