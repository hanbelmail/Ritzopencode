"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, Settings, Globe, LogOut, Building2, Users, CalendarDays, Code2 } from "lucide-react";
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

export default function StaffLayout({ children }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-56 md:min-h-screen border-r bg-white flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Ritz Reservations</p>
            <p className="text-[10px] text-gray-400">Management System</p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 py-3 flex-1">
          {sideItems.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-blue-600" : ""}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-0.5 px-3 pb-5 border-t pt-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
          >
            <Globe className="w-4 h-4" /> View site
          </Link>
          <button
            onClick={() => logout(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 text-left w-full"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
          <p className="px-3 pt-2 text-[10px] text-gray-400">● Convex — shared reservation data</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-stretch">
        {navItems.map(({ to, label, icon: Icon, highlight }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              href={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-black" : "text-gray-400"
              }`}
            >
              {highlight ? (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-black" : "bg-gray-100"}`}>
                  <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-500"}`} />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${active ? "text-black" : "text-gray-400"}`} />
              )}
              <span className={active && !highlight ? "text-black" : ""}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
