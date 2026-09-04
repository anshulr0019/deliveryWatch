import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

export function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-obsidian/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#check" className="transition hover:text-white">
            Instant Checker
          </a>
          <a href="#how" className="transition hover:text-white">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-gold !px-4 !py-2 text-xs sm:text-sm">
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-muted transition hover:text-white sm:block">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="btn-gold !px-4 !py-2 text-xs sm:text-sm">
                Start Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
