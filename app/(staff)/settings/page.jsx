"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Plus, X, Eye, EyeOff } from "lucide-react";
import { DEFAULT_SETTINGS, useSettings, useSettingsActions } from "@/lib/store";

export default function SettingsPage() {
  const savedSettings = useSettings();
  const { saveSettings } = useSettingsActions();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  const setTier = (i, k, v) =>
    setSettings((s) => ({
      ...s,
      discountTiers: s.discountTiers.map((t, idx) => (idx === i ? { ...t, [k]: Number(v) } : t)),
    }));

  // Room types helpers
  const addRoom = () =>
    setSettings((s) => ({ ...s, roomTypes: [...(s.roomTypes || []), { name: "", hidden: false }] }));
  const updateRoom = (i, k, v) =>
    setSettings((s) => ({ ...s, roomTypes: s.roomTypes.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) }));
  const removeRoom = (i) =>
    setSettings((s) => ({ ...s, roomTypes: s.roomTypes.filter((_, idx) => idx !== i) }));

  // Payment methods helpers
  const addPaymentMethod = () =>
    setSettings((s) => ({ ...s, paymentMethods: [...(s.paymentMethods || []), { name: "", instructions: "", hidden: false }] }));
  const updatePaymentMethod = (i, k, v) =>
    setSettings((s) => ({ ...s, paymentMethods: s.paymentMethods.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)) }));
  const removePaymentMethod = (i) =>
    setSettings((s) => ({ ...s, paymentMethods: s.paymentMethods.filter((_, idx) => idx !== i) }));

  const save = async (e) => {
    e.preventDefault();
    await saveSettings({
      ...settings,
      defaultRetailPrice: Number(settings.defaultRetailPrice),
      cleaningFee: Number(settings.cleaningFee),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground mt-0.5 mb-6">Defaults used across all new reservations.</p>

      <form onSubmit={save} className="space-y-6">
        {/* Pricing */}
        <div className="border rounded-xl bg-card p-5 md:p-6 space-y-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pricing defaults</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default retail price ($)</Label>
              <Input type="number" step="0.01" value={settings.defaultRetailPrice} onChange={(e) => set("defaultRetailPrice", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cleaning fee ($)</Label>
              <Input type="number" step="0.01" value={settings.cleaningFee} onChange={(e) => set("cleaningFee", e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Paid by guests directly to the Ritz — never added to totals.</p>
            </div>
          </div>
        </div>

        {/* Discount tiers */}
        <div className="border rounded-xl bg-card p-5 md:p-6 space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Discount tiers</p>
          <div className="space-y-2">
            {settings.discountTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Input type="number" className="w-20" value={tier.nights} onChange={(e) => setTier(i, "nights", e.target.value)} />
                <span className="text-muted-foreground">{i === settings.discountTiers.length - 1 ? "+ nights →" : "nights →"}</span>
                <Input type="number" className="w-20" value={tier.discount} onChange={(e) => setTier(i, "discount", e.target.value)} />
                <span className="text-muted-foreground">% off</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hotel info */}
        <div className="border rounded-xl bg-card p-5 md:p-6 space-y-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Hotel info</p>
          <div className="space-y-2">
            <Label>App name <span className="text-muted-foreground font-normal">(browser/tab title)</span></Label>
            <Input value={settings.appName || ""} onChange={(e) => set("appName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hotel name</Label>
            <Input value={settings.hotelName} onChange={(e) => set("hotelName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={settings.hotelAddress} onChange={(e) => set("hotelAddress", e.target.value)} />
          </div>
        </div>

        {/* Room Types */}
        <div className="border rounded-xl bg-card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Room Types</p>
            <Button type="button" variant="outline" size="sm" onClick={addRoom}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Room
            </Button>
          </div>
          <div className="space-y-2">
            {(settings.roomTypes || []).map((room, i) => (
              <div key={i} className={`flex items-center gap-2 ${room.hidden ? "opacity-50" : ""}`}>
                <Input
                  value={room.name}
                  onChange={(e) => updateRoom(i, "name", e.target.value)}
                  placeholder="e.g. Deluxe Ocean View, 1 King, Sofa Bed"
                />
                <Button
                  type="button" variant="ghost" size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => updateRoom(i, "hidden", !room.hidden)}
                  title={room.hidden ? "Show" : "Hide"}
                >
                  {room.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRoom(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {(settings.roomTypes || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No room types yet. Click "Add Room" to add one.</p>
            )}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="border rounded-xl bg-card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Payment Instructions</p>
            <Button type="button" variant="outline" size="sm" onClick={addPaymentMethod}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Method
            </Button>
          </div>
          <div className="space-y-3">
            {(settings.paymentMethods || []).map((method, i) => (
              <div key={i} className={`border rounded-lg p-3 space-y-2 ${method.hidden ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <Input
                    value={method.name}
                    onChange={(e) => updatePaymentMethod(i, "name", e.target.value)}
                    placeholder="Method name (e.g. Zelle)"
                    className="font-medium text-sm"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => updatePaymentMethod(i, "hidden", !method.hidden)}
                    title={method.hidden ? "Show" : "Hide"}
                  >
                    {method.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removePaymentMethod(i)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={method.instructions}
                  onChange={(e) => updatePaymentMethod(i, "instructions", e.target.value)}
                  className="h-20 resize-none text-sm"
                  placeholder={`Instructions for ${method.name || "this"} payment…`}
                />
              </div>
            ))}
            {(settings.paymentMethods || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No payment methods yet. Click "Add Method" to add one.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            {saved ? <><Check className="w-4 h-4 mr-1.5" /> Saved</> : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
