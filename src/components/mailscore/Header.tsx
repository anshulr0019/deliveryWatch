import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

export function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#features" className="transition hover:text-[#0F372E]">
            Features
          </Link>
          <Link href="/#check" className="transition hover:text-[#0F372E]">
            Instant Checker
          </Link>
          <Link href="/#how" className="transition hover:text-[#0F372E]">
            How it works
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary btn-sm group">
              <span>Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-slate-600 transition hover:text-[#0F372E] sm:block">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn-primary btn-sm group relative">
                <span className="relative flex h-2 w-2 mr-0.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300"></span>
                </span>
                <span>Get Started Free</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
