"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { fmtDate, fmtMoney } from "@/lib/calc";

export default function TicketPreview({ ticket, settings }) {
  const [copied, setCopied] = useState(false);
  const hasPrice = ticket.rateOffered !== null && ticket.rateOffered !== undefined;

  const lines = [
    `Ticket ID: ${ticket.id}`,
    `Check-in:   ${fmtDate(ticket.checkIn)}`,
    `Check-out:  ${fmtDate(ticket.checkOut)}`,
    `Nights:     ${ticket.nights || 0}`,
    `Room:       ${ticket.roomType || "—"}`,
    `Retail Price: ${hasPrice ? fmtMoney(ticket.retailPrice) : "Pending — our team will confirm shortly"}`,
    `Discount:   ${hasPrice ? `${ticket.discountPct}% off` : "Pending"}`,
    `💰 YOUR PRICE: ${hasPrice ? fmtMoney(ticket.rateOffered) : "Pending"}`,
    `Cleaning Fee: ${fmtMoney(settings.cleaningFee)} (Paid directly to the Ritz).`,
  ];
  const text = lines.join("\n");

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-xl bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-sm font-medium">Guest Ticket</p>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 text-[13px] leading-6 whitespace-pre-wrap font-mono text-foreground/90">{text}</pre>
    </div>
  );
}
