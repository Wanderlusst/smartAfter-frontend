import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import { getServerSession } from 'next-auth'
import SessionProviderWrapper from './components/SessionProviderWrapper'
import { SidebarProvider } from './components/SidebarContext'
import AppSidebar from './components/Sidebar'
import { Toaster } from './components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SmartAfter - AI-Powered Analytics',
  description: 'SmartAfter - Your intelligent financial companion for smart spending, refunds, and warranty management',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b82f6',
}


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get session server-side - import authOptions dynamically to avoid client-side issues
  let session = null;
  try {
    const { authOptions } = await import('@/auth');
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('Error getting session:', error);
    session = null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof self === 'undefined') {
                self = globalThis;
              }
            `,
          }}
        />
        {/* Force favicon refresh */}
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
      </head>
      <body className={inter.className}>
        <SessionProviderWrapper session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <div className="flex h-screen overflow-hidden">
                <AppSidebar />
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
              <Toaster />
            </SidebarProvider>
          </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';
