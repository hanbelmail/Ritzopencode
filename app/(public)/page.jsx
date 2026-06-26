"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BedDouble, Waves, Sofa, Sparkles, Search, ArrowRight, Info, BookOpen, MapPin, Star, ConciergeBell, BadgeDollarSign, CalendarCheck, CreditCard, Users, Car, KeyRound, Camera } from "lucide-react";
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

function HomePageClassic({ settings }) {
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
            <Link href="/ritz-info" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#141413]">Room Info</Link>
            <Link href="/gallery" className="transition-colors hover:text-[#141413]">Gallery</Link>
            <Link href="/faq" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#141413]">Guest Guide</Link>
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
                    <Link href="/ritz-info" target="_blank" rel="noopener noreferrer"><Info className="mr-1.5 h-4 w-4" /> Room Info</Link>
                  </Button>
                  <Button asChild className="h-10 rounded-[8px] bg-[#faf9f5] px-5 text-sm font-medium text-[#141413] shadow-none hover:bg-[#efe9de]">
                    <Link href="/gallery"><Camera className="mr-1.5 h-4 w-4" /> Gallery</Link>
                  </Button>
                  <Button asChild className="h-10 rounded-[8px] bg-[#a9583e] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]">
                    <Link href="/faq" target="_blank" rel="noopener noreferrer"><BookOpen className="mr-1.5 h-4 w-4" /> FAQ</Link>
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
            <Link href="/ritz-info" target="_blank" rel="noopener noreferrer" className="hover:text-[#faf9f5]">Room Info</Link>
            <Link href="/gallery" className="hover:text-[#faf9f5]">Gallery</Link>
            <Link href="/faq" target="_blank" rel="noopener noreferrer" className="hover:text-[#faf9f5]">Guest Guide</Link>
            <Link href="/dashboard" className="hover:text-[#faf9f5]">Staff</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomePageNew({ settings }) {
  const router = useRouter();
  const [lookupId, setLookupId] = useState("");

  const lookup = (e) => {
    e.preventDefault();
    if (lookupId.trim()) router.push(`/ticket/${lookupId.trim()}`);
  };

  const processSteps = [
    { icon: CalendarCheck, title: "Send your dates", copy: "Tell us when you want to stay and how many guests are coming." },
    { icon: BadgeDollarSign, title: "Receive a private quote", copy: "We check availability and prepare your personal discounted ticket." },
    { icon: CreditCard, title: "Secure the reservation", copy: "Pay once the quote is accepted. Rooms are not held until payment clears." },
    { icon: KeyRound, title: "Get confirmation", copy: "Confirmation details are normally forwarded within 2-3 business days." },
  ];

  return (
    <div className="min-h-screen bg-[#fbf7ef] text-[#161411] antialiased">
      <header className="border-b border-[#eadfd1] bg-[#fbf7ef]/95">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold text-[#161411]">
            <SpikeMark className="text-[#b86547]" />
            <span>{settings.hotelName}</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#6e665d] md:flex">
            <Link href="/ritz-info" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#161411]">Room Info</Link>
            <Link href="/gallery" className="transition-colors hover:text-[#161411]">Gallery</Link>
            <Link href="/faq" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#161411]">FAQ</Link>
            <a href="#find" className="transition-colors hover:text-[#161411]">Find Ticket</a>
            <Link href="/dashboard" className="transition-colors hover:text-[#161411]">Staff</Link>
          </nav>
          <Button asChild className={creamButton}>
            <a href="#quote">Request quote</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-[1fr_0.82fr] md:px-8 md:py-24">
          <div className="flex flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfd1] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a6b5f]">
              <Star className="h-3.5 w-3.5 text-[#b86547]" /> Unit 1609E, Waikiki Beach
            </p>
            <h1 className={`${serif} max-w-4xl text-[3.15rem] font-medium leading-[0.96] tracking-[-0.05em] md:text-[5.6rem]`}>
              Private Ritz-Carlton Waikiki stays below retail.
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-[1.7] text-[#463f38]">
              Request a private quote for a Deluxe Ocean View residence with a king bed, sofa bed, resort amenities, and clear guest terms before you book.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={creamButton}>
                <a href="#quote">Secure Your Experience <ArrowRight className="ml-1.5 h-4 w-4" /></a>
              </Button>
              <Button asChild variant="outline" className={outlineButton}>
                <a href="#find">I have a ticket</a>
              </Button>
              <Button asChild variant="outline" className={outlineButton}>
                <Link href="/ritz-info" target="_blank" rel="noopener noreferrer">See room details</Link>
              </Button>
              <Button asChild variant="outline" className={outlineButton}>
                <Link href="/gallery">View gallery</Link>
              </Button>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
              <div className="rounded-[12px] border border-[#eadfd1] bg-white/70 p-4">
                <p className={`${serif} text-3xl font-medium`}>16th</p>
                <p className="mt-1 text-[#756d64]">floor residence</p>
              </div>
              <div className="rounded-[12px] border border-[#eadfd1] bg-white/70 p-4">
                <p className={`${serif} text-3xl font-medium`}>4</p>
                <p className="mt-1 text-[#756d64]">guest maximum</p>
              </div>
              <div className="rounded-[12px] border border-[#eadfd1] bg-white/70 p-4">
                <p className={`${serif} text-3xl font-medium`}>2-3</p>
                <p className="mt-1 text-[#756d64]">business days</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#161411] p-4 text-white shadow-2xl shadow-[#b86547]/10">
            <img
              src="https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_e3c1ea9727e848f99f55cc1c89e77407~mv2.jpg"
              alt="Deluxe Ocean View room at The Ritz-Carlton Residences Waikiki"
              className="h-80 w-full rounded-[18px] object-cover md:h-[430px]"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: BedDouble, label: "King bed" },
                { icon: Sofa, label: "Sofa bed" },
                { icon: Waves, label: "Ocean view" },
                { icon: Sparkles, label: "Resort amenities" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-[12px] bg-white/10 px-4 py-3">
                  <Icon className="mb-2 h-4 w-4 text-[#d89578]" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-20 md:px-8">
          <div className="grid gap-4 rounded-[20px] bg-white p-4 shadow-sm md:grid-cols-[0.85fr_1fr] md:p-6">
            <div className="rounded-[16px] border border-red-100 bg-red-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">Typical retail</p>
              <p className={`${serif} mt-3 text-5xl font-medium tracking-[-0.04em] text-red-700 line-through`}>$600-$1,000</p>
              <p className="mt-1 text-sm text-red-600">per night before your private quote</p>
            </div>
            <div className="rounded-[16px] bg-[#e7f4e8] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55775b]">Your private rate</p>
              <h2 className={`${serif} mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.035em] text-[#18331d]`}>Longer stays unlock deeper discounts.</h2>
              <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  ["2 nights", "30%"],
                  ["3 nights", "35%"],
                  ["4 nights", "40%"],
                  ["5+ nights", "50%"],
                ].map(([nights, pct]) => (
                  <div key={nights} className="rounded-[10px] bg-white/70 p-3 text-center">
                    <p className="text-xs text-[#55775b]">{nights}</p>
                    <p className="text-2xl font-semibold text-[#18331d]">{pct}</p>
                    <p className="text-xs text-[#55775b]">off retail</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#756d64]">
            Checkout cleaning is {fmtMoney(settings.cleaningFee)} and paid directly to the Ritz at the hotel. Valet parking, sofa bed setup, and optional services are billed separately when used.
          </p>
        </section>

        <section className="bg-[#161411] py-24 text-white">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="grid gap-10 md:grid-cols-[0.8fr_1fr]">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#d89578]">Before you book</p>
                <h2 className={`${serif} text-4xl font-medium leading-[1.08] tracking-[-0.035em] md:text-5xl`}>Clear guest details, no guessing.</h2>
                <p className="mt-5 text-sm leading-[1.75] text-[#b9b2aa]">The home page gives the highlights. The FAQ keeps full check-in, cancellation, payment, and amenity details available before and after booking.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Users, title: "Max 4 registered guests", copy: "Every guest name must be provided before arrival." },
                  { icon: CalendarCheck, title: "4 PM check-in, 12 PM checkout", copy: "Early check-in may be possible if there is no prior guest." },
                  { icon: CreditCard, title: "Paid in full to book", copy: "Travel insurance is recommended because cancellation terms are strict." },
                  { icon: Car, title: "$60/day valet parking", copy: "Parking and optional services are charged separately by the property." },
                ].map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="rounded-[14px] bg-white/[0.08] p-5">
                    <Icon className="h-5 w-5 text-[#d89578]" />
                    <h3 className="mt-5 font-medium">{title}</h3>
                    <p className="mt-2 text-sm leading-[1.6] text-[#b9b2aa]">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fbf7ef] py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#756d64]">How it works</p>
              <h2 className={`${serif} text-4xl font-medium leading-[1.08] tracking-[-0.035em] md:text-5xl`}>From dates to confirmation in four simple steps.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {processSteps.map(({ icon: Icon, title, copy }, index) => (
                <div key={title} className="rounded-[16px] border border-[#eadfd1] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-[#b86547]" />
                    <span className="text-xs font-semibold text-[#9a9188]">0{index + 1}</span>
                  </div>
                  <h3 className="mt-8 font-medium text-[#26211c]">{title}</h3>
                  <p className="mt-3 text-sm leading-[1.65] text-[#756d64]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="find" className="scroll-mt-8 bg-white py-20">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-5 md:grid-cols-[0.8fr_1fr] md:px-8">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#756d64]">Ticket lookup</p>
              <h2 className={`${serif} text-4xl font-medium leading-[1.1] tracking-[-0.035em] md:text-5xl`}>Already have a quote?</h2>
            </div>
            <div className="rounded-[16px] border border-[#eadfd1] bg-[#fbf7ef] p-6 md:p-8">
              <p className="mb-5 text-sm leading-relaxed text-[#756d64]">Enter your Ticket ID to view the quote, payment status, reservation details, and payment instructions.</p>
              <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9188]" />
                  <Input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Paste your Ticket ID" className="h-10 rounded-[8px] border-[#eadfd1] bg-white pl-9 text-[#161411] shadow-none focus-visible:ring-[#cc785c]" />
                </div>
                <Button type="submit" className={creamButton}>View ticket</Button>
              </form>
            </div>
          </div>
        </section>

        <section id="quote" className="scroll-mt-8 bg-[#181715] py-24 text-[#faf9f5]">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:grid-cols-[0.82fr_1fr] md:px-8">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <p className="mb-4 inline-flex rounded-full bg-[#cc785c] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white">Private quote</p>
                <h2 className={`${serif} text-4xl font-medium leading-[1.08] tracking-[-0.035em] md:text-5xl`}>Tell us your dates. We will prepare the ticket.</h2>
              </div>
              <div className="rounded-[16px] border border-[#3a3630] bg-[#252320] p-5 text-sm leading-[1.65] text-[#a09d96]">
                Want every detail first? Review the <Link href="/faq" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#d89578] underline-offset-4 hover:underline">guest FAQ</Link> or the <Link href="/ritz-info" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#d89578] underline-offset-4 hover:underline">room info page</Link> before submitting.
              </div>
            </div>
            <div className="space-y-5">
              <QuoteForm />
            </div>
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
                    <Link href="/ritz-info" target="_blank" rel="noopener noreferrer"><Info className="mr-1.5 h-4 w-4" /> Room Info</Link>
                  </Button>
                  <Button asChild className="h-10 rounded-[8px] bg-[#faf9f5] px-5 text-sm font-medium text-[#141413] shadow-none hover:bg-[#efe9de]">
                    <Link href="/gallery"><Camera className="mr-1.5 h-4 w-4" /> Gallery</Link>
                  </Button>
                  <Button asChild className="h-10 rounded-[8px] bg-[#a9583e] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]">
                    <Link href="/faq" target="_blank" rel="noopener noreferrer"><BookOpen className="mr-1.5 h-4 w-4" /> FAQ</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#161411] text-[#b9b2aa]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-14 text-sm md:grid-cols-[1fr_auto] md:px-8">
          <div>
            <div className="flex items-center gap-3 text-white">
              <SpikeMark className="text-[#d89578]" />
              <span className="font-medium">{settings.hotelName}</span>
            </div>
            <p className="mt-4 max-w-md leading-relaxed">Private Deluxe Ocean View reservations at The Ritz-Carlton Residences, Waikiki Beach.</p>
          </div>
          <div className="flex flex-wrap gap-5 md:justify-end">
            <Link href="/ritz-info" target="_blank" rel="noopener noreferrer" className="hover:text-white">Room Info</Link>
            <Link href="/gallery" className="hover:text-white">Gallery</Link>
            <Link href="/faq" target="_blank" rel="noopener noreferrer" className="hover:text-white">FAQ</Link>
            <Link href="/dashboard" className="hover:text-white">Staff</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const settings = useSettings() || DEFAULT_SETTINGS;

  if (settings.homePageVariant === "new") {
    return <HomePageNew settings={settings} />;
  }

  return <HomePageClassic settings={settings} />;
}
