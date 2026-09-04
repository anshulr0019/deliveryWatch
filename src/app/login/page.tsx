import { Suspense } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Star } from "lucide-react";
import { Logo } from "@/components/mailscore/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — DeliverWatch" };

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT COLUMN: Atmospheric Brand & Social Proof Pane (Desktop) */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200/80 bg-gradient-to-br from-emerald-50/90 via-[#F4FAF7] to-slate-50 p-12 lg:flex xl:p-16">
          {/* Soft ambient background orbs */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-[450px] w-[450px] rounded-full bg-emerald-200/40 blur-[80px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-teal-100/50 blur-[70px]"
            aria-hidden="true"
          />

          {/* Top Logo */}
          <div className="relative z-10 flex items-center justify-between">
            <Logo />
            <span className="badge-healthy">100% Free · Community</span>
          </div>

          {/* Middle Copy */}
          <div className="relative z-10 my-auto max-w-lg py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-100/60 px-3 py-1 text-xs font-bold text-emerald-900">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Automated Deliverability Infrastructure
            </div>

            <h1 className="font-display mt-5 text-4xl font-extrabold tracking-tight text-[#0B1311] xl:text-5xl">
              Scale from 10 mailboxes to <span className="text-[#0F372E]">10,000 with ease.</span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-600">
              DeliverWatch runs real-time DNS diagnostics across SPF, DKIM, DMARC, MX records and 8 blacklists around the clock so you never land in spam.
            </p>

            <div className="mt-8 space-y-3 text-sm font-semibold text-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
                <span>Automated 15-minute background re-checks</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
                <span>Instant WhatsApp, Slack, and email notifications</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
                <span>Historical deliverability charts & DNS change diffing</span>
              </div>
            </div>
          </div>

          {/* Bottom Testimonial Card */}
          <div className="relative z-10 rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
              <Star className="h-3.5 w-3.5 fill-current" />
            </div>
            <p className="mt-2.5 text-xs italic leading-relaxed text-slate-700">
              &ldquo;DeliverWatch saved our cold outreach domain pool within 48 hours of onboarding. The instant WhatsApp alerts are a game changer.&rdquo;
            </p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Alex R. — Head of Outbound</span>
              <span className="text-slate-400">Merryreach User</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean White Auth Card */}
        <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile-only logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo />
            </div>

            <Suspense fallback={<div className="h-[480px] w-full rounded-2xl bg-slate-100 animate-pulse" />}>
              <LoginForm />
            </Suspense>

            <p className="mt-8 text-center text-xs text-slate-400">
              Continuous Deliverability & Blacklist Monitoring — 100% Free Forever.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
