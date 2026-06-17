"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Info, MessageSquarePlus, Ticket } from "lucide-react";

const mobileNav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/ritz-info", label: "Room Info", icon: Info },
  { to: "/faq", label: "Guide & FAQ", icon: BookOpen },
  { to: "/#quote", label: "Quote", icon: MessageSquarePlus, isAnchor: true },
  { to: "/#find", label: "Ticket", icon: Ticket, isAnchor: true },
];

export default function PublicLayout({ children }) {
  const pathname = usePathname();

  const isActive = (to, exact) => {
    if (exact) return pathname === to;
    return pathname === to;
  };

  return (
    <div className="min-h-screen">
      <div className="pb-16 md:pb-0">
        {children}
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-stretch">
        {mobileNav.map(({ to, label, icon: Icon, exact, isAnchor }) => {
          const active = isAnchor ? false : isActive(to, exact);
          if (isAnchor) {
            return (
              <a
                key={label}
                href={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </a>
            );
          }
          return (
            <Link
              key={to}
              href={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
