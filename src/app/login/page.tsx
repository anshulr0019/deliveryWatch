import { Suspense } from "react";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/mailscore/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — DeliveryWatch" };

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-[#FAFAFA] font-apple">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT COLUMN: Atmospheric Brand Pane fitted into left bottom */}
        <div className="relative hidden flex-col justify-between items-start overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-emerald-50/70 via-[#F6FAF8] to-slate-50 p-10 lg:flex xl:p-14">
          {/* Soft ambient background orbs */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-[380px] w-[380px] rounded-full bg-emerald-200/35 blur-[80px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-[340px] w-[340px] rounded-full bg-teal-100/40 blur-[70px]"
            aria-hidden="true"
          />

          {/* Top Logo */}
          <div className="relative z-10 flex w-full items-center justify-between">
            <Logo />
            <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-100/60 px-2.5 py-0.5 text-[11px] font-medium tracking-tight text-emerald-900">
              100% Free · Community
            </span>
          </div>

          {/* Bottom Copy fitted nicely into left bottom corner with refined Apple sizing */}
          <div className="relative z-10 mt-auto max-w-sm text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-emerald-900 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Automated Deliverability Infrastructure
            </div>

            <h1 className="mt-3.5 text-2xl font-semibold tracking-[-0.025em] text-[#1d1d1f] xl:text-[27px] leading-snug">
              Keep your email DNS <span className="text-[#0F372E]">under observation.</span>
            </h1>

            <p className="mt-2.5 text-[13px] leading-relaxed text-[#6e6e73]">
              DeliveryWatch runs real-time DNS diagnostics across SPF, DKIM, DMARC, MX records and 7 blacklists around the clock with clear findings and change history.
            </p>

            <div className="mt-6 space-y-2.5 text-xs text-[#1d1d1f]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span className="font-medium text-slate-700">Automated daily background re-checks</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span className="font-medium text-slate-700">Queued Slack and email notifications</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span className="font-medium text-slate-700">Historical deliverability charts & DNS change diffing</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Apple Glass Auth Pane */}
        <div className="relative flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-16 overflow-hidden">
          {/* Subtle atmospheric gradient in background for glass refraction */}
          <div
            className="pointer-events-none absolute right-12 top-12 h-64 w-64 rounded-full bg-emerald-100/30 blur-[90px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-8 bottom-12 h-64 w-64 rounded-full bg-teal-50/50 blur-[80px]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto w-full max-w-[420px]">
            {/* Mobile-only logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo />
            </div>

            <Suspense fallback={<div className="h-[460px] w-full rounded-3xl bg-slate-100/60 animate-pulse" />}>
              <LoginForm />
            </Suspense>

            <p className="mt-6 text-center text-[11px] font-medium tracking-tight text-[#86868b]">
              Continuous Deliverability & Blacklist Monitoring — Free to use.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
