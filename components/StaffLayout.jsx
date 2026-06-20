"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, Settings, Globe, LogOut, Users, CalendarDays, Code2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/new", label: "New", icon: Plus, highlight: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/api-dashboard", label: "API", icon: Code2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const sideItems = [
  { to: "/dashboard", label: "Reservations", icon: LayoutGrid },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/new", label: "New Reservation", icon: Plus },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/api-dashboard", label: "API Dashboard", icon: Code2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

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

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

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
          <p className="px-3 pt-2 text-[10px] text-[#a09d96]">Convex - shared reservation data</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#faf9f5] border-t border-[#e6dfd8] flex items-stretch">
        {navItems.map(({ to, label, icon: Icon, highlight }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              href={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-[#141413]" : "text-[#8e8b82]"
              }`}
            >
              {highlight ? (
                <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center transition-colors ${active ? "bg-[#cc785c]" : "bg-[#efe9de]"}`}>
                  <Icon className={`w-5 h-5 ${active ? "text-white" : "text-[#6c6a64]"}`} />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${active ? "text-[#cc785c]" : "text-[#8e8b82]"}`} />
              )}
              <span className={active && !highlight ? "text-[#141413]" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
