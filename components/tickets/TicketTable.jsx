"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "./StatusBadge";
import { fmtDate, fmtMoney, shortId } from "@/lib/calc";

const columns = [
  { key: "id", label: "Ticket", render: (t) => <span className="font-mono text-xs">{shortId(t.id)}</span> },
  { key: "createdAt", label: "Quote date", render: (t) => (t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US") : "—") },
  { key: "guests", label: "Guests", sortVal: (t) => (t.guests?.[0] || ""), render: (t) => <span className="font-medium">{(t.guests || []).filter(Boolean).join(", ")}</span> },
  { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
  { key: "checkIn", label: "Check-in", render: (t) => fmtDate(t.checkIn) },
  { key: "checkOut", label: "Check-out", render: (t) => fmtDate(t.checkOut) },
  { key: "nights", label: "Nights", render: (t) => t.nights || 0 },
  { key: "retailPrice", label: "Retail", render: (t) => fmtMoney(t.retailPrice) },
  { key: "discountPct", label: "Disc %", render: (t) => (t.discountPct ? `${t.discountPct}%` : "—") },
  { key: "rateOffered", label: "Rate Offered", render: (t) => <span className="font-medium">{fmtMoney(t.rateOffered)}</span> },
  { key: "costPerNight", label: "Per Night", render: (t) => fmtMoney(t.costPerNight) },
  { key: "paymentMethod", label: "Method", render: (t) => t.paymentMethod || "—" },
  { key: "informedHotel", label: "Informed", render: (t) => (t.informedHotel ? "Yes" : "No") },
  { key: "notes", label: "Notes/special request", render: (t) => <span className="block max-w-64 truncate" title={t.notes || ""}>{t.notes || "—"}</span> },
  { key: "referredBy", label: "Referred By", render: (t) => t.referredBy || "—" },
];

export default function TicketTable({ tickets }) {
  const router = useRouter();
  const [sort, setSort] = useState({ key: "createdAt", dir: -1 });

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    const val = (t) => (col?.sortVal ? col.sortVal(t) : t[sort.key] ?? "");
    return [...tickets].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * sort.dir;
    });
  }, [tickets, sort]);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));

  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#efe9de] hover:bg-[#efe9de]">
            {columns.map((c) => (
              <TableHead key={c.key} className="whitespace-nowrap text-[#6c6a64]">
                <button className="flex items-center gap-1 text-xs font-medium" onClick={() => toggleSort(c.key)}>
                  {c.label}
                  <ArrowUpDown className="w-3 h-3 text-[#8e8b82]" />
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((t) => (
            <TableRow key={t.id} className="cursor-pointer border-[#e6dfd8] hover:bg-[#f5f0e8]" onClick={() => router.push(`/ticket/${t.id}`)}>
              {columns.map((c) => (
                <TableCell key={c.key} className="whitespace-nowrap text-sm text-[#252523]">{c.render(t)}</TableCell>
              ))}
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-[#6c6a64] py-8 text-sm">
                No reservations found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
