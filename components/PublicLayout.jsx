"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Info, BookOpen, Ticket } from "lucide-react";
import GuestChatWidget from "@/components/chat/GuestChatWidget";

const mobileNav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/ritz-info", label: "Room Info", icon: Info },
  { to: "/gallery", label: "Gallery", icon: Camera },
  { to: "/faq", label: "FAQ", icon: BookOpen },
  { to: "/#find", label: "Ticket", icon: Ticket, isAnchor: true },
];

export default function PublicLayout({ children }) {
  const pathname = usePathname();
  const showGuestChat = pathname !== "/ticket" && !pathname.startsWith("/ticket/");

  const isActive = (to, exact) => {
    if (exact) return pathname === to;
    return pathname === to;
  };

  return (
    <div className="min-h-screen">
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>

      {showGuestChat && <GuestChatWidget />}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#faf9f5] border-t border-[#e6dfd8] flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {mobileNav.map(({ to, label, icon: Icon, exact, isAnchor }) => {
          const active = isAnchor ? false : isActive(to, exact);
          if (isAnchor) {
            return (
              <a
                key={label}
                href={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium text-[#8e8b82] hover:text-[#141413] transition-colors"
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
                active ? "text-[#cc785c]" : "text-[#8e8b82] hover:text-[#141413]"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-[#cc785c]" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
