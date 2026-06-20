"use client"

import React from "react";

function SpikeMark({ className = "" }) {
  return (
    <span className={`relative inline-flex h-5 w-5 items-center justify-center ${className}`} aria-hidden="true">
      <span className="absolute h-5 w-[2px] rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] rotate-45 rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] rotate-90 rounded-full bg-current" />
      <span className="absolute h-5 w-[2px] -rotate-45 rounded-full bg-current" />
    </span>
  );
}

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-[#faf9f5] px-5 py-10 text-[#141413] md:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1120px] items-center gap-10 lg:grid-cols-[0.95fr_1fr]">
        <section className="hidden rounded-[16px] bg-[#181715] p-8 text-[#faf9f5] lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#faf9f5] text-[#141413]">
              <SpikeMark className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Ritz Reservations</p>
              <p className="text-[11px] text-[#a09d96]">Private staff workspace</p>
            </div>
          </div>
          <div className="mt-16">
            <p className="mb-4 inline-flex rounded-full bg-[#cc785c] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white">Secure access</p>
            <h2 className="font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif] text-6xl font-medium leading-[1.02] tracking-[-0.045em]">
              Quotes, tickets, and guest details in one calm workspace.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-[1.7] text-[#a09d96]">
              Sign in to manage private reservations, review quote requests, and keep guest-facing flows synchronized with Convex.
            </p>
          </div>
          <div className="mt-14 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              "Convex-backed data",
              "Staff-only routes",
              "Ticketed follow-up",
            ].map((item) => (
              <div key={item} className="rounded-[12px] bg-[#252320] p-4 text-[#faf9f5]">
                <SpikeMark className="mb-3 h-4 w-4 text-[#cc785c]" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#efe9de] text-[#cc785c]">
              <Icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif] text-5xl font-medium leading-[1.03] tracking-[-0.04em] text-[#141413]">{title}</h1>
            {subtitle && <p className="mt-3 text-sm leading-relaxed text-[#6c6a64]">{subtitle}</p>}
          </div>
          <div className="rounded-[16px] border border-[#e6dfd8] bg-[#faf9f5] p-6 md:p-8">
            {children}
          </div>
          {footer && (
            <p className="text-center text-sm text-[#6c6a64] mt-6">{footer}</p>
          )}
        </section>
      </div>
    </div>
  );
}
