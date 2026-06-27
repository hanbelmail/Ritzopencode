"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Mail, Plus, Trash2 } from "lucide-react";
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

  const recipients = settings.staffEmailRecipients || [];
  const activeRecipients = recipients.filter((recipient) => recipient.active !== false && recipient.email.trim());
  const enabledAlertCount = [settings.quoteAlertEnabled, settings.priceSentStaffAlertEnabled, settings.paymentSubmittedAlertEnabled].filter(Boolean).length;
  const alertsReady = settings.emailAlertsEnabled && enabledAlertCount > 0 && activeRecipients.length > 0;

  function setField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function addRecipient() {
    setSettings((current) => ({
      ...current,
      staffEmailRecipients: [...(current.staffEmailRecipients || []), { email: "", active: true }],
    }));
  }

  function updateRecipient(index, key, value) {
    setSettings((current) => ({
      ...current,
      staffEmailRecipients: (current.staffEmailRecipients || []).map((recipient, recipientIndex) => (
        recipientIndex === index ? { ...recipient, [key]: value } : recipient
      )),
    }));
  }

  function removeRecipient(index) {
    setSettings((current) => ({
      ...current,
      staffEmailRecipients: (current.staffEmailRecipients || []).filter((_, recipientIndex) => recipientIndex !== index),
    }));
  }

  async function save(event) {
    event.preventDefault();
    const nextRecipients = sanitizeRecipients(recipients);
    const invalid = nextRecipients.find((recipient) => !emailPattern.test(recipient.email));

    if (invalid) {
      setError(`Invalid email address: ${invalid.email}`);
      return;
    }

    setError("");
    await saveSettings({
      ...settings,
      staffEmailRecipients: nextRecipients,
    });
    setSettings((current) => ({ ...current, staffEmailRecipients: nextRecipients }));
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
                Manage staff recipients and alert switches for quote and price emails.
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
                Turn all staff email alerts on or off, then control each alert independently.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
                  <div>
                    <Label htmlFor="email-alerts-enabled" className="text-sm font-medium text-[#252523]">Email alerts active</Label>
                    <p className="mt-0.5 text-xs text-[#6c6a64]">Master switch for staff email alerts.</p>
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
              </div>

              {settings.emailAlertsEnabled && activeRecipients.length === 0 && (
                <p className="mt-4 rounded-[8px] border border-[#e0c18d] bg-[#fff4df] px-3 py-2 text-xs leading-relaxed text-[#7b5428]">
                  Add at least one active staff email before alerts can be sent.
                </p>
              )}
            </section>

            <section className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8e8b82]">Status</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-[10px] bg-[#efe9de] p-3">
                  <p className="text-2xl font-semibold text-[#252523]">{recipients.length}</p>
                  <p className="text-xs text-[#6c6a64]">Total recipients</p>
                </div>
                <div className="rounded-[10px] bg-[#efe9de] p-3">
                  <p className="text-2xl font-semibold text-[#252523]">{enabledAlertCount}</p>
                  <p className="text-xs text-[#6c6a64]">Enabled alerts</p>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[12px] bg-[#efe9de] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-medium text-[#252523]">Staff email recipients</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">Add, edit, delete, or pause staff inboxes for email alerts.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRecipient} className="rounded-[8px] border-[#d9cfc2] bg-[#faf9f5] text-[#252523] hover:bg-white">
                <Plus className="h-3.5 w-3.5" /> Add email
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {recipients.map((recipient, index) => (
                <div key={index} className={`rounded-[10px] border border-[#e6dfd8] bg-[#faf9f5] p-3 ${recipient.active === false ? "opacity-60" : ""}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`staff-email-${index}`} className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Staff email</Label>
                      <Input
                        id={`staff-email-${index}`}
                        type="email"
                        value={recipient.email}
                        onChange={(event) => updateRecipient(index, "email", event.target.value)}
                        placeholder="staff@example.com"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#e6dfd8] px-3 py-2 md:mt-6 md:w-40">
                      <Label htmlFor={`staff-email-active-${index}`} className="text-sm text-[#252523]">Active</Label>
                      <Switch id={`staff-email-active-${index}`} checked={recipient.active !== false} onCheckedChange={(value) => updateRecipient(index, "active", value)} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRecipient(index)} className="self-end text-[#8e8b82] hover:text-red-600 md:mt-6">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {recipients.length === 0 && (
                <div className="rounded-[10px] border border-dashed border-[#d9cfc2] bg-[#faf9f5] p-6 text-center">
                  <Mail className="mx-auto h-8 w-8 text-[#cc785c]" />
                  <p className="mt-3 text-sm font-medium text-[#252523]">No staff emails yet</p>
                  <p className="mt-1 text-xs text-[#6c6a64]">Add a recipient to start sending new quote alerts.</p>
                </div>
              )}
            </div>

            {error && <p className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="mt-5 flex justify-end">
              <Button type="submit" className={primaryButton}>
                {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save email settings"}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
