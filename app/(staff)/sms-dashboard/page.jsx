"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { validateReminderSettings } from "@/convex/guestReminderPolicy";
import { Check, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SETTINGS, useSettings, useSettingsActions } from "@/lib/store";
import {
  normalizeBookingConfirmedSmsTemplates,
  normalizePaymentSubmittedSmsTemplates,
  normalizePaymentVerifiedSmsTemplates,
  normalizePriceSentSmsTemplates,
  validateSmsTemplates,
} from "@/lib/sms-templates";

const MAX_SMS_LENGTH = 1600;
const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";

const SMS_STATUS_CONFIGS = [
  {
    value: "price-sent",
    label: "PRICE SENT",
    title: "Guest price sent SMS",
    description: "Send the selected quote SMS after a reservation is saved or updated as PRICE SENT.",
    enabledKey: "priceSentSmsEnabled",
    templatesKey: "priceSentSmsTemplates",
    templateIdKey: "priceSentSmsTemplateId",
    normalize: normalizePriceSentSmsTemplates,
    placeholders: ["{guestName}", "{retailPrice}", "{discount}", "{estimatedSavings}", "{yourPrice}", "{cleaningFeeNotice}", "{retailPriceScreenshotBlock}", "{retailPriceScreenshotUrl}", "{ticketUrl}"],
  },
  {
    value: "payment-submitted",
    label: "PAYMENT SUBMITTED",
    title: "Guest payment submitted SMS",
    description: "Acknowledge receipt of payment proof while it is waiting for staff verification.",
    enabledKey: "paymentSubmittedSmsEnabled",
    templatesKey: "paymentSubmittedSmsTemplates",
    templateIdKey: "paymentSubmittedSmsTemplateId",
    normalize: normalizePaymentSubmittedSmsTemplates,
    placeholders: ["{{guestName}}", "{{paymentMethod}}", "{{paymentDate}}", "{{ticketUrl}}"],
  },
  {
    value: "payment-verified",
    label: "PAYMENT VERIFIED",
    title: "Guest payment verified SMS",
    description: "Tell the guest that payment is verified and the reservation is being finalized.",
    enabledKey: "paymentVerifiedSmsEnabled",
    templatesKey: "paymentVerifiedSmsTemplates",
    templateIdKey: "paymentVerifiedSmsTemplateId",
    normalize: normalizePaymentVerifiedSmsTemplates,
    placeholders: ["{{guestName}}", "{{paymentMethod}}", "{{paymentDate}}", "{{checkIn}}", "{{checkOut}}", "{{roomType}}", "{{ticketUrl}}"],
  },
  {
    value: "booking-confirmed",
    label: "BOOKING CONFIRMED",
    title: "Guest booking confirmed SMS",
    description: "Send the reservation confirmation number and confirm where the PDF was emailed.",
    enabledKey: "bookingConfirmedSmsEnabled",
    templatesKey: "bookingConfirmedSmsTemplates",
    templateIdKey: "bookingConfirmedSmsTemplateId",
    normalize: normalizeBookingConfirmedSmsTemplates,
    placeholders: ["{{guestName}}", "{{confirmationNumber}}", "{{email}}", "{{checkIn}}", "{{checkOut}}", "{{roomType}}", "{{ticketUrl}}"],
  },
];

function replacePreviewValue(message, placeholder, value) {
  const name = placeholder.replaceAll("{", "").replaceAll("}", "");
  return message.replaceAll(`{{${name}}}`, value).replaceAll(`{${name}}`, value);
}

