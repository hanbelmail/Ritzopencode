"use client";

import { useEffect, useState } from "react";
import { BellRing, Building2, Check, Mail, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, useSettings, useSettingsActions } from "@/lib/store";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const inputClass = "h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none placeholder:text-[#8e8b82] focus-visible:ring-[#cc785c]";
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";

function sanitizeRecipients(recipients) {
  const seen = new Set();
  const sanitized = [];

  for (const recipient of recipients || []) {
    const email = String(recipient.email || "").trim();
    if (!email) continue;

    const key = email.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    sanitized.push({ email, active: recipient.active !== false });
  }

  return sanitized;
}

function RecipientSection({ title, description, label, placeholder, emptyTitle, emptyCopy, icon: Icon, recipients, groupKey, onAdd, onUpdate, onRemove }) {
  return (
    <section className="rounded-[12px] bg-[#efe9de] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-[#252523]">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onAdd(groupKey)} className="rounded-[8px] border-[#d9cfc2] bg-[#faf9f5] text-[#252523] hover:bg-white">
          <Plus className="h-3.5 w-3.5" /> Add email
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {recipients.map((recipient, index) => (
          <div key={index} className={`rounded-[10px] border border-[#e6dfd8] bg-[#faf9f5] p-3 ${recipient.active === false ? "opacity-60" : ""}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`${groupKey}-${index}`} className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">{label}</Label>
                <Input
                  id={`${groupKey}-${index}`}
                  type="email"
                  value={recipient.email}
                  onChange={(event) => onUpdate(groupKey, index, "email", event.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#e6dfd8] px-3 py-2 md:mt-6 md:w-40">
                <Label htmlFor={`${groupKey}-active-${index}`} className="text-sm text-[#252523]">Active</Label>
                <Switch id={`${groupKey}-active-${index}`} checked={recipient.active !== false} onCheckedChange={(value) => onUpdate(groupKey, index, "active", value)} />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(groupKey, index)} className="self-end text-[#8e8b82] hover:text-red-600 md:mt-6">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {recipients.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-[#d9cfc2] bg-[#faf9f5] p-6 text-center">
            <Icon className="mx-auto h-8 w-8 text-[#cc785c]" />
            <p className="mt-3 text-sm font-medium text-[#252523]">{emptyTitle}</p>
            <p className="mt-1 text-xs text-[#6c6a64]">{emptyCopy}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function EmailDashboardPage() {
  const savedSettings = useSettings();
  const { saveSettings } = useSettingsActions();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const staffRecipients = settings.staffEmailRecipients || [];
  const hotelRecipients = settings.hotelEmailRecipients || [];
  const activeStaffRecipients = staffRecipients.filter((recipient) => recipient.active !== false && recipient.email.trim());
  const activeHotelRecipients = hotelRecipients.filter((recipient) => recipient.active !== false && recipient.email.trim());
  const staffAlertCount = [settings.quoteAlertEnabled, settings.priceSentStaffAlertEnabled, settings.paymentSubmittedAlertEnabled].filter(Boolean).length;
  const hotelAlertCount = [settings.bookingConfirmedHotelAlertEnabled].filter(Boolean).length;
  const enabledAlertCount = staffAlertCount + hotelAlertCount;
  const staffAlertsReady = staffAlertCount > 0 && activeStaffRecipients.length > 0;
  const hotelAlertsReady = hotelAlertCount > 0 && activeHotelRecipients.length > 0;
  const alertsReady = settings.emailAlertsEnabled && (staffAlertsReady || hotelAlertsReady);

  function setField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function addRecipient(groupKey) {
    setSettings((current) => ({
      ...current,
      [groupKey]: [...(current[groupKey] || []), { email: "", active: true }],
    }));
  }

  function updateRecipient(groupKey, index, key, value) {
    setSettings((current) => ({
      ...current,
      [groupKey]: (current[groupKey] || []).map((recipient, recipientIndex) => (
        recipientIndex === index ? { ...recipient, [key]: value } : recipient
      )),
    }));
  }

  function removeRecipient(groupKey, index) {
    setSettings((current) => ({
      ...current,
      [groupKey]: (current[groupKey] || []).filter((_, recipientIndex) => recipientIndex !== index),
    }));
  }

  async function save(event) {
    event.preventDefault();
    const nextStaffRecipients = sanitizeRecipients(staffRecipients);
    const nextHotelRecipients = sanitizeRecipients(hotelRecipients);
    const invalidStaff = nextStaffRecipients.find((recipient) => !emailPattern.test(recipient.email));
    const invalidHotel = nextHotelRecipients.find((recipient) => !emailPattern.test(recipient.email));

    if (invalidStaff || invalidHotel) {
      const invalid = invalidStaff || invalidHotel;
      const group = invalidStaff ? "staff" : "hotel";
      setError(`Invalid ${group} email address: ${invalid.email}`);
      return;
    }

    setError("");
    await saveSettings({
      ...settings,
      staffEmailRecipients: nextStaffRecipients,
      hotelEmailRecipients: nextHotelRecipients,
    });
    setSettings((current) => ({
      ...current,
      staffEmailRecipients: nextStaffRecipients,
      hotelEmailRecipients: nextHotelRecipients,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">
            <Mail className="h-4 w-4 text-[#cc785c]" /> Email dashboard
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className={`${serif} text-5xl font-medium leading-[1.02] tracking-[-0.04em] md:text-6xl`}>Email Dashboard</h1>
              <p className="mt-4 max-w-3xl text-sm leading-[1.65] text-[#a09d96]">
                Manage staff and hotel recipients for reservation email alerts.
              </p>
            </div>
            <Badge className={alertsReady ? "border-transparent bg-[#5db872] text-white" : "border-[#3a352f] bg-[#252320] text-[#d8d2c9]"}>
              {alertsReady ? "Email alerts active" : "Alerts not ready"}
            </Badge>
          </div>
        </div>

        <form onSubmit={save} className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <section className="rounded-[12px] bg-[#efe9de] p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#faf9f5] text-[#cc785c]">
                <BellRing className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium text-[#252523]">Alert controls</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">
                Turn all email alerts on or off, then control each alert independently.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
                  <div>
                    <Label htmlFor="email-alerts-enabled" className="text-sm font-medium text-[#252523]">Email alerts active</Label>
                    <p className="mt-0.5 text-xs text-[#6c6a64]">Master switch for staff and hotel email alerts.</p>
                  </div>
                  <Switch id="email-alerts-enabled" checked={settings.emailAlertsEnabled} onCheckedChange={(value) => setField("emailAlertsEnabled", value)} />
                </div>

                <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
                  <div>
                    <Label htmlFor="quote-alert-enabled" className="text-sm font-medium text-[#252523]">New quote alert</Label>
                    <p className="mt-0.5 text-xs text-[#6c6a64]">Email active staff when a guest requests a quote.</p>
                  </div>
                  <Switch id="quote-alert-enabled" checked={settings.quoteAlertEnabled} onCheckedChange={(value) => setField("quoteAlertEnabled", value)} />
                </div>

                <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
                  <div>
                    <Label htmlFor="price-sent-staff-alert-enabled" className="text-sm font-medium text-[#252523]">Price sent staff copy</Label>
                    <p className="mt-0.5 text-xs text-[#6c6a64]">Send staff the same guest price email and attachment when price is sent.</p>
                  </div>
                  <Switch id="price-sent-staff-alert-enabled" checked={settings.priceSentStaffAlertEnabled} onCheckedChange={(value) => setField("priceSentStaffAlertEnabled", value)} />
                </div>

                <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
                  <div>
                    <Label htmlFor="payment-submitted-alert-enabled" className="text-sm font-medium text-[#252523]">Payment submitted alert</Label>
                    <p className="mt-0.5 text-xs text-[#6c6a64]">Email staff when a guest submits payment proof, with the screenshot attached.</p>
                  </div>
                  <Switch id="payment-submitted-alert-enabled" checked={settings.paymentSubmittedAlertEnabled} onCheckedChange={(value) => setField("paymentSubmittedAlertEnabled", value)} />
                </div>

                <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
                  <div>
                    <Label htmlFor="booking-confirmed-hotel-alert-enabled" className="text-sm font-medium text-[#252523]">Booking confirmed hotel alert</Label>
                    <p className="mt-0.5 text-xs text-[#6c6a64]">Email active hotel inboxes when a booking is confirmed.</p>
                  </div>
                  <Switch id="booking-confirmed-hotel-alert-enabled" checked={settings.bookingConfirmedHotelAlertEnabled} onCheckedChange={(value) => setField("bookingConfirmedHotelAlertEnabled", value)} />
                </div>
              </div>

              {settings.emailAlertsEnabled && staffAlertCount > 0 && activeStaffRecipients.length === 0 && (
                <p className="mt-4 rounded-[8px] border border-[#e0c18d] bg-[#fff4df] px-3 py-2 text-xs leading-relaxed text-[#7b5428]">
                  Add at least one active staff email before staff alerts can be sent.
                </p>
              )}
              {settings.emailAlertsEnabled && hotelAlertCount > 0 && activeHotelRecipients.length === 0 && (
                <p className="mt-3 rounded-[8px] border border-[#e0c18d] bg-[#fff4df] px-3 py-2 text-xs leading-relaxed text-[#7b5428]">
                  Add at least one active hotel email before booking confirmed hotel alerts can be sent.
                </p>
              )}
            </section>

            <section className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8e8b82]">Status</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[10px] bg-[#efe9de] p-3">
                  <p className="text-2xl font-semibold text-[#252523]">{staffRecipients.length + hotelRecipients.length}</p>
                  <p className="text-xs text-[#6c6a64]">Total recipients</p>
                </div>
                <div className="rounded-[10px] bg-[#efe9de] p-3">
                  <p className="text-2xl font-semibold text-[#252523]">{enabledAlertCount}</p>
                  <p className="text-xs text-[#6c6a64]">Enabled alerts</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <RecipientSection
              title="Staff email recipients"
              description="Add, edit, delete, or pause staff inboxes for email alerts."
              label="Staff email"
              placeholder="staff@example.com"
              emptyTitle="No staff emails yet"
              emptyCopy="Add a recipient to start sending staff alerts."
              icon={Mail}
              recipients={staffRecipients}
              groupKey="staffEmailRecipients"
              onAdd={addRecipient}
              onUpdate={updateRecipient}
              onRemove={removeRecipient}
            />

            <RecipientSection
              title="Hotel email recipients"
              description="Add, edit, delete, or pause hotel inboxes for email alerts."
              label="Hotel email"
              placeholder="hotel@example.com"
              emptyTitle="No hotel emails yet"
              emptyCopy="Add a hotel inbox to send booking confirmed alerts."
              icon={Building2}
              recipients={hotelRecipients}
              groupKey="hotelEmailRecipients"
              onAdd={addRecipient}
              onUpdate={updateRecipient}
              onRemove={removeRecipient}
            />

            {error && <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" className={primaryButton}>
                {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save email settings"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
