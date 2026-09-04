import { Suspense } from "react";
import { Logo } from "@/components/mailscore/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — DeliverWatch" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Suspense fallback={<div className="h-[480px] w-full max-w-md rounded-2xl shimmer" />}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 max-w-sm text-center text-xs text-muted-2">
        Continuous Deliverability & Blacklist Monitoring — 100% Free. No credit card, no trial, no paid tier.
      </p>
    </main>
  );
}
