import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-slate-200/80 bg-slate-50/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
            Continuous deliverability & blacklist monitoring for teams who can&apos;t afford to land in spam. Real DNS checks, real alerts — 100% free, forever.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-4 text-[#0F372E]">Product</div>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>
              <a href="/#features" className="hover:text-[#0F372E] transition">
                Features
              </a>
            </li>
            <li>
              <a href="/#check" className="hover:text-[#0F372E] transition">
                Instant Checker
              </a>
            </li>
            <li>
              <Link href="/login" className="hover:text-[#0F372E] transition">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/login?mode=signup" className="hover:text-[#0F372E] transition">
                Create free account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4 text-[#0F372E]">What we monitor</div>
          <ul className="space-y-2.5 text-sm text-slate-600">
            <li>SPF · DKIM · DMARC</li>
            <li>MX topology & resolution</li>
            <li>Spamhaus, Barracuda, SpamCop, SORBS</li>
            <li>UCEPROTECT, PSBL, DroneBL, CBL</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} DeliverWatch. Continuous Deliverability Monitoring.</span>
          <span className="font-medium text-emerald-700">100% Free · No credit card required</span>
        </div>
      </div>
    </footer>
  );
}
