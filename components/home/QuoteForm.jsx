"use client";

import { useEffect, useState } from "react";
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getVisibleRoomNames(settings) {
  return Array.from(
    new Set((settings.roomTypes || [])
      .filter((room) => !room.hidden)
      .map((room) => String(room.name || "").trim())
      .filter(Boolean))
  );
}

export default function QuoteForm() {
  const settings = useSettings() || DEFAULT_SETTINGS;
  const { createTicket } = useTicketActions();
  const [guests, setGuests] = useState([""]);
  const [form, setForm] = useState({
    checkIn: "", checkOut: "", email: "", phone: "", referredBy: "", roomType: "", notes: "",
  });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});
  const visibleRoomOptions = getVisibleRoomNames(settings);
  const singleVisibleRoom = visibleRoomOptions.length === 1 ? visibleRoomOptions[0] : "";

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.roomType || !singleVisibleRoom) return;
    setForm((current) => current.roomType ? current : { ...current, roomType: singleVisibleRoom });
  }, [form.roomType, singleVisibleRoom]);

  const submit = async (e) => {
    e.preventDefault();
    const guestNames = guests.map((g) => g.trim()).filter(Boolean);
    const email = form.email.trim();
    const nextErrors = {};

    if (!guestNames.length) nextErrors.guests = "Add at least one guest name.";
    if (!form.checkIn) nextErrors.checkIn = "Select a check-in date.";
    if (!form.checkOut) nextErrors.checkOut = "Select a check-out date.";
    if (!form.roomType) nextErrors.roomType = "Select a room name.";
    if (!email) {
      nextErrors.email = "Enter an email address.";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (guestNames.length > MAX_PUBLIC_GUESTS) {
      nextErrors.guests = `Maximum ${MAX_PUBLIC_GUESTS} guests total, including children.`;
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const sanitizedForm = { ...form, email };
    const computed = computeTicket({ ...sanitizedForm, retailPrice: null, adjustment: 0 }, settings);
    const ticket = await createTicket({
      ...sanitizedForm,
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
    fetch("/api/quote-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id }),
    }).catch((error) => {
      console.error("Failed to send quote alert", error);
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
        {errors.guests && <p className="text-xs font-medium text-red-600">{errors.guests}</p>}
      </div>
      <ReservationDatePicker
        checkIn={form.checkIn}
        checkOut={form.checkOut}
        onCheckInChange={(v) => set("checkIn", v)}
        onCheckOutChange={(v) => set("checkOut", v)}
      />
      {(errors.checkIn || errors.checkOut) && (
        <div className="grid grid-cols-1 gap-1 text-xs font-medium text-red-600 md:grid-cols-2">
          <p>{errors.checkIn}</p>
          <p>{errors.checkOut}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#252523]">Email</Label>
          <Input className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus-visible:ring-[#cc785c]" type="email" required aria-invalid={Boolean(errors.email)} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
          {errors.email && <p className="text-xs font-medium text-red-600">{errors.email}</p>}
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
              {visibleRoomOptions.map((room) => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.roomType && <p className="text-xs font-medium text-red-600">{errors.roomType}</p>}
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
