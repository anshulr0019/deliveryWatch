import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { SmoothScroll } from "@/components/mailscore/SmoothScroll";
import { FilmGrain } from "@/components/mailscore/FilmGrain";
import { LiveBackground } from "@/components/mailscore/LiveBackground";
import { ScrollProgress } from "@/components/mailscore/ScrollProgress";
import { MotionProvider } from "@/components/mailscore/MotionProvider";

function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (raw) {
    const withProto = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    try {
      return new URL(withProto);
    } catch {
      // ignore
    }
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  title: "DeliveryWatch — Continuous Deliverability & Blacklist Monitoring — 100% Free",
  description:
    "Understand your email DNS health. DeliveryWatch monitors SPF, DKIM, DMARC, MX and 7 blacklists 24/7 and alerts you on Slack, email or webhooks. Free to use.",
  metadataBase: getSiteUrl(),
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "DeliveryWatch — Free 24/7 Email Deliverability Monitoring",
    description: "SPF, DKIM, DMARC, MX and blacklist monitoring with change alerts. 100% free.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="relative min-h-screen bg-white text-slate-800 antialiased overflow-x-hidden selection:bg-emerald-100 selection:text-[#0F372E]">
        <MotionProvider>
          {/* Momentum smooth scrolling */}
          <SmoothScroll />

          {/* Interactive light ambient mesh background */}
          <LiveBackground />

          {/* Top pine/emerald reading progress line */}
          <ScrollProgress />

          {/* Page Content */}
          <div className="relative z-10">{children}</div>
        </MotionProvider>
      </body>
    </html>
  );
}
