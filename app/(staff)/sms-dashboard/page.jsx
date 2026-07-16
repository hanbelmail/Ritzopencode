"use client";

import { useEffect, useState } from "react";
import { Check, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SETTINGS, useSettings, useSettingsActions } from "@/lib/store";
import { normalizePriceSentSmsTemplates, validatePriceSentSmsTemplates } from "@/lib/sms-templates";

const MAX_SMS_LENGTH = 1600;
const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";

function previewMessage(template) {
  const replacements = {
    "{guestName}": "Alex Morgan",
    "{retailPrice}": "$5,000",
    "{discount}": "35% off",
    "{estimatedSavings}": "$1,750",
    "{yourPrice}": "$3,250",
    "{cleaningFeeNotice}": "Cleaning fee is paid directly to the Ritz at check-in and is not included in the private rate above.",
    "{retailPriceScreenshotBlock}": "Ritz website retail price image: https://reservations.example.com/ticket/example-ticket/retail-price-image",
    "{retailPriceScreenshotUrl}": "https://reservations.example.com/ticket/example-ticket/retail-price-image",
    "{ticketUrl}": "https://reservations.example.com/ticket/example-ticket",
  };

  return Object.entries(replacements)
    .reduce((message, [placeholder, value]) => message.replaceAll(placeholder, value), template)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

  const templates = Array.isArray(settings.priceSentSmsTemplates)
    ? settings.priceSentSmsTemplates
    : normalizePriceSentSmsTemplates(settings.priceSentSmsTemplates);
  const activeTemplate = templates.find((template) => template.id === settings.priceSentSmsTemplateId) || templates[0];
  const preview = previewMessage(activeTemplate.content);

  function setField(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateTemplate(id, key, value) {
    setSettings((current) => ({
      ...current,
      priceSentSmsTemplates: current.priceSentSmsTemplates.map((template) => (
        template.id === id ? { ...template, [key]: value } : template
      )),
    }));
  }

  async function save(event) {
    event.preventDefault();
    const priceSentSmsTemplates = templates.map((template) => ({
      id: template.id,
      name: String(template.name || ""),
      content: String(template.content || ""),
    }));
    const templateError = validatePriceSentSmsTemplates(priceSentSmsTemplates);
    if (templateError) {
      setError(templateError);
      return;
    }
    const overlongTemplate = priceSentSmsTemplates.find((template) => previewMessage(template.content).length > MAX_SMS_LENGTH);
    if (overlongTemplate) {
      setError(`${overlongTemplate.name} must render at ${MAX_SMS_LENGTH} characters or fewer.`);
      return;
    }

    setError("");
    await saveSettings({ ...settings, priceSentSmsTemplates });
    setSettings((current) => ({ ...current, priceSentSmsTemplates }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
              <p className="mt-4 max-w-2xl text-sm leading-[1.65] text-[#a09d96]">
                Send guests their quote and ticket link through Quo when a reservation reaches PRICE SENT.
              </p>
            </div>
            <Badge className={settings.priceSentSmsEnabled ? "border-transparent bg-[#5db872] text-white" : "border-[#3a352f] bg-[#252320] text-[#d8d2c9]"}>
              {settings.priceSentSmsEnabled ? "SMS alert active" : "SMS alert inactive"}
            </Badge>
          </div>
        </div>

        <form onSubmit={save} className="space-y-4">
          <section className="rounded-[12px] bg-[#efe9de] p-5">
            <div className="flex items-center justify-between gap-4 rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3">
              <div>
                <Label htmlFor="price-sent-sms-enabled" className="text-sm font-medium text-[#252523]">Guest price sent SMS</Label>
                <p className="mt-0.5 text-xs leading-relaxed text-[#6c6a64]">Send one SMS after a reservation is saved or updated as PRICE SENT.</p>
              </div>
              <Switch id="price-sent-sms-enabled" checked={settings.priceSentSmsEnabled} onCheckedChange={(value) => setField("priceSentSmsEnabled", value)} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#6c6a64]">A successful Quo send is recorded per reservation, so later PRICE SENT saves do not send duplicates.</p>
          </section>

          <section className="rounded-[12px] border border-[#e6dfd8] bg-[#faf9f5] p-5">
            <h2 className="text-lg font-medium text-[#252523]">Quote SMS templates</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">Choose one active template and edit all three. Use the available values below wherever they fit your message.</p>
            <div className="mt-5 space-y-4">
              {templates.map((template, index) => {
                const active = template.id === activeTemplate.id;
                return (
                  <div key={template.id} className={`rounded-[10px] border p-4 ${active ? "border-[#cc785c] bg-[#fff4ef]" : "border-[#e6dfd8] bg-[#faf9f5]"}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8e8b82]">Template {index + 1}</p>
                        <p className="mt-1 text-sm text-[#6c6a64]">{active ? "This template is sent for PRICE SENT reservations." : "Select to make this the active SMS."}</p>
                      </div>
                      <Button type="button" variant={active ? "default" : "outline"} onClick={() => setField("priceSentSmsTemplateId", template.id)} className={active ? "h-9 rounded-[8px] bg-[#cc785c] text-white hover:bg-[#a9583e]" : "h-9 rounded-[8px] border-[#d9cfc2] bg-[#faf9f5] text-[#252523] hover:bg-white"}>
                        {active ? "Active template" : "Use this template"}
                      </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`${template.id}-name`} className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Template name</Label>
                      <Input id={`${template.id}-name`} value={template.name} onChange={(event) => updateTemplate(template.id, "name", event.target.value)} className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none focus-visible:ring-[#cc785c]" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`${template.id}-content`} className="text-xs font-medium uppercase tracking-[0.12em] text-[#8e8b82]">Message</Label>
                      <Textarea id={`${template.id}-content`} value={template.content} onChange={(event) => updateTemplate(template.id, "content", event.target.value)} className="min-h-36 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none focus-visible:ring-[#cc785c]" />
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
            <p className="mt-3 text-xs leading-relaxed text-[#6c6a64]">Available values: <code>{"{guestName}"}</code>, <code>{"{retailPrice}"}</code>, <code>{"{discount}"}</code>, <code>{"{estimatedSavings}"}</code>, <code>{"{yourPrice}"}</code>, <code>{"{cleaningFeeNotice}"}</code>, <code>{"{retailPriceScreenshotBlock}"}</code>, <code>{"{retailPriceScreenshotUrl}"}</code>, and <code>{"{ticketUrl}"}</code>.</p>
            <p className="mt-3 text-xs leading-relaxed text-[#6c6a64]">Quo sends to guest phone numbers in E.164 format, such as <code>+18085551234</code>. Set <code>QUO_API_KEY</code> and <code>QUO_FROM</code> in the server environment before activating this alert.</p>
          </section>

          {error && <p className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" className={primaryButton}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save SMS settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
