"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Copy, Check } from "lucide-react";
import GuestNamesInput from "@/components/forms/GuestNamesInput";
import ReservationDatePicker from "@/components/forms/ReservationDatePicker";
import { DEFAULT_SETTINGS, useSettings, useTicketActions } from "@/lib/store";
import { computeTicket } from "@/lib/calc";

export default function QuoteForm() {
  const settings = useSettings() || DEFAULT_SETTINGS;
  const { createTicket } = useTicketActions();
  const [guests, setGuests] = useState([""]);
  const [form, setForm] = useState({
    checkIn: "", checkOut: "", email: "", phone: "", referredBy: "", roomType: "", notes: "",
  });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const computed = computeTicket({ ...form, retailPrice: null, adjustment: 0 }, settings);
    const ticket = await createTicket({
      ...form,
      guests: guests.filter((g) => g.trim()),
      retailPrice: null,
      adjustment: 0,
      status: "QUOTE",
      informedHotel: false,
      ...computed,
      rateOffered: null,
      costPerNight: null,
    });
    fetch("/api/quote-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
    }).catch((error) => {
      console.error("Failed to send quote webhook", error);
    });
    setCreated(ticket);
  };

  if (created) {
    return (
      <div className="border rounded-xl bg-card p-8 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <div>
          <h3 className="font-semibold text-lg">Quote request received</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Our team will review your dates and add your price shortly. Save your Ticket ID to check back:
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <code className="text-xs bg-secondary px-3 py-2 rounded-lg font-mono">{created.id}</code>
          <Button
            variant="outline" size="icon" className="h-9 w-9 shrink-0"
            onClick={async () => {
              await navigator.clipboard.writeText(created.id);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Button asChild>
          <Link href={`/ticket/${created.id}`}>View my ticket</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border rounded-xl bg-card p-6 md:p-8 space-y-5">
      <div className="space-y-2">
        <Label>Guest names</Label>
        <GuestNamesInput guests={guests} onChange={setGuests} />
      </div>
      <ReservationDatePicker
        checkIn={form.checkIn}
        checkOut={form.checkOut}
        onCheckInChange={(v) => set("checkIn", v)}
        onCheckOutChange={(v) => set("checkOut", v)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Referred by <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Room name</Label>
          <Select value={form.roomType} onValueChange={(v) => set("roomType", v)} required>
            <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
            <SelectContent>
              {(settings.roomTypes || []).filter((r) => !r.hidden).map((r) => (
                <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes / special requests</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="h-20" />
      </div>
      <Button type="submit" className="w-full">Request my quote</Button>
    </form>
  );
}
