import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

export function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060709]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href="/#features" className="transition hover:text-white">
            Features
          </Link>
          <Link href="/#check" className="transition hover:text-white">
            Instant Checker
          </Link>
          <Link href="/#how" className="transition hover:text-white">
            How it works
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-gold btn-sm group">
              <span>Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-muted transition hover:text-white sm:block">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn-gold btn-sm group">
                <span>Start Free</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
