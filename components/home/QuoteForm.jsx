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

const MAX_PUBLIC_GUESTS = 4;

export default function QuoteForm() {
  const settings = useSettings() || DEFAULT_SETTINGS;
  const { createTicket } = useTicketActions();
  const [guests, setGuests] = useState([""]);
  const [form, setForm] = useState({
    checkIn: "", checkOut: "", email: "", phone: "", referredBy: "", roomType: "", notes: "",
  });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [guestError, setGuestError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const guestNames = guests.map((g) => g.trim()).filter(Boolean);

    if (guestNames.length > MAX_PUBLIC_GUESTS) {
      setGuestError(`Maximum ${MAX_PUBLIC_GUESTS} guests total, including children.`);
      return;
    }

    setGuestError("");
    const computed = computeTicket({ ...form, retailPrice: null, adjustment: 0 }, settings);
    const ticket = await createTicket({
      ...form,
      guests: guestNames,
      retailPrice: null,
      adjustment: 0,
      status: "QUOTE REQUESTED",
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
      <div className="rounded-[12px] bg-[#faf9f5] p-8 text-center text-[#141413] space-y-4">
        <CheckCircle2 className="w-10 h-10 text-[#5db872] mx-auto" />
        <div>
          <h3 className="font-medium text-lg">Quote request received</h3>
          <p className="text-sm text-[#6c6a64] mt-1">
            Our team will review your dates and add your price shortly. Save your Ticket ID to check back:
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <code className="text-xs bg-[#efe9de] px-3 py-2 rounded-[8px] font-mono">{created.id}</code>
          <Button
            variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full border-[#e6dfd8] bg-[#faf9f5] shadow-none hover:bg-[#efe9de]"
            onClick={async () => {
              await navigator.clipboard.writeText(created.id);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#5db872]" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <Button asChild className="h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]">
          <Link href={`/ticket/${created.id}`}>View my ticket</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[12px] bg-[#faf9f5] p-6 text-[#141413] md:p-8 space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#252523]">Guest names</Label>
        <GuestNamesInput guests={guests} onChange={setGuests} maxGuests={MAX_PUBLIC_GUESTS} />
        <p className="text-xs leading-relaxed text-red-600">Provide the full names of every guest. Maximum {MAX_PUBLIC_GUESTS} guests total, including children.</p>
        {guestError && <p className="text-xs font-medium text-red-600">{guestError}</p>}
      </div>
      <ReservationDatePicker
        checkIn={form.checkIn}
        checkOut={form.checkOut}
        onCheckInChange={(v) => set("checkIn", v)}
        onCheckOutChange={(v) => set("checkOut", v)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#252523]">Email</Label>
          <Input className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus-visible:ring-[#cc785c]" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#252523]">Phone</Label>
          <Input className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus-visible:ring-[#cc785c]" type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#252523]">Referred by <span className="text-[#6c6a64] font-normal">(optional)</span></Label>
          <Input className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus-visible:ring-[#cc785c]" value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#252523]">Room name</Label>
          <Select value={form.roomType} onValueChange={(v) => set("roomType", v)} required>
            <SelectTrigger className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus:ring-[#cc785c]"><SelectValue placeholder="Select room type" /></SelectTrigger>
            <SelectContent>
              {(settings.roomTypes || []).filter((r) => !r.hidden).map((r) => (
                <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#252523]">Notes / special requests</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="h-20 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus-visible:ring-[#cc785c]" />
      </div>
      <Button type="submit" className="h-10 w-full rounded-[8px] bg-[#cc785c] text-sm font-medium text-white shadow-none hover:bg-[#a9583e]">Request my quote</Button>
    </form>
  );
}
