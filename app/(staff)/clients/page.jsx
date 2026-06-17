"use client";

import { useState, useMemo } from "react";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTickets } from "@/lib/store";
import { fmtDate, fmtMoney } from "@/lib/calc";

export default function Clients() {
  const [search, setSearch] = useState("");
  const tickets = useTickets();

  const clients = useMemo(() => {
    // Group tickets by primary guest name
    const map = {};
    tickets.forEach((t) => {
      const [primary] = (t.guests || []).filter(Boolean);
      if (!primary) return;
      if (!map[primary]) {
        map[primary] = { name: primary, email: t.email || "", phone: t.phone || "", reservations: 0, lastCheckIn: null, totalValue: 0 };
      }
      map[primary].reservations += 1;
      if (!map[primary].lastCheckIn || t.checkIn > map[primary].lastCheckIn) {
        map[primary].lastCheckIn = t.checkIn;
        // Keep email/phone from the most recent reservation
        if (t.email) map[primary].email = t.email;
        if (t.phone) map[primary].phone = t.phone;
      }
      map[primary].totalValue += t.rateOffered || 0;
    });
    return Object.values(map);
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.phone].some((v) => v.toLowerCase().includes(q))
    );
  }, [clients, search]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5 bg-[#f7f7f7] min-h-screen">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{clients.length} unique client{clients.length !== 1 ? "s" : ""} from your reservations.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="pl-9 bg-card" />
      </div>

      <div className="border rounded-xl bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/30">
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Client</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Phone</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Reservations</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Last Check-in</th>
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.name} className={`border-b last:border-0 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-secondary border flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                <td className="px-4 py-3">{c.reservations}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.lastCheckIn ? fmtDate(c.lastCheckIn) : "—"}</td>
                <td className="px-4 py-3 font-semibold">{fmtMoney(c.totalValue)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No clients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
