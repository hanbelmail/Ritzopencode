"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GuestNamesInput from "@/components/forms/GuestNamesInput";
import ReservationDatePicker from "@/components/forms/ReservationDatePicker";
import { DEFAULT_SETTINGS, useSettings, useTicket, useTicketActions, STATUSES } from "@/lib/store";
import { computeTicket, fmtMoney } from "@/lib/calc";
import { notifyPriceSent } from "@/lib/price-sent-email";
import { useToast } from "@/components/ui/use-toast";

export default function NewReservation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const settings = useSettings() || DEFAULT_SETTINGS;
  const existing = useTicket(editId);
  const { createTicket, updateTicket } = useTicketActions();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  const [guests, setGuests] = useState([""]);
  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    email: "",
    phone: "",
    referredBy: "",
    roomType: "",
    retailPrice: settings.defaultRetailPrice,
    adjustment: "",
    notes: "",
    status: "PRICE SENT",
    informedHotel: false,
  });

  useEffect(() => {
    if (initialized) return;
    if (editId && existing === undefined) return;

    setGuests(existing?.guests?.length ? existing.guests : [""]);
    setForm({
      checkIn: existing?.checkIn || "",
      checkOut: existing?.checkOut || "",
      email: existing?.email || "",
      phone: existing?.phone || "",
      referredBy: existing?.referredBy || "",
      roomType: existing?.roomType || "",
      retailPrice: existing ? (existing.retailPrice ?? "") : settings.defaultRetailPrice,
      adjustment: existing?.adjustment ?? "",
      notes: existing?.notes || "",
      status: existing?.status || "PRICE SENT",
      informedHotel: existing?.informedHotel || false,
    });
    setInitialized(true);
  }, [editId, existing, initialized, settings.defaultRetailPrice]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const computed = computeTicket(form, settings);

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      guests: guests.filter((g) => g.trim()),
      retailPrice: form.retailPrice === "" ? null : Number(form.retailPrice),
      adjustment: form.adjustment === "" ? 0 : Number(form.adjustment),
      ...computeTicket(form, settings),
      confirmationDate:
        form.status === "PAYMENT VERIFIED" && !existing?.confirmationDate
          ? new Date().toISOString().slice(0, 10)
          : existing?.confirmationDate || null,
    };
    const ticket = existing ? await updateTicket(existing.id, data) : await createTicket(data);
    if (ticket.status === "PRICE SENT") {
      try {
        const result = await notifyPriceSent(ticket.id);
        toast({
          title: result.sent ? "Price email sent" : "Price email skipped",
          description: result.sent ? "The guest received the ticket link and quote details." : result.reason,
        });
      } catch (error) {
        toast({
          title: "Price email failed",
          description: error.message || "The reservation was saved, but the email was not sent.",
          variant: "destructive",
        });
      }
    }
    router.push(`/ticket/${ticket.id}`);
  };

  if (editId && existing === undefined) {
    return <div className="p-8 text-sm text-muted-foreground">Loading reservation...</div>;
  }

  if (editId && existing === null) {
    return <div className="p-8 text-sm text-muted-foreground">Reservation not found.</div>;
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">{existing ? "Edit Reservation" : "New Reservation"}</h1>
      <p className="text-sm text-muted-foreground mt-0.5 mb-6">
        {existing ? `Ticket ${existing.id.slice(0, 8).toUpperCase()}` : "Staff form — pricing is auto-calculated from settings."}
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div className="border rounded-xl bg-card p-5 md:p-6 space-y-5">
          <div className="space-y-2">
            <Label>Guest names</Label>
            <GuestNamesInput guests={guests} onChange={setGuests} />
          </div>
          <ReservationDatePicker
            checkIn={form.checkIn}
            checkOut={form.checkOut}
            onCheckInChange={(v) => set("checkIn", v)}
            onCheckOutChange={(v) => set("checkOut", v)}
            excludeId={editId}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Referred by <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Room type</Label>
              <Select value={form.roomType} onValueChange={(v) => set("roomType", v)}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>
                  {(settings.roomTypes || []).filter((r) => !r.hidden).map((r) => (
                    <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retail price (total)</Label>
              <Input type="number" step="0.01" value={form.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adjustment <span className="text-muted-foreground font-normal">(optional $)</span></Label>
              <Input type="number" step="0.01" value={form.adjustment} onChange={(e) => set("adjustment", e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2.5">
              <Label className="font-normal">Informed hotel</Label>
              <Switch checked={form.informedHotel} onCheckedChange={(v) => set("informedHotel", v)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes / special requests</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="h-20" />
          </div>
        </div>

        {/* Auto-computed summary */}
        <div className="border rounded-xl bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Auto-calculated</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-muted-foreground text-xs">Nights</p><p className="font-semibold mt-0.5">{computed.nights}</p></div>
            <div><p className="text-muted-foreground text-xs">Discount</p><p className="font-semibold mt-0.5">{computed.discountPct}%</p></div>
            <div><p className="text-muted-foreground text-xs">Rate offered</p><p className="font-semibold mt-0.5">{fmtMoney(computed.rateOffered)}</p></div>
            <div><p className="text-muted-foreground text-xs">Cost / night</p><p className="font-semibold mt-0.5">{fmtMoney(computed.costPerNight)}</p></div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Cleaning fee {fmtMoney(settings.cleaningFee)} is paid by the guest directly to the Ritz — never added to the total.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>Cancel</Button>
          <Button type="submit">{existing ? "Save changes" : "Create reservation"}</Button>
        </div>
      </form>
    </div>
  );
}
