"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Info } from "lucide-react";
import Link from "next/link";
import { DEFAULT_SETTINGS, useSettings } from "@/lib/store";

export default function PayDialog({ open, onOpenChange, faqLink, onConfirmPayment }) {
  const settings = useSettings() || DEFAULT_SETTINGS;
  const activeMethods = (settings.paymentMethods || []).filter((m) => !m.hidden);
  const [step, setStep] = useState("terms");
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Payment proof must be an image.");
      return;
    }
    setError("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [screenshotPreview]);

  const close = (v) => {
    onOpenChange(v);
    if (!v) {
      setStep("terms");
      setAgreed(false);
      setMethod("");
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setSaving(false);
      setError("");
    }
  };

  const save = async () => {
    if (!method || !screenshotFile) return;
    setSaving(true);
    try {
      await onConfirmPayment(method, screenshotFile);
      close(false);
    } catch {
      setError("Payment proof upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {step === "terms" ? (
          <>
            <DialogHeader>
              <DialogTitle>Before you pay</DialogTitle>
              <DialogDescription className="pt-2 leading-relaxed">
                Please confirm that you have read and agree to the{" "}
                <Link href="/ritz-info" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">Ritz Info</Link>
                {" "}and{" "}
                <Link href="/faq" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">FAQ terms</Link>.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 leading-relaxed">
              A cleaning fee of ${settings.cleaningFee} is paid directly to the Ritz at check-in and is not part of your quoted price.
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={setAgreed}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label htmlFor="agree" className="text-sm cursor-pointer select-none">
                I have read and agree to the terms.
              </label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                disabled={!agreed}
                onClick={() => setStep("method")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Select Payment Method</DialogTitle>
            </DialogHeader>

            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                {activeMethods.map((m) => (
                  <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {method && activeMethods.find((m) => m.name === method)?.instructions && (
              <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 text-green-700 shrink-0" />
                <p className="text-xs text-green-800 leading-relaxed">{activeMethods.find((m) => m.name === method).instructions}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Payment Screenshot (required)</p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {screenshotPreview ? (
                <div className="relative border rounded-lg overflow-hidden">
                  <img src={screenshotPreview} alt="Payment proof" className="w-full max-h-48 object-contain bg-secondary/30" />
                  <Button
                    variant="secondary" size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => {
                      setScreenshotFile(null);
                      setScreenshotPreview(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 border border-dashed rounded-lg py-6 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to attach screenshot</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("terms")}>Back</Button>
              <Button disabled={!method || !screenshotFile || saving} onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">{saving ? "Uploading..." : "Confirm Payment"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
