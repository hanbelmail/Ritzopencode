"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

const Section = ({ emoji, title, children }) => (
  <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-4 border-b bg-secondary/30">
      <span className="text-xl">{emoji}</span>
      <h2 className="font-semibold text-sm">{title}</h2>
    </div>
    <div className="px-5 py-4 text-sm text-foreground/80 space-y-2 leading-relaxed">{children}</div>
  </div>
);

const BulletItem = ({ icon = "•", children }) => (
  <li className="flex gap-2.5">
    <span className="shrink-0">{icon}</span>
    <span>{children}</span>
  </li>
);

const FAQItem = ({ question, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-left bg-white hover:bg-secondary/30 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-foreground/80 leading-relaxed space-y-2 bg-white border-t">
          {children}
        </div>
      )}
    </div>
  );
};

export default function RitzFAQ() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs text-muted-foreground">The Ritz-Carlton Residences</p>
            <h1 className="text-sm font-semibold leading-tight">Guest Experience Guide & FAQ</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Intro banner */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-white p-5 shadow-lg">
          <p className="text-xl font-bold mb-1">🏨 Welcome to Unit 1609E</p>
          <p className="text-amber-200 text-sm">383 Kalaimoku St, Waikiki, HI 96815 · Deluxe Ocean View · Sleeps 4</p>
          <p className="mt-3 text-sm text-amber-100 leading-relaxed">
            Please read through this guide before your stay so everything goes smoothly. Don't hesitate to reach out with any questions!
          </p>
        </div>

        {/* Guest Registration */}
        <Section emoji="📋" title="Guest Registration">
          <ul className="space-y-2">
            <BulletItem icon="👤">Provide the <strong>full names of every guest</strong> staying in the unit — the Ritz-Carlton Residences requires all guests to be registered.</BulletItem>
            <BulletItem icon="🚫">Unregistered guests will <strong>not be allowed</strong> in the room or on the property.</BulletItem>
            <BulletItem icon="👨👩👧👦">Maximum occupancy is <strong>4 guests total</strong> (children included).</BulletItem>
          </ul>
        </Section>

        {/* Cancellation Policy */}
        <Section emoji="❌" title="Cancellation Policy">
          <ul className="space-y-2">
            <BulletItem icon="📅">All reservations are <strong>100% non-refundable within 21 days</strong> of arrival.</BulletItem>
            <BulletItem icon="✅">If cancelled <strong>more than 21 days before</strong> your stay, a <strong>50% refund</strong> will be issued.</BulletItem>
            <BulletItem icon="🗓️">Stays <strong>longer than 14 days</strong> or reservations during <strong>holiday periods</strong> are non-refundable within 30 days of arrival.</BulletItem>
            <BulletItem icon="💸">If cancelled more than 30 days prior, a <strong>50% refund</strong> will be issued.</BulletItem>
          </ul>
        </Section>

        {/* Payment */}
        <Section emoji="💳" title="Payment">
          <p>Reservations must be <strong>paid in full at the time of booking</strong>.</p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
            <strong>✈️ Travel Insurance Recommendation:</strong> We strongly recommend purchasing travel insurance. Since our rates depend on a strict cancellation policy, travel insurance protects you if illness, flight issues, or unexpected events prevent travel outside the cancellation window.
          </div>
        </Section>

        {/* Check-In */}
        <Section emoji="🗝️" title="Check-In Procedure">
          <ul className="space-y-2">
            <BulletItem icon="🚗">Upon entering the valet driveway, inform them you are checking into <strong>Unit 1609E as a guest of Michael Ramos</strong>.</BulletItem>
            <BulletItem icon="🪪">You'll be directed to the check-in desk — present your <strong>ID</strong> and provide a <strong>credit card for incidentals</strong>.</BulletItem>
            <BulletItem icon="🛗">The unit is on the <strong>16th floor</strong>, to the right when exiting the elevators.</BulletItem>
            <BulletItem icon="❄️">Please avoid running the A/C while the lanai door is open. Set thermostat to <strong>75°F upon departure</strong>.</BulletItem>
          </ul>
        </Section>

        {/* Check-In / Check-Out Times */}
        <Section emoji="⏰" title="Check-In & Check-Out Times">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs text-green-600 font-medium mb-1">✅ Check-In</p>
              <p className="text-xl font-bold text-green-700">4:00 PM</p>
              <p className="text-xs text-green-600 mt-1">Early check-in possible if no prior guest — ask in advance</p>
            </div>
            <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs text-orange-600 font-medium mb-1">🕛 Check-Out</p>
              <p className="text-xl font-bold text-orange-700">12:00 PM</p>
              <p className="text-xs text-orange-600 mt-1">Noon sharp</p>
            </div>
          </div>
        </Section>

        {/* Fees & Parking */}
        <Section emoji="🅿️" title="Parking, Setup & Cleaning Fees">
          <ul className="space-y-2">
            <BulletItem icon="🚙">Valet Parking: <strong>$60/day + tax</strong></BulletItem>
            <BulletItem icon="🛋️">Sofa bed setup (if used): approx. <strong>$35 one-time fee</strong></BulletItem>
            <BulletItem icon="🧹">Checkout cleaning: <strong>$170</strong> (paid directly to the hotel at check-in)</BulletItem>
            <BulletItem icon="➕">Additional cleanings: <strong>$170 each</strong>, must be scheduled <strong>72 hours in advance</strong></BulletItem>
          </ul>
        </Section>

        {/* Incidentals & Supplies */}
        <Section emoji="🏨" title="Incidentals & Initial Supplies">
          <ul className="space-y-2">
            <BulletItem icon="💳">The Ritz-Carlton Front Desk will require a <strong>credit card on file</strong> upon arrival for incidentals.</BulletItem>
            <BulletItem icon="🛎️">The unit is initially stocked like a hotel room. Additional restocking during your stay will incur charges.</BulletItem>
            <BulletItem icon="📄">An à la carte pricing PDF will be emailed to you.</BulletItem>
          </ul>
        </Section>

        {/* À La Carte */}
        <Section emoji="🍽️" title="À La Carte Services">
          <p className="mb-2">You'll receive an emailed list of optional services billed directly by The Ritz-Carlton Residences:</p>
          <div className="grid grid-cols-2 gap-2">
            {["Toiletry/towel refills","Room service & dining","Spa services","Cabana reservations","Extra towel sets","Food & beverage"].map((s) => (
              <div key={s} className="bg-secondary/50 rounded-lg px-3 py-2 text-xs font-medium">• {s}</div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">You're welcome to purchase supplies from nearby stores. Guests sometimes leave usable items for future guests — always appreciated! 😊</p>
        </Section>

        {/* Confirmation */}
        <Section emoji="📬" title="Confirmation Number">
          <p>Please allow <strong>2–3 business days</strong> to receive your confirmation number. Once available, we'll forward it along with all PDFs and service details.</p>
        </Section>

        {/* Maintenance */}
        <Section emoji="🔧" title="Maintenance & Assistance">
          <p>If anything is not working properly (laundry, coffee machine, appliances, leaks, etc.), please <strong>contact the hotel directly</strong> so they can resolve the issue quickly.</p>
        </Section>

        {/* Owner Extras */}
        <Section emoji="🎁" title="Owner-Provided Extras">
          <p className="mb-2">Since this is an owner's unit, we've added items not normally included in standard hotel rooms:</p>
          <ul className="space-y-1">
            <BulletItem icon="🍚">Rice cooker</BulletItem>
            <BulletItem icon="🔪">Knife and scissor set + cutting board</BulletItem>
            <BulletItem icon="🍽️">Plates, bowls, utensils</BulletItem>
            <BulletItem icon="🥘">Additional pots and pans</BulletItem>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Items are typically available but not guaranteed as replacements occasionally take time. Please return all items to where you found them before checkout.</p>
        </Section>

        {/* Miscellaneous */}
        <Section emoji="📝" title="Miscellaneous">
          <ul className="space-y-2">
            <BulletItem icon="🏅">This reservation does <strong>not qualify for Bonvoy points</strong> — it is booked as a guest stay in a privately owned unit.</BulletItem>
            <BulletItem icon="🚫">Please <strong>do not contact the owner's concierge</strong> — those services are reserved for owners only. For special requests, contact the main Ritz-Carlton front desk.</BulletItem>
            <BulletItem icon="⏳">Rate quotes expire after <strong>3 days</strong>. Rooms are not held until payment has fully cleared.</BulletItem>
            <BulletItem icon="⚠️">Costs, fees, and terms are subject to change at any time without notice.</BulletItem>
          </ul>
        </Section>

        {/* FAQ */}
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2 mb-3">
            <span>❓</span> Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            <FAQItem question="🫧 How do I operate the washer/dryer?">
              <ul className="space-y-1.5">
                <li>• The <strong>power button</strong> is on the top left of each machine — hold it down for 3–5 seconds to turn on or off.</li>
                <li>• Do not fill either machine beyond <strong>2/3 capacity</strong> for best performance.</li>
                <li>• To open the washing machine, press and hold the <strong>lock button</strong> (top right side) until you hear the door click. Do not pull or force the door.</li>
                <li>• When using the dryer, leave the cabinet door <strong>halfway open</strong> for proper airflow.</li>
              </ul>
            </FAQItem>

            <FAQItem question="🍳 Can I cook?">
              <ul className="space-y-1.5">
                <li>• Absolutely! When using the stovetop, pull the <strong>range hood toward you</strong> to maximize coverage.</li>
                <li>• Set the fan to <strong>"IS" (highest setting)</strong> to help prevent triggering smoke detectors.</li>
                <li>• If the smoke alarm activates, open the lanai doors fully. Hotel security will come to confirm there is no fire — please allow them access so they can reset the alarm.</li>
              </ul>
            </FAQItem>

            <FAQItem question="🏊 Can I use the amenities?">
              <ul className="space-y-1.5">
                <li>• Yes! All resort amenities are available for your enjoyment.</li>
                <li>• <strong>Fitness center:</strong> 6th floor, to the right at the end of the hall when exiting the elevators.</li>
                <li>• <strong>Pools:</strong> Main lobby level (Floor 9). Adult pool (18+) is to the right; family pool is to the left.</li>
                <li>• Cabanas may be reserved at either pool for an additional cost. Please respect all operating hours and facility rules.</li>
              </ul>
            </FAQItem>

            <FAQItem question="🏖️ Pool & Beach Towels">
              <ul className="space-y-1.5">
                <li>• <strong>Pool towels</strong> are provided at the pool area.</li>
                <li>• <strong>Beach towels</strong> may be requested downstairs at valet — currently no additional charge.</li>
              </ul>
            </FAQItem>

            <FAQItem question="🛏️ What is the bed configuration?">
              <ul className="space-y-1.5">
                <li>• The main bed is a <strong>King-size bed</strong>.</li>
                <li>• A <strong>pull-out sofa sleeper</strong> is available in the living room couch for additional sleeping space.</li>
              </ul>
            </FAQItem>

            <FAQItem question="🧹 Cleaning & Departure Info">
              <ul className="space-y-1.5">
                <li>• The Ritz-Carlton will not discard items that may belong to the owner or still be usable.</li>
                <li>• Unopened drinks or water may be left for future guests — appreciated! 🙏</li>
                <li>• Clothes, opened food, water, or liquor should be disposed of using the trash chute or placed in a trash bag by the door before departure.</li>
                <li>• If you arrive and notice anything valuable left behind, please notify us so we can contact the previous guest.</li>
                <li>• If food or drinks are in the refrigerator upon arrival, feel free to enjoy them.</li>
                <li>• The $170 cleaning fee covers the standard reset and cleaning after departure. Additional cleanings are $170 each and must be scheduled in advance.</li>
              </ul>
            </FAQItem>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          🌺 The Ritz-Carlton Residences, Waikiki Beach · Unit 1609E · Deluxe Ocean View
        </p>
      </div>
    </div>
  );
}
