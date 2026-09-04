import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.06]">
      <div className="divider-gold absolute inset-x-0 top-0" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Continuous deliverability & blacklist monitoring for teams who can&apos;t afford to land in spam. Real DNS checks, real alerts — 100% free, forever.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-4">Product</div>
          <ul className="space-y-2.5 text-sm text-muted">
            <li>
              <a href="/#features" className="hover:text-white">
                Features
              </a>
            </li>
            <li>
              <a href="/#check" className="hover:text-white">
                Instant Checker
              </a>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/login?mode=signup" className="hover:text-white">
                Create free account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">What we monitor</div>
          <ul className="space-y-2.5 text-sm text-muted">
            <li>SPF · DKIM · DMARC</li>
            <li>MX topology & resolution</li>
            <li>Spamhaus, Barracuda, SpamCop, SORBS</li>
            <li>UCEPROTECT, PSBL, DroneBL, CBL</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-2 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} DeliverWatch. Formerly MailScore.</span>
          <span>No credit card. No paid tiers. No catch.</span>
        </div>
      </div>
    </footer>
  );
}
