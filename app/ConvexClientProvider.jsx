"use client"

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs"
import { ConvexReactClient } from "convex/react"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export default function ConvexClientProvider({ children }) {
  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="max-w-md rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Convex is not configured</h1>
          <p className="mt-2 text-sm text-slate-600">
            Run <code className="rounded bg-slate-100 px-1 py-0.5">npx convex dev</code> to create a Convex deployment and populate <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_CONVEX_URL</code>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  )
}
