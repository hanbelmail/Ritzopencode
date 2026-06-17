"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin, Star, Clock, DollarSign, Users, Instagram } from "lucide-react";

const discounts = [
  { nights: "2 nights", pct: "30%", color: "bg-blue-50 border-blue-200 text-blue-800" },
  { nights: "3 nights", pct: "35%", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { nights: "4 nights", pct: "40%", color: "bg-purple-50 border-purple-200 text-purple-800" },
  { nights: "5+ nights", pct: "50%", color: "bg-pink-50 border-pink-200 text-pink-800" },
];

export default function RitzInfo() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">The Ritz-Carlton Residences</p>
            <h1 className="text-sm font-semibold leading-tight">Room Info & Pricing</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Hero card */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌺</span>
              <span className="text-xs font-medium bg-white/20 rounded-full px-3 py-1">Exclusive Offer — Honolulu, Hawaiʻi</span>
            </div>
            <h2 className="text-2xl font-bold leading-snug mb-2">The Ritz-Carlton Residences, Waikiki Beach</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Know anyone planning a trip to Honolulu in the coming weeks or months? We've got an incredible hookup on a premium room — at a fraction of the usual price. 🏝️
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>383 Kalaimoku St, Waikiki, HI 96815</span>
            </div>
          </div>
        </div>

        {/* Retail vs our price */}
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-base">Retail Price vs. Your Price 💰</h3>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex-1 text-center rounded-xl bg-red-50 border border-red-100 py-4">
              <p className="text-xs text-red-500 font-medium mb-1">Full Retail Rate</p>
              <p className="text-2xl font-bold text-red-600 line-through">$600–$1,000<span className="text-sm font-normal">/night</span></p>
            </div>
            <div className="text-2xl">→</div>
            <div className="flex-1 text-center rounded-xl bg-green-50 border border-green-200 py-4">
              <p className="text-xs text-green-600 font-medium mb-1">Your Exclusive Rate</p>
              <p className="text-2xl font-bold text-green-700">Way less 🎉</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            ✅ Out-the-door pricing — no hidden hotel fees or resort charges
          </p>
        </div>

        {/* Discount tiers */}
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-base">Discount Tiers — The Longer You Stay, The More You Save 🔥</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {discounts.map(({ nights, pct, color }) => (
              <div key={nights} className={`rounded-xl border px-4 py-3 text-center ${color}`}>
                <p className="text-xs font-medium opacity-80">{nights}</p>
                <p className="text-3xl font-bold mt-1">{pct}</p>
                <p className="text-xs opacity-70 mt-0.5">off retail</p>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl bg-white border shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <span>ℹ️</span> Good to Know
          </h3>
          <ul className="space-y-3 text-sm text-foreground/80">
            <li className="flex gap-2.5">
              <span className="shrink-0 mt-0.5">🏨</span>
              <span>Only <strong>one room</strong> is available at a time — availability is limited, so don't wait too long.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 mt-0.5">🌴</span>
              <span>Comparable to Hilton Hawaiian Village or Prince Waikiki — but with <strong>much better value</strong>.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 mt-0.5">💬</span>
              <span>Just send us your dates and we'll check availability and send your personal discounted rate.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 mt-0.5">🤝</span>
              <span>We also have a <strong>trusted local contact</strong> who can help arrange activities, restaurant reservations, transportation, or anything else you need during your stay. Just ask!</span>
            </li>
          </ul>
        </div>

        {/* Availability */}
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <h3 className="font-semibold text-base flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" /> How to Get Your Rate
          </h3>
          <p className="text-sm text-muted-foreground">
            Send us the dates you're considering and we'll check availability and send you your personal discounted rate. Rates are out-the-door — no surprise fees!
          </p>
          <Link
            href="/"
            className="mt-4 block w-full text-center bg-primary text-primary-foreground font-semibold rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
          >
            Request a Quote →
          </Link>
        </div>

        {/* Links */}
        <div className="rounded-2xl bg-white border shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Explore the Property
          </h3>
          <a
            href="https://www.ritzcarlton.com/en/hotels/hawaii/waikiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border hover:bg-secondary/50 transition-colors group"
          >
            <span className="text-2xl">🏩</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Official Ritz-Carlton Waikiki Page</p>
              <p className="text-xs text-muted-foreground truncate">ritzcarlton.com</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
          </a>

          <a
            href="https://www.instagram.com/p/DJfHuTMhG-6/?img_index=1&igsh=NTc4MTIwNjQ2YQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border hover:bg-secondary/50 transition-colors group"
          >
            <Instagram className="w-6 h-6 text-pink-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Photo Gallery — Post 1</p>
              <p className="text-xs text-muted-foreground">instagram.com</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
          </a>

          <a
            href="https://www.instagram.com/p/DNGMoUazge2/?igsh=NWtoYzUxZTBxdXli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border hover:bg-secondary/50 transition-colors group"
          >
            <Instagram className="w-6 h-6 text-pink-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Photo Gallery — Post 2</p>
              <p className="text-xs text-muted-foreground">instagram.com</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
          </a>

          <a
            href="https://www.instagram.com/reel/Cd7W6Zyj_O2/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border hover:bg-secondary/50 transition-colors group"
          >
            <span className="text-2xl shrink-0">🎥</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Video Tour</p>
              <p className="text-xs text-muted-foreground">instagram.com</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
          </a>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          🌺 The Ritz-Carlton Residences, Waikiki Beach · Unit 1609E
        </p>
      </div>
    </div>
  );
}