function previewMessage(template) {
  const replacements = {
    guestName: "Alex Morgan",
    email: "alex@example.com",
    confirmationNumber: "RC-123456",
    paymentMethod: "Zelle",
    paymentDate: "July 20, 2026",
    checkIn: "August 10, 2026",
    checkOut: "August 14, 2026",
    roomType: "Deluxe Ocean View",
    retailPrice: "$5,000",
    discount: "35% off",
    estimatedSavings: "$1,750",
    yourPrice: "$3,250",
    cleaningFeeNotice: "Cleaning fee is paid directly to the Ritz at check-in and is not included in the private rate above.",
    retailPriceScreenshotBlock: "Ritz website retail price image: https://reservations.example.com/ticket/example-ticket/retail-price-image",
    retailPriceScreenshotUrl: "https://reservations.example.com/ticket/example-ticket/retail-price-image",
    ticketUrl: "https://reservations.example.com/ticket/example-ticket",
    quoteExpiryHawaii: "Aug 3, 2026, 10:00 AM",
  };

  return Object.entries(replacements)
    .reduce((message, [name, value]) => replacePreviewValue(message, name, value), String(template || ""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function SmsStatusPanel({ config, settings, setField, updateTemplate }) {
  const templates = config.normalize(settings[config.templatesKey]);
  const activeTemplate = templates.find((template) => template.id === settings[config.templateIdKey]) || templates[0];
  const preview = previewMessage(activeTemplate.content);

  return (
    <div className="space-y-4 pt-3">
      <section className="rounded-[12px] bg-[#efe9de] p-5">
        <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
          <div>
            <Label htmlFor={`${config.value}-enabled`} className="text-sm font-medium text-[#252523]">{config.title}</Label>
            <p className="mt-0.5 text-xs leading-relaxed text-[#6c6a64]">{config.description}</p>
          </div>
          <Switch id={`${config.value}-enabled`} checked={settings[config.enabledKey]} onCheckedChange={(value) => setField(config.enabledKey, value)} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#6c6a64]">A successful Quo send is recorded once per reservation for this status, so later saves or status re-entry do not send duplicates.</p>
      </section>

      <section className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
        <h2 className="text-lg font-medium text-[#252523]">{config.label} templates</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">Choose one active template and customize the message options below.</p>
        <div className="mt-5 space-y-4">
          {templates.map((template, index) => {
            const active = template.id === activeTemplate.id;
            return (
              <div key={template.id} className={`rounded-[10px] border p-4 ${active ? "border-[#cc785c] bg-[#fff4ef]" : "border-[#e6dfd8] bg-[#faf9f5]"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8e8b82]">Template {index + 1}</p>
                    <p className="mt-1 text-sm text-[#6c6a64]">{active ? `This template is sent for ${config.label} reservations.` : "Select to make this the active SMS."}</p>
                  </div>
                  <Button type="button" variant={active ? "default" : "outline"} onClick={() => setField(config.templateIdKey, template.id)} className={active ? "h-9 rounded-[8px] bg-[#cc785c] text-white hover:bg-[#a9583e]" : "h-9 rounded-[8px] border-[#d9cfc2] bg-[#faf9f5] text-[#252523] hover:bg-white"}>
                    {active ? "Active template" : "Use this template"}
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`${config.value}-${template.id}-name`} className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Template name</Label>
                  <Input id={`${config.value}-${template.id}-name`} value={template.name} onChange={(event) => updateTemplate(config, template.id, "name", event.target.value)} className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none focus-visible:ring-[#cc785c]" />
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`${config.value}-${template.id}-content`} className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Message</Label>
                  <Textarea id={`${config.value}-${template.id}-content`} value={template.content} onChange={(event) => updateTemplate(config, template.id, "content", event.target.value)} className="min-h-32 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none focus-visible:ring-[#cc785c]" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8e8b82]">Active template preview</p>
        <p className="mt-3 whitespace-pre-wrap rounded-[10px] bg-[#efe9de] p-4 text-sm leading-relaxed text-[#252523]">{preview || "Your SMS preview will appear here."}</p>
        <p className={`mt-2 text-xs ${preview.length > MAX_SMS_LENGTH ? "font-medium text-red-600" : "text-[#6c6a64]"}`}>{preview.length} / {MAX_SMS_LENGTH} characters in the preview</p>
        <p className="mt-3 text-xs leading-relaxed text-[#6c6a64]">Available values: {config.placeholders.map((placeholder, index) => <span key={placeholder}>{index > 0 && ", "}<code>{placeholder}</code></span>)}.</p>
        {config.value === "booking-confirmed" && <p className="mt-2 text-xs leading-relaxed text-[#6c6a64]">Templates using <code>{"{{confirmationNumber}}"}</code> or <code>{"{{email}}"}</code> wait until that reservation value is available.</p>}
      </section>
    </div>
  );
}

function ScheduledRemindersPanel({ settings, setField }) {
  const history = useQuery(api.guestReminders.list, {});
  const time = (value) => new Date(value).toLocaleString("en-US", { timeZone: "Pacific/Honolulu" });
  return <section className="mt-6 space-y-4 rounded-[12px] border border-[#e6dfd8] p-5">
    <h2 className="text-xl font-medium">Scheduled guest reminders</h2>
    <p className="text-sm text-[#6c6a64]">Off by default. Review the messages, test with the SMS allowlist, then enable and save. Eligible existing reservations are also scheduled; expired quotes and past checkout-reminder windows are never replayed.</p>
    {[
      { kind: "quoteReminder", title: "Day-3 quote reminder", description: "One SMS per quote round, 24 hours before expiration. Only unpaid, active quotes with payable dates are eligible." },
      { kind: "checkoutReminder", title: "Day-before-checkout reminder", description: "One SMS per confirmed reservation on the day before checkout. Changing dates before sending reschedules it; changing dates after acceptance does not send it again." },
    ].map(({ kind, title, description }) => <div key={kind} className="space-y-3 rounded-lg bg-[#efe9de] p-4">
      <div className="flex items-center justify-between gap-4">
        <div><Label htmlFor={`${kind}-enabled`}>{title}</Label><p className="mt-1 text-xs text-[#6c6a64]">{description}</p></div>
        <Switch id={`${kind}-enabled`} checked={settings[`${kind}SmsEnabled`]} onCheckedChange={(value) => setField(`${kind}SmsEnabled`, value)} />
      </div>
      {kind === "checkoutReminder" && <div className="max-w-xs space-y-2"><Label htmlFor="checkout-reminder-time">Send time (Hawaii / Pacific/Honolulu)</Label><Input id="checkout-reminder-time" type="time" value={settings.checkoutReminderTime} onChange={(event) => setField("checkoutReminderTime", event.target.value)} /></div>}
      <Label htmlFor={`${kind}-template`}>Message</Label>
      <Textarea id={`${kind}-template`} value={settings[`${kind}SmsTemplate`]} onChange={(event) => setField(`${kind}SmsTemplate`, event.target.value)} className="min-h-28 bg-[#faf9f5]" />
      <p className="whitespace-pre-wrap rounded-lg bg-[#faf9f5] p-3 text-sm">{previewMessage(settings[`${kind}SmsTemplate`])}</p>
      <p className="text-xs text-[#6c6a64]">Values: {"{guestName}, {checkIn}, {checkOut}, {ticketUrl}, {quoteExpiryHawaii}"}. The quote reminder must retain its expiration and ticket link. Keep all housekeeping instructions in the checkout message.</p>
    </div>)}
    <p className="text-xs text-[#6c6a64]">STOP, staff takeover, test mode, and current reservation state are rechecked before every send. A skipped reminder is not automatically replayed for the same quote/stay. Ambiguous provider results are never retried automatically; check Quo history first. Only explicit rate-limit/retryable rejections are retried (up to 3 calls). <Link href="/attention" className="underline">Review failures</Link>.</p>
    <h3 className="font-medium">Recent reminder jobs</h3>
    <p className="text-xs text-[#6c6a64]">Latest 100 jobs. Times below are Hawaii time. Accepted is provider acceptance, not confirmed delivery.</p>
    {history === undefined && <p className="text-sm">Loading reminders...</p>}
    {history?.length === 0 && <p className="text-sm text-[#6c6a64]">No reminders scheduled yet.</p>}
    <div className="max-h-96 space-y-2 overflow-y-auto">{history?.map((row) => <article key={row._id} className="rounded-lg border border-[#e6dfd8] bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><span>{row.kind === "quoteReminder" ? "Quote reminder" : "Checkout reminder"}</span><Badge variant="outline">{row.status}</Badge></div>
      <p className="mt-1 text-xs text-[#6c6a64]">Due: {time(row.dueAt)} · {row.attempts} provider attempt(s)</p>
      {row.reason && <p className="mt-1 text-xs text-amber-800">{row.reason}</p>}
      {row.providerMessageId && <p className="mt-1 break-all text-xs text-[#6c6a64]">Provider ID: {row.providerMessageId}</p>}
      <Link href={`/new?id=${encodeURIComponent(row.ticketId)}`} className="mt-1 inline-block text-xs text-[#a9583e] underline">Open reservation</Link>
    </article>)}</div>
  </section>;
}

export default function SmsDashboardPage() {
  const savedSettings = useSettings();
  const { saveSettings } = useSettingsActions();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  function setField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateTemplate(config, id, key, value) {
    setSettings((current) => ({
      ...current,
      [config.templatesKey]: config.normalize(current[config.templatesKey]).map((template) => (
        template.id === id ? { ...template, [key]: value } : template
      )),
    }));
  }

  async function save(event) {
    event.preventDefault();
    const nextSettings = { ...settings };
    try {
      Object.assign(nextSettings, validateReminderSettings(settings));
      for (const kind of ["quoteReminder", "checkoutReminder"]) {
        if (previewMessage(settings[`${kind}SmsTemplate`]).length > MAX_SMS_LENGTH) throw new Error("Reminder preview exceeds 1600 characters");
      }
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    for (const config of SMS_STATUS_CONFIGS) {
      const templates = config.normalize(settings[config.templatesKey]).map((template) => ({
        id: template.id,
        name: String(template.name || ""),
        content: String(template.content || ""),
      }));
      const templateError = validateSmsTemplates(templates);
      if (templateError) {
        setError(`${config.label}: ${templateError}`);
        return;
      }
      const overlongTemplate = templates.find((template) => previewMessage(template.content).length > MAX_SMS_LENGTH);
      if (overlongTemplate) {
        setError(`${config.label} ${overlongTemplate.name} must render at ${MAX_SMS_LENGTH} characters or fewer.`);
        return;
      }
      nextSettings[config.templatesKey] = templates;
    }

    setError("");
    try {
      await saveSettings(nextSettings);
    } catch (saveError) {
      setError(saveError.message || "Failed to save SMS settings");
      return;
    }
    setSettings(nextSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const activeCount = SMS_STATUS_CONFIGS.filter((config) => settings[config.enabledKey]).length;

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1000px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">
            <MessageSquare className="h-4 w-4 text-[#cc785c]" /> Guest messaging
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className={`${serif} text-5xl font-medium leading-[1.02] tracking-[-0.04em] md:text-6xl`}>SMS Dashboard</h1>
              <p className="mt-4 max-w-2xl text-sm leading-[1.65] text-[#a09d96]">Manage automatic Quo messages for each milestone in the guest reservation lifecycle.</p>
            </div>
            <Badge className={activeCount ? "border-transparent bg-[#5db872] text-white" : "border-[#3a352f] bg-[#252320] text-[#d8d2c9]"}>{activeCount} of 4 active</Badge>
          </div>
        </div>

        <form onSubmit={save}>
          <Tabs defaultValue="price-sent">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-[12px] bg-[#efe9de] p-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {SMS_STATUS_CONFIGS.map((config) => (
                <TabsTrigger key={config.value} value={config.value} className="min-h-10 rounded-[8px] px-2 text-xs data-[state=active]:bg-[#181715] data-[state=active]:text-white">{config.label}</TabsTrigger>
              ))}
            </TabsList>
            {SMS_STATUS_CONFIGS.map((config) => (
              <TabsContent key={config.value} value={config.value}>
                <SmsStatusPanel config={config} settings={settings} setField={setField} updateTemplate={updateTemplate} />
              </TabsContent>
            ))}
          </Tabs>

          <ScheduledRemindersPanel settings={settings} setField={setField} />

          <p className="mt-4 text-xs leading-relaxed text-[#6c6a64]">Quo sends to guest phone numbers in E.164 format, such as <code>+18085551234</code>. SMS test mode and the allowlist are enforced immediately before every delivery.</p>
          {error && <p className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button type="submit" className={primaryButton}>{saved ? <><Check className="h-4 w-4" /> Saved</> : "Save SMS settings"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
