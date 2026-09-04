import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <>
      <DashboardNav user={{ email: user.email, fullName: user.fullName, plan: user.plan }} />
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
    </>
  );
}
