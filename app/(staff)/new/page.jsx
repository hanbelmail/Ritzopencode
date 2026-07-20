"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import GuestNamesInput from "@/components/forms/GuestNamesInput";
import ReservationDatePicker from "@/components/forms/ReservationDatePicker";
import { DEFAULT_SETTINGS, useSettings, useTicket, useTicketActions, STATUSES } from "@/lib/store";
import { computeTicket, fmtMoney } from "@/lib/calc";
import { isE164Phone, normalizePhone } from "@/lib/phone";
import { getPriceSentNotificationFeedback, notifyPriceSent } from "@/lib/price-sent-email";
import { notifyPaymentSubmitted } from "@/lib/payment-submitted-alert";
import { notifyBookingRequestHotel } from "@/lib/booking-request-hotel-alert";
import { notifyBookingConfirmedHotel } from "@/lib/booking-confirmed-hotel-alert";
import { getLifecycleNotificationFeedback } from "@/lib/lifecycle-notification-feedback";
import { useToast } from "@/components/ui/use-toast";
import { Upload, X } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uniqueNames(names) {
  return Array.from(new Set(names.map((name) => String(name || "").trim()).filter(Boolean)));
}

function getVisibleRoomNames(settings) {
  return uniqueNames((settings.roomTypes || []).filter((room) => !room.hidden).map((room) => room.name));
}

function includeCurrentOption(options, current) {
  const value = String(current || "").trim();
  return value && !options.includes(value) ? [value, ...options] : options;
}

