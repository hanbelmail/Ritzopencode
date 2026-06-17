"use client"

import { QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'

export function QueryClientProvider({ children }) {
  return (
    <TanStackQueryClientProvider client={queryClientInstance}>
      {children}
    </TanStackQueryClientProvider>
  )
}
