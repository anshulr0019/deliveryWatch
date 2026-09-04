import Link from "next/link";
import { Logo } from "@/components/mailscore/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <div className="eyebrow mt-10 text-[#0F372E]">404</div>
      <h1 className="font-display mt-2 text-3xl font-bold text-[#0B1311]">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you are looking for does not exist.</p>
      <Link href="/" className="btn-primary mt-8">
        Go home
      </Link>
    </main>
  );
}
