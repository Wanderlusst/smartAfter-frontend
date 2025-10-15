import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from 'next-themes'
import ClientLayoutWrapper from './components/ClientLayoutWrapper'
import { getServerSession } from 'next-auth'
import { LoadingProvider } from './contexts/LoadingContext'

const inter = Inter({ subsets: ['latin'] })

// Cache busting version
const APP_VERSION = Date.now().toString();

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
  manifest: '/manifest.json',
  other: {
    'cache-bust': APP_VERSION,
    'build-time': new Date().toISOString(),
  }
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LoadingProvider>
            {ClientLayoutWrapper ? (
              <ClientLayoutWrapper fontClass={inter.className} session={session}>
                {children}
              </ClientLayoutWrapper>
            ) : (
              <div className={inter.className}>
                {children}
              </div>
            )}
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
