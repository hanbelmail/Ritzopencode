"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, BedDouble, Waves, Sofa, Sparkles, Search, ArrowRight, Info, BookOpen, MapPin, Star, Users, CheckCircle } from "lucide-react";
import QuoteForm from "@/components/home/QuoteForm";
import { DEFAULT_SETTINGS, useSettings } from "@/lib/store";
import { fmtMoney } from "@/lib/calc";

export default function Home() {
  const settings = useSettings() || DEFAULT_SETTINGS;
  const router = useRouter();
  const [lookupId, setLookupId] = useState("");

  const lookup = (e) => {
    e.preventDefault();
    if (lookupId.trim()) router.push(`/ticket/${lookupId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">{settings.hotelName}</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/ritz-info" className="hover:text-foreground transition-colors hidden sm:inline">Room Info</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors hidden sm:inline">FAQ</Link>
            <a href="#quote" className="hover:text-foreground transition-colors hidden sm:inline">Get a Quote</a>
            <Link href="/dashboard" className="hover:text-foreground transition-colors hidden sm:inline">Staff</Link>
            <Button size="sm" asChild className="sm:hidden">
              <a href="#quote">Quote</a>
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <section className="py-14 md:py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Private reservations</p>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight max-w-2xl">
            Deluxe Ocean View at {settings.hotelName}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
            Exclusive member rates on a Deluxe Ocean View room — up to 50% off retail.
            Request a quote below and our team will confirm your price.
          </p>
          {settings.hotelAddress && (
            <p className="text-sm text-muted-foreground mt-2">{settings.hotelAddress}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-8">
            <Button asChild>
              <a href="#quote">Get a quote <ArrowRight className="w-4 h-4 ml-1.5" /></a>
            </Button>
            <Button variant="outline" asChild>
              <a href="#find">I have a ticket</a>
            </Button>
          </div>
        </section>

        {/* Room */}
        <section className="pb-14">
          <div className="rounded-2xl overflow-hidden border">
            <img
              src="https://media.db.com/images/public/6a2946fed79e2bf06847f28f/bc01270aa_b11591_7d17baaf5bb44f15bf24584a918fb6a6mv2.png"
              alt="Deluxe Ocean View room at The Ritz-Carlton Residences Waikiki"
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { icon: BedDouble, label: "1 King Bed" },
              { icon: Sofa, label: "Sofa Bed" },
              { icon: Waves, label: "Ocean View" },
              { icon: Sparkles, label: "Sleeps up to 4" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="border rounded-lg px-4 py-3 flex items-center gap-2.5 text-sm">
                <Icon className="w-4 h-4 text-muted-foreground" /> {label}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Note: a one-time cleaning fee of {fmtMoney(settings.cleaningFee)} is paid by the guest directly
            to the Ritz at the hotel — it is never included in your quoted price.
          </p>
        </section>

        {/* Pricing info strip */}
        <section className="pb-14">
          <div className="rounded-2xl border bg-secondary/30 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">Exclusive Pricing</p>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2">
              Up to 50% off retail — no hidden fees
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-lg">
              This room normally retails for $600–$1,000+ per night. As a private guest you receive an
              exclusive discounted rate based on your length of stay. The price we quote is out-the-door — no additional hotel or resort fees.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { nights: "2 nights", pct: "30% off" },
                { nights: "3 nights", pct: "35% off" },
                { nights: "4 nights", pct: "40% off" },
                { nights: "5+ nights", pct: "50% off" },
              ].map(({ nights, pct }) => (
                <div key={nights} className="bg-white border rounded-xl text-center py-3 px-2">
                  <p className="text-xs text-muted-foreground">{nights}</p>
                  <p className="text-lg font-bold mt-0.5">{pct}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/ritz-info">
                  <Info className="w-3.5 h-3.5 mr-1.5" /> Full Room Info
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm">
                <Link href="/faq">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Guest Guide & FAQ
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Property highlights */}
        <section className="pb-14">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4">About the Property</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border rounded-xl p-5 space-y-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium text-sm">Prime Waikiki Location</p>
              <p className="text-xs text-muted-foreground leading-relaxed">383 Kalaimoku St, Waikiki, HI 96815. Unit 1609E — 16th floor with ocean views.</p>
            </div>
            <div className="border rounded-xl p-5 space-y-2">
              <Star className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium text-sm">World-Class Amenities</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Pools, fitness center, spa, cabanas, and full resort access — comparable to Hilton Hawaiian Village or Prince Waikiki.</p>
            </div>
            <div className="border rounded-xl p-5 space-y-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium text-sm">Local Concierge Access</p>
              <p className="text-xs text-muted-foreground leading-relaxed">A trusted local contact can arrange activities, dining reservations, transportation, or anything you need during your stay.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/ritz-info"
              className="text-sm text-primary underline-offset-4 hover:underline flex items-center gap-1"
            >
              Learn more about the property <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/faq"
              className="text-sm text-primary underline-offset-4 hover:underline flex items-center gap-1"
            >
              Read the Guest Guide & Terms <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Find ticket */}
        <section id="find" className="pb-14 scroll-mt-8">
          <h2 className="text-xl font-semibold tracking-tight mb-1">Find my ticket</h2>
          <p className="text-sm text-muted-foreground mb-4">Already requested a quote? Enter your Ticket ID to view your reservation and pay.</p>
          <form onSubmit={lookup} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Paste your Ticket ID…"
                className="pl-9"
              />
            </div>
            <Button type="submit">View ticket</Button>
          </form>
        </section>

        {/* Quote form */}
        <section id="quote" className="pb-20 scroll-mt-8">
          <h2 className="text-xl font-semibold tracking-tight mb-1">Get a quote</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Tell us your dates and details — our team will calculate your discounted price and add it to your ticket.
          </p>
          <QuoteForm />
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-4xl mx-auto px-6 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>{settings.hotelName} — Private Reservations</span>
          <div className="flex items-center gap-4">
            <Link href="/ritz-info" className="hover:text-foreground transition-colors">Room Info</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">Guest Guide & FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