export default function NewReservation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const settings = useSettings() || DEFAULT_SETTINGS;
  const existing = useTicket(editId);
  const { createTicket, updateTicket } = useTicketActions();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retailScreenshotFile, setRetailScreenshotFile] = useState(null);
  const [retailScreenshotPreview, setRetailScreenshotPreview] = useState(null);
  const [retailScreenshotUrl, setRetailScreenshotUrl] = useState(null);
  const [retailScreenshotError, setRetailScreenshotError] = useState("");
  const [errors, setErrors] = useState({});

  const [guests, setGuests] = useState([""]);
  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    email: "",
    phone: "",
    referredBy: "",
    roomType: "",
    reservationConfirmationNumber: "",
    retailPrice: settings.defaultRetailPrice,
    adjustment: "",
    notes: "",
    status: "PRICE SENT",
  });
  const visibleRoomOptions = getVisibleRoomNames(settings);
  const singleVisibleRoom = visibleRoomOptions.length === 1 ? visibleRoomOptions[0] : "";
  const roomOptions = includeCurrentOption(visibleRoomOptions, form.roomType);
  const statusOptions = includeCurrentOption(STATUSES, form.status);

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
      roomType: existing?.roomType?.trim() || "",
      reservationConfirmationNumber: existing?.reservationConfirmationNumber || "",
      retailPrice: existing ? (existing.retailPrice ?? "") : settings.defaultRetailPrice,
      adjustment: existing?.adjustment ?? "",
      notes: existing?.notes || "",
      status: existing?.status?.trim() || (existing ? "QUOTE REQUESTED" : "PRICE SENT"),
    });
    setInitialized(true);
  }, [editId, existing, initialized, settings.defaultRetailPrice]);

  useEffect(() => {
    if (!initialized || form.roomType || !singleVisibleRoom) return;
    setForm((current) => current.roomType ? current : { ...current, roomType: singleVisibleRoom });
  }, [form.roomType, initialized, singleVisibleRoom]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const computed = computeTicket(form, settings);

  useEffect(() => {
    return () => {
      if (retailScreenshotPreview) URL.revokeObjectURL(retailScreenshotPreview);
    };
  }, [retailScreenshotPreview]);

  useEffect(() => {
    let cancelled = false;

    async function loadRetailScreenshotUrl() {
      if (!existing?.retailPriceScreenshotKey || retailScreenshotFile) {
        setRetailScreenshotUrl(null);
        return;
      }

      const response = await fetch("/api/retail-price-screenshot/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: existing.id, key: existing.retailPriceScreenshotKey }),
      });

      if (!response.ok) {
        throw new Error("Failed to load retail price screenshot");
      }

      const data = await response.json();
      if (!cancelled) setRetailScreenshotUrl(data.viewUrl);
    }

    loadRetailScreenshotUrl().catch(() => {
      if (!cancelled) setRetailScreenshotUrl(null);
    });

    return () => {
      cancelled = true;
    };
  }, [existing?.id, existing?.retailPriceScreenshotKey, retailScreenshotFile]);

  const handleRetailScreenshot = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setRetailScreenshotError("Retail price screenshot must be an image.");
      return;
    }
    if (retailScreenshotPreview) URL.revokeObjectURL(retailScreenshotPreview);
    setRetailScreenshotError("");
    setRetailScreenshotFile(file);
    setRetailScreenshotPreview(URL.createObjectURL(file));
  };

  const clearRetailScreenshotSelection = () => {
    if (retailScreenshotPreview) URL.revokeObjectURL(retailScreenshotPreview);
    setRetailScreenshotFile(null);
    setRetailScreenshotPreview(null);
    setRetailScreenshotError("");
  };

  const uploadRetailScreenshot = async (ticketId, file) => {
    const uploadUrlResponse = await fetch("/api/retail-price-screenshot/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        fileName: file.name,
        contentType: file.type,
      }),
    });

    if (!uploadUrlResponse.ok) {
      throw new Error("Failed to prepare retail screenshot upload");
    }

    const { key, uploadUrl } = await uploadUrlResponse.json();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload retail screenshot");
    }

    return key;
  };

  const submit = async (e) => {
    e.preventDefault();
    const guestNames = guests.map((g) => g.trim()).filter(Boolean);
    const email = form.email.trim();
    const phone = normalizePhone(form.phone);
    const retailPrice = form.retailPrice === "" || form.retailPrice == null ? null : Number(form.retailPrice);
    const nextErrors = {};

    if (!guestNames.length) nextErrors.guests = "Add at least one guest name.";
    if (!form.checkIn) nextErrors.checkIn = "Select a check-in date.";
    if (!form.checkOut) nextErrors.checkOut = "Select a check-out date.";
    if (!form.roomType) nextErrors.roomType = "Select a room type.";
    if (!form.status || !STATUSES.includes(form.status)) nextErrors.status = "Select a valid status.";
    if (!email) {
      nextErrors.email = "Enter an email address.";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (form.status === "PRICE SENT" && (retailPrice === null || Number.isNaN(retailPrice) || retailPrice <= 0)) {
      nextErrors.retailPrice = "Enter a valid retail price before saving PRICE SENT.";
    }
    if (form.status === "PRICE SENT" && !phone) {
      nextErrors.phone = "Enter a guest phone number before saving PRICE SENT.";
    } else if (phone && !isE164Phone(phone)) {
      nextErrors.phone = "Enter a valid US or Canada phone number.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const hasRetailScreenshot = Boolean(retailScreenshotFile || existing?.retailPriceScreenshotKey);
    if (form.status === "PRICE SENT" && !hasRetailScreenshot) {
      const shouldContinue = window.confirm("No retail price screenshot is attached. Send the PRICE SENT guest notifications without the screenshot?");
      if (!shouldContinue) return;
    }

    setSaving(true);
    const data = {
      ...form,
      email,
      phone,
      guests: guestNames,
      reservationConfirmationNumber: form.reservationConfirmationNumber.trim(),
      retailPrice,
      adjustment: form.adjustment === "" ? 0 : Number(form.adjustment),
      ...computeTicket(form, settings),
      confirmationDate:
        form.status === "PAYMENT VERIFIED" && !existing?.confirmationDate
          ? new Date().toISOString().slice(0, 10)
          : existing?.confirmationDate || null,
    };
    try {
      let ticket = existing ? await updateTicket(existing.id, data) : await createTicket(data);

      if (retailScreenshotFile) {
        const retailPriceScreenshotKey = await uploadRetailScreenshot(ticket.id, retailScreenshotFile);
        ticket = await updateTicket(ticket.id, {
          retailPriceScreenshot: null,
          retailPriceScreenshotKey,
        });
      }

      if (ticket.status === "PRICE SENT") {
        try {
          const result = await notifyPriceSent(ticket.id);
          toast(getPriceSentNotificationFeedback(result));
        } catch (error) {
          toast({
            title: "Price notifications failed",
            description: error.message || "The reservation was saved, but price notifications were not sent.",
            variant: "destructive",
          });
        }
      }
      if (ticket.status === "PAYMENT SUBMITTED") {
        try {
          const result = await notifyPaymentSubmitted(ticket.id);
          toast(getLifecycleNotificationFeedback(result, "Payment submitted", "Active staff recipients received the payment proof alert."));
        } catch (error) {
          toast({
            title: "Payment alert failed",
            description: error.message || "The reservation was saved, but the staff alert was not sent.",
            variant: "destructive",
          });
        }
      }
      if (ticket.status === "PAYMENT VERIFIED") {
        try {
          const result = await notifyBookingRequestHotel(ticket.id);
          toast(getLifecycleNotificationFeedback(result, "Payment verified", "Active hotel inboxes received the booking request."));
        } catch (error) {
          toast({
            title: "Booking request failed",
            description: error.message || "The reservation was saved, but the hotel alert was not sent.",
            variant: "destructive",
          });
        }
      }
      if (ticket.status === "BOOKING CONFIRMED") {
        try {
          const result = await notifyBookingConfirmedHotel(ticket.id);
          toast(getLifecycleNotificationFeedback(result, "Booking confirmed", "Active hotel inboxes received the booking confirmation."));
        } catch (error) {
          toast({
            title: "Booking confirmation failed",
            description: error.message || "The reservation was saved, but the hotel alert was not sent.",
            variant: "destructive",
          });
        }
      }
      router.push(`/ticket/${ticket.id}`);
    } catch (error) {
      toast({
        title: "Reservation save failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (editId && existing === undefined) {
    return <div className="p-8 text-sm text-muted-foreground">Loading reservation...</div>;
  }

  if (editId && existing === null) {
    return <div className="p-8 text-sm text-muted-foreground">Reservation not found.</div>;
  }

  const retailScreenshotDisplayUrl = retailScreenshotPreview || retailScreenshotUrl;

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
            {errors.guests && <p className="text-xs font-medium text-red-600">{errors.guests}</p>}
          </div>
          <ReservationDatePicker
            checkIn={form.checkIn}
            checkOut={form.checkOut}
            onCheckInChange={(v) => set("checkIn", v)}
            onCheckOutChange={(v) => set("checkOut", v)}
            excludeId={editId}
          />
          {(errors.checkIn || errors.checkOut) && (
            <div className="grid grid-cols-1 gap-1 text-xs font-medium text-red-600 md:grid-cols-2">
              <p>{errors.checkIn}</p>
              <p>{errors.checkOut}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" aria-invalid={Boolean(errors.email)} value={form.email} onChange={(e) => set("email", e.target.value)} />
              {errors.email && <p className="text-xs font-medium text-red-600">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" aria-invalid={Boolean(errors.phone)} value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => set("phone", normalizePhone(form.phone))} placeholder="(786) 749-0725" />
              {errors.phone && <p className="text-xs font-medium text-red-600">{errors.phone}</p>}
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
                <SelectTrigger>
                  <span className={form.roomType ? "" : "text-muted-foreground"}>{form.roomType || "Select room type"}</span>
                </SelectTrigger>
                <SelectContent>
                  {roomOptions.map((room) => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               {errors.roomType && <p className="text-xs font-medium text-red-600">{errors.roomType}</p>}
             </div>
           </div>
           <div className="space-y-2">
             <Label>Reservation confirmation number <span className="text-muted-foreground font-normal">(optional, added by staff)</span></Label>
             <Input value={form.reservationConfirmationNumber} onChange={(e) => set("reservationConfirmationNumber", e.target.value)} placeholder="Enter hotel confirmation number" />
           </div>
           <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retail price (total)</Label>
              <Input type="number" step="0.01" aria-invalid={Boolean(errors.retailPrice)} value={form.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} />
              {errors.retailPrice && <p className="text-xs font-medium text-red-600">{errors.retailPrice}</p>}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <span className={form.status ? "" : "text-muted-foreground"}>{form.status || "Select status"}</span>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.status && <p className="text-xs font-medium text-red-600">{errors.status}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Retail price screenshot <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {existing?.retailPriceScreenshotKey && !retailScreenshotFile && (
                <span className="text-[11px] font-medium text-emerald-700">Saved</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Attach the Ritz website retail price screenshot. It will be shown on the guest ticket and attached to the PRICE SENT email.</p>
            {retailScreenshotError && <p className="text-xs text-red-600">{retailScreenshotError}</p>}
            {retailScreenshotDisplayUrl ? (
              <div className="relative overflow-hidden rounded-lg border bg-secondary/20">
                <img src={retailScreenshotDisplayUrl} alt="Retail price screenshot preview" className="max-h-64 w-full object-contain" />
                {retailScreenshotFile && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={clearRetailScreenshotSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-6 transition-colors hover:bg-secondary/30">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to attach screenshot</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleRetailScreenshot} />
              </label>
            )}
            {retailScreenshotDisplayUrl && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#8a5c2e] hover:underline">
                Replace screenshot
                <input type="file" accept="image/*" className="hidden" onChange={handleRetailScreenshot} />
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label>Adjustment <span className="text-muted-foreground font-normal">(optional $)</span></Label>
            <Input type="number" step="0.01" value={form.adjustment} onChange={(e) => set("adjustment", e.target.value)} placeholder="0" />
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
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : existing ? "Save changes" : "Create reservation"}</Button>
        </div>
      </form>
    </div>
  );
}
