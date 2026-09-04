"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Globe, LogOut, Menu, Settings, X } from "lucide-react";
import { Logo } from "@/components/mailscore/Logo";

const NAV = [
  { href: "/dashboard", label: "Domains", icon: Globe, exact: false },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell, exact: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: true },
];

export function DashboardNav({ user }: { user: { email: string; fullName: string | null; plan: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    // Domains tab is active for /dashboard and /dashboard/[id] (but not alerts/settings)
    return pathname === href || (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/alerts") && !pathname.startsWith("/dashboard/settings"));
  };

  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-obsidian/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = isActive(n.href, n.exact);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition ${
                    active ? "bg-gold/[0.12] text-gold-light ring-1 ring-gold/40" : "text-muted hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="rounded-full border border-gold/30 bg-gold/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light">Free · Community</span>
          <span className="max-w-[180px] truncate text-sm text-muted" title={user.email}>
            {user.fullName || user.email}
          </span>
          <button type="button" onClick={signOut} disabled={signingOut} className="btn-ghost !px-3.5 !py-1.5 text-xs">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-lg border border-white/[0.08] p-2 text-muted md:hidden" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#0B0D12] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${isActive(n.href, n.exact) ? "bg-gold/[0.12] text-gold-light" : "text-muted"}`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="truncate text-xs text-muted">{user.email}</span>
            <button type="button" onClick={signOut} className="text-xs text-gold">
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
