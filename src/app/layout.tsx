import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import { SmoothScroll } from "@/components/mailscore/SmoothScroll";
import { FilmGrain } from "@/components/mailscore/FilmGrain";
import { LiveBackground } from "@/components/mailscore/LiveBackground";
import { CursorGlow } from "@/components/mailscore/CursorGlow";
import { ScrollProgress } from "@/components/mailscore/ScrollProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: "DeliverWatch — Continuous Deliverability & Blacklist Monitoring — 100% Free",
  description:
    "Your domains are getting blacklisted. You just don't know it yet. DeliverWatch monitors SPF, DKIM, DMARC, MX and 8 blacklists 24/7 and alerts you on WhatsApp, Slack or email. Free forever.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "DeliverWatch — Free 24/7 Email Deliverability Monitoring",
    description: "SPF, DKIM, DMARC, MX and blacklist monitoring with instant alerts. 100% free.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${grotesk.variable}`}>
      <body className="relative min-h-screen bg-[#060709] text-slate-200 antialiased overflow-x-hidden selection:bg-[#C8A96E]/30 selection:text-white">
        {/* Momentum smooth scrolling */}
        <SmoothScroll />

        {/* Tactile micro-noise film grain */}
        <FilmGrain />

        {/* Interactive parallax ambient background */}
        <LiveBackground />

        {/* Cursor flashlight glow */}
        <CursorGlow />

        {/* Top gold reading progress line */}
        <ScrollProgress />

        {/* Page Content */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
