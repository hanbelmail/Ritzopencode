"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function TicketTable({ tickets, selectedIds, onSelectedIdsChange }) {
  const router = useRouter();
  const [sort, setSort] = useState({ key: "createdAt", dir: -1 });
  const selectable = Array.isArray(selectedIds) && typeof onSelectedIdsChange === "function";

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

  const sortedIds = useMemo(() => sorted.map((ticket) => ticket.id), [sorted]);
  const selectedCount = selectable ? sortedIds.filter((id) => selectedIds.includes(id)).length : 0;
  const allSelected = selectable && sortedIds.length > 0 && selectedCount === sortedIds.length;
  const someSelected = selectable && selectedCount > 0 && selectedCount < sortedIds.length;

  const toggleAll = (checked) => {
    if (!selectable) return;
    onSelectedIdsChange((current) => {
      const otherIds = current.filter((id) => !sortedIds.includes(id));
      return checked ? [...otherIds, ...sortedIds] : otherIds;
    });
  };

  const toggleOne = (id, checked) => {
    if (!selectable) return;
    onSelectedIdsChange((current) => (checked ? [...new Set([...current, id])] : current.filter((selectedId) => selectedId !== id)));
  };

  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#efe9de] hover:bg-[#efe9de]">
            {selectable && (
              <TableHead className="w-12 text-[#6c6a64]">
                <Checkbox
                  aria-label="Select all reservations"
                  checked={allSelected || (someSelected && "indeterminate")}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  className="border-[#8e8b82] data-[state=checked]:border-[#cc785c] data-[state=checked]:bg-[#cc785c]"
                />
              </TableHead>
            )}
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
              {selectable && (
                <TableCell className="w-12" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    aria-label={`Select reservation ${t.id}`}
                    checked={selectedIds.includes(t.id)}
                    onCheckedChange={(checked) => toggleOne(t.id, checked === true)}
                    className="border-[#8e8b82] data-[state=checked]:border-[#cc785c] data-[state=checked]:bg-[#cc785c]"
                  />
                </TableCell>
              )}
              {columns.map((c) => (
                <TableCell key={c.key} className="whitespace-nowrap text-sm text-[#252523]">{c.render(t)}</TableCell>
              ))}
            </TableRow>
          ))}
          {sorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center text-[#6c6a64] py-8 text-sm">
                No reservations found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
