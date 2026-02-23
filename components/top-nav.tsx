"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard" as Route, label: "Dashboard" },
  { href: "/admin" as Route, label: "Admin" }
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") {
    return (
      <header className="card">
        <p className="text-xs uppercase tracking-wider text-slate-500">AccessLens AI</p>
        <h1 className="text-xl font-semibold text-slate-950">Identity Access Risk Triage</h1>
      </header>
    );
  }

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">AccessLens AI</p>
        <h1 className="text-xl font-semibold text-slate-950">Identity Access Risk Triage</h1>
      </div>
      <nav className="flex items-center gap-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              className={isActive ? "rounded-md bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-800" : "rounded-md px-3 py-2 text-sm font-medium text-slate-700"}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </nav>
    </header>
  );
}
