"use client"

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, Plus, Settings, Globe, LogOut, Users, Calendar, Code, Menu, Workflow, UserRound, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const drawerItems = [
  { to: "/clients", label: "Clients", description: "Guest records", icon: Users },
  { to: "/api-dashboard", label: "API", description: "Integrations and docs", icon: Code },
  { to: "/settings", label: "Settings", description: "Workspace preferences", icon: Settings },
  { to: "#", label: "Automations", description: "Coming soon", icon: Workflow, disabled: true },
  { to: "#", label: "Team", description: "Coming soon", icon: UserRound, disabled: true },
];

const sideItems = [
  { to: "/dashboard", label: "Reservations", icon: LayoutGrid },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/new", label: "New Reservation", icon: Plus },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/api-dashboard", label: "API Dashboard", icon: Code },
  { to: "/settings", label: "Settings", icon: Settings },
];

const navCradleMask = {
  WebkitMaskImage: "radial-gradient(circle 40px at 50% 0px, transparent 0 39px, #000 40px)",
  maskImage: "radial-gradient(circle 40px at 50% 0px, transparent 0 39px, #000 40px)",
};

function SpikeMark({ className = "" }) {
  return (
    <span className={`relative inline-flex h-5 w-5 items-center justify-center ${className}`} aria-hidden="true">
      <span className="absolute h-5 w-[2px] rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] rotate-45 rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] rotate-90 rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] -rotate-45 rounded-full bg-current" />
    </span>
  );
}

export default function StaffLayout({ children }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");
  const moreActive = drawerItems.some((item) => !item.disabled && isActive(item.to));

  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 md:min-h-screen border-r border-[#e6dfd8] bg-[#181715] flex-col shrink-0 text-[#faf9f5]">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-[#252320]">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#faf9f5] text-[#141413]">
            <SpikeMark className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">Ritz Reservations</p>
            <p className="text-[10px] text-[#a09d96]">Management System</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {sideItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[#252320] font-medium text-[#faf9f5]"
                    : "text-[#a09d96] hover:bg-[#1f1e1b] hover:text-[#faf9f5]"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-[#cc785c]" : ""}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 px-3 pb-5 border-t border-[#252320] pt-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#a09d96] hover:bg-[#1f1e1b] hover:text-[#faf9f5]"
          >
            <Globe className="w-4 h-4" /> View site
          </Link>
          <button
            onClick={() => logout(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#a09d96] hover:bg-[#1f1e1b] hover:text-[#faf9f5] text-left w-full"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-28 md:pb-0">
        {children}
      </main>

      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-[76px] px-2 pb-[max(env(safe-area-inset-bottom),0px)] md:hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[#faf9f5]/95 shadow-[0_-14px_34px_rgba(24,23,21,0.08)] backdrop-blur-xl dark:bg-slate-950/92"
            style={navCradleMask}
            aria-hidden="true"
          />
          <svg
            className="pointer-events-none absolute inset-x-0 top-0 h-11 w-full text-[#e6dfd8] dark:text-slate-700/80"
            viewBox="0 0 390 44"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 0H155A40 40 0 0 0 235 0H390"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <Link
            href="/new"
            aria-label="Add Reservation"
            className={`absolute left-1/2 top-0 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_18px_36px_rgba(204,120,92,0.38)] transition-all ${
              isActive("/new")
                ? "bg-[#b86148] text-white ring-4 ring-[#cc785c]/20"
                : "bg-[#cc785c] text-white hover:bg-[#bd6c51]"
            }`}
          >
            <Plus className="h-7 w-7" aria-hidden="true" />
          </Link>

          <div className="relative z-10 grid h-full grid-cols-[1fr_1fr_72px_1fr_1fr] items-end gap-1">
            {navItems.map(({ to, label, icon: Icon }, index) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  style={{ gridColumn: index < 2 ? index + 1 : index + 2 }}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-colors ${
                    active
                      ? "bg-[#cc785c]/12 text-[#cc785c] dark:bg-[#cc785c]/18 dark:text-[#f0a48a]"
                      : "text-[#8e8b82] hover:bg-[#efe9de] hover:text-[#141413] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="More navigation"
                style={{ gridColumn: 5 }}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-colors ${
                  moreActive || drawerOpen
                    ? "bg-[#cc785c]/12 text-[#cc785c] dark:bg-[#cc785c]/18 dark:text-[#f0a48a]"
                    : "text-[#8e8b82] hover:bg-[#efe9de] hover:text-[#141413] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
                <span>More</span>
              </button>
            </Dialog.Trigger>
          </div>
        </nav>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:hidden" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-[80] rounded-t-[28px] border border-white/[0.12] bg-[#181715]/96 px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-[#faf9f5] shadow-[0_-24px_80px_rgba(0,0,0,0.45)] outline-none backdrop-blur-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:hidden">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" aria-hidden="true" />

            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold">More tools</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-slate-300">
                  Staff workspace modules and settings.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close more navigation"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-slate-200 transition-colors hover:bg-white/[0.14] focus:outline-none focus:ring-2 focus:ring-[#cc785c]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {drawerItems.map(({ to, label, description, icon: Icon, disabled }) => {
                const active = !disabled && isActive(to);
                const className = `flex min-h-[84px] items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  active
                    ? "border-[#cc785c]/45 bg-[#cc785c]/18 text-white"
                    : disabled
                      ? "border-white/[0.08] bg-white/[0.03] text-slate-500"
                      : "border-white/10 bg-white/[0.06] text-slate-100 hover:border-[#cc785c]/35 hover:bg-white/[0.1]"
                }`;

                const content = (
                  <>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[#cc785c] text-white" : "bg-white/10 text-[#f0a48a]"}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">{description}</span>
                    </span>
                  </>
                );

                if (disabled) {
                  return (
                    <button key={label} type="button" disabled className={className} aria-label={`${label} coming soon`}>
                      {content}
                    </button>
                  );
                }

                return (
                  <Dialog.Close asChild key={to}>
                    <Link href={to} className={className} aria-label={label} aria-current={active ? "page" : undefined}>
                      {content}
                    </Link>
                  </Dialog.Close>
                );
              })}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
