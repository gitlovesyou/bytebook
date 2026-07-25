import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { getNavigation } from '@/lib/navigation'

export const metadata: Metadata = {
  title: { default: 'ByteBook', template: '%s · ByteBook' },
  description: 'Production-grade CS learning platform — notes, code, and interactive demos for Operating Systems, Algorithms, and more.',
  metadataBase: new URL('https://bytebook.dev'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bytebook.dev',
    siteName: 'ByteBook',
    title: 'ByteBook — CS Learning Platform',
    description: 'Premium computer science notes with interactive demos',
  },
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1a' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  robots: { index: true, follow: true },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNavigation()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Intel+One+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Ubuntu+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <script
          id="theme-loader"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `
          }}
        />
        <div className="layout-shell">
          <Header />
          <Sidebar nav={nav} />
          <main className="content-area">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
