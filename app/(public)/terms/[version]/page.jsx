"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeft, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";

export default function TermsVersionPage() {
  const { version } = useParams();
  const terms = useQuery(api.terms.getPublic, version ? { version: String(version) } : "skip");

  return (
    <main className="min-h-screen bg-[#faf9f5] px-5 py-10 text-[#141413] md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#6c6a64] hover:text-[#141413]"><ArrowLeft className="h-4 w-4" /> Back to reservations</Link>
        <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e6dfd8] bg-white shadow-sm">
          <header className="bg-[#181715] p-6 text-white md:p-8">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#b8b4ac]"><FileCheck2 className="h-4 w-4 text-[#f0a48a]" /> Booking agreement</p>
            <h1 className="mt-3 font-['Cormorant_Garamond',_'Times_New_Roman',_serif] text-4xl font-medium">Terms and Conditions</h1>
            <p className="mt-2 text-sm text-[#b8b4ac]">Version {String(version || "")}</p>
          </header>
          <div className="p-6 md:p-8">
            {terms === undefined && <div className="flex items-center gap-2 text-sm text-[#6c6a64]"><Loader2 className="h-4 w-4 animate-spin" /> Loading published Terms...</div>}
            {terms === null && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">This Terms version is not published. Ask Sara or a reservations specialist for the current version.</p>}
            {terms && (
              <>
                <div className="flex items-start gap-2 rounded-xl border border-[#e6dfd8] bg-[#faf9f5] p-3 text-xs leading-relaxed text-[#6c6a64]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#cc785c]" /> These are immutable published Terms for an independent private residence reservation service, not the official hotel reservations desk.</div>
                <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-[#35332f]">{terms.content}</div>
                <p className="mt-8 border-t border-[#e6dfd8] pt-4 text-xs text-[#8e8b82]">Published {new Date(terms.publishedAt).toLocaleDateString()} - Reference {terms.contentHash.slice(0, 12)}</p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
