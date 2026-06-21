"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, CreditCard, CheckCircle2 } from "lucide-react";
import StatusBadge from "@/components/tickets/StatusBadge";
import TicketPreview from "@/components/ticket/TicketPreview";
import PayDialog from "@/components/ticket/PayDialog";
import { DEFAULT_SETTINGS, useSettings, useTicket, useTicketActions } from "@/lib/store";
import { fmtDate, fmtMoney } from "@/lib/calc";

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm mt-0.5">{value || "—"}</p>
    </div>
  );
}

export default function TicketPage() {
  const { id } = useParams();
  const ticket = useTicket(id);
  const settings = useSettings() || DEFAULT_SETTINGS;
  const { updateTicket } = useTicketActions();
  const [payOpen, setPayOpen] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPaymentProofUrl() {
      if (!ticket?.paymentScreenshotKey) {
        setPaymentProofUrl(null);
        return;
      }

      const response = await fetch("/api/payment-proof/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, key: ticket.paymentScreenshotKey }),
      });

      if (!response.ok) {
        throw new Error("Failed to load payment proof");
      }

      const data = await response.json();
      if (!cancelled) setPaymentProofUrl(data.viewUrl);
    }

    loadPaymentProofUrl().catch(() => {
      if (!cancelled) setPaymentProofUrl(null);
    });

    return () => {
      cancelled = true;
    };
  }, [ticket?.id, ticket?.paymentScreenshotKey]);

  if (ticket === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">Ticket not found</h1>
          <p className="text-sm text-muted-foreground">Check your Ticket ID and try again.</p>
          <Button asChild variant="outline"><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    );
  }

  const hasPrice = ticket.rateOffered !== null && ticket.rateOffered !== undefined;
  const isConfirmed = ticket.status === "PAYMENT VERIFIED";
  const canPay = hasPrice && !["PAYMENT VERIFIED", "PAYMENT SUBMITTED", "BOOKING CONFIRMED", "CANCELLED"].includes(ticket.status);
  const isPaid = ["PAYMENT SUBMITTED", "BOOKING CONFIRMED"].includes(ticket.status);

  const uploadPaymentProof = async (file) => {
    const uploadUrlResponse = await fetch("/api/payment-proof/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: ticket.id,
        fileName: file.name,
        contentType: file.type,
      }),
    });

    if (!uploadUrlResponse.ok) {
      throw new Error("Failed to prepare payment proof upload");
    }

    const { key, uploadUrl } = await uploadUrlResponse.json();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload payment proof");
    }

    return key;
  };

  const handlePayment = async (method, screenshotFile) => {
    const paymentScreenshotKey = await uploadPaymentProof(screenshotFile);

    await updateTicket(ticket.id, {
      status: "PAYMENT SUBMITTED",
      paymentMethod: method,
      paymentScreenshot: null,
      paymentScreenshotKey,
      paymentDate: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="w-4 h-4" /> {settings.hotelName}
          </div>
        </div>
      </header>

      {canPay && (
        <div className="sticky top-0 z-40 border-b bg-background/95 p-3 shadow-md backdrop-blur md:hidden">
          <Button size="lg" className="w-full" onClick={() => setPayOpen(true)}>
            <CreditCard className="w-4 h-4 mr-2" /> Pay {fmtMoney(ticket.rateOffered)}
          </Button>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reservation Ticket</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{ticket.id}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {ticket.status === "QUOTE REQUESTED" && (
          <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
            Your quote is being reviewed — our team will add your price shortly. Check back soon.
          </div>
        )}

        {isConfirmed && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold">Booking Confirmed — Payment Successfully Received</p>
              <p className="mt-0.5 text-emerald-700">Your booking is finalized. We look forward to welcoming you at {settings.hotelName}!</p>
            </div>
          </div>
        )}

        {isPaid && (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Payment received via {ticket.paymentMethod}{ticket.paymentDate ? ` on ${fmtDate(ticket.paymentDate)}` : ""}. Thank you!
          </div>
        )}

        <div className="border rounded-xl bg-card p-5 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5">
            <Field label="Guests" value={(ticket.guests || []).filter(Boolean).join(", ")} />
            <Field label="Email" value={ticket.email} />
            <Field label="Phone" value={ticket.phone} />
            <Field label="Check-in" value={fmtDate(ticket.checkIn)} />
            <Field label="Check-out" value={fmtDate(ticket.checkOut)} />
            <Field label="Nights" value={ticket.nights} />
            <Field label="Room" value={ticket.roomType} />
            <Field label="Referred by" value={ticket.referredBy} />
            <Field label="Quote date" value={ticket.createdAt ? fmtDate(ticket.createdAt) : null} />
            <Field label="Retail rate" value={hasPrice ? fmtMoney(ticket.retailPrice) : "Pending"} />
            <Field label="Discount" value={hasPrice ? `${ticket.discountPct}% off` : "Pending"} />
            <Field label="Your price" value={hasPrice ? fmtMoney(ticket.rateOffered) : "Pending"} />
            <Field label="Cost per night" value={hasPrice ? fmtMoney(ticket.costPerNight) : "Pending"} />
            <Field label="Adjustment" value={ticket.adjustment ? fmtMoney(ticket.adjustment) : "—"} />
            <Field label="Cleaning fee" value={`${fmtMoney(settings.cleaningFee)} — paid directly to the Ritz`} />
          </div>
          {ticket.notes && (
            <div className="mt-5 pt-4 border-t">
              <Field label="Notes" value={ticket.notes} />
            </div>
          )}
        </div>

        {canPay && (
          <Button size="lg" className="hidden md:flex w-full" onClick={() => setPayOpen(true)}>
            <CreditCard className="w-4 h-4 mr-2" /> Pay {fmtMoney(ticket.rateOffered)}
          </Button>
        )}

        <TicketPreview ticket={ticket} settings={settings} />

        {(paymentProofUrl || ticket.paymentScreenshot) && (
          <div className="border rounded-xl bg-card p-4">
            <p className="text-sm font-medium mb-2">Payment proof</p>
            <img src={paymentProofUrl || ticket.paymentScreenshot} alt="Payment proof" className="rounded-lg border max-h-72 object-contain" />
          </div>
        )}

        <PayDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          faqLink={settings.faqLink}
          onConfirmPayment={handlePayment}
        />
      </main>
    </div>
  );
}
