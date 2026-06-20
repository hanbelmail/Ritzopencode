"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BedDouble, Waves, Sofa, Sparkles, Search, ArrowRight, Info, BookOpen, MapPin, Star, CheckCircle, CalendarDays, ShieldCheck, ConciergeBell } from "lucide-react";
import QuoteForm from "@/components/home/QuoteForm";
import { DEFAULT_SETTINGS, useSettings } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const creamButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";
const outlineButton = "h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] px-5 text-sm font-medium text-[#141413] shadow-none hover:bg-[#efe9de]";

function SpikeMark({ className = "" }) {
  return (
    <span className={`relative inline-flex h-5 w-5 items-center justify-center ${className}`} aria-hidden="true">
      <span className="absolute h-5 w-[2px] rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] rotate-45 rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] rotate-90 rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] -rotate-45 rounded-full bg-current" />
    </span>
  );
}

export default function Home() {
  const settings = useSettings() || DEFAULT_SETTINGS;
  const router = useRouter();
  const [lookupId, setLookupId] = useState("");

  const lookup = (e) => {
    e.preventDefault();
    if (lookupId.trim()) router.push(`/ticket/${lookupId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#141413] antialiased">
      <header className="border-b border-[#e6dfd8] bg-[#faf9f5]/95">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3 text-sm font-medium text-[#141413]">
            <SpikeMark />
            <span>{settings.hotelName}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#6c6a64] md:flex">
            <Link href="/ritz-info" className="transition-colors hover:text-[#141413]">Room Info</Link>
            <Link href="/faq" className="transition-colors hover:text-[#141413]">Guest Guide</Link>
            <a href="#find" className="transition-colors hover:text-[#141413]">Find Ticket</a>
            <Link href="/dashboard" className="transition-colors hover:text-[#141413]">Staff</Link>
          </nav>
          <Button asChild className={creamButton}>
            <a href="#quote">Get a quote</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 md:grid-cols-[1fr_0.9fr] md:px-8 md:py-24 lg:py-28">
          <div className="flex flex-col justify-center">
            <p className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#6c6a64]">
              <SpikeMark className="h-4 w-4 text-[#cc785c]" /> Private reservations
            </p>
            <h1 className={`${serif} max-w-3xl text-[3rem] font-medium leading-[0.98] tracking-[-0.045em] text-[#141413] md:text-[4.85rem]`}>
              Ocean-view Waikiki stays, quoted with quiet precision.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.65] text-[#3d3d3a]">
              Request preferred private rates for the Deluxe Ocean View room at {settings.hotelName}. Your ticket keeps the quote, payment status, and reservation details in one place.
            </p>
            {settings.hotelAddress && (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#6c6a64]">
                <MapPin className="h-4 w-4" /> {settings.hotelAddress}
              </p>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild className={creamButton}>
                <a href="#quote">Request quote <ArrowRight className="ml-1.5 h-4 w-4" /></a>
              </Button>
              <Button asChild variant="outline" className={outlineButton}>
                <a href="#find">I have a ticket</a>
              </Button>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#e6dfd8] bg-[#faf9f5] p-3">
            <div className="overflow-hidden rounded-[12px] bg-[#181715] p-4 text-[#faf9f5]">
              <img
                src="https://media.db.com/images/public/6a2946fed79e2bf06847f28f/bc01270aa_b11591_7d17baaf5bb44f15bf24584a918fb6a6mv2.png"
                alt="Deluxe Ocean View room at The Ritz-Carlton Residences Waikiki"
                className="h-72 w-full rounded-[8px] object-cover md:h-96"
              />
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  { icon: BedDouble, label: "1 King Bed" },
                  { icon: Sofa, label: "Sofa Bed" },
                  { icon: Waves, label: "Ocean View" },
                  { icon: Sparkles, label: "Sleeps up to 4" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-[8px] bg-[#252320] px-3 py-3 text-[#faf9f5]">
                    <Icon className="mb-2 h-4 w-4 text-[#cc785c]" />
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[8px] bg-[#1f1e1b] p-4 font-mono text-[12px] leading-relaxed text-[#a09d96]">
                <p><span className="text-[#e8a55a]">rate_window</span>: 2-5+ nights</p>
                <p><span className="text-[#5db8a6]">cleaning_fee</span>: paid directly at hotel</p>
                <p><span className="text-[#faf9f5]">guest_quote</span>: ticketed after review</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-24 md:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { nights: "2 nights", pct: "30% off" },
              { nights: "3 nights", pct: "35% off" },
              { nights: "4 nights", pct: "40% off" },
              { nights: "5+ nights", pct: "50% off" },
            ].map(({ nights, pct }) => (
              <div key={nights} className="rounded-[12px] bg-[#efe9de] p-6">
                <p className="text-sm font-medium text-[#6c6a64]">{nights}</p>
                <p className={`${serif} mt-2 text-4xl font-medium tracking-[-0.03em] text-[#141413]`}>{pct}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#6c6a64]">
            A one-time cleaning fee of {fmtMoney(settings.cleaningFee)} is paid by the guest directly to the Ritz at the hotel and is never included in your quoted room price.
          </p>
        </section>

        <section className="bg-[#f5f0e8] py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="mb-10 max-w-3xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#6c6a64]">Designed around the stay</p>
              <h2 className={`${serif} text-4xl font-medium leading-[1.08] tracking-[-0.035em] md:text-5xl`}>Every detail is handled before the room key.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: MapPin, title: "Prime Waikiki location", copy: "383 Kalaimoku St, Unit 1609E. A 16th-floor residence with ocean views and resort access." },
                { icon: Star, title: "Ritz-level amenities", copy: "Pools, spa, cabanas, fitness center, and the service polish expected from the property." },
                { icon: ConciergeBell, title: "Local concierge access", copy: "A trusted local contact can help with activities, dining, transportation, and arrival details." },
              ].map(({ icon: Icon, title, copy }) => (
                <div key={title} className="rounded-[12px] bg-[#efe9de] p-8">
                  <Icon className="h-5 w-5 text-[#cc785c]" />
                  <h3 className="mt-6 text-lg font-medium text-[#252523]">{title}</h3>
                  <p className="mt-3 text-sm leading-[1.65] text-[#6c6a64]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="find" className="scroll-mt-8 bg-[#faf9f5] py-24">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 md:grid-cols-[0.8fr_1fr] md:px-8">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-[#6c6a64]">Ticket lookup</p>
              <h2 className={`${serif} text-4xl font-medium leading-[1.1] tracking-[-0.035em] md:text-5xl`}>Return to a quote already in motion.</h2>
            </div>
            <div className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-6 md:p-8">
              <p className="mb-5 text-sm leading-relaxed text-[#6c6a64]">Already requested a quote? Enter your Ticket ID to view your reservation details and payment status.</p>
              <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8b82]" />
                  <Input
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    placeholder="Paste your Ticket ID"
                    className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] pl-9 text-[#141413] shadow-none focus-visible:ring-[#cc785c]"
                  />
                </div>
                <Button type="submit" className={creamButton}>View ticket</Button>
              </form>
            </div>
          </div>
        </section>

        <section id="quote" className="scroll-mt-8 bg-[#181715] py-24 text-[#faf9f5]">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:grid-cols-[0.82fr_1fr] md:px-8">
            <div className="flex flex-col justify-between gap-10">
              <div>
                <p className="mb-4 inline-flex rounded-full bg-[#cc785c] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white">Private quote</p>
                <h2 className={`${serif} text-4xl font-medium leading-[1.08] tracking-[-0.035em] md:text-5xl`}>Tell us your dates. We'll prepare the ticket.</h2>
                <p className="mt-5 text-base leading-[1.65] text-[#a09d96]">The quote flow stays simple: submit guest details, receive a Ticket ID, then return anytime to view confirmed pricing and payment instructions.</p>
              </div>
              <div className="grid gap-3 text-sm text-[#faf9f5] sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {[
                  { icon: CalendarDays, label: "Date-based review" },
                  { icon: ShieldCheck, label: "No resort fee markup" },
                  { icon: CheckCircle, label: "Ticketed follow-up" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-[12px] bg-[#252320] p-4">
                    <Icon className="mb-3 h-4 w-4 text-[#5db8a6]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <QuoteForm />
          </div>
        </section>

        <section className="bg-[#faf9f5] py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="rounded-[12px] bg-[#cc785c] p-8 text-white md:p-16">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <h2 className={`${serif} text-4xl font-medium leading-[1.1] tracking-[-0.035em] md:text-5xl`}>Need the full room guide first?</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-[1.65] text-white/85">Review the residence details, guest terms, and frequently asked questions before requesting your private quote.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="h-10 rounded-[8px] bg-[#faf9f5] px-5 text-sm font-medium text-[#141413] shadow-none hover:bg-[#efe9de]">
                    <Link href="/ritz-info"><Info className="mr-1.5 h-4 w-4" /> Room Info</Link>
                  </Button>
                  <Button asChild className="h-10 rounded-[8px] bg-[#a9583e] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]">
                    <Link href="/faq"><BookOpen className="mr-1.5 h-4 w-4" /> FAQ</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#181715] text-[#a09d96]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-14 text-sm md:grid-cols-[1fr_auto] md:px-8">
          <div>
            <div className="flex items-center gap-3 text-[#faf9f5]">
              <SpikeMark />
              <span className="font-medium">{settings.hotelName}</span>
            </div>
            <p className="mt-4 max-w-md leading-relaxed">Private reservations for the Deluxe Ocean View residence in Waikiki.</p>
          </div>
          <div className="flex flex-wrap gap-5 md:justify-end">
            <Link href="/ritz-info" className="hover:text-[#faf9f5]">Room Info</Link>
            <Link href="/faq" className="hover:text-[#faf9f5]">Guest Guide</Link>
            <Link href="/dashboard" className="hover:text-[#faf9f5]">Staff</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
