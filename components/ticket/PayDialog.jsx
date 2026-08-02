"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  ImagePlus,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/calc";

const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const STEPS = [
  { id: "terms", label: "Agree" },
  { id: "method", label: "Pay" },
  { id: "proof", label: "Upload" },
];

export default function PayDialog({ open, onOpenChange, onAcceptTerms, onConfirmPayment, paymentOptions, amount }) {
  const activeMethods = paymentOptions?.methods || [];
  const contentRef = useRef(null);
  const [step, setStep] = useState("terms");
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copyState, setCopyState] = useState("idle");
  const [error, setError] = useState("");
  const selectedMethod = activeMethods.find((option) => option.name === method);
  const instructionsReady = paymentOptions?.termsAccepted === true && activeMethods.some((option) => option.instructions);
  const currentStepIndex = STEPS.findIndex((item) => item.id === step);

  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [screenshotPreview]);

  useEffect(() => {
    if (!open) return;
    setStep(paymentOptions?.termsAccepted ? "method" : "terms");
    setAgreed(false);
    setError("");
  }, [open, paymentOptions?.termsVersion]);

  useEffect(() => {
    if (copyState !== "copied") return;
    const timeout = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    if (open && contentRef.current) contentRef.current.scrollTop = 0;
  }, [open, step]);

  const reset = () => {
    setStep("terms");
    setAgreed(false);
    setMethod("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setSaving(false);
    setAccepting(false);
    setCopyState("idle");
    setError("");
  };

  const close = (nextOpen) => {
    if (!nextOpen && (saving || accepting)) return;
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image from your camera or photo library.");
      return;
    }
    if (file.size <= 0) {
      setError("That image is empty. Choose a different screenshot.");
      return;
    }
    if (file.size > MAX_PROOF_SIZE) {
      setError("That image is larger than 10 MB. Choose a smaller screenshot.");
      return;
    }

    setError("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeProof = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setError("");
  };

  const acceptTerms = async () => {
    if (!agreed || !paymentOptions?.termsVersion || accepting) return;
    setAccepting(true);
    setError("");
    try {
      await onAcceptTerms(paymentOptions.termsVersion, paymentOptions.termsContentHash);
      setStep("method");
    } catch (acceptError) {
      setError(acceptError.message || "Terms acceptance failed. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const copyInstructions = async () => {
    if (!selectedMethod?.instructions) return;
    try {
      await navigator.clipboard.writeText(selectedMethod.instructions);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const save = async () => {
    if (!method || !screenshotFile || saving) return;
    setSaving(true);
    setError("");
    try {
      await onConfirmPayment(method, screenshotFile, paymentOptions?.termsVersion);
      setStep("success");
    } catch (paymentError) {
      setError(paymentError.message || "Payment proof upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const chooseMethod = (name) => {
    setMethod(name);
    setError("");
    setCopyState("idle");
  };

  const renderProgress = () => (
    <div className="grid grid-cols-3 gap-2" aria-label={`Payment step ${currentStepIndex + 1} of 3`}>
      {STEPS.map((item, index) => {
        const complete = index < currentStepIndex;
        const current = index === currentStepIndex;
        return (
          <div key={item.id} className="text-center">
            <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7 sm:text-xs ${complete ? "bg-[#b48a4f] text-white" : current ? "bg-[#25211d] text-white" : "bg-[#eee7dc] text-[#9a8f80]"}`}>
              {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.12em] ${current || complete ? "text-[#6f4b27]" : "text-[#a59a8d]"}`}>{item.label}</p>
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden border-0 bg-[#fffaf3] p-0 text-[#25211d] sm:h-auto sm:max-h-[92dvh] sm:max-w-lg sm:rounded-[1.75rem] sm:border sm:border-[#dbc7a8] [&>button]:right-5 [&>button]:top-5 [&>button]:z-20"
        onEscapeKeyDown={(event) => (saving || accepting) && event.preventDefault()}
        onPointerDownOutside={(event) => (saving || accepting) && event.preventDefault()}
      >
        {step === "success" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center sm:min-h-[34rem]">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-500">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Screenshot received</p>
            <DialogTitle className="mt-2 text-3xl leading-tight">Payment proof submitted</DialogTitle>
            <DialogDescription className="mt-3 max-w-sm text-sm leading-relaxed text-[#766b5f]">
              Our reservations team will verify your payment next. Your booking is finalized only after payment is verified and confirmed.
            </DialogDescription>
            <div className="mt-6 w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-800">
              <p className="font-semibold">What happens next?</p>
              <p className="mt-1 leading-relaxed">You can follow the verification and booking status on this reservation page.</p>
            </div>
            <Button className="mt-7 h-12 w-full max-w-sm rounded-full bg-[#25211d] text-white hover:bg-[#3a3028]" onClick={() => close(false)}>
              Return to reservation
            </Button>
          </div>
        ) : paymentOptions && paymentOptions.available === false && step !== "proof" ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 text-center sm:min-h-[30rem]">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f1e6d6] text-[#8a5c2e]">
              <Info className="h-7 w-7" />
            </span>
            <DialogTitle className="mt-5 text-2xl">Payment is temporarily unavailable</DialogTitle>
            <DialogDescription className="mt-3 max-w-sm leading-relaxed text-[#766b5f]">
              {paymentOptions.reason || "Please contact the reservations team for help."}
            </DialogDescription>
            <Button variant="outline" className="mt-7 h-11 w-full max-w-sm rounded-full border-[#d8c5a6] bg-white" onClick={() => close(false)}>
              Return to reservation
            </Button>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-[#eadfce] bg-white px-4 pb-3 pt-4 pr-14 sm:px-6 sm:pb-4 sm:pt-5 sm:pr-14">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25211d] text-[#f5d9a6] sm:h-10 sm:w-10">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a6b36]">Secure reservation</p>
                  <p className="mt-0.5 text-lg font-semibold">{fmtMoney(amount)}</p>
                </div>
              </div>
              <div className="mt-3 sm:mt-4">{renderProgress()}</div>
            </div>

            <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              {step === "terms" && (
                <div className="space-y-4">
                  <div>
                    <DialogTitle className="text-xl sm:text-2xl">First, review and agree</DialogTitle>
                    <DialogDescription className="mt-1.5 leading-relaxed text-[#766b5f] sm:mt-2">
                      Read the exact booking agreement below before continuing to payment.
                    </DialogDescription>
                  </div>

                  <Link href={`/terms/${encodeURIComponent(paymentOptions?.termsVersion || "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-[#7a4d23] underline underline-offset-4 hover:text-[#25211d]">
                    Open Terms version {paymentOptions?.termsVersion} in a new tab
                  </Link>

                  <div className="whitespace-pre-wrap rounded-2xl border border-[#ddd5c9] bg-white px-4 py-4 text-xs leading-relaxed text-[#4d443b]">
                    {paymentOptions?.termsContent || "Published Terms are unavailable. Please contact the reservations team."}
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-relaxed text-orange-900">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>A {fmtMoney(paymentOptions?.cleaningFee || 0)} cleaning fee is paid directly to the Ritz at check-in and is not included in your {fmtMoney(amount)} private rate.</p>
                  </div>
                </div>
              )}

              {step === "method" && (
                <div className="space-y-4">
                  <div>
                    <DialogTitle className="text-2xl">Choose how to pay</DialogTitle>
                    <DialogDescription className="mt-2 leading-relaxed text-[#766b5f]">
                      Choose one method, send {fmtMoney(amount)}, then come back here for the last step.
                    </DialogDescription>
                  </div>

                  {!instructionsReady ? (
                    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-[#eadfce] bg-white px-5 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#8a5c2e]" />
                      <p className="mt-3 text-sm font-semibold">Preparing secure payment instructions...</p>
                      <p className="mt-1 text-xs text-[#766b5f]">Your Terms acceptance was recorded.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2" role="radiogroup" aria-label="Payment method">
                        {activeMethods.map((option) => {
                          const selected = method === option.name;
                          return (
                            <button
                              key={option.name}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => chooseMethod(option.name)}
                              className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${selected ? "border-[#8a5c2e] bg-[#fff8ec] shadow-sm" : "border-[#e4ddd2] bg-white hover:border-[#c9ad83]"}`}
                            >
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[#25211d] text-white" : "bg-[#f5ede0] text-[#8a5c2e]"}`}>
                                <CreditCard className="h-4 w-4" />
                              </span>
                              <span className="flex-1 text-sm font-semibold">{option.name}</span>
                              <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#8a5c2e] bg-[#8a5c2e] text-white" : "border-[#c8bfb4]"}`}>
                                {selected && <Check className="h-3 w-3" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {selectedMethod?.instructions && (
                        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
                          <div className="flex items-center justify-between gap-3 border-b border-emerald-200 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                              <Info className="h-4 w-4" /> {selectedMethod.name} instructions
                            </div>
                            <button type="button" onClick={copyInstructions} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100">
                              {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
                            </button>
                          </div>
                          <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-emerald-900">{selectedMethod.instructions}</p>
                        </div>
                      )}

                      <div className="rounded-2xl border border-[#e6d4b7] bg-[#fff4df] px-4 py-3 text-xs leading-relaxed text-[#7b5428]">
                        Send exactly <strong>{fmtMoney(amount)}</strong>. The cleaning fee is paid separately at check-in.
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === "proof" && (
                <div className="space-y-4">
                  <div>
                    <DialogTitle className="text-2xl">Upload your screenshot</DialogTitle>
                    <DialogDescription className="mt-2 leading-relaxed text-[#766b5f]">
                      Last step: attach a screenshot or photo showing that you sent the payment.
                    </DialogDescription>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a8f80]">Payment summary</p>
                      <p className="mt-1 text-sm font-semibold">{method} · {fmtMoney(amount)}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  </div>

                  {screenshotPreview ? (
                    <div className="overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white">
                      <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4" /> Screenshot ready</span>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-[#5d5146]" onClick={removeProof} disabled={saving}>
                          <X className="h-3.5 w-3.5" /> Change
                        </Button>
                      </div>
                      <img src={screenshotPreview} alt="Selected payment proof" className="max-h-64 w-full object-contain bg-[#faf6ef]" />
                    </div>
                  ) : (
                    <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cdbb9e] bg-white px-6 py-8 text-center transition-colors hover:border-[#8a5c2e] hover:bg-[#fffaf3]">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1e6d6] text-[#8a5c2e]">
                        <ImagePlus className="h-6 w-6" />
                      </span>
                      <span className="mt-4 text-base font-semibold">Choose screenshot or photo</span>
                      <span className="mt-1 text-xs leading-relaxed text-[#766b5f]">Tap here to use your camera or photo library. Images up to 10 MB.</span>
                      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25211d] px-4 py-2 text-xs font-semibold text-white"><Upload className="h-3.5 w-3.5" /> Select image</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={saving} />
                    </label>
                  )}
                </div>
              )}

              {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700" role="alert" aria-live="assertive">{error}</p>}
            </div>

            <div className="shrink-0 border-t border-[#eadfce] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5">
              {step === "terms" && (
                <>
                  <label htmlFor="payment-terms-agreement" className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-3 py-3 transition-colors ${agreed ? "border-[#8a5c2e] bg-[#fff8ec]" : "border-[#ddd5c9] bg-white hover:border-[#c9ad83]"}`}>
                    <Checkbox
                      id="payment-terms-agreement"
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(checked === true)}
                      className="mt-0.5 h-5 w-5 shrink-0 border-[#8a5c2e] data-[state=checked]:border-[#8a5c2e] data-[state=checked]:bg-[#8a5c2e]"
                    />
                    <span className="text-xs font-medium leading-relaxed text-[#4d443b]">
                      {paymentOptions?.agreementText || `I agree to the Terms (${paymentOptions?.termsVersion}).`}
                    </span>
                  </label>
                  <Button className="mt-3 h-12 w-full rounded-full bg-[#25211d] text-white hover:bg-[#3a3028]" disabled={!agreed || accepting || !paymentOptions?.termsContent} onClick={acceptTerms}>
                    {accepting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Recording agreement...</>
                      : agreed
                        ? <>I agree, continue <ChevronRight className="h-4 w-4" /></>
                        : "Check the box to continue"}
                  </Button>
                </>
              )}

              {step === "method" && (
                <Button className="h-12 w-full rounded-full bg-[#25211d] text-white hover:bg-[#3a3028]" disabled={!selectedMethod?.instructions} onClick={() => setStep("proof")}>
                  I sent {fmtMoney(amount)} <Upload className="h-4 w-4" />
                </Button>
              )}

              {step === "proof" && (
                <div className="flex gap-2">
                  <Button variant="outline" className="h-12 rounded-full border-[#d8c5a6] bg-white px-4" onClick={() => setStep("method")} disabled={saving}>
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button className="h-12 flex-1 rounded-full bg-[#25211d] text-white hover:bg-[#3a3028]" disabled={!screenshotFile || saving} onClick={save}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting safely...</> : <><ShieldCheck className="h-4 w-4" /> Submit payment proof</>}
                  </Button>
                </div>
              )}
              <p className="mt-2 text-center text-[10px] leading-relaxed text-[#8a7e70]">Your reservation is finalized only after payment is verified.</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
