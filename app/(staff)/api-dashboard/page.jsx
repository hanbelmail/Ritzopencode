"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, useSettings, useSettingsActions } from "@/lib/store";
import { Code2, LayoutTemplate, Webhook } from "lucide-react";

const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";
const inputClass = "h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none placeholder:text-[#8e8b82] focus-visible:ring-[#cc785c]";
const primaryButton = "h-10 rounded-[8px] bg-[#cc785c] px-5 text-sm font-medium text-white shadow-none hover:bg-[#a9583e]";

export default function ApiDashboardPage() {
  const savedSettings = useSettings();
  const { saveSettings } = useSettingsActions();
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_SETTINGS.webhookUrl);
  const [webhookEnabled, setWebhookEnabled] = useState(DEFAULT_SETTINGS.webhookEnabled);
  const [homePageVariant, setHomePageVariant] = useState(DEFAULT_SETTINGS.homePageVariant);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [homePageSaved, setHomePageSaved] = useState(false);

  useEffect(() => {
    if (!savedSettings) return;
    setWebhookUrl(savedSettings.webhookUrl || "");
    setWebhookEnabled(Boolean(savedSettings.webhookEnabled));
    setHomePageVariant(savedSettings.homePageVariant || DEFAULT_SETTINGS.homePageVariant);
  }, [savedSettings]);

  async function saveWebhookSettings(event) {
    event.preventDefault();
    const nextSettings = {
      ...(savedSettings || DEFAULT_SETTINGS),
      webhookUrl: webhookUrl.trim(),
      webhookEnabled,
    };

    await saveSettings(nextSettings);
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 2000);
  }

  async function saveHomePageSettings(event) {
    event.preventDefault();
    const nextSettings = {
      ...(savedSettings || DEFAULT_SETTINGS),
      homePageVariant,
    };

    await saveSettings(nextSettings);
    setHomePageSaved(true);
    setTimeout(() => setHomePageSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-8 text-[#141413] md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-[16px] bg-[#181715] p-6 text-[#faf9f5] md:p-8">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#a09d96]">
            <Code2 className="h-4 w-4 text-[#cc785c]" /> API dashboard
          </p>
          <h1 className={`${serif} text-5xl font-medium leading-[1.02] tracking-[-0.04em] md:text-6xl`}>API Dashboard</h1>
          <p className="mt-4 max-w-3xl text-sm leading-[1.65] text-[#a09d96]">Manage the public home page design and the n8n webhook used for quote ticket notifications.</p>
        </div>

        <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
          <form onSubmit={saveHomePageSettings} className="space-y-4 rounded-[12px] bg-[#efe9de] p-5">
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#faf9f5] text-[#cc785c]">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-medium text-[#252523]">Home page design</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">Choose which public home page visitors see at /.</p>
            </div>
            <RadioGroup value={homePageVariant} onValueChange={setHomePageVariant} className="gap-3">
              {[
                { value: "classic", title: "Home Page 1 - Classic", copy: "Keep the current quiet luxury layout and existing content flow." },
                { value: "new", title: "Home Page 2 - New", copy: "Use the stronger retail comparison, guest details, and booking steps." },
              ].map((option) => (
                <Label key={option.value} htmlFor={`home-page-${option.value}`} className="flex cursor-pointer gap-3 rounded-[10px] border border-[#e6dfd8] bg-[#faf9f5] p-4 text-[#252523] transition-colors hover:bg-white">
                  <RadioGroupItem id={`home-page-${option.value}`} value={option.value} className="mt-0.5 border-[#cc785c] text-[#cc785c]" />
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#6c6a64]">{option.copy}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <Button type="submit" className={`${primaryButton} w-full`}>{homePageSaved ? "Home page saved" : "Save home page design"}</Button>
          </form>

          <div className="space-y-4">
            <form onSubmit={saveWebhookSettings} className="space-y-4 rounded-[12px] bg-[#efe9de] p-5">
              <div>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#faf9f5] text-[#cc785c]">
                  <Webhook className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-medium text-[#252523]">Quote webhook</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#6c6a64]">Send every home page quote ticket to n8n after it is created.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook-url" className="text-sm font-medium text-[#252523]">n8n webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://n9n.aquaskals.com/webhook-test/get-a-quota"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-between rounded-[8px] border border-[#e6dfd8] bg-[#faf9f5] px-3 py-2">
                <Label htmlFor="webhook-enabled" className="text-sm font-medium text-[#252523]">Webhook active</Label>
                <Switch id="webhook-enabled" checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
              </div>
              <Button type="submit" className={`${primaryButton} w-full`}>{webhookSaved ? "Webhook saved" : "Save webhook settings"}</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
