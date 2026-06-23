"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  Info,
  Loader2,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import StatusBadge from "@/components/tickets/StatusBadge";
import TicketPreview from "@/components/ticket/TicketPreview";
import PayDialog from "@/components/ticket/PayDialog";
import { DEFAULT_SETTINGS, useSettings, useTicket, useTicketActions } from "@/lib/store";
import { fmtDate, fmtMoney } from "@/lib/calc";

const FLOW_STEPS = [
  { status: "QUOTE REQUESTED", label: "Quote requested", description: "We received your dates." },
  { status: "PRICE SENT", label: "Price sent", description: "Your private rate is ready." },
  { status: "PAYMENT SUBMITTED", label: "Payment submitted", description: "Proof is waiting for review." },
  { status: "PAYMENT VERIFIED", label: "Payment verified", description: "Your payment has cleared." },
  { status: "BOOKING CONFIRMED", label: "Booking confirmed", description: "Your stay is finalized." },
];

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#eee7dc] bg-white/75 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a8f80]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#25211d]">{value || "—"}</p>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[1.75rem] border border-[#e8dfd2] bg-white/90 p-4 shadow-sm shadow-[#4a2f1d]/5 md:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5ede0] text-[#8a5c2e]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-semibold text-[#25211d]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PortalLink({ href, icon: Icon, title, description }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-[#e8dfd2] bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#d5b98c] hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8f2e8] text-[#8a5c2e]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#25211d]">{title}</span>
        <span className="block text-xs leading-relaxed text-[#766b5f]">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#b6a895] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Timeline({ status }) {
  const activeIndex = FLOW_STEPS.findIndex((step) => step.status === status);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;
  const isCancelled = status === "CANCELLED";

  return (
    <section className="rounded-[1.75rem] border border-[#e8dfd2] bg-white p-4 shadow-sm shadow-[#4a2f1d]/5 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8f80]">Reservation progress</p>
          <h2 className="mt-1 text-lg font-semibold text-[#25211d]">Your booking timeline</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      {isCancelled ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          This ticket was cancelled. Please request a new quote if you still need dates.
        </div>
      ) : (
        <div className="space-y-0">
          {FLOW_STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <div key={step.status} className="relative flex gap-3 pb-5 last:pb-0">
                {index !== FLOW_STEPS.length - 1 && (
                  <div className={`absolute left-[17px] top-9 h-[calc(100%-2rem)] w-px ${isDone ? "bg-[#b48a4f]" : "bg-[#eadfce]"}`} />
                )}
                <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${isDone ? "border-[#b48a4f] bg-[#b48a4f] text-white" : isCurrent ? "border-[#8a5c2e] bg-[#25211d] text-white shadow-lg shadow-[#8a5c2e]/20" : "border-[#eadfce] bg-[#faf6ef] text-[#b6a895]"}`}>
                  {isDone ? <Check className="h-4 w-4" /> : isCurrent ? <Clock3 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </div>
                <div className="min-w-0 pt-1">
                  <p className={`text-sm font-semibold ${isUpcoming ? "text-[#9a8f80]" : "text-[#25211d]"}`}>{step.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#766b5f]">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getPaymentState(ticket, hasPrice) {
  if (ticket.status === "CANCELLED") {
    return { canPay: false, title: "Ticket cancelled", description: "This reservation is no longer active." };
  }
  if (!hasPrice || ticket.status === "QUOTE REQUESTED") {
    return { canPay: false, title: "Waiting for your private rate", description: "Our team is reviewing availability and will add pricing soon." };
  }
  if (ticket.status === "PAYMENT SUBMITTED") {
    return { canPay: false, title: "Payment submitted", description: "Your proof was received and is awaiting verification." };
  }
  if (ticket.status === "PAYMENT VERIFIED") {
    return { canPay: false, title: "Payment verified", description: "Your payment cleared. The booking confirmation is being finalized." };
  }
  if (ticket.status === "BOOKING CONFIRMED") {
    return { canPay: false, title: "Booking confirmed", description: "Your reservation is finalized. We look forward to welcoming you." };
  }
  return { canPay: true, title: "Secure your reservation", description: "Review the Ritz info and FAQ terms, then upload your payment proof." };
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
  const primaryGuest = (ticket.guests || []).filter(Boolean)[0] || "Guest";
  const guestList = (ticket.guests || []).filter(Boolean).join(", ");
  const paymentState = getPaymentState(ticket, hasPrice);
  const canPay = paymentState.canPay;
  const isPaymentSubmitted = ticket.status === "PAYMENT SUBMITTED";
  const isPaymentVerified = ticket.status === "PAYMENT VERIFIED";
  const isBookingConfirmed = ticket.status === "BOOKING CONFIRMED";
  const savings = hasPrice && ticket.retailPrice ? ticket.retailPrice - ticket.rateOffered : null;

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
    <div className="min-h-screen bg-[#f7f1e8] text-[#25211d]">
      <header className="border-b border-[#eadfce] bg-[#fffaf3]/90 backdrop-blur-xl md:sticky md:top-0 md:z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[#766b5f] transition-colors hover:text-[#25211d]">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a5c2e]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">Guest portal</span>
          </div>
        </div>
      </header>

      {canPay && (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-[#eadfce] bg-[#fffaf3]/95 p-3 shadow-[0_12px_30px_rgba(74,47,29,0.12)] backdrop-blur md:hidden">
          <Button size="lg" className="h-12 w-full rounded-full bg-[#25211d] text-white hover:bg-[#3a3028]" onClick={() => setPayOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" /> Secure for {fmtMoney(ticket.rateOffered)}
          </Button>
        </div>
      )}

      <main className={`mx-auto max-w-5xl px-4 pb-8 md:px-6 md:py-8 ${canPay ? "pt-20 md:pt-8" : "pt-5"}`}>
        <section className="overflow-hidden rounded-[2rem] bg-[#211b17] text-white shadow-2xl shadow-[#4a2f1d]/20">
          <div className="relative p-5 md:p-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#b48a4f]/25 blur-3xl" />
            <div className="absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-[#f4d8a6]/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/75">Ticket {ticket.id}</span>
                </div>
                <p className="text-sm font-medium text-[#d7c2a3]">{settings.hotelName}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Aloha, {primaryGuest}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
                  Your private room quote, payment status, and reservation details are organized here for a smoother mobile booking experience.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 md:min-w-80">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                  <CalendarDays className="mb-2 h-4 w-4 text-[#d7c2a3]" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Check-in</p>
                  <p className="mt-1 text-sm font-semibold">{fmtDate(ticket.checkIn)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                  <BedDouble className="mb-2 h-4 w-4 text-[#d7c2a3]" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Stay</p>
                  <p className="mt-1 text-sm font-semibold">{ticket.nights || 0} nights</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-[#d8c5a6] bg-[#fffaf3] p-5 shadow-xl shadow-[#4a2f1d]/10 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6b36]">Your private rate</p>
                  <div className="mt-3 flex items-end gap-2">
                    <p className="text-4xl font-semibold tracking-tight text-[#25211d] md:text-5xl">{hasPrice ? fmtMoney(ticket.rateOffered) : "Pending"}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#766b5f]">
                    {hasPrice ? `${fmtMoney(ticket.costPerNight)} per night before direct Ritz fees.` : "Our team will add pricing after reviewing your dates."}
                  </p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25211d] text-[#f5d9a6]">
                  <ReceiptText className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a8f80]">Retail rate</p>
                  <p className="mt-1 text-base font-semibold text-[#25211d]">{hasPrice ? fmtMoney(ticket.retailPrice) : "Pending"}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a8f80]">Discount</p>
                  <p className="mt-1 text-base font-semibold text-[#25211d]">{hasPrice ? `${ticket.discountPct}% off` : "Pending"}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a8f80]">Estimated savings</p>
                  <p className="mt-1 text-base font-semibold text-[#25211d]">{savings !== null ? fmtMoney(Math.max(savings, 0)) : "Pending"}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a8f80]">Cleaning fee</p>
                  <p className="mt-1 text-base font-semibold text-[#25211d]">{fmtMoney(settings.cleaningFee)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#ecd8b8] bg-[#fff4df] px-4 py-3 text-xs leading-relaxed text-[#7b5428]">
                Cleaning fee is paid directly to the Ritz at check-in and is not included in the private rate above.
              </div>
            </section>

            <Timeline status={ticket.status} />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-20">
            <section className="rounded-[1.75rem] border border-[#e8dfd2] bg-white p-5 shadow-sm shadow-[#4a2f1d]/5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f1e6d6] text-[#8a5c2e]">
                  {canPay ? <ShieldCheck className="h-5 w-5" /> : isPaymentSubmitted ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#25211d]">{paymentState.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#766b5f]">{paymentState.description}</p>
                </div>
              </div>

              {canPay && (
                <Button size="lg" className="mt-5 hidden h-12 w-full rounded-full bg-[#25211d] text-white hover:bg-[#3a3028] md:flex" onClick={() => setPayOpen(true)}>
                  <CreditCard className="mr-2 h-4 w-4" /> Secure for {fmtMoney(ticket.rateOffered)}
                </Button>
              )}

              {(isPaymentSubmitted || isPaymentVerified || isBookingConfirmed) && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
                  {isPaymentSubmitted && `Payment received via ${ticket.paymentMethod || "your selected method"}${ticket.paymentDate ? ` on ${fmtDate(ticket.paymentDate)}` : ""}.`}
                  {isPaymentVerified && "Your payment has been verified. The final booking confirmation is next."}
                  {isBookingConfirmed && `Your booking is finalized. We look forward to welcoming you at ${settings.hotelName}.`}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a8f80]">Before your stay</p>
              </div>
              <PortalLink href="/ritz-info" icon={Info} title="Ritz Info" description="Room details, property links, pricing notes, and what to expect." />
              <PortalLink href="/faq" icon={HelpCircle} title="FAQ & Terms" description="Payment rules, cancellation terms, check-in details, and guest guide." />
            </section>
          </aside>
        </div>

        {ticket.status === "QUOTE REQUESTED" && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Your quote is being reviewed — our team will add your price shortly. Check back soon.
          </div>
        )}

        <div className="mt-5 space-y-5">
          <DetailSection title="Reservation details" icon={Home}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Guests" value={guestList} />
              <Field label="Email" value={ticket.email} />
              <Field label="Phone" value={ticket.phone} />
              <Field label="Referred by" value={ticket.referredBy} />
              <Field label="Quote date" value={ticket.createdAt ? fmtDate(ticket.createdAt) : null} />
              <Field label="Ticket ID" value={ticket.id} />
            </div>
          </DetailSection>

          <DetailSection title="Stay details" icon={MapPin}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Check-in" value={fmtDate(ticket.checkIn)} />
              <Field label="Check-out" value={fmtDate(ticket.checkOut)} />
              <Field label="Nights" value={ticket.nights} />
              <Field label="Room" value={ticket.roomType} />
            </div>
          </DetailSection>

          <DetailSection title="Pricing details" icon={ReceiptText}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Retail rate" value={hasPrice ? fmtMoney(ticket.retailPrice) : "Pending"} />
              <Field label="Discount" value={hasPrice ? `${ticket.discountPct}% off` : "Pending"} />
              <Field label="Your price" value={hasPrice ? fmtMoney(ticket.rateOffered) : "Pending"} />
              <Field label="Cost per night" value={hasPrice ? fmtMoney(ticket.costPerNight) : "Pending"} />
              <Field label="Adjustment" value={ticket.adjustment ? fmtMoney(ticket.adjustment) : "—"} />
              <Field label="Cleaning fee" value={`${fmtMoney(settings.cleaningFee)} paid directly to the Ritz`} />
            </div>
          </DetailSection>

          {ticket.notes && (
            <DetailSection title="Notes" icon={FileText}>
              <p className="rounded-2xl border border-[#eee7dc] bg-white/75 px-4 py-3 text-sm leading-relaxed text-[#4d443b]">{ticket.notes}</p>
            </DetailSection>
          )}
        </div>

        <div className="mt-5">
          <TicketPreview ticket={ticket} settings={settings} />
        </div>

        {(paymentProofUrl || ticket.paymentScreenshot) && (
          <div className="mt-5 rounded-[1.75rem] border border-[#e8dfd2] bg-white p-4 shadow-sm shadow-[#4a2f1d]/5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#25211d]">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Payment proof
            </div>
            <img src={paymentProofUrl || ticket.paymentScreenshot} alt="Payment proof" className="max-h-72 rounded-2xl border border-[#eee7dc] object-contain" />
          </div>
        )}

        <PayDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          onConfirmPayment={handlePayment}
        />
      </main>
    </div>
  );
}
