import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import ConvexClientProvider from '@/app/ConvexClientProvider'
import { AuthProvider } from '@/lib/AuthContext'
import { QueryClientProvider } from '@/lib/Providers'
import { Toaster } from '@/components/ui/toaster'
import ScrollToTop from '@/components/ScrollToTop'
import StoreMigrator from '@/lib/StoreMigrator'
import './globals.css'

export const metadata = {
  title: 'Base44 APP',
  description: 'Private Reservations Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="https://db.com/logo_v2.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>
            <AuthProvider>
              <QueryClientProvider>
                <StoreMigrator />
                <ScrollToTop />
                {children}
                <Toaster />
              </QueryClientProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}
